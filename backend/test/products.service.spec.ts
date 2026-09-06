import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../src/products/products.service';
import { Product } from '../src/products/product.entity';
import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { ProductCategory } from '../src/products/product-category.enum';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

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
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  it('should create product with correct monetary minor units', async () => {
    const dto: CreateProductDto = {
      name: 'Luxury Lipstick',
      category: ProductCategory.COSMETICS,
      stock: 25,
      purchaseCostMinor: 80000,
      sellingPriceMinor: 120000,
      minimumStockThreshold: 5,
    };

    jest.spyOn(repository, 'create').mockReturnValue({
      ...dto,
    } as unknown as Product);

    jest.spyOn(repository, 'save').mockResolvedValue({
      id: 'uuid-product-1',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product);

    const result = await service.create(dto);

    expect(result.sellingPriceMinor).toBe(120000);
    expect(result.purchaseCostMinor).toBe(80000);
  });

  it('should return empty list when no products', async () => {
    jest.spyOn(repository, 'find').mockResolvedValue([]);
    const result = await service.findAll();
    expect(result).toEqual([]);
  });
});
