import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem } from '../src/transactions/transaction-item.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { ProductCategory } from '../src/products/product-category.enum';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

describe('Database Integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dream_app',
      password: process.env.DB_PASSWORD ?? 'change_me',
      database: process.env.DB_DATABASE ?? 'dream_makeover_test',
      entities: [Customer, Product, SalonService, Transaction, TransactionItem],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should persist customer and apply database-level default values', async () => {
    const customerRepository = dataSource.getRepository(Customer);

    // Omit default fields to verify database DEFAULT constraints
    const customer = customerRepository.create({
      fullName: 'Integration Test Customer',
      phoneNumber: '01900000000',
    });

    const saved = await customerRepository.save(customer);
    expect(saved.id).toBeDefined();

    // Fetch directly from DB to verify database hydration
    const found = await customerRepository.findOne({ where: { id: saved.id } });
    expect(found).not.toBeNull();
    expect(found?.fullName).toBe('Integration Test Customer');
    expect(found?.rewardTier).toBe(CustomerRewardTier.SILVER);
    expect(Number(found?.rewardPoints)).toBe(0);
  });

  it('should persist product and handle bigint type conversion from database', async () => {
    const productRepository = dataSource.getRepository(Product);

    const product = productRepository.create({
      name: 'Integration Test Lipstick',
      category: ProductCategory.COSMETICS,
      stock: 10,
      purchaseCostMinor: 80000,
      sellingPriceMinor: 120000,
      minimumStockThreshold: 3,
    });

    const saved = await productRepository.save(product);

    // Query DB directly to verify column types
    const found = await productRepository.findOne({ where: { id: saved.id } });
    expect(found).not.toBeNull();
    // MySQL bigint columns are hydrated as strings by default driver settings
    expect(Number(found?.sellingPriceMinor)).toBe(120000);
    expect(Number(found?.purchaseCostMinor)).toBe(80000);
  });

  it('should enforce unique phone number constraint at database level', async () => {
    const customerRepository = dataSource.getRepository(Customer);

    const first = customerRepository.create({
      fullName: 'Customer One',
      phoneNumber: '01800000000',
    });
    await customerRepository.save(first);

    const second = customerRepository.create({
      fullName: 'Customer Two',
      phoneNumber: '01800000000',
    });

    // Expect DB unique constraint failure
    await expect(customerRepository.save(second)).rejects.toThrow();
  });

  it('should maintain transaction relations and handle SET NULL on customer deletion', async () => {
    const customerRepository = dataSource.getRepository(Customer);
    const transactionRepository = dataSource.getRepository(Transaction);

    const customer = await customerRepository.save(
      customerRepository.create({
        fullName: 'Relational Customer',
        phoneNumber: '01711111111',
      }),
    );

    const transaction = await transactionRepository.save(
      transactionRepository.create({
        invoiceId: 'INV-TEST-001',
        customer: customer,
        subtotalMinor: 100000,
        discountMinor: 0,
        totalMinor: 100000,
        cashReceivedMinor: 100000,
        changeMinor: 0,
        cashier: 'System Test',
      }),
    );

    // Delete customer to test foreign key ON DELETE SET NULL constraint
    await customerRepository.remove(customer);

    const foundTransaction = await transactionRepository.findOne({
      where: { id: transaction.id },
    });

    expect(foundTransaction).not.toBeNull();
    expect(foundTransaction?.customerId).toBeNull();
  });
});
