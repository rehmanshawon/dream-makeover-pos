import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Package } from '../src/packages/package.entity';
import { PackageItem } from '../src/packages/package-item.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Package persistence (integration)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

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
        packageId: pkg.id,
        itemKind: 'SERVICE',
        serviceId: service.id,
        productId: null,
        snapshotPriceMinor: 350000,
      }),
      itemRepo.create({
        packageId: pkg.id,
        itemKind: 'PRODUCT',
        productId: product.id,
        serviceId: null,
        snapshotPriceMinor: 120000,
      }),
    ]);

    const reloaded = await packageRepo.findOne({ where: { id: pkg.id } });
    expect(reloaded?.normalPriceMinor).toBe(470000);
    expect(reloaded?.savingsMinor).toBe(70000);

    const items = await itemRepo.find({ where: { packageId: pkg.id } });
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
          packageId: pkg.id,
          itemKind: 'SERVICE',
          serviceId: service.id,
          productId: product.id,
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
        packageId: pkg.id,
        itemKind: 'SERVICE',
        serviceId: service.id,
        productId: null,
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
        packageId: pkg.id,
        itemKind: 'SERVICE',
        serviceId: service.id,
        productId: null,
        snapshotPriceMinor: 100000,
      }),
    );

    await packageRepo.delete(pkg.id);

    const remaining = await itemRepo.find({ where: { packageId: pkg.id } });
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
        packageId: pkg.id,
        itemKind: 'SERVICE',
        serviceId: service.id,
        productId: null,
        snapshotPriceMinor: 100000,
      }),
    );

    await expect(serviceRepo.delete(service.id)).rejects.toThrow();
  });
});
