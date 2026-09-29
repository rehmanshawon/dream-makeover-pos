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
    let bankReconciled = false;
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;

      if (url.includes('/accounting/reconciliation')) {
        const statementDate = new URL(url).searchParams.get('statementDate') ?? '2026-09-30';
        if (init?.method === 'POST') {
          bankReconciled = true;
          return new Response(
            JSON.stringify({
              id: 'reconciliation-1',
              statementDate,
              openingBalanceMinor: 0,
              closingBalanceMinor: 10000,
              clearedMovementMinor: 10000,
              createdBy: 'admin',
            }),
            { status: 201, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify(
            bankReconciled
              ? {
                  openingBalanceMinor: 0,
                  previousStatementDate: null,
                  completedReconciliation: {
                    id: 'reconciliation-1',
                    statementDate,
                    openingBalanceMinor: 0,
                    closingBalanceMinor: 10000,
                    clearedMovementMinor: 10000,
                    createdBy: 'admin',
                  },
                  candidates: [],
                }
              : {
                  openingBalanceMinor: 0,
                  previousStatementDate: null,
                  completedReconciliation: null,
                  candidates: [
                    {
                      journalLineId: '00000000-0000-4000-8000-000000000111',
                      entryDate: '2026-09-02',
                      memo: 'Owner deposit',
                      reference: null,
                      debitMinor: 10000,
                      creditMinor: 0,
                      movementMinor: 10000,
                    },
                  ],
                },
          ),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/accounting/trial-balance')) {
        return new Response(
          JSON.stringify({
            asOf: '2026-09-30',
            lines: [
              {
                accountId: 'bank',
                code: 'BANK',
                name: 'Business bank',
                type: 'ASSET',
                debitBalanceMinor: 10000,
                creditBalanceMinor: 0,
              },
            ],
            totalDebitsMinor: 10000,
            totalCreditsMinor: 10000,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/accounting/balance-sheet')) {
        return new Response(
          JSON.stringify({
            asOf: '2026-09-30',
            assets: [{ code: 'BANK', name: 'Business bank', balanceMinor: 10000 }],
            liabilities: [],
            equity: [{ code: 'OWNER_CAPITAL', name: 'Owner capital', balanceMinor: 10000 }],
            currentEarningsMinor: 0,
            totalAssetsMinor: 10000,
            totalLiabilitiesMinor: 0,
            totalEquityMinor: 10000,
            totalLiabilitiesAndEquityMinor: 10000,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

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

  it('finalizes a statement after selected bank activity matches the closing balance', async () => {
    mockEndpoints();
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: /owner deposit/i }));
    fireEvent.change(screen.getByLabelText(/statement closing balance/i), {
      target: { value: '100.00' },
    });
    const finalize = screen.getByRole('button', { name: /finalize reconciliation/i });
    expect(finalize).toBeEnabled();
    fireEvent.click(finalize);

    expect(await screen.findByText(/this statement was reconciled by admin/i)).toBeInTheDocument();
    expect(finalize).toBeDisabled();
    expect(screen.getByText('Difference').nextElementSibling).toHaveClass('is-balanced');
    const request = vi.mocked(globalThis.fetch).mock.calls.find(([input, init]) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      return url.includes('/accounting/reconciliation') && init?.method === 'POST';
    });
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      openingBalanceMinor: 0,
      closingBalanceMinor: 10000,
      clearedJournalLineIds: ['00000000-0000-4000-8000-000000000111'],
    });
  });

  it('shows the balance sheet with a balanced assets and liabilities/equity total', async () => {
    mockEndpoints();
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: /balance sheet/i }));
    const panel = await screen.findByRole('tabpanel', { name: /balance sheet/i });
    expect(within(panel).getByText('Business bank')).toBeInTheDocument();
    expect(within(panel).getByText('Owner capital')).toBeInTheDocument();
    expect(within(panel).getByRole('status').textContent).toContain('Liabilities + equity');
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
