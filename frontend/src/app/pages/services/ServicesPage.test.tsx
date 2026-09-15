import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ServicesPage } from './ServicesPage';
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

const SERVICES = [
  {
    id: 's1',
    name: 'Bridal Facial',
    priceMinor: 350000,
    durationMinutes: 60,
    rewardPointWeight: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 's2',
    name: 'Hair Spa',
    priceMinor: 200000,
    durationMinutes: 45,
    rewardPointWeight: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ServicesPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockServices(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(SERVICES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(user: AuthenticatedUser): void {
    renderWithProviders(
      <Routes>
        <Route path="/parlour" element={<ServicesPage />} />
      </Routes>,
      { route: '/parlour', user, token: 'test-token' },
    );
  }

  it('shows all services', async () => {
    mockServices();
    renderPage(ADMIN);

    expect(await screen.findByText('Bridal Facial')).toBeInTheDocument();
    expect(screen.getByText('Hair Spa')).toBeInTheDocument();
  });

  it('shows the price formatted with Taka symbol', async () => {
    mockServices();
    renderPage(ADMIN);

    expect(await screen.findByText('৳3,500.00')).toBeInTheDocument();
    expect(screen.getByText('৳2,000.00')).toBeInTheDocument();
  });

  it('shows the create button to admins', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    expect(screen.getByRole('button', { name: /new service/i })).toBeInTheDocument();
  });

  it('hides the create button from staff', async () => {
    mockServices();
    renderPage(STAFF);

    await screen.findByText('Bridal Facial');
    expect(screen.queryByRole('button', { name: /new service/i })).not.toBeInTheDocument();
  });

  it('filters by search term', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');

    const search = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(search, 'hair');

    expect(screen.queryByText('Bridal Facial')).not.toBeInTheDocument();
    expect(screen.getByText('Hair Spa')).toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockServices();
    renderPage(ADMIN);

    await screen.findByText('Bridal Facial');
    await userEvent.click(screen.getByRole('button', { name: /new service/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no services', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage(ADMIN);

    expect(await screen.findByText(/no services yet/i)).toBeInTheDocument();
  });
});
