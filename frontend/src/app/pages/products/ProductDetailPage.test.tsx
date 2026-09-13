import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
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
});
