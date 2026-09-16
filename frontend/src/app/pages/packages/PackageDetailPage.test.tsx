import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { PackageDetailPage } from './PackageDetailPage';
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

const PACKAGE = {
  id: 'pkg-1',
  name: 'Bridal Package',
  description: 'Complete bridal preparation',
  normalPriceMinor: 570000,
  packagePriceMinor: 499900,
  savingsMinor: 70100,
  active: true,
  items: [
    {
      id: 'i1',
      itemKind: 'SERVICE',
      itemId: 's1',
      itemName: 'Bridal Facial',
      snapshotPriceMinor: 350000,
    },
    {
      id: 'i2',
      itemKind: 'SERVICE',
      itemId: 's2',
      itemName: 'Hair Styling',
      snapshotPriceMinor: 220000,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PackageDetailPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockPackage(): void {
    globalThis.fetch = vi.fn(async (input) => {
      // PackageFormModal mounts the item picker with the detail page, so its
      // service and product queries need valid list-shaped responses too.
      const url = String(input);
      const body = url.includes('/services') || url.includes('/products') ? [] : PACKAGE;

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser): void {
    renderWithProviders(
      <Routes>
        <Route path="/packages/:id" element={<PackageDetailPage />} />
      </Routes>,
      { route: '/packages/pkg-1', user, token: 'test-token' },
    );
  }

  it('renders the package header and pricing', async () => {
    mockPackage();
    renderPage(ADMIN);

    expect(await screen.findByRole('heading', { name: 'Bridal Package' })).toBeInTheDocument();
    expect(screen.getByText('৳4,999.00')).toBeInTheDocument();
    expect(screen.getByText('৳701.00')).toBeInTheDocument();
  });

  it('renders the components', async () => {
    mockPackage();
    renderPage(ADMIN);

    expect(await screen.findByText('Bridal Facial')).toBeInTheDocument();
    expect(screen.getByText('Hair Styling')).toBeInTheDocument();
  });

  it('shows the edit button to admins', async () => {
    mockPackage();
    renderPage(ADMIN);

    await screen.findByRole('heading', { name: 'Bridal Package' });
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });

  it('hides the edit button from staff', async () => {
    mockPackage();
    renderPage(STAFF);

    await screen.findByRole('heading', { name: 'Bridal Package' });
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('shows a not-found message on 404', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ statusCode: 404, message: 'Package not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage(ADMIN);

    expect(await screen.findByText(/package not found/i)).toBeInTheDocument();
  });
});
