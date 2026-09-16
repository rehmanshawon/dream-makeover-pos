import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppModule } from '../src/app.module';
import { Package } from '../src/packages/package.entity';
import { PackageItem } from '../src/packages/package-item.entity';
import { PackageItemKind } from '../src/packages/package-item-kind.enum';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Package persistence (integration)', () => {
  let dataSource: DataSource;
  let app: INestApplication;
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
        username: 'package_admin',
        passwordHash: await bcrypt.hash('admin12345', 10),
        displayName: 'Package Admin',
        role: UserRole.ADMIN,
        active: true,
      }),
    );
    const staff = await userRepo.save(
      userRepo.create({
        username: 'package_staff',
        passwordHash: await bcrypt.hash('staff12345', 10),
        displayName: 'Package Staff',
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

  // Create a service fixture with the exact price used by package calculations.
  async function createService(name: string, priceMinor: number): Promise<SalonService> {
    const repository = dataSource.getRepository(SalonService);
    return repository.save(
      repository.create({
        name,
        priceMinor,
        durationMinutes: 60,
        rewardPointWeight: 1,
        active: true,
      }),
    );
  }

  // Create a package through the API so these tests cover validation and persistence together.
  async function createPackage(serviceIds: string[], packagePriceMinor: number) {
    return request(app.getHttpServer())
      .post('/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Package ${Date.now()}-${Math.random()}`,
        packagePriceMinor,
        items: serviceIds.map((itemId) => ({
          itemKind: PackageItemKind.SERVICE,
          itemId,
        })),
      })
      .expect(201);
  }

  it('persists a package with mixed items and correct totals', async () => {
    const serviceRepo = dataSource.getRepository(SalonService);
    const productRepo = dataSource.getRepository(Product);
    const packageRepo = dataSource.getRepository(Package);
    const itemRepo = dataSource.getRepository(PackageItem);

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Bridal Makeup',
        priceMinor: 350000,
        durationMinutes: 60,
        rewardPointWeight: 1,
        active: true,
      }),
    );

    const product = await productRepo.save(
      productRepo.create({
        name: 'Premium Cosmetics Kit',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 80000,
        sellingPriceMinor: 120000,
        minimumStockThreshold: 1,
      }),
    );

    const pkg = await packageRepo.save(
      packageRepo.create({
        name: 'Bridal Package',
        description: 'Complete bridal preparation',
        normalPriceMinor: 470000,
        packagePriceMinor: 400000,
        savingsMinor: 70000,
        active: true,
      }),
    );

    await itemRepo.save([
      itemRepo.create({
        package: pkg,
        itemKind: 'SERVICE' as PackageItem['itemKind'],
        service,
        snapshotPriceMinor: 350000,
      }),
      itemRepo.create({
        package: pkg,
        itemKind: 'PRODUCT' as PackageItem['itemKind'],
        product,
        snapshotPriceMinor: 120000,
      }),
    ]);

    const reloaded = await packageRepo.findOne({ where: { id: pkg.id } });
    expect(reloaded?.normalPriceMinor).toBe(470000);
    expect(reloaded?.savingsMinor).toBe(70000);

    const items = await itemRepo.find({ where: { package: { id: pkg.id } } });
    expect(items).toHaveLength(2);
  });

  it('enforces the CHECK constraint preventing both service and product', async () => {
    const serviceRepo = dataSource.getRepository(SalonService);
    const productRepo = dataSource.getRepository(Product);
    const packageRepo = dataSource.getRepository(Package);
    const itemRepo = dataSource.getRepository(PackageItem);

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Test Service',
        priceMinor: 100000,
        durationMinutes: 30,
        rewardPointWeight: 1,
        active: true,
      }),
    );
    const product = await productRepo.save(
      productRepo.create({
        name: 'Test Product',
        category: ProductCategory.COSMETICS,
        stock: 10,
        purchaseCostMinor: 10000,
        sellingPriceMinor: 20000,
        minimumStockThreshold: 1,
      }),
    );

    const pkg = await packageRepo.save(
      packageRepo.create({
        name: 'Invalid Combo',
        normalPriceMinor: 100000,
        packagePriceMinor: 90000,
        savingsMinor: 10000,
        active: true,
      }),
    );

    await expect(
      itemRepo.save(
        itemRepo.create({
          package: pkg,
          itemKind: 'SERVICE' as PackageItem['itemKind'],
          service,
          product,
          snapshotPriceMinor: 100000,
        }),
      ),
    ).rejects.toThrow();
  });

  it('accepts a package item with only a service reference', async () => {
    const serviceRepo = dataSource.getRepository(SalonService);
    const packageRepo = dataSource.getRepository(Package);
    const itemRepo = dataSource.getRepository(PackageItem);

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Service Only',
        priceMinor: 100000,
        durationMinutes: 30,
        rewardPointWeight: 1,
        active: true,
      }),
    );
    const pkg = await packageRepo.save(
      packageRepo.create({
        name: 'Service Package',
        normalPriceMinor: 100000,
        packagePriceMinor: 90000,
        savingsMinor: 10000,
        active: true,
      }),
    );

    const item = await itemRepo.save(
      itemRepo.create({
        package: pkg,
        itemKind: 'SERVICE' as PackageItem['itemKind'],
        service,
        snapshotPriceMinor: 100000,
      }),
    );

    const reloaded = await itemRepo.findOne({ where: { id: item.id } });
    expect(reloaded?.serviceId).toBe(service.id);
  });

  it('cascades delete of package items when package is deleted', async () => {
    const serviceRepo = dataSource.getRepository(SalonService);
    const packageRepo = dataSource.getRepository(Package);
    const itemRepo = dataSource.getRepository(PackageItem);

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Test Service',
        priceMinor: 100000,
        durationMinutes: 30,
        rewardPointWeight: 1,
        active: true,
      }),
    );

    const pkg = await packageRepo.save(
      packageRepo.create({
        name: 'Delete Test',
        normalPriceMinor: 100000,
        packagePriceMinor: 90000,
        savingsMinor: 10000,
        active: true,
      }),
    );

    await itemRepo.save(
      itemRepo.create({
        package: pkg,
        itemKind: 'SERVICE' as PackageItem['itemKind'],
        service,
        snapshotPriceMinor: 100000,
      }),
    );

    await packageRepo.delete(pkg.id);

    const remaining = await itemRepo.find({ where: { package: { id: pkg.id } } });
    expect(remaining).toHaveLength(0);
  });

  it('RESTRICTs deletion of a service used in a package', async () => {
    const serviceRepo = dataSource.getRepository(SalonService);
    const packageRepo = dataSource.getRepository(Package);
    const itemRepo = dataSource.getRepository(PackageItem);

    const service = await serviceRepo.save(
      serviceRepo.create({
        name: 'Protected Service',
        priceMinor: 100000,
        durationMinutes: 30,
        rewardPointWeight: 1,
        active: true,
      }),
    );

    const pkg = await packageRepo.save(
      packageRepo.create({
        name: 'Reference Test',
        normalPriceMinor: 100000,
        packagePriceMinor: 90000,
        savingsMinor: 10000,
        active: true,
      }),
    );

    await itemRepo.save(
      itemRepo.create({
        package: pkg,
        itemKind: 'SERVICE' as PackageItem['itemKind'],
        service,
        snapshotPriceMinor: 100000,
      }),
    );

    await expect(serviceRepo.delete(service.id)).rejects.toThrow();
  });

  it('rejects PATCH from staff', async () => {
    // Seed the package that the staff member will attempt to modify.
    const service = await createService('Staff Protected Service', 100000);
    const created = await createPackage([service.id], 90000);

    // Staff may use packages for sales, but only admins may change definitions.
    await request(app.getHttpServer())
      .patch(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Staff Edited Package' })
      .expect(403);
  });

  it('allows admin to update package name', async () => {
    // Create a valid package before exercising the update endpoint.
    const service = await createService('Rename Service', 100000);
    const created = await createPackage([service.id], 90000);

    // Send only the field being changed to verify PATCH semantics.
    const response = await request(app.getHttpServer())
      .patch(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Package' })
      .expect(200);

    // The server should preserve the composition and update only the name.
    expect(response.body.name).toBe('Renamed Package');
    expect(response.body.normalPriceMinor).toBe(100000);
    expect(response.body.packagePriceMinor).toBe(90000);
    expect(response.body.items).toHaveLength(1);
  });

  it('replaces items and recomputes totals', async () => {
    // Start with one component priced at 100000 minor units.
    const firstService = await createService('First Component', 100000);
    const secondService = await createService('Second Component', 150000);
    const created = await createPackage([firstService.id], 90000);

    // Provide a new item list; the service replaces the old composition completely.
    const response = await request(app.getHttpServer())
      .patch(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { itemKind: PackageItemKind.SERVICE, itemId: firstService.id },
          { itemKind: PackageItemKind.SERVICE, itemId: secondService.id },
        ],
        packagePriceMinor: 200000,
      })
      .expect(200);

    // Normal price is recomputed from current component prices: 100000 + 150000.
    expect(response.body.normalPriceMinor).toBe(250000);
    expect(response.body.packagePriceMinor).toBe(200000);
    expect(response.body.savingsMinor).toBe(50000);
    expect(response.body.items).toHaveLength(2);
  });

  it('rejects invalid package price on edit', async () => {
    // Create a package whose component normal price is 100000.
    const service = await createService('Price Validation Service', 100000);
    const created = await createPackage([service.id], 90000);

    // A package price above the computed normal price must be rejected.
    await request(app.getHttpServer())
      .patch(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ packagePriceMinor: 100001 })
      .expect(400);

    // Failed validation must leave the original price unchanged in the database.
    const reloaded = await request(app.getHttpServer())
      .get(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(reloaded.body.packagePriceMinor).toBe(90000);
  });

  it('toggles active via PATCH', async () => {
    // Create an active package, then request a soft deactivation.
    const service = await createService('Active Toggle Service', 100000);
    const created = await createPackage([service.id], 90000);

    const response = await request(app.getHttpServer())
      .patch(`/packages/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);

    // Deactivation changes availability without deleting the package or its items.
    expect(response.body.active).toBe(false);
    expect(response.body.items).toHaveLength(1);
  });
});
