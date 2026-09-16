import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { CatalogPage } from './CatalogPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('CatalogPage', () => {
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
      if (url.includes('/categories/tree')) {
        return new Response(
          JSON.stringify([
            {
              id: 'c1',
              name: 'Cosmetics',
              slug: 'cosmetics',
              kind: 'PRODUCT',
              parentId: null,
              displayOrder: 0,
              active: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              children: [],
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.includes('/products')) {
        return new Response(
          JSON.stringify([
            {
              id: 'p1',
              name: 'Lipstick',
              categoryId: 'c1',
              category: 'Cosmetics',
              stock: 10,
              sellingPriceMinor: 100000,
              minimumStockThreshold: 2,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.includes('/services')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;
  }

  function renderPage(slug: string): void {
    renderWithProviders(
      <Routes>
        <Route path="/catalog/:slug" element={<CatalogPage />} />
      </Routes>,
      { route: `/catalog/${slug}`, user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the category title and products', async () => {
    mockEndpoints();
    renderPage('cosmetics');

    expect(await screen.findByRole('heading', { name: 'Cosmetics' })).toBeInTheDocument();
    expect(await screen.findByText('Lipstick')).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown slug', async () => {
    mockEndpoints();
    renderPage('missing');

    expect(await screen.findByText(/category not found/i)).toBeInTheDocument();
  });
});
