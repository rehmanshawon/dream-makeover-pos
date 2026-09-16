import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ExpenseBreakdownCard } from './ExpenseBreakdownCard';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('ExpenseBreakdownCard', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderCard(): void {
    renderWithProviders(<ExpenseBreakdownCard />, {
      user: ADMIN,
      token: 'test-token',
    });
  }

  it('renders salaries and categories', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            totalMinor: 3500000,
            salaryPaymentsMinor: 3000000,
            categories: [
              { category: 'ELECTRICITY', amountMinor: 250000, count: 1 },
              { category: 'CLEANING', amountMinor: 250000, count: 2 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderCard();

    expect(await screen.findByText('Salaries')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
    expect(screen.getByText('৳35,000.00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no expenses', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            totalMinor: 0,
            salaryPaymentsMinor: 0,
            categories: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderCard();

    expect(await screen.findByText(/no expenses in this range/i)).toBeInTheDocument();
  });

  it('uses a custom range when provided', async () => {
    const fetchSpy = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-08-01',
            to: '2026-08-31',
            totalMinor: 0,
            salaryPaymentsMinor: 0,
            categories: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderWithProviders(
      <ExpenseBreakdownCard range={{ range: 'custom', from: '2026-08-01', to: '2026-08-31' }} />,
      { user: ADMIN, token: 'test-token' },
    );

    expect(await screen.findByText(/no expenses in this range/i)).toBeInTheDocument();

    const calledUrl = String(
      (fetchSpy.mock.calls[0]?.[0] as Request | string) instanceof Request
        ? (fetchSpy.mock.calls[0]?.[0] as Request).url
        : fetchSpy.mock.calls[0]?.[0],
    );
    expect(calledUrl).toContain('from=2026-08-01');
    expect(calledUrl).toContain('to=2026-08-31');
  });
});
