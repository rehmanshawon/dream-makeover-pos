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
import { AccountingService } from '../src/accounting/accounting.service';
import { LoyaltySettingsService } from '../src/loyalty/loyalty-settings.service';
import { LoyaltySettings } from '../src/loyalty/loyalty-settings.entity';

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
  let accountingService: AccountingService;
  let loyaltySettingsService: LoyaltySettingsService;

  beforeEach(async () => {
    const mockManager = {
      getRepository: jest.fn((entity: any) => {
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
      transaction: jest.fn((callback: any) => callback(mockManager)),
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
      next: jest.fn<() => Promise<string>>().mockResolvedValue('DM-20260911-0001'),
    } as unknown as InvoiceNumberService;

    inventoryService = {
      applySaleMovement: jest.fn().mockImplementation(async (_manager: any, input: any) => ({
        movement: {
          id: 'movement-1',
          productId: input.productId,
          delta: -input.quantity,
          reason: StockMovementReason.SALE,
          referenceId: input.referenceId,
          note: null,
          createdBy: input.createdBy,
          createdAt: new Date(),
        },
        costMinor: input.quantity * 25000,
      })),
    } as unknown as InventoryService;

    accountingService = {
      createSaleEntry: jest.fn(),
    } as unknown as AccountingService;

    const defaultTiers = [
      { tier: CustomerRewardTier.SILVER, minimumPoints: 0, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.GOLD, minimumPoints: 200, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.PLATINUM, minimumPoints: 500, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.DIAMOND, minimumPoints: 1000, redeemPoints: 0, discountMinor: 0 },
    ];
    loyaltySettingsService = {
      get: jest.fn().mockResolvedValue({
        id: 1,
        earningSpendMinor: 10000,
        earningPoints: 1,
        tiers: defaultTiers,
      } as LoyaltySettings),
      tierForPoints: jest.fn(
        (points: number, tiers: typeof defaultTiers) =>
          [...tiers]
            .sort((a, b) => b.minimumPoints - a.minimumPoints)
            .find((tier) => points >= tier.minimumPoints)?.tier ?? CustomerRewardTier.SILVER,
      ),
      tierSetting: jest.fn(
        (tier: CustomerRewardTier, tiers: typeof defaultTiers) =>
          tiers.find((setting) => setting.tier === tier) ?? defaultTiers[0]!,
      ),
    } as unknown as LoyaltySettingsService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DataSource, useValue: dataSource },
        { provide: InvoiceNumberService, useValue: invoiceNumberService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: AccountingService, useValue: accountingService },
        { provide: LoyaltySettingsService, useValue: loyaltySettingsService },
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
      fullName: 'Test Customer',
      rewardPoints: 0,
      lifetimeSpendMinor: 0,
      rewardTier: CustomerRewardTier.SILVER,
    } as Customer;
    customerRepo.findOne.mockResolvedValue(customer);
    customerRepo.save.mockResolvedValue(customer);

    // Mock transaction save
    const savedTransaction = {
      id: 't1',
      invoiceId: 'INV-123',
      createdAt: new Date('2026-09-28T12:34:56.000Z'),
    } as Transaction;
    transactionRepo.create.mockReturnValue({} as Transaction);
    transactionRepo.save.mockResolvedValue(savedTransaction);

    itemRepo.create.mockImplementation((data: any) => data);
    itemRepo.save.mockResolvedValue({} as TransactionItem);

    const dto: CheckoutRequestDto = Object.assign(
      {
        items: [
          { itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 2 },
          { itemType: TransactionItemType.SERVICE, itemId: 's1', quantity: 1 },
        ],
        customerId: 'c1',
        discountMinor: 1000,
        cashReceivedMinor: 70000,
      },
      { vatRatePercent: 10 },
    );

    const result = await service.checkout(dto, 'admin');

    expect(result.subtotalMinor).toBe(2 * 10000 + 50000); // 70000
    expect(result.discountMinor).toBe(1000);
    expect(result.totalMinor).toBe(69000);
    expect(result).not.toHaveProperty('vatRatePercent');
    expect(result).not.toHaveProperty('vatMinor');
    expect(result.cashReceivedMinor).toBe(70000);
    expect(result.paymentMethod).toBe('CASH');
    expect(result.changeMinor).toBe(1000);
    expect(inventoryService.applySaleMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ productId: 'p1', quantity: 2 }),
    );
    expect(customerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lifetimeSpendMinor: 69000, rewardPoints: 6 }),
    );
    expect(result.loyaltyPointsEarned).toBe(6); // 69000 / 10000 = 6.9 -> 6
    expect(result.cashier).toBe('admin');
    expect(accountingService.createSaleEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceTransactionId: 't1',
        entryDate: '2026-09-28',
        totalMinor: 69000,
        paymentMethod: 'CASH',
        revenueMinor: 69000,
        vatMinor: 0,
        cogsMinor: 50000,
        createdBy: 'admin',
      }),
    );
    expect(accountingService.createSaleEntry).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ totalMinor: 70000 }),
    );
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ vatRatePercent: 0, vatMinor: 0, totalMinor: 69000 }),
    );
    expect(result.customer).not.toBeNull();
    expect(result.customer?.name).toBe('Test Customer');
    expect(result.customer?.totalPointsAfterSale).toBe(6);
  });

  it('redeems a configured tier reward and earns points from cumulative paid spend', async () => {
    const settings = (await loyaltySettingsService.get()) as LoyaltySettings;
    settings.tiers = settings.tiers.map((tier) =>
      tier.tier === CustomerRewardTier.GOLD
        ? { ...tier, redeemPoints: 100, discountMinor: 5000 }
        : tier,
    );
    jest.spyOn(loyaltySettingsService, 'get').mockResolvedValue(settings);

    productRepo.findOne.mockResolvedValue({
      id: 'p1',
      name: 'Lipstick',
      stock: 10,
      sellingPriceMinor: 200000,
    } as Product);
    const customer = {
      id: 'c1',
      fullName: 'Test Customer',
      phoneNumber: '01700000000',
      rewardPoints: 250,
      lifetimeSpendMinor: 9000,
      rewardTier: CustomerRewardTier.GOLD,
    } as Customer;
    customerRepo.findOne.mockResolvedValue(customer);
    customerRepo.save.mockImplementation(async (saved: Customer) => saved);
    transactionRepo.create.mockImplementation(
      (values: Partial<Transaction>) => values as Transaction,
    );
    transactionRepo.save.mockImplementation(
      async (saved: Transaction) =>
        ({
          ...saved,
          id: 'tx-reward',
          invoiceId: 'DM-20260930-0001',
          createdAt: new Date('2026-09-30T12:00:00.000Z'),
        }) as Transaction,
    );
    itemRepo.create.mockImplementation(
      (values: Partial<TransactionItem>) => values as TransactionItem,
    );
    itemRepo.save.mockImplementation(async (saved: TransactionItem) => saved);

    const result = await service.checkout(
      {
        items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
        customerId: 'c1',
        redeemRewardPoints: true,
        discountMinor: 0,
        cashReceivedMinor: 195000,
      },
      'admin',
    );

    expect(result.rewardDiscountMinor).toBe(5000);
    expect(result.discountMinor).toBe(5000);
    expect(result.totalMinor).toBe(195000);
    expect(result.rewardPointsRedeemed).toBe(100);
    expect(result.loyaltyPointsEarned).toBe(20);
    expect(customer.rewardPoints).toBe(170);
    expect(customer.lifetimeSpendMinor).toBe(204000);
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

  it('requires a provider for mobile wallet checkout', async () => {
    productRepo.findOne.mockResolvedValue({
      id: 'p1',
      name: 'Lipstick',
      stock: 5,
      sellingPriceMinor: 10000,
    } as Product);

    await expect(
      service.checkout(
        {
          items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
          discountMinor: 0,
          cashReceivedMinor: 0,
          paymentMethod: 'MOBILE',
        },
        'admin',
      ),
    ).rejects.toThrow('Choose a mobile wallet provider');
  });

  it('records mobile wallet tender with the sale total and no cash change', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 5, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);
    productRepo.save.mockResolvedValue(product);
    transactionRepo.create.mockImplementation((values: Partial<Transaction>) => values as Transaction);
    transactionRepo.save.mockImplementation(
      async (saved: Transaction) =>
        ({ ...saved, id: 't-mobile', invoiceId: 'DM-20260930-0002', createdAt: new Date() }) as Transaction,
    );
    itemRepo.create.mockImplementation((values: Partial<TransactionItem>) => values as TransactionItem);
    itemRepo.save.mockImplementation(async (saved: TransactionItem) => saved);

    const result = await service.checkout(
      {
        items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
        discountMinor: 0,
        cashReceivedMinor: 0,
        paymentMethod: 'MOBILE',
        mobileWalletProvider: 'BKASH',
        paymentReference: '  TX-123  ',
      },
      'admin',
    );

    expect(result.paymentMethod).toBe('MOBILE');
    expect(result.mobileWalletProvider).toBe('BKASH');
    expect(result.paymentReference).toBe('TX-123');
    expect(result.cashReceivedMinor).toBe(10000);
    expect(result.changeMinor).toBe(0);
    expect(accountingService.createSaleEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paymentMethod: 'MOBILE' }),
    );
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
    productRepo.save.mockImplementation(async (p: any) => p);

    transactionRepo.create.mockReturnValue({} as Transaction);
    transactionRepo.save.mockResolvedValue({
      id: 't-1',
      invoiceId: 'DM-20260912-0001',
    } as Transaction);
    itemRepo.create.mockImplementation((data: any) => data);
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
    expect(inventoryService.applySaleMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: 'p-in-pkg',
        quantity: 2,
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

  it('returns null customer for a guest sale', async () => {
    const product = { id: 'p1', name: 'Lipstick', stock: 10, sellingPriceMinor: 10000 } as Product;
    productRepo.findOne.mockResolvedValue(product);
    productRepo.save.mockResolvedValue(product);

    transactionRepo.create.mockReturnValue({} as Transaction);
    transactionRepo.save.mockResolvedValue({
      id: 't-2',
      invoiceId: 'DM-20260915-0001',
    } as Transaction);
    itemRepo.create.mockImplementation((data: any) => data);
    itemRepo.save.mockResolvedValue({} as TransactionItem);

    const dto: CheckoutRequestDto = {
      items: [{ itemType: TransactionItemType.PRODUCT, itemId: 'p1', quantity: 1 }],
      discountMinor: 0,
      cashReceivedMinor: 10000,
    };

    const result = await service.checkout(dto, 'admin');

    expect(result.customer).toBeNull();
    expect(result.cashier).toBe('admin');
  });
});
