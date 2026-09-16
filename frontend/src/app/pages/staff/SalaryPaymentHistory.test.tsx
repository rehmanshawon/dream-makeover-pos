import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { SalaryPaymentHistory } from './SalaryPaymentHistory';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function paymentResponse(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: 'p1',
    employeeId: 'e1',
    amountMinor: 3500000,
    paymentType: 'REGULAR',
    paymentMethod: 'CASH',
    paidOn: '2026-09-01',
    note: 'September salary',
    paidBy: 'admin',
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('SalaryPaymentHistory', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows an empty state when there are no payments', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderWithProviders(<SalaryPaymentHistory employeeId="e1" />, {
      user: ADMIN,
      token: 'test-token',
    });

    expect(await screen.findByText(/no payments recorded yet/i)).toBeInTheDocument();
  });

  it('renders payments and totals', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            paymentResponse(),
            paymentResponse({
              id: 'p2',
              amountMinor: 500000,
              paymentType: 'BONUS',
              paidOn: '2026-09-15',
              note: 'Eid bonus',
            }),
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderWithProviders(<SalaryPaymentHistory employeeId="e1" />, {
      user: ADMIN,
      token: 'test-token',
    });

    expect(await screen.findByText(/35,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('৳5,000.00')).toBeInTheDocument();
    expect(screen.getByText(/Regular salary/i)).toBeInTheDocument();
    expect(screen.getByText(/^Bonus$/i)).toBeInTheDocument();
    expect(screen.getByText('September salary')).toBeInTheDocument();
    expect(screen.getByText('Eid bonus')).toBeInTheDocument();
  });

  it('opens a delete confirmation and calls the delete endpoint', async () => {
    let deleteCalled = false;

    globalThis.fetch = vi.fn(async (_input, init) => {
      const method = init?.method ?? 'GET';
      if (method === 'DELETE') {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify([paymentResponse()]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    renderWithProviders(<SalaryPaymentHistory employeeId="e1" />, {
      user: ADMIN,
      token: 'test-token',
    });

    await screen.findByText('September salary');
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await vi.waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });
});
