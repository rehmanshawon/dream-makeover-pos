import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { CatalogNav } from './CatalogNav';
import { resetTokenProvider } from '../../api/token-provider';

const TREE = [
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
  {
    id: 'c2',
    name: 'Services',
    slug: 'services',
    kind: 'SERVICE',
    parentId: null,
    displayOrder: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children: [],
  },
];

describe('CatalogNav', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
    resetTokenProvider();
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(TREE), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderNav(): void {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CatalogNav />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders top-level categories as links', async () => {
    renderNav();

    const cosmetics = await screen.findByRole('link', { name: /cosmetics/i });
    const services = screen.getByRole('link', { name: /services/i });

    expect(cosmetics).toHaveAttribute('href', '/catalog/cosmetics');
    expect(services).toHaveAttribute('href', '/catalog/services');
  });

  it('shows the Catalog group label', async () => {
    renderNav();
    expect(await screen.findByText('Catalog')).toBeInTheDocument();
  });
});
