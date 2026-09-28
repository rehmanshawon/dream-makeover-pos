import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;

      if (url.endsWith('/accounting/accounts')) {
        return new Response(
          JSON.stringify([
            { id: 'cash', code: 'CASH', name: 'Cash on hand', type: 'ASSET', balanceMinor: 0 },
            { id: 'bank', code: 'BANK', name: 'Business bank', type: 'ASSET', balanceMinor: 0 },
            {
              id: 'capital',
              code: 'OWNER_CAPITAL',
              name: 'Owner capital',
              type: 'EQUITY',
              balanceMinor: 0,
            },
            {
              id: 'drawings',
              code: 'OWNER_DRAWINGS',
              name: 'Owner drawings',
              type: 'CONTRA_EQUITY',
              balanceMinor: 0,
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/accounting/journal')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.endsWith('/accounting/vouchers') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'journal-1',
            entryType: 'OWNER_CONTRIBUTION',
            entryDate: '2026-09-28',
            memo: 'Owner contribution to bank',
            reference: null,
            createdBy: 'admin',
            createdAt: '2026-09-28T10:00:00.000Z',
            lines: [],
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.endsWith('/system/time-trust')) {
        return new Response(
          JSON.stringify({
            state: 'ONLINE',
            payrollAllowed: true,
            warning: false,
            message: null,
            lastVerifiedAt: '2026-09-28T10:00:00.000Z',
            offlineForMs: 0,
            remainingMs: 28800000,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/reports/financial-summary')) {
        return new Response(JSON.stringify(summaryResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/reports/revenue-trend')) {
        return new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            points: [{ date: '2026-09-01', revenueMinor: 500000, transactionCount: 2 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/reports/expense-breakdown')) {
        return new Response(
          JSON.stringify({
            from: '2026-09-01',
            to: '2026-09-30',
            totalMinor: 3250000,
            salaryPaymentsMinor: 3000000,
            categories: [{ category: 'ELECTRICITY', amountMinor: 250000, count: 1 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;
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

  it('records an owner deposit as a cash/bank voucher', async () => {
    mockEndpoints();
    renderPage();

    fireEvent.change(await screen.findByLabelText(/amount \(bdt\)/i), {
      target: { value: '1250.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post voucher/i }));

    await waitFor(() => {
      const voucherRequest = vi.mocked(globalThis.fetch).mock.calls.find(([input, init]) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        return url.endsWith('/accounting/vouchers') && init?.method === 'POST';
      });
      expect(voucherRequest).toBeDefined();
      expect(JSON.parse(String(voucherRequest?.[1]?.body))).toMatchObject({
        entryType: 'OWNER_CONTRIBUTION',
        amountMinor: 125050,
        cashBankAccountCode: 'BANK',
      });
    });
  });

  it('renders the profit and loss statement sections', async () => {
    mockEndpoints();
    renderPage();

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

  it('renders the revenue trend and expense breakdown widgets', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/revenue trend/i)).toBeInTheDocument();
    expect(screen.getByText(/expense breakdown/i)).toBeInTheDocument();
  });
});
