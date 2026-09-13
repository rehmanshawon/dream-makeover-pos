import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { productsApi } from './products';
import { resetTokenProvider } from './token-provider';

describe('productsApi', () => {
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

  it('lists products', async () => {
    mockJson([
      {
        id: 'p1',
        name: 'Lipstick',
        category: 'Cosmetics',
        stock: 10,
        purchaseCostMinor: 80000,
        sellingPriceMinor: 120000,
        minimumStockThreshold: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await productsApi.list();
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Lipstick');
  });

  it('creates a product', async () => {
    mockJson(
      {
        id: 'p2',
        name: 'Saree',
        category: 'Saree',
        stock: 5,
        purchaseCostMinor: 500000,
        sellingPriceMinor: 900000,
        minimumStockThreshold: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      201,
    );

    const result = await productsApi.create({
      name: 'Saree',
      category: 'Saree',
      stock: 5,
      purchaseCostMinor: 500000,
      sellingPriceMinor: 900000,
      minimumStockThreshold: 1,
    });
    expect(result.id).toBe('p2');
  });
});
