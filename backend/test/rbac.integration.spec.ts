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
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { Customer } from '../src/customers/customer.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem } from '../src/transactions/transaction-item.entity';

describe('RBAC (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Create test database connection with synchronize
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'dream_app',
      password: process.env.DB_PASSWORD ?? 'change_me',
      database: process.env.DB_DATABASE ?? 'dream_makeover_test',
      entities: [Customer, Product, SalonService, Transaction, TransactionItem, User],
      synchronize: true,
      dropSchema: true,
      logging: false,
    });

    await dataSource.initialize();

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
      username: 'rbac_admin',
      passwordHash: await bcrypt.hash('admin12345', 10),
      displayName: 'RBAC Admin',
      role: UserRole.ADMIN,
      active: true,
    });

    const staff = userRepository.create({
      username: 'rbac_staff',
      passwordHash: await bcrypt.hash('staff12345', 10),
      displayName: 'RBAC Staff',
      role: UserRole.STAFF,
      active: true,
    });

    const savedAdmin = await userRepository.save(admin);
    const savedStaff = await userRepository.save(staff);

    adminToken = await jwtService.signAsync({
      sub: savedAdmin.id,
      username: savedAdmin.username,
      role: savedAdmin.role,
    });

    staffToken = await jwtService.signAsync({
      sub: savedStaff.id,
      username: savedStaff.username,
      role: savedStaff.role,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should reject request without token', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Unauthorized Product',
        category: 'Cosmetics',
        stock: 5,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 15000,
        minimumStockThreshold: 1,
      })
      .expect(401);
  });

  it('should allow ADMIN to create product', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Created Product',
        category: 'Cosmetics',
        stock: 5,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 15000,
        minimumStockThreshold: 1,
      })
      .expect(201);
  });

  it('should reject STAFF from creating product', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Staff Created Product',
        category: 'Cosmetics',
        stock: 5,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 15000,
        minimumStockThreshold: 1,
      })
      .expect(403);
  });

  it('should allow STAFF to view products', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('should allow STAFF to create customer', async () => {
    await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        fullName: 'RBAC Staff Customer',
        phoneNumber: '01600000000',
      })
      .expect(201);
  });

  it('should reject STAFF from viewing users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('should allow ADMIN to view users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
