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

    expect(await screen.findByText(/no revenue in this range/i)).toBeInTheDocument();
  });

  it('uses a custom range when from and to are provided', async () => {
    const fetchSpy = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-15',
            points: [{ date: '2026-09-10', revenueMinor: 500000, transactionCount: 3 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderWithProviders(<RevenueTrendChart from="2026-09-01" to="2026-09-15" />, {
      user: ADMIN,
      token: 'test-token',
    });

    expect(await screen.findByTestId('trend-chart')).toBeInTheDocument();

    const calledUrl = String(
      (fetchSpy.mock.calls[0]?.[0] as Request | string) instanceof Request
        ? (fetchSpy.mock.calls[0]?.[0] as Request).url
        : fetchSpy.mock.calls[0]?.[0],
    );
    expect(calledUrl).toContain('from=2026-09-01');
    expect(calledUrl).toContain('to=2026-09-15');
  });

  it('uses an override title when provided', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', points: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderWithProviders(<RevenueTrendChart title="Custom trend title" />, {
      user: ADMIN,
      token: 'test-token',
    });

    expect(await screen.findByText('Custom trend title')).toBeInTheDocument();
  });
});
