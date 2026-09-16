import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { DashboardPage } from './DashboardPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function summaryResponse(overrides: Record<string, unknown> = {}): unknown {
  return {
    range: { from: '2026-09-16', to: '2026-09-16' },
    revenue: {
      productSalesMinor: 100000,
      serviceSalesMinor: 350000,
      packageSalesMinor: 50000,
      totalRevenueMinor: 500000,
    },
    discountsGivenMinor: 0,
    cogsMinor: 40000,
    grossProfitMinor: 460000,
    expenses: {
      salaryPaymentsMinor: 0,
      shopExpensesMinor: 0,
      totalOperatingExpensesMinor: 0,
      shopExpensesByCategory: [],
    },
    netOperatingResultMinor: 460000,
    metadata: {
      cogsMethod: 'current_purchase_cost',
      generatedAt: '2026-09-16T10:00:00.000Z',
    },
    ...overrides,
  };
}

function monthlySummaryResponse(): unknown {
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
    grossProfitMinor: 6700000,
    expenses: {
      salaryPaymentsMinor: 3000000,
      shopExpensesMinor: 250000,
      totalOperatingExpensesMinor: 3250000,
      shopExpensesByCategory: [{ category: 'ELECTRICITY', amountMinor: 250000 }],
    },
    netOperatingResultMinor: 3450000,
    metadata: {
      cogsMethod: 'current_purchase_cost',
      generatedAt: '2026-09-16T10:00:00.000Z',
    },
  };
}

describe('DashboardPage', () => {
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

      if (url.includes('/reports/financial-summary')) {
        if (url.includes('range=this_month')) {
          return new Response(JSON.stringify(monthlySummaryResponse()), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(summaryResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/reports/revenue-trend')) {
        return new Response(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', points: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/reports/top-products')) {
        return new Response(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', items: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/reports/top-services')) {
        return new Response(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', items: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/reports/expense-breakdown')) {
        return new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            totalMinor: 0,
            salaryPaymentsMinor: 0,
            categories: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/customers')) {
        return new Response(JSON.stringify([{ id: 'c1' }, { id: 'c2' }]), {
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
        <Route path="/" element={<DashboardPage />} />
      </Routes>,
      { route: '/', user: ADMIN, token: 'test-token' },
    );
  }

  it('shows the admin name in the greeting', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/admin/i)).toBeInTheDocument();
  });

  it('renders the four today KPI cards', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/today's sales/i)).toBeInTheDocument();
    expect(screen.getByText(/today's services/i)).toBeInTheDocument();
    expect(screen.getByText(/today's product sales/i)).toBeInTheDocument();
    expect(screen.getByText(/total customers/i)).toBeInTheDocument();
  });

  it('renders today sales values from the summary', async () => {
    mockEndpoints();
    renderPage();

    // Today's Sales: ৳5,000.00 (500000 minor)
    expect(await screen.findByText('৳5,000.00')).toBeInTheDocument();
    // Today's Services: ৳3,500.00 (350000 minor)
    expect(screen.getByText('৳3,500.00')).toBeInTheDocument();
    // Today's Product Sales: ৳1,000.00 (100000 minor)
    expect(screen.getByText('৳1,000.00')).toBeInTheDocument();
  });

  it('renders the customer count', async () => {
    mockEndpoints();
    renderPage();

    // The count is rendered as text inside the KPI value
    // expect(await screen.findByText(/total customers/i)).toBeInTheDocument();
    // const totalCustomersCard = screen.getByText(/total customers/i).parentElement;
    // expect(totalCustomersCard?.textContent).toContain('2');

    const countElement = await screen.findByText('2');
    const totalCustomersCard = countElement.closest('.kpi-card') || countElement.parentElement;

    expect(totalCustomersCard).toHaveTextContent(/total customers/i);
  });

  it('renders the monthly KPI cards', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/monthly revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/monthly expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/net result/i)).toBeInTheDocument();
  });

  it('renders monthly revenue, expenses, and net result values', async () => {
    mockEndpoints();
    renderPage();

    // Monthly Revenue: ৳75,000.00 (7500000 minor)
    expect(await screen.findByText('৳75,000.00')).toBeInTheDocument();
    // Monthly Expenses: ৳32,500.00 (3250000 minor)
    expect(screen.getByText('৳32,500.00')).toBeInTheDocument();
    // Net Result: ৳34,500.00 (3450000 minor)
    expect(screen.getByText('৳34,500.00')).toBeInTheDocument();
  });

  it('shows a placeholder while summaries are loading', async () => {
    // Leave fetch pending by returning a never-resolving promise
    globalThis.fetch = vi.fn(() => new Promise(() => undefined)) as unknown as typeof fetch;

    renderPage();

    // The KPI placeholders are em-dashes
    const placeholders = await screen.findAllByText('—');
    expect(placeholders.length).toBeGreaterThan(0);
  });
});
