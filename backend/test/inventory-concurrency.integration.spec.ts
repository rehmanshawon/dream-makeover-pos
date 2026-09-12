import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { StockMovement } from '../src/inventory/stock-movement.entity';
import { InventoryService } from '../src/inventory/inventory.service';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Inventory concurrency (integration)', () => {
  let dataSource: DataSource;
  let service: InventoryService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    service = new InventoryService(dataSource);
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('serializes concurrent adjustments and preserves correct stock', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Concurrent Test Product',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    // Two concurrent adjustments of -3 each.
    // Correct final stock: 10 - 3 - 3 = 4.
    // Without locking, both could read 10, both write 7, final = 7 (WRONG).
    const [first, second] = await Promise.all([
      service.adjust({ productId: product.id, delta: -3, note: 'concurrent-1' }, 'admin'),
      service.adjust({ productId: product.id, delta: -3, note: 'concurrent-2' }, 'admin'),
    ]);

    expect(first.delta).toBe(-3);
    expect(second.delta).toBe(-3);

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(4);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({
      where: { productId: product.id },
    });
    expect(movements).toHaveLength(2);
  });

  it('rejects one of two concurrent adjustments when stock would go negative', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Fragile Concurrent Product',
        category: ProductCategory.COSMETICS,
        stock: 5,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    // Two concurrent adjustments of -4 each.
    // Stock is 5. Only one can succeed. The other must fail.
    // Without locking, both could read 5, both compute 1, both succeed → WRONG.
    const results = await Promise.allSettled([
      service.adjust({ productId: product.id, delta: -4, note: 'concurrent-a' }, 'admin'),
      service.adjust({ productId: product.id, delta: -4, note: 'concurrent-b' }, 'admin'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(1);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({
      where: { productId: product.id },
    });
    // Only the successful adjustment should have produced a movement.
    expect(movements).toHaveLength(1);
  });

  it('keeps product stock and movement ledger in sync under concurrency', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Ledger Sync Product',
        category: ProductCategory.COSMETICS,
        stock: 100,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    // Five concurrent adjustments of -5.
    const operations = Array.from({ length: 5 }, (_, i) =>
      service.adjust({ productId: product.id, delta: -5, note: `op-${i}` }, 'admin'),
    );

    await Promise.all(operations);

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(75);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({
      where: { productId: product.id },
    });
    expect(movements).toHaveLength(5);

    const totalDelta = movements.reduce((sum, m) => sum + m.delta, 0);
    expect(totalDelta).toBe(-25);
  });
});
