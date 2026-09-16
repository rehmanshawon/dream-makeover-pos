import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { PackagesPage } from './PackagesPage';
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

const PACKAGES = [
  {
    id: 'pkg-1',
    name: 'Bridal Package',
    description: 'Complete bridal preparation',
    normalPriceMinor: 570000,
    packagePriceMinor: 499900,
    savingsMinor: 70100,
    active: true,
    items: [
      {
        id: 'item-1',
        itemKind: 'SERVICE',
        itemId: 's1',
        itemName: 'Bridal Facial',
        snapshotPriceMinor: 350000,
      },
      {
        id: 'item-2',
        itemKind: 'SERVICE',
        itemId: 's2',
        itemName: 'Hair Styling',
        snapshotPriceMinor: 220000,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('PackagesPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockPackages(): void {
    globalThis.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/packages')) {
        return new Response(JSON.stringify(PACKAGES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/services')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/products')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser): void {
    renderWithProviders(
      <Routes>
        <Route path="/packages" element={<PackagesPage />} />
      </Routes>,
      { route: '/packages', user, token: 'test-token' },
    );
  }

  it('renders the packages list', async () => {
    mockPackages();
    renderPage(ADMIN);

    expect(await screen.findByText('Bridal Package')).toBeInTheDocument();
    expect(screen.getByText('৳5,700.00')).toBeInTheDocument();
    expect(screen.getByText('৳4,999.00')).toBeInTheDocument();
    expect(screen.getByText('৳701.00')).toBeInTheDocument();
  });

  it('shows the create button to admins', async () => {
    mockPackages();
    renderPage(ADMIN);

    await screen.findByText('Bridal Package');
    expect(screen.getByRole('button', { name: /new package/i })).toBeInTheDocument();
  });

  it('hides the create button from staff', async () => {
    mockPackages();
    renderPage(STAFF);

    await screen.findByText('Bridal Package');
    expect(screen.queryByRole('button', { name: /new package/i })).not.toBeInTheDocument();
  });

  it('filters by search term', async () => {
    mockPackages();
    renderPage(ADMIN);

    await screen.findByText('Bridal Package');

    const search = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(search, 'xyz');

    expect(screen.queryByText('Bridal Package')).not.toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockPackages();
    renderPage(ADMIN);

    await screen.findByText('Bridal Package');
    await userEvent.click(screen.getByRole('button', { name: /new package/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/package name/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no packages', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage(ADMIN);

    expect(await screen.findByText(/no packages yet/i)).toBeInTheDocument();
  });

  it('shows Edit and Deactivate buttons to admins', async () => {
    mockPackages();
    renderPage(ADMIN);

    await screen.findByText('Bridal Package');
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
  });

  it('hides action buttons from staff', async () => {
    mockPackages();
    renderPage(STAFF);

    await screen.findByText('Bridal Package');
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^deactivate$/i })).not.toBeInTheDocument();
  });
});
