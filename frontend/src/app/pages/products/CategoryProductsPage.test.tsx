import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { CategoryProductsPage } from './CategoryProductsPage';
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

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Lipstick',
    category: 'Cosmetics',
    stock: 10,
    purchaseCostMinor: 80000,
    sellingPriceMinor: 120000,
    minimumStockThreshold: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    name: 'Saree',
    category: 'Saree',
    stock: 5,
    purchaseCostMinor: 500000,
    sellingPriceMinor: 900000,
    minimumStockThreshold: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('CategoryProductsPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockProducts(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(PRODUCTS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser, slug: 'cosmetics' | 'shari' | 'three-piece'): void {
    renderWithProviders(
      <Routes>
        <Route path="/:slug" element={<CategoryProductsPage slug={slug} />} />
      </Routes>,
      { route: `/${slug}`, user, token: 'test-token' },
    );
  }

  it('shows only cosmetics products on the cosmetics page', async () => {
    mockProducts();
    renderPage(ADMIN, 'cosmetics');

    expect(await screen.findByText('Lipstick')).toBeInTheDocument();
    expect(screen.queryByText('Saree')).not.toBeInTheDocument();
  });

  it('shows only saree products on the shari page', async () => {
    mockProducts();
    renderPage(ADMIN, 'shari');

    expect(await screen.findByText('Saree')).toBeInTheDocument();
    expect(screen.queryByText('Lipstick')).not.toBeInTheDocument();
  });

  it('hides purchase cost column from staff', async () => {
    mockProducts();
    renderPage(STAFF, 'cosmetics');

    await screen.findByText('Lipstick');

    expect(screen.queryByRole('columnheader', { name: /purchase cost/i })).not.toBeInTheDocument();
  });

  it('shows purchase cost column to admins', async () => {
    mockProducts();
    renderPage(ADMIN, 'cosmetics');

    await screen.findByText('Lipstick');

    expect(screen.getByRole('columnheader', { name: /purchase cost/i })).toBeInTheDocument();
  });

  it('hides the create button from staff', async () => {
    mockProducts();
    renderPage(STAFF, 'cosmetics');

    await screen.findByText('Lipstick');

    expect(screen.queryByRole('button', { name: /new/i })).not.toBeInTheDocument();
  });
});
