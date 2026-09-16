import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { AccountsPage } from './AccountsPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function summaryResponse(): unknown {
  return {
    range: { from: '2026-09-01', to: '2026-09-30' },
    revenue: {
      productSalesMinor: 2000000,
      serviceSalesMinor: 5000000,
      packageSalesMinor: 500000,
      totalRevenueMinor: 7500000,
    },
    discountsGivenMinor: 100000,
    cogsMinor: 800000,
    grossProfitMinor: 6600000,
    expenses: {
      salaryPaymentsMinor: 3000000,
      shopExpensesMinor: 250000,
      totalOperatingExpensesMinor: 3250000,
      shopExpensesByCategory: [{ category: 'ELECTRICITY', amountMinor: 250000 }],
    },
    netOperatingResultMinor: 3350000,
    metadata: {
      cogsMethod: 'current_purchase_cost',
      generatedAt: '2026-09-16T10:00:00.000Z',
    },
  };
}

describe('AccountsPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockEndpoints(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(summaryResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/accounts" element={<AccountsPage />} />
      </Routes>,
      { route: '/accounts', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the four headline KPI cards', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/net revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/gross profit/i)).toBeInTheDocument();
    expect(screen.getByText(/operating expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/net operating result/i)).toBeInTheDocument();
  });

  it('renders the profit and loss statement sections', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/revenue/i)).toBeInTheDocument();
    const statement = await screen.findByRole('table', { name: /profit and loss statement/i });
    expect(within(statement).getByText(/cost of goods sold/i)).toBeInTheDocument();
    expect(within(statement).getByText(/net operating result/i)).toBeInTheDocument();
  });

  it('shows the methodology note', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/cost of goods sold methodology/i)).toBeInTheDocument();
    expect(screen.getByText(/current purchase cost/i)).toBeInTheDocument();
  });

  it('shows the disclaimer', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/not a complete accounting statement/i)).toBeInTheDocument();
  });

  it('shows the date range filter with presets', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByRole('group', { name: /date range presets/i })).toBeInTheDocument();
  });
});
