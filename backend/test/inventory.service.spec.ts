import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InventoryService } from '../src/inventory/inventory.service';
import { Product } from '../src/products/product.entity';
import { StockMovement } from '../src/inventory/stock-movement.entity';
import { StockMovementReason } from '../src/inventory/stock-movement-reason.enum';

describe('InventoryService', () => {
  let service: InventoryService;
  let productRepo: any;
  let movementRepo: any;
  let manager: EntityManager;
  let dataSource: DataSource;

  beforeEach(async () => {
    productRepo = { findOne: jest.fn(), save: jest.fn() };
    movementRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ ...data, id: 'movement-1', createdAt: new Date() })),
    };
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) return productRepo;
        if (entity === StockMovement) return movementRepo;
        throw new Error('Unexpected entity');
      }),
    } as unknown as EntityManager;
    dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
      getRepository: jest.fn((entity) => {
        if (entity === Product) return productRepo;
        if (entity === StockMovement) return movementRepo;
        throw new Error('Unexpected entity');
      }),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: DataSource, useValue: dataSource }],
    }).compile();
    service = module.get(InventoryService);
  });

  it('records STOCK_IN movement and increments stock', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 5 } as Product;
    productRepo.findOne.mockResolvedValue(product);
    productRepo.save.mockImplementation(async (p: Product) => p);

    const result = await service.stockIn({ productId: 'p1', quantity: 10 }, 'admin');

    expect(result.delta).toBe(10);
    expect(result.reason).toBe(StockMovementReason.STOCK_IN);
    expect(product.stock).toBe(15);
  });

  it('rejects adjustment that would result in negative stock', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 3 } as Product;
    productRepo.findOne.mockResolvedValue(product);

    await expect(
      service.adjust({ productId: 'p1', delta: -10, note: 'damage' }, 'admin'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects adjustment with zero delta', async () => {
    await expect(
      service.adjust({ productId: 'p1', delta: 0, note: 'noop' }, 'admin'),
    ).rejects.toThrow('Adjustment delta must not be zero');
  });

  it('throws NotFound for unknown product', async () => {
    productRepo.findOne.mockResolvedValue(null);
    await expect(service.stockIn({ productId: 'missing', quantity: 5 }, 'admin')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('findLowStock', () => {
    it('returns products at or below threshold', async () => {
      const repo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              id: 'p1',
              name: 'Almost Gone',
              category: 'Cosmetics',
              stock: 1,
              minimumStockThreshold: 3,
              sellingPriceMinor: 50000,
            },
          ]),
        }),
      } as any;

      (dataSource as any).getRepository = jest.fn(() => repo);

      const result = await service.findLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0].outOfStock).toBe(false);
    });

    it('marks out-of-stock products correctly', async () => {
      const repo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              id: 'p2',
              name: 'Empty',
              category: 'Cosmetics',
              stock: 0,
              minimumStockThreshold: 3,
              sellingPriceMinor: 50000,
            },
          ]),
        }),
      } as any;

      (dataSource as any).getRepository = jest.fn(() => repo);

      const result = await service.findLowStock();
      expect(result[0].outOfStock).toBe(true);
    });
  });

  describe('findOutOfStock', () => {
    it('queries only products with stock zero', async () => {
      const find = jest.fn().mockResolvedValue([]);
      (dataSource as any).getRepository = jest.fn(() => ({ find }));

      await service.findOutOfStock();

      expect(find).toHaveBeenCalledWith({
        where: { stock: 0 },
        order: { name: 'ASC' },
      });
    });
  });

  describe('getStats', () => {
    it('returns aggregate counts', async () => {
      const repo = {
        count: jest
          .fn()
          .mockResolvedValueOnce(10) // total
          .mockResolvedValueOnce(3), // out of stock
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(4),
        }),
      } as any;

      (dataSource as any).getRepository = jest.fn(() => repo);

      const result = await service.getStats();

      expect(result.totalProducts).toBe(10);
      expect(result.lowStockCount).toBe(4);
      expect(result.outOfStockCount).toBe(3);
    });
  });
});
