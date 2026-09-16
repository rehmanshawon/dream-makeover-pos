import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { SalesReportPage } from './SalesReportPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const TXN_1 = {
  id: 'tx-1',
  invoiceId: 'DM-20260916-0001',
  createdAt: '2026-09-16T10:00:00.000Z',
  cashier: 'admin',
  customerId: 'c1',
  customerName: 'Alice',
  subtotalMinor: 200000,
  discountMinor: 0,
  totalMinor: 200000,
  itemLineCount: 1,
  itemQuantityTotal: 1,
};

const TXN_2 = {
  id: 'tx-2',
  invoiceId: 'DM-20260916-0002',
  createdAt: '2026-09-16T11:00:00.000Z',
  cashier: 'admin',
  customerId: null,
  customerName: null,
  subtotalMinor: 150000,
  discountMinor: 10000,
  totalMinor: 140000,
  itemLineCount: 1,
  itemQuantityTotal: 2,
};

function listResponse() {
  return {
    range: { from: '2026-09-01', to: '2026-09-30' },
    filters: { cashier: null },
    summary: {
      transactionCount: 2,
      subtotalMinor: 350000,
      discountMinor: 10000,
      totalMinor: 340000,
      averageSaleMinor: 170000,
    },
    pagination: { total: 2, limit: 50, offset: 0 },
    transactions: [TXN_1, TXN_2],
  };
}

function detailResponse() {
  return {
    id: 'tx-1',
    invoiceId: 'DM-20260916-0001',
    createdAt: '2026-09-16T10:00:00.000Z',
    cashier: 'admin',
    customer: {
      id: 'c1',
      fullName: 'Alice',
      phoneNumber: '01700000000',
      rewardTier: 'Gold',
    },
    subtotalMinor: 200000,
    discountMinor: 0,
    totalMinor: 200000,
    cashReceivedMinor: 300000,
    changeMinor: 100000,
    items: [
      {
        id: 'item-1',
        itemType: 'SERVICE',
        itemName: 'Facial',
        quantity: 1,
        unitPriceMinor: 200000,
        totalPriceMinor: 200000,
      },
    ],
  };
}

describe('SalesReportPage', () => {
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

      if (url.match(/\/transactions\/[^?]+$/)) {
        return new Response(JSON.stringify(detailResponse()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/transactions')) {
        return new Response(JSON.stringify(listResponse()), {
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
        <Route path="/sales-report" element={<SalesReportPage />} />
      </Routes>,
      { route: '/sales-report', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the summary cards', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText(/total sales/i)).toBeInTheDocument();
    expect(screen.getByText(/discounts/i)).toBeInTheDocument();
    expect(screen.getByText(/average sale/i)).toBeInTheDocument();
    expect(await screen.findByText('৳3,400.00')).toBeInTheDocument();
  });

  it('renders the transaction list', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText('DM-20260916-0001')).toBeInTheDocument();
    expect(screen.getByText('DM-20260916-0002')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('opens the detail modal when a row is clicked', async () => {
    mockEndpoints();
    renderPage();

    const invoice = await screen.findByText('DM-20260916-0001');
    await userEvent.click(invoice);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('Facial')).toBeInTheDocument();
  });

  it('switches preset when a chip is clicked', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('DM-20260916-0001');

    const presetGroup = screen.getByRole('group', { name: /date range presets/i });
    await userEvent.click(within(presetGroup).getByRole('button', { name: /^today$/i }));

    // No assertion on the fetch contents here; the important thing is that
    // clicking does not throw and the filter visually updates.
    expect(within(presetGroup).getByRole('button', { name: /^today$/i })).toHaveClass(
      'date-range__chip--active',
    );
  });
});
