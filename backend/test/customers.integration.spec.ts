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
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { TransactionItemType } from '../src/transactions/transaction-item.entity';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Customers (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;

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
        username: 'cust_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Cust Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'cust_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Cust Staff',
        role: UserRole.STAFF,
        active: true,
      }),
    );

    adminToken = await jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    });
    staffToken = await jwtService.signAsync({
      sub: staff.id,
      username: staff.username,
      role: staff.role,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  it('rejects PATCH from staff', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Original Name',
        phoneNumber: '01700000000',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/customers/${customer.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ fullName: 'Changed' })
      .expect(403);
  });

  it('allows PATCH from admin', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Original Name',
        phoneNumber: '01700000000',
      }),
    );

    const response = await request(app.getHttpServer())
      .patch(`/customers/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Updated Name' })
      .expect(200);

    expect(response.body.fullName).toBe('Updated Name');
    expect(response.body.phoneNumber).toBe('01700000000');
  });

  it('rejects PATCH that duplicates another customer phone', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    await customerRepo.save(
      customerRepo.create({
        fullName: 'First',
        phoneNumber: '01700000000',
      }),
    );
    const second = await customerRepo.save(
      customerRepo.create({
        fullName: 'Second',
        phoneNumber: '01800000000',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/customers/${second.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phoneNumber: '01700000000' })
      .expect(409);
  });

  it('rejects attempts to edit loyalty fields', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Original',
        phoneNumber: '01700000000',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/customers/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rewardPoints: 99999 })
      .expect(400);
  });

  it('returns purchase history for a customer', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'History Customer',
        phoneNumber: '01700000000',
      }),
    );

    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'History Product',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 100000,
        minimumStockThreshold: 2,
      }),
    );

    // Perform a sale
    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            itemType: TransactionItemType.PRODUCT,
            itemId: product.id,
            quantity: 2,
          },
        ],
        customerId: customer.id,
        discountMinor: 0,
        cashReceivedMinor: 300000,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/customers/${customer.id}/transactions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].invoiceId).toMatch(/^DM-/);
    expect(response.body[0].totalMinor).toBe(200000);
    expect(response.body[0].items).toHaveLength(1);
    expect(response.body[0].items[0].itemName).toBe('History Product');
    expect(response.body[0].items[0].quantity).toBe(2);
  });

  it('returns empty array for a customer with no transactions', async () => {
    const customerRepo = dataSource.getRepository(Customer);
    const customer = await customerRepo.save(
      customerRepo.create({
        fullName: 'Fresh Customer',
        phoneNumber: '01700000000',
      }),
    );

    const response = await request(app.getHttpServer())
      .get(`/customers/${customer.id}/transactions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('returns 404 for a non-existent customer', async () => {
    await request(app.getHttpServer())
      .get('/customers/00000000-0000-0000-0000-000000000000/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
