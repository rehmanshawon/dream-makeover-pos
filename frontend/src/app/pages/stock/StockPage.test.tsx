import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { StockPage } from './StockPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Lipstick',
    category: 'Cosmetics',
    stock: 25,
    purchaseCostMinor: 80000,
    sellingPriceMinor: 120000,
    minimumStockThreshold: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    name: 'Foundation',
    category: 'Cosmetics',
    stock: 3,
    purchaseCostMinor: 100000,
    sellingPriceMinor: 150000,
    minimumStockThreshold: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p3',
    name: 'Jamdani Saree',
    category: 'Saree',
    stock: 0,
    purchaseCostMinor: 800000,
    sellingPriceMinor: 1500000,
    minimumStockThreshold: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const STATS = {
  totalProducts: 3,
  lowStockCount: 2,
  outOfStockCount: 1,
};

describe('StockPage', () => {
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
      if (url.includes('/inventory/stats')) {
        return new Response(JSON.stringify(STATS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/products')) {
        return new Response(JSON.stringify(PRODUCTS), {
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
        <Route path="/stock" element={<StockPage />} />
      </Routes>,
      { route: '/stock', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the stats cards', async () => {
    mockEndpoints();
    renderPage();

    const totalStat = await screen.findByText(/products tracked/i);
    const statCard = totalStat.closest('.stock-stats__card') as HTMLElement;

    expect(within(statCard).getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Low stock', { selector: '.stock-stats__label' })).toBeInTheDocument();
    expect(
      screen.getByText('Out of stock', { selector: '.stock-stats__label' }),
    ).toBeInTheDocument();
  });

  it('lists all products by default', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText('Lipstick')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Jamdani Saree')).toBeInTheDocument();
  });

  it('filters to low-stock when the chip is clicked', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const statusGroup = screen.getByRole('group', { name: /status filter/i });
    await userEvent.click(within(statusGroup).getByRole('button', { name: /low stock/i }));

    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Jamdani Saree')).toBeInTheDocument();
  });

  it('filters to out-of-stock when the chip is clicked', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const statusGroup = screen.getByRole('group', { name: /status filter/i });
    await userEvent.click(within(statusGroup).getByRole('button', { name: /out of stock/i }));

    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
    expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
    expect(screen.getByText('Jamdani Saree')).toBeInTheDocument();
  });

  it('filters by category', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const categoryGroup = screen.getByRole('group', { name: /category filter/i });
    await userEvent.click(within(categoryGroup).getByRole('button', { name: /shari/i }));

    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
    expect(screen.queryByText('Foundation')).not.toBeInTheDocument();
    expect(screen.getByText('Jamdani Saree')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const search = screen.getByPlaceholderText(/search products/i);
    await userEvent.type(search, 'foun');

    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
  });

  it('combines status and category filters', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const statusGroup = screen.getByRole('group', { name: /status filter/i });
    await userEvent.click(within(statusGroup).getByRole('button', { name: /low stock/i }));

    const categoryGroup = screen.getByRole('group', { name: /category filter/i });
    await userEvent.click(within(categoryGroup).getByRole('button', { name: /cosmetics/i }));

    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.queryByText('Jamdani Saree')).not.toBeInTheDocument();
  });

  it('shows an empty state when no products match', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Lipstick');

    const search = screen.getByPlaceholderText(/search products/i);
    await userEvent.type(search, 'nothing-matches');

    expect(await screen.findByText(/no matching products/i)).toBeInTheDocument();
  });
});
