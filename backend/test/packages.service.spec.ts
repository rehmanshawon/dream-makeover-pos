import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PackagesService } from '../src/packages/packages.service';
import { Package } from '../src/packages/package.entity';
import { PackageItem } from '../src/packages/package-item.entity';
import { PackageItemKind } from '../src/packages/package-item-kind.enum';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { CreatePackageDto } from '../src/packages/dto/create-package.dto';
import { ProductCategory } from '../src/products/product-category.enum';

describe('PackagesService (unit)', () => {
  let service: PackagesService;
  let packageRepo: any;
  let itemRepo: any;
  let productRepo: any;
  let serviceRepo: any;

  beforeEach(async () => {
    packageRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: 'pkg-1' })),
      save: jest.fn(async (data) => ({ ...data, id: 'pkg-1' })),
      find: jest.fn(),
    };
    itemRepo = {
      find: jest.fn(),
      create: jest.fn((data) => ({ ...data, id: `item-${Math.random()}` })),
      save: jest.fn(async (data) => data),
    };
    productRepo = { findOne: jest.fn() };
    serviceRepo = { findOne: jest.fn() };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Package) return packageRepo;
        if (entity === PackageItem) return itemRepo;
        if (entity === Product) return productRepo;
        if (entity === SalonService) return serviceRepo;
        throw new Error(`Unexpected entity: ${entity}`);
      }),
    };

    const dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
      getRepository: jest.fn((entity) => {
        if (entity === Package) return packageRepo;
        if (entity === PackageItem) return itemRepo;
        if (entity === Product) return productRepo;
        if (entity === SalonService) return serviceRepo;
        throw new Error(`Unexpected entity: ${entity}`);
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PackagesService, { provide: DataSource, useValue: dataSource }],
    }).compile();

    service = module.get(PackagesService);
  });

  const serviceFixture = (id: string, priceMinor: number): SalonService =>
    ({
      id,
      name: `Service ${id}`,
      priceMinor,
      durationMinutes: 60,
      rewardPointWeight: 1,
      active: true,
    }) as SalonService;

  const productFixture = (id: string, priceMinor: number): Product =>
    ({
      id,
      name: `Product ${id}`,
      category: ProductCategory.COSMETICS,
      stock: 10,
      purchaseCostMinor: 0,
      sellingPriceMinor: priceMinor,
      minimumStockThreshold: 1,
    }) as Product;

  it('computes normal price, package price, and savings from components', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    serviceRepo.findOne
      .mockResolvedValueOnce(serviceFixture('s1', 350000))
      .mockResolvedValueOnce(serviceFixture('s2', 220000));

    const dto: CreatePackageDto = {
      name: 'Bridal Package',
      packagePriceMinor: 499900,
      items: [
        { itemKind: PackageItemKind.SERVICE, itemId: 's1' },
        { itemKind: PackageItemKind.SERVICE, itemId: 's2' },
      ],
    };

    const result = await service.create(dto);

    expect(result.normalPriceMinor).toBe(570000);
    expect(result.packagePriceMinor).toBe(499900);
    expect(result.savingsMinor).toBe(70100);
  });

  it('rejects package price greater than computed normal price', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    serviceRepo.findOne.mockResolvedValueOnce(serviceFixture('s1', 100000));

    const dto: CreatePackageDto = {
      name: 'Overpriced',
      packagePriceMinor: 200000,
      items: [{ itemKind: PackageItemKind.SERVICE, itemId: 's1' }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate name', async () => {
    packageRepo.findOne.mockResolvedValue({ id: 'existing' } as Package);

    const dto: CreatePackageDto = {
      name: 'Bridal Package',
      packagePriceMinor: 100000,
      items: [{ itemKind: PackageItemKind.SERVICE, itemId: 's1' }],
    };

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('rejects inactive service', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    const svc = serviceFixture('s1', 100000);
    svc.active = false;
    serviceRepo.findOne.mockResolvedValueOnce(svc);

    const dto: CreatePackageDto = {
      name: 'Invalid Package',
      packagePriceMinor: 80000,
      items: [{ itemKind: PackageItemKind.SERVICE, itemId: 's1' }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects missing product', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    productRepo.findOne.mockResolvedValueOnce(null);

    const dto: CreatePackageDto = {
      name: 'Invalid Product Package',
      packagePriceMinor: 10000,
      items: [{ itemKind: PackageItemKind.PRODUCT, itemId: 'p-missing' }],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate items in package definition', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    serviceRepo.findOne.mockResolvedValue(serviceFixture('s1', 100000));

    const dto: CreatePackageDto = {
      name: 'Duplicate Items',
      packagePriceMinor: 90000,
      items: [
        { itemKind: PackageItemKind.SERVICE, itemId: 's1' },
        { itemKind: PackageItemKind.SERVICE, itemId: 's1' },
      ],
    };

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('mixes products and services correctly', async () => {
    packageRepo.findOne.mockResolvedValue(null);
    serviceRepo.findOne.mockResolvedValueOnce(serviceFixture('s1', 350000));
    productRepo.findOne.mockResolvedValueOnce(productFixture('p1', 120000));

    const dto: CreatePackageDto = {
      name: 'Mixed Package',
      packagePriceMinor: 400000,
      items: [
        { itemKind: PackageItemKind.SERVICE, itemId: 's1' },
        { itemKind: PackageItemKind.PRODUCT, itemId: 'p1' },
      ],
    };

    const result = await service.create(dto);

    expect(result.normalPriceMinor).toBe(470000);
    expect(result.savingsMinor).toBe(70000);
  });
});
