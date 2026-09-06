import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { Transaction } from '../src/transactions/transaction.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { ProductCategory } from '../src/products/product-category.enum';
import { beforeAll, describe, expect, it } from '@jest/globals';

describe('Database integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dream_app',
      password: process.env.DB_PASSWORD ?? 'change_me',
      database: process.env.DB_DATABASE ?? 'dream_makeover_test',
      entities: [Customer, Product, SalonService, Transaction],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should create and read a customer', async () => {
    const customerRepository = dataSource.getRepository(Customer);

    const customer = customerRepository.create({
      fullName: 'Integration Test Customer',
      phoneNumber: '01900000000',
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
    });

    const saved = await customerRepository.save(customer);
    expect(saved.id).toBeDefined();
    expect(saved.rewardTier).toBe(CustomerRewardTier.SILVER);

    const found = await customerRepository.findOne({
      where: { id: saved.id },
    });
    expect(found?.fullName).toBe('Integration Test Customer');
  });

  it('should create and read a product', async () => {
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
    expect(saved.id).toBeDefined();
    expect(saved.sellingPriceMinor).toBe(120000);
  });

  it('should create and read a service', async () => {
    const serviceRepository = dataSource.getRepository(SalonService);

    const service = serviceRepository.create({
      name: 'Integration Test Facial',
      priceMinor: 350000,
      durationMinutes: 60,
      rewardPointWeight: 1,
      active: true,
    });

    const saved = await serviceRepository.save(service);
    expect(saved.id).toBeDefined();
    expect(saved.active).toBe(true);
  });

  it('should enforce unique phone number', async () => {
    const customerRepository = dataSource.getRepository(Customer);

    const first = customerRepository.create({
      fullName: 'Duplicate Phone Customer',
      phoneNumber: '01800000000',
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
    });

    await customerRepository.save(first);

    const second = customerRepository.create({
      fullName: 'Duplicate Phone Customer 2',
      phoneNumber: '01800000000',
      rewardTier: CustomerRewardTier.SILVER,
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
    });

    await expect(customerRepository.save(second)).rejects.toThrow();
  });
});
