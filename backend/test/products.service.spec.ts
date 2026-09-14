import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ProductsService } from '../src/products/products.service';
import { Product } from '../src/products/product.entity';
import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { ProductCategory } from '../src/products/product-category.enum';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  const baseProduct = (): Product =>
    ({
      id: 'uuid-product-1',
      name: 'Lipstick',
      category: ProductCategory.COSMETICS,
      stock: 10,
      purchaseCostMinor: 50000,
      sellingPriceMinor: 100000,
      minimumStockThreshold: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Product;

  it('includes purchase cost when options.includePurchaseCost is true', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(baseProduct());

    const result = await service.findById('uuid-product-1', {
      includePurchaseCost: true,
    });

    expect(result.purchaseCostMinor).toBe(50000);
  });

  it('omits purchase cost when options.includePurchaseCost is false', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(baseProduct());

    const result = await service.findById('uuid-product-1', {
      includePurchaseCost: false,
    });

    expect(result.purchaseCostMinor).toBeUndefined();
    // Other fields still present
    expect(result.sellingPriceMinor).toBe(100000);
    expect(result.stock).toBe(10);
  });

  it('strips purchase cost from findAll for staff', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([baseProduct()]);

    const result = await service.findAll({ includePurchaseCost: false });

    expect(result).toHaveLength(1);
    expect(result[0].purchaseCostMinor).toBeUndefined();
  });

  it('updates non-stock fields without touching stock', async () => {
    const product = baseProduct();
    jest.spyOn(repository, 'findOne').mockResolvedValue(product);
    jest.spyOn(repository, 'save').mockImplementation(async (p) => p as Product);

    const result = await service.update(
      'uuid-product-1',
      { name: 'Renamed Lipstick', sellingPriceMinor: 110000 },
      { includePurchaseCost: true },
    );

    expect(result.name).toBe('Renamed Lipstick');
    expect(result.sellingPriceMinor).toBe(110000);
    expect(result.stock).toBe(10); // unchanged
    expect(product.name).toBe('Renamed Lipstick');
  });

  it('throws NotFoundException when updating a missing product', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    await expect(
      service.update('missing', { name: 'X' }, { includePurchaseCost: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates product with correct monetary values', async () => {
    const dto: CreateProductDto = {
      name: 'Lipstick',
      category: ProductCategory.COSMETICS,
      stock: 10,
      purchaseCostMinor: 50000,
      sellingPriceMinor: 100000,
      minimumStockThreshold: 2,
    };

    jest.spyOn(repository, 'create').mockReturnValue(baseProduct());
    jest.spyOn(repository, 'save').mockResolvedValue(baseProduct());

    const result = await service.create(dto, { includePurchaseCost: true });

    expect(result.purchaseCostMinor).toBe(50000);
    expect(result.sellingPriceMinor).toBe(100000);
  });
});
