import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from '../src/products/products.service';
import { Product } from '../src/products/product.entity';
import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { ProductCategory } from '../src/products/product-category.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: MockRepository<Product>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(Product));
  });

  describe('create', () => {
    it('should pass correct properties to repository.create and return response DTO', async () => {
      const dto: CreateProductDto = {
        name: 'Luxury Jamdani Saree',
        category: ProductCategory.SAREE,
        stock: 10,
        purchaseCostMinor: 1500000,
        sellingPriceMinor: 2500000,
        minimumStockThreshold: 2,
      };

      const mockSavedProduct = {
        id: 'uuid-product-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product;

      repository.create?.mockReturnValue(mockSavedProduct);
      repository.save?.mockResolvedValue(mockSavedProduct);

      const result = await service.create(dto);

      // Verify actual argument delegation to repository
      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        category: dto.category,
        stock: dto.stock,
        purchaseCostMinor: dto.purchaseCostMinor,
        sellingPriceMinor: dto.sellingPriceMinor,
        minimumStockThreshold: dto.minimumStockThreshold,
      });

      expect(repository.save).toHaveBeenCalledWith(mockSavedProduct);
      expect(result.id).toBe('uuid-product-1');
      expect(result.sellingPriceMinor).toBe(2500000);
    });
  });

  describe('findAll', () => {
    it('should fetch products ordered by category and name ASC', async () => {
      const mockProducts = [
        {
          id: 'uuid-1',
          name: 'Matte Lipstick',
          category: ProductCategory.COSMETICS,
          stock: 15,
          purchaseCostMinor: '50000', // TypeORM bigint often returns string
          sellingPriceMinor: '90000',
          minimumStockThreshold: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Product,
      ];

      repository.find?.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { category: 'ASC', name: 'ASC' },
      });
      expect(result).toHaveLength(1);
      // Verify toResponseDto string-to-number conversion
      expect(result[0].purchaseCostMinor).toBe(50000);
      expect(result[0].sellingPriceMinor).toBe(90000);
    });
  });

  describe('findByCategory', () => {
    it('should query products filtered by category and ordered by name ASC', async () => {
      repository.find?.mockResolvedValue([]);

      const result = await service.findByCategory(ProductCategory.COSMETICS);

      expect(repository.find).toHaveBeenCalledWith({
        where: { category: ProductCategory.COSMETICS },
        order: { name: 'ASC' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return product DTO when found', async () => {
      const mockProduct = {
        id: 'uuid-1',
        name: 'Silk Three-piece',
        category: ProductCategory.THREE_PIECE,
        stock: 5,
        purchaseCostMinor: 200000,
        sellingPriceMinor: 350000,
        minimumStockThreshold: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product;

      repository.findOne?.mockResolvedValue(mockProduct);

      const result = await service.findById('uuid-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
      expect(result.id).toBe('uuid-1');
      expect(result.name).toBe('Silk Three-piece');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      repository.findOne?.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
