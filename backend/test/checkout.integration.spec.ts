import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import * as bcrypt from 'bcryptjs';
import { describe, beforeAll, afterAll, it, expect, beforeEach } from '@jest/globals';
import { Customer } from '../src/customers/customer.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { SalonService } from '../src/services/service.entity';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem, TransactionItemType } from '../src/transactions/transaction-item.entity';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Checkout (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;

  let product: Product;
  let service: SalonService;
  let customer: Customer;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    // await dataSource.initialize(); // Already initialized in createTestDataSource()

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = app.get(JwtService);

    const userRepository = dataSource.getRepository(User);
    const admin = userRepository.create({
      username: 'checkout_admin',
      passwordHash: await bcrypt.hash('admin12345', 10),
      displayName: 'Checkout Admin',
      role: UserRole.ADMIN,
      active: true,
    });
    const savedAdmin = await userRepository.save(admin);

    adminToken = await jwtService.signAsync({
      sub: savedAdmin.id,
      username: savedAdmin.username,
      role: savedAdmin.role,
    });
  });

  beforeEach(async () => {
    // Clean tables between tests to keep isolation
    await truncateAllTables(dataSource);

    const productRepo = dataSource.getRepository(Product);
    product = await productRepo.save(
      productRepo.create({
        name: 'Luxury Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 80000,
        sellingPriceMinor: 120000,
        minimumStockThreshold: 2,
      }),
    );

    const serviceRepo = dataSource.getRepository(SalonService);
    service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Bridal Facial',
        priceMinor: 350000,
        durationMinutes: 60,
        rewardPointWeight: 1,
        active: true,
      }),
    );

    const customerRepo = dataSource.getRepository(Customer);
    customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Checkout Customer',
        phoneNumber: '01500000000',
        rewardTier: CustomerRewardTier.SILVER,
        rewardPoints: 0,
        lifetimeSpendMinor: 0,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('should complete a mixed checkout and update all tables', async () => {
    const payload = {
      items: [
        { itemType: TransactionItemType.PRODUCT, itemId: product.id, quantity: 2 },
        { itemType: TransactionItemType.SERVICE, itemId: service.id, quantity: 1 },
      ],
      customerId: customer.id,
      discountMinor: 20000,
      cashReceivedMinor: 600000,
    };

    const response = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    // Subtotal = 2 * 120000 + 350000 = 590000
    // Total = 590000 - 20000 = 570000
    // Change = 600000 - 570000 = 30000
    expect(response.body.subtotalMinor).toBe(590000);
    expect(response.body.discountMinor).toBe(20000);
    expect(response.body.totalMinor).toBe(570000);
    expect(response.body.changeMinor).toBe(30000);
    expect(response.body.items).toHaveLength(2);
    // Points = floor(570000 / 10000) = 57
    expect(response.body.loyaltyPointsEarned).toBe(57);

    // Verify product stock reduced from 10 to 8
    const updatedProduct = await dataSource
      .getRepository(Product)
      .findOne({ where: { id: product.id } });
    expect(updatedProduct?.stock).toBe(8);

    // Verify customer updates
    const updatedCustomer = await dataSource
      .getRepository(Customer)
      .findOne({ where: { id: customer.id } });
    expect(updatedCustomer?.lifetimeSpendMinor).toBe(570000);
    expect(updatedCustomer?.rewardPoints).toBe(57);
    expect(updatedCustomer?.rewardTier).toBe(CustomerRewardTier.SILVER);

    // Verify transaction and items persisted
    const transactionRepo = dataSource.getRepository(Transaction);
    const savedTransaction = await transactionRepo.findOne({
      where: { id: response.body.transactionId },
    });
    expect(savedTransaction).toBeDefined();

    const itemRepo = dataSource.getRepository(TransactionItem);
    const items = await itemRepo.find({
      where: { transactionId: response.body.transactionId },
    });
    expect(items).toHaveLength(2);
  });

  it('should roll back when stock is insufficient', async () => {
    const payload = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: product.id, quantity: 999 }],
      customerId: customer.id,
      discountMinor: 0,
      cashReceivedMinor: 10000000,
    };

    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(400);

    // Verify nothing changed
    const unchangedProduct = await dataSource
      .getRepository(Product)
      .findOne({ where: { id: product.id } });
    expect(unchangedProduct?.stock).toBe(10);

    const unchangedCustomer = await dataSource
      .getRepository(Customer)
      .findOne({ where: { id: customer.id } });
    expect(unchangedCustomer?.lifetimeSpendMinor).toBe(0);
    expect(unchangedCustomer?.rewardPoints).toBe(0);

    const transactionCount = await dataSource.getRepository(Transaction).count();
    expect(transactionCount).toBe(0);

    const itemCount = await dataSource.getRepository(TransactionItem).count();
    expect(itemCount).toBe(0);
  });

  it('should roll back when discount exceeds subtotal', async () => {
    const payload = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: product.id, quantity: 1 }],
      customerId: customer.id,
      discountMinor: 99999999,
      cashReceivedMinor: 99999999,
    };

    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(400);

    const transactionCount = await dataSource.getRepository(Transaction).count();
    expect(transactionCount).toBe(0);
  });

  it('should roll back when cash received is insufficient', async () => {
    const payload = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: product.id, quantity: 1 }],
      customerId: customer.id,
      discountMinor: 0,
      cashReceivedMinor: 1,
    };

    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(400);

    const transactionCount = await dataSource.getRepository(Transaction).count();
    expect(transactionCount).toBe(0);
  });

  it('should upgrade customer to Gold tier when points cross 200', async () => {
    // Reset customer points to 150
    const customerRepo = dataSource.getRepository(Customer);
    await customerRepo.update(customer.id, { rewardPoints: 150 });
    const refreshed = await customerRepo.findOne({ where: { id: customer.id } });
    if (!refreshed) throw new Error('Customer not found');

    // Checkout amount large enough to push points past 200
    // Need >= 50 more points = 50 * 10000 = 500000 poisha
    const payload = {
      items: [{ itemType: TransactionItemType.SERVICE, itemId: service.id, quantity: 2 }],
      customerId: customer.id,
      discountMinor: 0,
      cashReceivedMinor: 1000000,
    };

    const response = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    // Points earned = floor(700000 / 10000) = 70
    expect(response.body.loyaltyPointsEarned).toBe(70);

    const updated = await customerRepo.findOne({ where: { id: customer.id } });
    expect(updated?.rewardPoints).toBe(220);
    expect(updated?.rewardTier).toBe(CustomerRewardTier.GOLD);
  });
});
