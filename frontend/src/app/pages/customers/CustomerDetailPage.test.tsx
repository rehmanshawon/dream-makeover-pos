import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { CustomerDetailPage } from './CustomerDetailPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('CustomerDetailPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
      </Routes>,
      { route: '/customers/c1', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the customer details', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'c1',
            fullName: 'Alice Rahman',
            phoneNumber: '01700000000',
            rewardTier: 'Gold',
            rewardPoints: 250,
            lifetimeSpendMinor: 500000,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;

    renderPage();

    expect(await screen.findAllByText('Alice Rahman')).toHaveLength(2);
    expect(screen.getByText('01700000000')).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/5,000\.00/)).toBeInTheDocument();
  });

  it('shows a not-found message on 404', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            statusCode: 404,
            message: 'Customer not found',
          }),
          {
            status: 404,
            headers: { 'content-type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;

    renderPage();

    expect(await screen.findByText(/customer not found/i)).toBeInTheDocument();
  });
});
