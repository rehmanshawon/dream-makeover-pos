import { DataSource } from 'typeorm';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem } from '../src/transactions/transaction-item.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { ProductCategory } from '../src/products/product-category.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Database Integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should persist customer and apply database-level default values', async () => {
    const repo = dataSource.getRepository(Customer);
    const customer = repo.create({
      fullName: 'Integration Customer',
      phoneNumber: '01900000000',
    });
    const saved = await repo.save(customer);

    expect(saved.id).toBeDefined();

    const reloaded = await repo.findOne({ where: { id: saved.id } });
    expect(reloaded?.rewardTier).toBe(CustomerRewardTier.SILVER);
    expect(reloaded?.rewardPoints).toBe(0);
    expect(reloaded?.lifetimeSpendMinor).toBe(0);
    // Explicitly assert the transformer ran: DB returns string, entity returns number
    expect(typeof reloaded?.lifetimeSpendMinor).toBe('number');
  });

  it('should persist product and handle bigint type conversion from database', async () => {
    const repo = dataSource.getRepository(Product);
    const saved = await repo.save(
      repo.create({
        name: 'Integration Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 80000,
        sellingPriceMinor: 120000,
        minimumStockThreshold: 3,
      }),
    );

    const reloaded = await repo.findOne({ where: { id: saved.id } });
    expect(reloaded?.sellingPriceMinor).toBe(120000);
    expect(typeof reloaded?.sellingPriceMinor).toBe('number');
  });

  it('should enforce unique phone number constraint at database level', async () => {
    const repo = dataSource.getRepository(Customer);

    await repo.save(repo.create({ fullName: 'First', phoneNumber: '01700000000' }));

    await expect(
      repo.save(repo.create({ fullName: 'Second', phoneNumber: '01700000000' })),
    ).rejects.toThrow();
  });

  it('should maintain transaction relations and handle SET NULL on customer deletion', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const txRepo = dataSource.getRepository(Transaction);
    const itemRepo = dataSource.getRepository(TransactionItem);
    const productRepo = dataSource.getRepository(Product);

    const customer = await customerRepo.save(
      customerRepo.create({ fullName: 'Will Be Deleted', phoneNumber: '01600000001' }),
    );

    const product = await productRepo.save(
      productRepo.create({
        name: 'Linked Product',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 80000,
        minimumStockThreshold: 1,
      }),
    );

    const tx = await txRepo.save(
      txRepo.create({
        invoiceId: 'INV-DB-TEST-1',
        customerId: customer.id,
        subtotalMinor: 80000,
        discountMinor: 0,
        totalMinor: 80000,
        cashReceivedMinor: 100000,
        changeMinor: 20000,
        cashier: 'test',
      }),
    );

    await itemRepo.save(
      itemRepo.create({
        transactionId: tx.id,
        productId: product.id,
        serviceId: null,
        itemType: 'PRODUCT',
        itemName: 'Linked Product',
        quantity: 1,
        unitPriceMinor: 80000,
        totalPriceMinor: 80000,
      }),
    );

    await customerRepo.delete(customer.id);

    const reloaded = await txRepo.findOne({ where: { id: tx.id } });
    expect(reloaded).toBeDefined();
    expect(reloaded?.customerId).toBeNull();
  });
});
