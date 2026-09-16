import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ChangePasswordModal } from './ChangePasswordModal';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('ChangePasswordModal', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderModal(onSuccess?: () => void): void {
    renderWithProviders(
      <ChangePasswordModal
        open
        onClose={() => undefined}
        {...(onSuccess === undefined ? {} : { onSuccess })}
      />,
      { user: ADMIN, token: 'test-token' },
    );
  }

  it('renders all three fields', () => {
    renderModal();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    renderModal();

    await userEvent.type(screen.getByLabelText(/current password/i), 'old-pass-123');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'new-pass-456');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different');

    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('rejects short new password', async () => {
    renderModal();

    await userEvent.type(screen.getByLabelText(/current password/i), 'old-pass-123');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'short');

    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('submits a valid change', async () => {
    let called = false;
    globalThis.fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(init?.body as string);
      expect(body.currentPassword).toBe('old-pass-123');
      expect(body.newPassword).toBe('new-pass-456');
      called = true;
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    renderModal();

    await userEvent.type(screen.getByLabelText(/current password/i), 'old-pass-123');
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'new-pass-456');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'new-pass-456');

    await userEvent.click(screen.getByRole('button', { name: /change password/i }));

    await vi.waitFor(() => {
      expect(called).toBe(true);
    });
  });
});
