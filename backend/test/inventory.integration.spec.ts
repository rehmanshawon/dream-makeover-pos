import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { StockMovement } from '../src/inventory/stock-movement.entity';
import { StockMovementReason } from '../src/inventory/stock-movement-reason.enum';
import { InventoryService } from '../src/inventory/inventory.service';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Inventory (integration)', () => {
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

  it('records stock-in and persists updated product stock', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Test Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 5,
        purchaseCostMinor: 80000,
        sellingPriceMinor: 120000,
        minimumStockThreshold: 2,
      }),
    );

    await service.stockIn({ productId: product.id, quantity: 20 }, 'admin');

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(25);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({ where: { productId: product.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(20);
    expect(movements[0].reason).toBe(StockMovementReason.STOCK_IN);
    expect(movements[0].createdBy).toBe('admin');
  });

  it('records adjustment and updates stock correctly', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Adjust Me',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    await service.adjust({ productId: product.id, delta: -3, note: 'damaged units' }, 'admin');

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(7);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({ where: { productId: product.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].delta).toBe(-3);
    expect(movements[0].note).toBe('damaged units');
  });

  it('rolls back when adjustment would create negative stock', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Fragile',
        category: ProductCategory.COSMETICS,
        stock: 2,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    await expect(
      service.adjust({ productId: product.id, delta: -10, note: 'impossible' }, 'admin'),
    ).rejects.toThrow();

    const reloaded = await productRepo.findOne({ where: { id: product.id } });
    expect(reloaded?.stock).toBe(2);

    const movementRepo = dataSource.getRepository(StockMovement);
    const movements = await movementRepo.find({ where: { productId: product.id } });
    expect(movements).toHaveLength(0);
  });

  it('returns history newest first', async () => {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'History',
        category: ProductCategory.COSMETICS,
        stock: 0,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    await service.stockIn({ productId: product.id, quantity: 10 }, 'admin');
    await new Promise((r) => setTimeout(r, 5));
    await service.adjust({ productId: product.id, delta: -2, note: 'shrink' }, 'admin');

    const history = await service.historyForProduct(product.id);
    expect(history).toHaveLength(2);
    expect(history[0].delta).toBe(-2);
    expect(history[1].delta).toBe(10);
  });
});
