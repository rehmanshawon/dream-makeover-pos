import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InvoiceNumberService } from '../src/transactions/invoice-number.service';
import { Transaction } from '../src/transactions/transaction.entity';

describe('InvoiceNumberService', () => {
  let service: InvoiceNumberService;
  let repository: Repository<Transaction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceNumberService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(InvoiceNumberService);
    repository = module.get(getRepositoryToken(Transaction));
  });

  function mockQueryBuilder(lastInvoiceId: string | null) {
    const qb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue(lastInvoiceId ? ({ invoiceId: lastInvoiceId } as Transaction) : null),
    };
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
    return qb;
  }

  it('returns DM-YYYYMMDD-0001 when no invoices exist for the day', async () => {
    mockQueryBuilder(null);

    const date = new Date(2026, 8, 11); // September 11, 2026
    const result = await service.next(date);

    expect(result).toBe('DM-20260911-0001');
  });

  it('increments the sequence from the last invoice of the day', async () => {
    mockQueryBuilder('DM-20260911-0041');

    const date = new Date(2026, 8, 11);
    const result = await service.next(date);

    expect(result).toBe('DM-20260911-0042');
  });

  it('uses a different prefix for a different day', async () => {
    mockQueryBuilder(null);

    const date = new Date(2026, 8, 12);
    const result = await service.next(date);

    expect(result).toBe('DM-20260912-0001');
  });

  it('pads the sequence to four digits', async () => {
    mockQueryBuilder('DM-20260911-0009');

    const date = new Date(2026, 8, 11);
    const result = await service.next(date);

    expect(result).toBe('DM-20260911-0010');
  });

  it('throws when the daily sequence exceeds 9999', async () => {
    mockQueryBuilder('DM-20260911-9999');

    const date = new Date(2026, 8, 11);
    await expect(service.next(date)).rejects.toThrow('Daily invoice sequence exceeded 9999');
  });

  it('throws on malformed invoice ID in the database', async () => {
    mockQueryBuilder('DM-20260911-ABCD');

    const date = new Date(2026, 8, 11);
    await expect(service.next(date)).rejects.toThrow('Malformed invoice ID');
  });
});
