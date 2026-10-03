import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { TransactionDetailModal } from './TransactionDetailModal';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('TransactionDetailModal', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderModal(transactionId: string | null): void {
    renderWithProviders(
      <TransactionDetailModal transactionId={transactionId} onClose={() => undefined} />,
      { user: ADMIN, token: 'test-token' },
    );
  }

  it('renders transaction details, items, and totals', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'tx-1',
            invoiceId: 'DM-20260916-0001',
            createdAt: '2026-09-16T10:00:00.000Z',
            cashier: 'admin',
            customer: {
              id: 'c1',
              fullName: 'Alice',
              phoneNumber: '01700000000',
              rewardTier: 'Gold',
            },
            subtotalMinor: 200000,
            discountMinor: 0,
            totalMinor: 200000,
            cashReceivedMinor: 300000,
            changeMinor: 100000,
            items: [
              {
                id: 'item-1',
                itemType: 'SERVICE',
                itemName: 'Facial',
                quantity: 1,
                returnedQuantity: 0,
                remainingQuantity: 1,
                unitPriceMinor: 200000,
                totalPriceMinor: 200000,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderModal('tx-1');

    expect(await screen.findByText('DM-20260916-0001')).toBeInTheDocument();
    expect(screen.getByText('Facial')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders nothing when transactionId is null', () => {
    renderModal(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows an admin to refund a product', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'return-1', refundMinor: 5000 }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          id: 'tx-1',
          invoiceId: 'DM-20260916-0001',
          createdAt: '2026-09-16T10:00:00.000Z',
          cashier: 'admin',
          customer: null,
          subtotalMinor: 5000,
          discountMinor: 0,
          totalMinor: 5000,
          cashReceivedMinor: 5000,
          changeMinor: 0,
          items: [
            {
              id: 'item-1',
              itemType: 'PRODUCT',
              itemName: 'Lipstick',
              quantity: 1,
              returnedQuantity: 0,
              remainingQuantity: 1,
              unitPriceMinor: 5000,
              totalPriceMinor: 5000,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderModal('tx-1');
    await user.click(
      await screen.findByRole('button', { name: 'Refund products or services' }),
    );
    await user.clear(screen.getByRole('spinbutton', { name: 'Quantity to refund for Lipstick' }));
    await user.type(
      screen.getByRole('spinbutton', { name: 'Quantity to refund for Lipstick' }),
      '1',
    );
    await user.click(screen.getByRole('button', { name: 'Post return' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Refund posted');
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      transactionId: 'tx-1',
      lines: [{ transactionItemId: 'item-1', quantity: 1 }],
    });
  });

  it('allows an admin to refund remaining services only', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'return-2', refundMinor: 10000 }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          id: 'tx-2',
          invoiceId: 'DM-20260916-0002',
          createdAt: '2026-09-16T10:00:00.000Z',
          cashier: 'admin',
          customer: null,
          subtotalMinor: 30000,
          discountMinor: 0,
          totalMinor: 30000,
          cashReceivedMinor: 30000,
          changeMinor: 0,
          items: [
            {
              id: 'service-item-1',
              itemType: 'SERVICE',
              itemName: 'Facial',
              quantity: 3,
              returnedQuantity: 1,
              remainingQuantity: 2,
              unitPriceMinor: 10000,
              totalPriceMinor: 30000,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderModal('tx-2');
    await user.click(
      await screen.findByRole('button', { name: 'Refund products or services' }),
    );
    const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity to refund for Facial' });
    expect(quantityInput).toHaveAttribute('max', '2');
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    await user.click(screen.getByRole('button', { name: 'Post return' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Refund posted');
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      transactionId: 'tx-2',
      lines: [{ transactionItemId: 'service-item-1', quantity: 2 }],
    });
  });
});
