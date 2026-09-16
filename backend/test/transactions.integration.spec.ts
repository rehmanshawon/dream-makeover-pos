import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { Product } from '../src/products/product.entity';
import { Customer } from '../src/customers/customer.entity';
import { TransactionItemType } from '../src/transactions/transaction-item.entity';
import {
  createTestDataSource,
  TEST_PRODUCT_CATEGORY_ID,
  truncateAllTables,
} from './helpers/test-data-source';

describe('Transactions listing (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let productId: string;
  let customerId: string;

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  beforeAll(async () => {
    dataSource = await createTestDataSource();

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
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);

    const userRepo = dataSource.getRepository(User);
    const admin = await userRepo.save(
      userRepo.create({
        username: 'txn_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Txn Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    adminToken = await jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });

    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Txn Product',
        categoryId: TEST_PRODUCT_CATEGORY_ID,
        stock: 100,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 100000,
        minimumStockThreshold: 2,
      }),
    );
    productId = product.id;

    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Txn Customer',
        phoneNumber: '01700000000',
      }),
    );
    customerId = customer.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  async function performSale(quantity: number): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ itemType: TransactionItemType.PRODUCT, itemId: productId, quantity }],
        customerId,
        discountMinor: 0,
        cashReceivedMinor: 1000000,
      })
      .expect(201);

    return response.body.transactionId;
  }

  it('lists all transactions', async () => {
    await performSale(1);
    await performSale(2);

    const response = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.summary.transactionCount).toBe(2);
    expect(response.body.summary.totalMinor).toBe(300000);
    expect(response.body.summary.averageSaleMinor).toBe(150000);
  });

  it('filters by date range', async () => {
    await performSale(1);

    const inRange = await request(app.getHttpServer())
      .get(`/transactions?from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(inRange.body.transactions).toHaveLength(1);

    const outOfRange = await request(app.getHttpServer())
      .get('/transactions?from=2000-01-01&to=2000-01-31')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(outOfRange.body.transactions).toHaveLength(0);
  });

  it('filters by cashier', async () => {
    await performSale(1);

    const match = await request(app.getHttpServer())
      .get('/transactions?cashier=txn_admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(match.body.transactions).toHaveLength(1);

    const noMatch = await request(app.getHttpServer())
      .get('/transactions?cashier=someone_else')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(noMatch.body.transactions).toHaveLength(0);
  });

  it('respects limit and offset', async () => {
    await performSale(1);
    await performSale(2);
    await performSale(3);

    const page1 = await request(app.getHttpServer())
      .get('/transactions?limit=2&offset=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page1.body.transactions).toHaveLength(2);
    expect(page1.body.pagination.total).toBe(3);
    expect(page1.body.summary.transactionCount).toBe(3);

    const page2 = await request(app.getHttpServer())
      .get('/transactions?limit=2&offset=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(page2.body.transactions).toHaveLength(1);
  });

  it('returns transaction detail with items', async () => {
    const txId = await performSale(2);

    const response = await request(app.getHttpServer())
      .get(`/transactions/${txId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(txId);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].itemName).toBe('Txn Product');
    expect(response.body.items[0].quantity).toBe(2);
    expect(response.body.customer?.fullName).toBe('Txn Customer');
  });

  it('returns 404 for a missing transaction', async () => {
    await request(app.getHttpServer())
      .get('/transactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
