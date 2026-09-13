import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { CustomersPage } from './CustomersPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const CUSTOMERS = [
  {
    id: 'c1',
    fullName: 'Alice Rahman',
    phoneNumber: '01700000000',
    rewardTier: 'Silver',
    rewardPoints: 0,
    lifetimeSpendMinor: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'c2',
    fullName: 'Bob Chowdhury',
    phoneNumber: '01800000000',
    rewardTier: 'Gold',
    rewardPoints: 250,
    lifetimeSpendMinor: 500000,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
];

describe('CustomersPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockListCustomers(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(CUSTOMERS), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<div>Detail view</div>} />
      </Routes>,
      { route: '/customers', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the customer list', async () => {
    mockListCustomers();
    renderPage();

    expect(await screen.findByText('Alice Rahman')).toBeInTheDocument();
    expect(screen.getByText('Bob Chowdhury')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    mockListCustomers();
    renderPage();

    await screen.findByText('Alice Rahman');

    const search = screen.getByPlaceholderText(/search by name or phone/i);
    await userEvent.type(search, 'Bob');

    expect(screen.queryByText('Alice Rahman')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Chowdhury')).toBeInTheDocument();
  });

  it('shows an empty state when there are no customers', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no customers yet/i)).toBeInTheDocument();
    });
  });

  it('opens the create modal when the action is clicked', async () => {
    mockListCustomers();
    renderPage();

    await screen.findByText('Alice Rahman');

    await userEvent.click(screen.getByRole('button', { name: /new customer/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
