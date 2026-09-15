import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { NewSalePage } from './NewSalePage';
import type { AuthenticatedUser } from '../../../types/auth';
import { MockReceiptPrinter } from './receipt/printer/mock-receipt-printer';
import { setReceiptPrinter, resetReceiptPrinter } from './receipt/printer/printer-provider';

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
    resetReceiptPrinter();
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

  it('submits the sale, shows confirmation, and clears the cart', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cashInput = screen.getByLabelText(/cash received/i);
    await userEvent.clear(cashInput);
    await userEvent.type(cashInput, '3000');

    // Intercept the checkout request
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/checkout')) {
        const body = JSON.parse(init?.body as string);
        expect(body.items).toEqual([{ itemType: 'SERVICE', itemId: 's1', quantity: 1 }]);
        expect(body.cashReceivedMinor).toBe(300000);
        return new Response(
          JSON.stringify({
            transactionId: 'tx-1',
            invoiceId: 'DM-20260914-0001',
            subtotalMinor: 200000,
            discountMinor: 0,
            totalMinor: 200000,
            cashReceivedMinor: 300000,
            changeMinor: 100000,
            items: [
              {
                itemType: 'SERVICE',
                itemName: 'Test Facial',
                quantity: 1,
                unitPriceMinor: 200000,
                totalPriceMinor: 200000,
              },
            ],
            loyaltyPointsEarned: 0,
          }),
          {
            status: 201,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));

    expect(await screen.findByText('Sale completed')).toBeInTheDocument();
    expect(screen.getByText('DM-20260914-0001')).toBeInTheDocument();
    expect(screen.getByText(/৳1,000\.00/)).toBeInTheDocument();

    // Cart should be cleared
    await userEvent.click(screen.getByRole('button', { name: /new sale/i }));
    const cart = screen.getByRole('complementary', { name: /cart/i });
    expect(within(cart).getByText(/no items yet/i)).toBeInTheDocument();
  });

  it('preserves the cart and shows an error on checkout failure', async () => {
    mockEndpoints();
    renderPage();

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cashInput = screen.getByLabelText(/cash received/i);
    await userEvent.clear(cashInput);
    await userEvent.type(cashInput, '3000');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/checkout')) {
        return new Response(
          JSON.stringify({
            statusCode: 400,
            message: 'Insufficient stock',
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        );
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));

    expect(await screen.findByText(/insufficient stock/i)).toBeInTheDocument();

    // Cart is preserved
    const cart = screen.getByRole('complementary', { name: /cart/i });
    expect(within(cart).getByText('Test Facial')).toBeInTheDocument();
  });

  it('prints a receipt after a successful sale', async () => {
    mockEndpoints();
    const printer = new MockReceiptPrinter();

    renderPage();
    setReceiptPrinter(printer);

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cashInput = screen.getByLabelText(/cash received/i);
    await userEvent.clear(cashInput);
    await userEvent.type(cashInput, '3000');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/checkout')) {
        return new Response(
          JSON.stringify({
            transactionId: 'tx-1',
            invoiceId: 'DM-20260915-0001',
            subtotalMinor: 200000,
            discountMinor: 0,
            totalMinor: 200000,
            cashReceivedMinor: 300000,
            changeMinor: 100000,
            cashier: 'admin',
            items: [
              {
                itemType: 'SERVICE',
                itemName: 'Test Facial',
                quantity: 1,
                unitPriceMinor: 200000,
                totalPriceMinor: 200000,
              },
            ],
            loyaltyPointsEarned: 0,
            customer: null,
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));
    await screen.findByText('Sale completed');

    await userEvent.click(screen.getByRole('button', { name: /print receipt/i }));

    // Wait for the print to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(printer.printed).toHaveLength(1);
    const lines = printer.printed[0]!;
    expect(lines.some((l) => l.includes('DM-20260915-0001'))).toBe(true);
    expect(lines.some((l) => l.includes('Test Facial'))).toBe(true);
  });

  it('shows a print error when printing fails', async () => {
    mockEndpoints();
    const printer = new MockReceiptPrinter();
    printer.failWith = new Error('Printer is offline');

    renderPage();
    setReceiptPrinter(printer);

    await screen.findByText('Test Facial');
    await userEvent.click(screen.getByText('Test Facial'));

    const cashInput = screen.getByLabelText(/cash received/i);
    await userEvent.clear(cashInput);
    await userEvent.type(cashInput, '3000');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.endsWith('/checkout')) {
        return new Response(
          JSON.stringify({
            transactionId: 'tx-1',
            invoiceId: 'DM-20260915-0002',
            subtotalMinor: 200000,
            discountMinor: 0,
            totalMinor: 200000,
            cashReceivedMinor: 300000,
            changeMinor: 100000,
            cashier: 'admin',
            items: [],
            loyaltyPointsEarned: 0,
            customer: null,
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }
      return originalFetch(input, init);
    }) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole('button', { name: /complete sale/i }));
    await screen.findByText('Sale completed');

    await userEvent.click(screen.getByRole('button', { name: /print receipt/i }));

    expect(await screen.findByText(/printer is offline/i)).toBeInTheDocument();

    // Modal remains open so the user can retry
    expect(screen.getByText('Sale completed')).toBeInTheDocument();
  });
});
