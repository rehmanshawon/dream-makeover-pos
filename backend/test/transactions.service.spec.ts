import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TransactionsService } from '../src/transactions/transactions.service';
import { Transaction } from '../src/transactions/transaction.entity';
import { TransactionItem } from '../src/transactions/transaction-item.entity';
import { Customer } from '../src/customers/customer.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let txRepo: jest.Mocked<Partial<Repository<Transaction>>>;
  let itemRepo: jest.Mocked<Partial<Repository<TransactionItem>>>;
  let customerRepo: jest.Mocked<Partial<Repository<Customer>>>;

  beforeEach(async () => {
    const txQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        transactionCount: '0',
        subtotalMinor: '0',
        discountMinor: '0',
        totalMinor: '0',
      }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    txRepo = {
      createQueryBuilder: jest.fn(() => txQueryBuilder) as never,
      findOne: jest.fn(),
    };

    itemRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })) as never,
      find: jest.fn(),
    };

    customerRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })) as never,
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(TransactionItem), useValue: itemRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  it('returns an empty list with zeroed summary when no transactions match', async () => {
    const result = await service.list({});

    expect(result.summary.transactionCount).toBe(0);
    expect(result.summary.totalMinor).toBe(0);
    expect(result.summary.averageSaleMinor).toBe(0);
    expect(result.transactions).toEqual([]);
  });

  it('computes average sale from total and count', async () => {
    const qb = txRepo.createQueryBuilder!() as unknown as {
      getRawOne: jest.Mock;
    };
    qb.getRawOne.mockResolvedValueOnce({
      transactionCount: '4',
      subtotalMinor: '1000000',
      discountMinor: '50000',
      totalMinor: '950000',
    });

    const result = await service.list({});
    expect(result.summary.averageSaleMinor).toBe(237500);
  });

  it('throws NotFoundException for missing transaction', async () => {
    (txRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns detail with items and customer', async () => {
    (txRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      invoiceId: 'DM-20260916-0001',
      createdAt: new Date(),
      cashier: 'admin',
      customerId: 'c1',
      subtotalMinor: 200000,
      discountMinor: 0,
      totalMinor: 200000,
      cashReceivedMinor: 300000,
      changeMinor: 100000,
    } as Transaction);

    (itemRepo.find as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        itemType: 'SERVICE',
        itemName: 'Facial',
        quantity: 1,
        unitPriceMinor: 200000,
        totalPriceMinor: 200000,
      } as TransactionItem,
    ]);

    (customerRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'c1',
      fullName: 'Alice',
      phoneNumber: '01700000000',
      rewardTier: 'Gold',
    } as Customer);

    const result = await service.findById('tx-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemName).toBe('Facial');
    expect(result.customer?.fullName).toBe('Alice');
  });
});
