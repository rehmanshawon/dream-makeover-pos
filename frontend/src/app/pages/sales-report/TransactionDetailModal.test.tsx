import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
});
