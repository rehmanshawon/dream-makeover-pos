import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { NewSalePage } from './NewSalePage';
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
    name: 'Test Lipstick',
    category: 'Cosmetics',
    stock: 10,
    purchaseCostMinor: 80000,
    sellingPriceMinor: 120000,
    minimumStockThreshold: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const SERVICES = [
  {
    id: 's1',
    name: 'Test Facial',
    priceMinor: 200000,
    durationMinutes: 60,
    rewardPointWeight: 1,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('NewSalePage', () => {
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
      if (url.includes('/services')) {
        return new Response(JSON.stringify(SERVICES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/packages')) {
        return new Response(JSON.stringify([]), {
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
        <Route path="/pos" element={<NewSalePage />} />
      </Routes>,
      { route: '/pos', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders service tab by default', async () => {
    mockEndpoints();
    renderPage();

    expect(await screen.findByText('Test Facial')).toBeInTheDocument();
  });

  it('adds a service to the cart when clicked', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cart = screen.getByRole('complementary', { name: /cart/i });
    expect(within(cart).getByText('Test Facial')).toBeInTheDocument();
  });

  it('switches to a product tab and shows products', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByRole('button', { name: /cosmetics/i }));

    expect(await screen.findByText('Test Lipstick')).toBeInTheDocument();
  });

  it('increments quantity when adding the same item twice', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));
    // Click the same item again to increment quantity
    await userEvent.click((await screen.findAllByText('Test Facial'))[0]!);

    const cart = screen.getByRole('complementary', { name: /cart/i });
    const quantityInput = within(cart).getByRole('spinbutton', {
      name: /quantity of test facial/i,
    });
    expect(quantityInput).toHaveValue(2);
  });

  it('shows zero change when cash is insufficient', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cashInput = screen.getByLabelText(/cash received/i);
    await userEvent.clear(cashInput);
    await userEvent.type(cashInput, '1000');

    // Total is ৳2000.00 (200000 minor), cash is ৳1000 → change should be 0.
    const cart = screen.getByRole('complementary', { name: /cart/i });
    expect(within(cart).getByText(/change/i).parentElement).toHaveTextContent('৳0.00');
  });
});
