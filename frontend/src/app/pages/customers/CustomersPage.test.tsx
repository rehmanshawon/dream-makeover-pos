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
    area: 'Banani',
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
    area: 'Mirpur',
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
    expect(screen.getByRole('table')).toHaveTextContent('Bob Chowdhury');
    expect(screen.getByRole('option', { name: 'Bob Chowdhury' })).toBeInTheDocument();
  });

  it('searches customer records by area', async () => {
    mockListCustomers();
    renderPage();

    await screen.findByText('Alice Rahman');
    await userEvent.type(screen.getByPlaceholderText(/search by name or phone/i), 'Mirpur');

    expect(screen.getByRole('table')).toHaveTextContent('Bob Chowdhury');
    expect(screen.getByRole('table')).not.toHaveTextContent('Alice Rahman');
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
    const areaSelect = screen.getByLabelText(/area \(optional\)/i);
    expect(areaSelect).toBeInTheDocument();
    expect(areaSelect).toHaveValue('');
    expect(areaSelect).not.toBeRequired();
    expect(screen.getAllByRole('option')).toHaveLength(51);
    expect(screen.getByRole('option', { name: 'Adabor' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wari' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /\((DNCC|DSCC)\)/ })).not.toBeInTheDocument();
  });

  it('submits an optional area when creating a customer', async () => {
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/customers') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'c3',
            fullName: 'Aisha Khan',
            phoneNumber: '01900000000',
            area: 'Mirpur Model',
            rewardTier: 'Silver',
            rewardPoints: 0,
            lifetimeSpendMinor: 0,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify(CUSTOMERS), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    renderPage();

    await screen.findByText('Alice Rahman');
    await userEvent.click(screen.getByRole('button', { name: /new customer/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Aisha Khan');
    await userEvent.type(screen.getByLabelText(/phone number/i), '01900000000');
    await userEvent.selectOptions(screen.getByLabelText(/area \(optional\)/i), 'Mirpur Model');
    await userEvent.click(screen.getByRole('button', { name: /create customer/i }));

    expect(await screen.findByText('Detail view')).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(createCall?.[1]?.body as string)).toMatchObject({
      area: 'Mirpur Model',
    });
  });
});
