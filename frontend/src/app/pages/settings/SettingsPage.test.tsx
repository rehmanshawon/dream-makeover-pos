import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { SettingsPage } from './SettingsPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('SettingsPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockEndpoints(): void {
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/users')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>,
      { route: '/settings', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the three tabs', async () => {
    mockEndpoints();
    renderPage();

    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /business info/i })).toBeInTheDocument();
  });

  it('shows the Users tab by default', async () => {
    mockEndpoints();
    renderPage();

    expect(screen.getByRole('tab', { name: /users/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to the Security tab', async () => {
    mockEndpoints();
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    expect(screen.getByRole('tab', { name: /security/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('switches to the Business info tab', async () => {
    mockEndpoints();
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: /business info/i }));

    expect(screen.getByText('DREAM MAKEOVER')).toBeInTheDocument();
  });
});
