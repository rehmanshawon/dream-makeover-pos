import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ProductDetailPage } from './ProductDetailPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const STAFF: AuthenticatedUser = {
  id: '2',
  username: 'staff',
  displayName: 'Staff',
  role: 'STAFF',
};

describe('ProductDetailPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockProductAndHistory(): void {
    globalThis.fetch = vi.fn(async (input, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'op-1' }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/purchases/returnable-lines/')) {
        return new Response(
          JSON.stringify([
            {
              purchaseId: 'purchase-1',
              purchaseDate: '2026-09-20',
              supplierName: 'Beauty Supply Co',
              paymentMethod: 'CREDIT',
              purchaseLineId: 'line-1',
              productId: 'p1',
              productName: 'Lipstick',
              productStock: 10,
              quantity: 5,
              returnedQuantity: 1,
              remainingQuantity: 4,
              unitCostMinor: 80000,
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.endsWith('/history')) {
        return new Response(
          JSON.stringify([
            {
              id: 'm1',
              productId: 'p1',
              delta: 10,
              reason: 'STOCK_IN',
              referenceId: null,
              note: 'Opening stock',
              createdBy: 'admin',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'm2',
              productId: 'p1',
              delta: 5,
              reason: 'PURCHASE',
              referenceId: 'purchase-1',
              note: 'Purchase unit cost 80000',
              createdBy: 'admin',
              createdAt: '2026-01-02T00:00:00.000Z',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          id: 'p1',
          name: 'Lipstick',
          category: 'Cosmetics',
          stock: 10,
          purchaseCostMinor: 80000,
          sellingPriceMinor: 120000,
          minimumStockThreshold: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser): void {
    renderWithProviders(
      <Routes>
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Routes>,
      { route: '/products/p1', user, token: 'test-token' },
    );
  }

  it('renders product details and stock history', async () => {
    mockProductAndHistory();
    renderPage(ADMIN);

    expect(await screen.findAllByText('Lipstick')).not.toHaveLength(0);
    expect(screen.getByText(/1,200\.00/)).toBeInTheDocument();
    expect(await screen.findByText('Opening stock')).toBeInTheDocument();
    expect(screen.getByText('Purchase unit cost ৳800.00')).toBeInTheDocument();
  });

  it('shows the stock status below the product name', async () => {
    mockProductAndHistory();
    renderPage(ADMIN);

    const productName = await screen.findByRole('heading', { name: 'Lipstick' });
    const stockStatus = screen.getByText('In stock');

    expect(
      productName.compareDocumentPosition(stockStatus) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('hides purchase cost from staff', async () => {
    mockProductAndHistory();
    renderPage(STAFF);

    await screen.findAllByText('Lipstick');

    expect(screen.queryByText(/purchase cost/i)).not.toBeInTheDocument();
  });

  it('shows purchase cost to admins', async () => {
    mockProductAndHistory();
    renderPage(ADMIN);

    await screen.findAllByText('Lipstick'); // Ensures all instances of 'Lipstick' are found

    expect(screen.getByText(/purchase cost/i)).toBeInTheDocument();
  });

  it('offers supplier return and cost revaluation actions only to admins', async () => {
    mockProductAndHistory();
    renderPage(ADMIN);
    expect(await screen.findByRole('button', { name: 'Return to supplier' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revalue cost' })).toBeInTheDocument();

    mockProductAndHistory();
    renderPage(STAFF);
    await screen.findAllByText('Lipstick');
    expect(screen.queryByRole('button', { name: 'Return to supplier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revalue cost' })).not.toBeInTheDocument();
  });

  it('posts a supplier return against a selected purchase line', async () => {
    mockProductAndHistory();
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Return to supplier' }));
    await user.selectOptions(await screen.findByLabelText('Purchase line'), 'line-1');
    await user.click(await screen.findByRole('button', { name: 'Post supplier return' }));

    await waitFor(() => {
      const postCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(JSON.parse(String((postCall?.[1] as RequestInit).body))).toMatchObject({
        purchaseId: 'purchase-1',
        refundMethod: 'CREDIT',
        lines: [{ purchaseLineId: 'line-1', quantity: 1 }],
      });
    });
  });

  it('posts a cost revaluation in minor units', async () => {
    mockProductAndHistory();
    const user = userEvent.setup();
    renderPage(ADMIN);

    await user.click(await screen.findByRole('button', { name: 'Revalue cost' }));
    const input = await screen.findByLabelText('New unit cost (BDT)');
    await user.clear(input);
    await user.type(input, '900.00');
    await user.click(screen.getByRole('button', { name: 'Post revaluation' }));

    await waitFor(() => {
      const postCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(JSON.parse(String((postCall?.[1] as RequestInit).body))).toMatchObject({
        productId: 'p1',
        newUnitCostMinor: 90000,
      });
    });
  });
});
