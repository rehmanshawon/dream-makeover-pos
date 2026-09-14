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
import { ProductCategory } from '../src/products/product-category.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Products (integration)', () => {
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
        username: 'prod_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Prod Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'prod_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Prod Staff',
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

  async function createProduct(): Promise<string> {
    const productRepo = dataSource.getRepository(Product);
    const product = await productRepo.save(
      productRepo.create({
        name: 'Integration Lipstick',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 50000,
        sellingPriceMinor: 100000,
        minimumStockThreshold: 2,
      }),
    );
    return product.id;
  }

  it('returns purchase cost to ADMIN', async () => {
    const productId = await createProduct();

    const response = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.purchaseCostMinor).toBe(50000);
  });

  it('omits purchase cost for STAFF', async () => {
    const productId = await createProduct();

    const response = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(response.body.purchaseCostMinor).toBeUndefined();
    expect(response.body.sellingPriceMinor).toBe(100000);
  });

  it('omits purchase cost for STAFF in list responses', async () => {
    await createProduct();

    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].purchaseCostMinor).toBeUndefined();
  });

  it('rejects product update from STAFF', async () => {
    const productId = await createProduct();

    await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Renamed' })
      .expect(403);
  });

  it('updates product name for ADMIN without changing stock', async () => {
    const productId = await createProduct();

    const response = await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Lipstick' })
      .expect(200);

    expect(response.body.name).toBe('Renamed Lipstick');
    expect(response.body.stock).toBe(10);

    const repo = dataSource.getRepository(Product);
    const persisted = await repo.findOne({ where: { id: productId } });
    expect(persisted?.name).toBe('Renamed Lipstick');
    expect(persisted?.stock).toBe(10);
  });

  it('rejects attempts to PATCH the stock field', async () => {
    const productId = await createProduct();

    // The DTO uses forbidNonWhitelisted, so `stock` in the body is rejected.
    await request(app.getHttpServer())
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 999 })
      .expect(400);
  });
});
