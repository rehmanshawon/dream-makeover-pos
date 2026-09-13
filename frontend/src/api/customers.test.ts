import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customersApi } from './customers';
import { resetTokenProvider } from './token-provider';

describe('customersApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetTokenProvider();
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockJson(payload: unknown, status = 200): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  it('lists customers', async () => {
    mockJson([
      {
        id: '1',
        fullName: 'Alice',
        phoneNumber: '01700000000',
        rewardTier: 'Silver',
        rewardPoints: 0,
        lifetimeSpendMinor: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await customersApi.list();
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe('Alice');
  });

  it('fetches a customer by id', async () => {
    mockJson({
      id: '42',
      fullName: 'Bob',
      phoneNumber: '01800000000',
      rewardTier: 'Gold',
      rewardPoints: 250,
      lifetimeSpendMinor: 500000,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await customersApi.getById('42');
    expect(result.id).toBe('42');
    expect(result.rewardTier).toBe('Gold');
  });

  it('creates a customer', async () => {
    mockJson(
      {
        id: '3',
        fullName: 'Carol',
        phoneNumber: '01900000000',
        rewardTier: 'Silver',
        rewardPoints: 0,
        lifetimeSpendMinor: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      201,
    );

    const result = await customersApi.create({
      fullName: 'Carol',
      phoneNumber: '01900000000',
    });
    expect(result.id).toBe('3');
  });
});
