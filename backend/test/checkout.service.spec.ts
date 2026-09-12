import { Test, TestingModule } from '@nestjs/testing';

import { DataSource } from 'typeorm';
import { CheckoutService } from '../src/transactions/checkout/checkout.service';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem } from '../src/transactions/transaction-item.entity';
import { Product } from '../src/products/product.entity';
import { SalonService } from '../src/services/service.entity';
import { Customer } from '../src/customers/customer.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { CheckoutRequestDto } from '../src/transactions/checkout/dto/checkout-request.dto';
import { TransactionItemType } from '../src/transactions/transaction-item.entity';
import { describe, beforeEach, it, jest, expect } from '@jest/globals';
import { InvoiceNumberService } from '../src/transactions/invoice-number.service';
import { Package } from '../src/packages/package.entity';
import { PackageItem } from '../src/packages/package-item.entity';
import { InventoryService } from '../src/inventory/inventory.service';
import { StockMovementReason } from '../src/inventory/stock-movement-reason.enum';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let dataSource: DataSource;
  let productRepo: any;
  let serviceRepo: any;
  let customerRepo: any;
  let transactionRepo: any;
  let itemRepo: any;
  let packageRepo: any;
  let packageItemRepo: any;
  let invoiceNumberService: InvoiceNumberService;
  let inventoryService: InventoryService;

  beforeEach(async () => {
    const mockManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) return productRepo;
        if (entity === SalonService) return serviceRepo;
        if (entity === Customer) return customerRepo;
        if (entity === Transaction) return transactionRepo;
        if (entity === TransactionItem) return itemRepo;
        if (entity === Package) return packageRepo;
        if (entity === PackageItem) return packageItemRepo;
        throw new Error(`Unexpected entity in test: ${entity.name}`);
      }),
    };

    dataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
    } as any;

    productRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    serviceRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    customerRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    transactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    itemRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    packageRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    packageItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    invoiceNumberService = {
      next: jest.fn().mockResolvedValue('DM-20260911-0001'),
    } as unknown as InvoiceNumberService;

    inventoryService = {
      applyMovement: jest.fn().mockImplementation(async (_manager, input) => ({
        id: 'movement-1',
        productId: input.productId,
        delta: input.delta,
        reason: input.reason,
        referenceId: input.referenceId,
        note: input.note,
        createdBy: input.createdBy,
        createdAt: new Date(),
      })),
    } as unknown as InventoryService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DataSource, useValue: dataSource },
        { provide: InvoiceNumberService, useValue: invoiceNumberService },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get(CheckoutService);
  });

  it('should calculate totals and record transaction', async () => {
    // Mock product
    const product = { id: 'p1', name: 'Lipstick', stock: 10, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);
    productRepo.save.mockResolvedValue(product);

    // Mock service
    const salonService = {
      id: 's1',
      name: 'Facial',
      priceMinor: 50000,
      active: true,
    } as SalonService;
    serviceRepo.findOne.mockResolvedValue(salonService);

    // Mock customer
    const customer = {
      id: 'c1',
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
      rewardTier: CustomerRewardTier.SILVER,
    } as Customer;
    customerRepo.findOne.mockResolvedValue(customer);
    customerRepo.save.mockResolvedValue(customer);

    // Mock transaction save
    const savedTransaction = { id: 't1', invoiceId: 'INV-123' } as Transaction;
    transactionRepo.create.mockReturnValue({} as Transaction);
    transactionRepo.save.mockResolvedValue(savedTransaction);

    itemRepo.create.mockImplementation((data) => data);
    itemRepo.save.mockResolvedValue({} as TransactionItem);

    const dto: CheckoutRequestDto = {
      items: [
        { itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 2 },
        { itemType: TransactionItemType.SERVICE, itemId: 's1', quantity: 1 },
      ],
      customerId: 'c1',
      discountMinor: 1000,
      cashReceivedMinor: 70000,
    };

    const result = await service.checkout(dto, 'admin');

    expect(result.subtotalMinor).toBe(2 * 10000 + 50000); // 70000
    expect(result.discountMinor).toBe(1000);
    expect(result.totalMinor).toBe(69000);
    expect(result.cashReceivedMinor).toBe(70000);
    expect(result.changeMinor).toBe(1000);
    expect(inventoryService.applyMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ productId: 'p1', delta: -2 }),
    );
    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lifetimeSpendMinor: 69000, rewardPoints: 6 }),
    );
    expect(result.loyaltyPointsEarned).toBe(6); // 69000 / 10000 = 6.9 -> 6
  });

  it('should throw error for insufficient stock', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 1, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);

    const dto: CheckoutRequestDto = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 2 }],
      discountMinor: 0,
      cashReceivedMinor: 20000,
    };

    await expect(service.checkout(dto, 'admin')).rejects.toThrow('Insufficient stock');
  });

  it('should throw error for discount exceeding subtotal', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 5, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);

    const dto: CheckoutRequestDto = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
      discountMinor: 15000,
      cashReceivedMinor: 20000,
    };

    await expect(service.checkout(dto, 'admin')).rejects.toThrow('Discount cannot exceed subtotal');
  });

  it('should throw error for insufficient cash', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 5, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);

    const dto: CheckoutRequestDto = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
      discountMinor: 0,
      cashReceivedMinor: 5000,
    };

    await expect(service.checkout(dto, 'admin')).rejects.toThrow('Insufficient cash received');
  });

  it('sells a package and reduces stock of contained products', async () => {
    const containedProduct = {
      id: 'p-in-pkg',
      name: 'Cosmetics Kit',
      stock: 10,
      sellingPriceMinor: 120000,
    } as Product;

    const pkg = {
      id: 'pkg-1',
      name: 'Bridal Package',
      packagePriceMinor: 499900,
      active: true,
    } as Package;

    const component = {
      id: 'pkg-item-1',
      packageId: 'pkg-1',
      productId: 'p-in-pkg',
      serviceId: null,
      itemKind: 'PRODUCT',
    } as PackageItem;

    packageRepo.findOne.mockResolvedValue(pkg);
    packageItemRepo.find.mockResolvedValue([component]);
    productRepo.findOne.mockResolvedValue(containedProduct);
    productRepo.save.mockImplementation(async (p) => p);

    transactionRepo.create.mockReturnValue({} as Transaction);
    transactionRepo.save.mockResolvedValue({
      id: 't-1',
      invoiceId: 'DM-20260912-0001',
    } as Transaction);
    itemRepo.create.mockImplementation((data) => data);
    itemRepo.save.mockResolvedValue({} as TransactionItem);

    const dto: CheckoutRequestDto = {
      items: [{ itemType: TransactionItemType.PACKAGE, itemId: 'pkg-1', quantity: 2 }],
      discountMinor: 0,
      cashReceivedMinor: 1000000,
    };

    const result = await service.checkout(dto, 'admin');

    expect(result.subtotalMinor).toBe(999800);
    expect(result.totalMinor).toBe(999800);
    // Inventory service should be called to reduce stock of contained products
    expect(inventoryService.applyMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: 'p-in-pkg',
        delta: -2,
        reason: StockMovementReason.SALE,
      }),
    );
    // Item has packageId set
    expect(itemRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        packageId: 'pkg-1',
        itemType: TransactionItemType.PACKAGE,
      }),
    );
  });
});
