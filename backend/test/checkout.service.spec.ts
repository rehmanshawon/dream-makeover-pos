import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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

describe('CheckoutService', () => {
  let service: CheckoutService;
  let dataSource: DataSource;
  let productRepo: any;
  let serviceRepo: any;
  let customerRepo: any;
  let transactionRepo: any;
  let itemRepo: any;

  beforeEach(async () => {
    const mockManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Product) return productRepo;
        if (entity === SalonService) return serviceRepo;
        if (entity === Customer) return customerRepo;
        if (entity === Transaction) return transactionRepo;
        if (entity === TransactionItem) return itemRepo;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(SalonService), useValue: serviceRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(TransactionItem), useValue: itemRepo },
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
      discountMinor: 1000,
      cashReceivedMinor: 70000,
    };

    const result = await service.checkout(dto, 'admin');

    expect(result.subtotalMinor).toBe(2 * 10000 + 50000); // 70000
    expect(result.discountMinor).toBe(1000);
    expect(result.totalMinor).toBe(69000);
    expect(result.cashReceivedMinor).toBe(70000);
    expect(result.changeMinor).toBe(1000);
    expect(productRepo.save).toHaveBeenCalledWith(expect.objectContaining({ stock: 8 }));
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
});
