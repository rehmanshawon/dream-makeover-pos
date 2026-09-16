import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/render-with-providers';
import { RevenueTrendChart } from './RevenueTrendChart';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('RevenueTrendChart', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderChart(): void {
    renderWithProviders(<RevenueTrendChart />, {
      user: ADMIN,
      token: 'test-token',
    });
  }

  it('renders the chart title', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            points: [
              { date: '2026-09-01', revenueMinor: 100000, transactionCount: 2 },
              { date: '2026-09-02', revenueMinor: 250000, transactionCount: 4 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderChart();
    expect(await screen.findByText(/revenue trend/i)).toBeInTheDocument();
  });

  it('renders the chart container with data', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            points: [{ date: '2026-09-01', revenueMinor: 100000, transactionCount: 2 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderChart();

    expect(await screen.findByTestId('trend-chart')).toBeInTheDocument();
  });

  it('shows an empty state when there are no points', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', points: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderChart();

    expect(await screen.findByText(/no revenue yet/i)).toBeInTheDocument();
  });
});
