import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';
import { Account } from '../src/accounting/account.entity';
import { AccountType } from '../src/accounting/account-type.enum';
import { AccountingService } from '../src/accounting/accounting.service';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { JournalLine } from '../src/accounting/journal-line.entity';

function createService() {
  const accounts: Account[] = [
    { id: 'cash-id', code: 'CASH', name: 'Cash on hand', type: AccountType.ASSET } as Account,
    { id: 'bank-id', code: 'BANK', name: 'Business bank', type: AccountType.ASSET } as Account,
    {
      id: 'capital-id',
      code: 'OWNER_CAPITAL',
      name: 'Owner capital',
      type: AccountType.EQUITY,
    } as Account,
    {
      id: 'drawings-id',
      code: 'OWNER_DRAWINGS',
      name: 'Owner drawings',
      type: AccountType.CONTRA_EQUITY,
    } as Account,
  ];
  const lineRepository = {
    create: jest.fn((value: Partial<JournalLine>) => value as JournalLine),
    save: jest.fn(async (value: JournalLine[]) => value),
  };
  const createdEntry: JournalEntry = {
    id: 'entry-1',
    entryType: JournalEntryType.OWNER_CONTRIBUTION,
    entryDate: '2026-09-28',
    memo: 'Owner contribution to bank',
    reference: null,
    createdBy: 'admin',
    createdAt: new Date('2026-09-28T10:00:00Z'),
    lines: [],
  };
  const entryRepository = {
    create: jest.fn((value: Partial<JournalEntry>) => value as JournalEntry),
    save: jest.fn(async (value: JournalEntry) => ({ ...value, id: 'entry-1' }) as JournalEntry),
    findOne: jest.fn(async () => ({ ...createdEntry, lines: [] })),
  };
  const accountRepository = { find: jest.fn(async () => accounts) };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === Account)
        return {
          findOne: jest.fn(
            async ({ where }: { where: { code: string } }) =>
              accounts.find((account) => account.code === where.code) ?? null,
          ),
        };
      if (entity === JournalEntry) return entryRepository;
      if (entity === JournalLine) return lineRepository;
      throw new Error('Unexpected repository');
    },
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (value: unknown) => Promise<unknown>) =>
      callback(manager),
    ),
  };
  const service = new AccountingService(
    dataSource as unknown as DataSource,
    accountRepository as never,
    entryRepository as never,
  );
  return { service, dataSource, entryRepository, lineRepository };
}

describe('AccountingService', () => {
  it('posts owner contributions as debit cash/bank and credit owner capital', async () => {
    const { service, entryRepository, lineRepository } = createService();

    await service.createVoucher(
      {
        entryType: JournalEntryType.OWNER_CONTRIBUTION,
        entryDate: '2026-09-28',
        amountMinor: 125000,
        cashBankAccountCode: 'BANK',
      },
      'trusted-admin',
    );

    expect(entryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'trusted-admin' }),
    );
    expect(lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'bank-id', debitMinor: 125000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'capital-id', debitMinor: 0, creditMinor: 125000 }),
    ]);
  });

  it('posts owner withdrawals and internal transfers without treating them as expenses or income', async () => {
    const drawings = createService();
    await drawings.service.createVoucher(
      {
        entryType: JournalEntryType.OWNER_WITHDRAWAL,
        entryDate: '2026-09-28',
        amountMinor: 25000,
        cashBankAccountCode: 'CASH',
      },
      'admin',
    );
    expect(drawings.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'drawings-id', debitMinor: 25000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'cash-id', debitMinor: 0, creditMinor: 25000 }),
    ]);

    const transfer = createService();
    await transfer.service.createVoucher(
      {
        entryType: JournalEntryType.CASH_BANK_TRANSFER,
        entryDate: '2026-09-28',
        amountMinor: 80000,
        fromAccountCode: 'CASH',
        toAccountCode: 'BANK',
      },
      'admin',
    );
    expect(transfer.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'bank-id', debitMinor: 80000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'cash-id', debitMinor: 0, creditMinor: 80000 }),
    ]);
  });

  it('rejects a transfer between the same account before opening a database transaction', async () => {
    const { service, dataSource } = createService();

    await expect(
      service.createVoucher(
        {
          entryType: JournalEntryType.CASH_BANK_TRANSFER,
          entryDate: '2026-09-28',
          amountMinor: 10000,
          fromAccountCode: 'CASH',
          toAccountCode: 'CASH',
        },
        'admin',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects impossible calendar dates before writing', async () => {
    const { service, dataSource } = createService();

    await expect(
      service.createVoucher(
        {
          entryType: JournalEntryType.OWNER_CONTRIBUTION,
          entryDate: '2026-02-30',
          amountMinor: 10000,
          cashBankAccountCode: 'CASH',
        },
        'admin',
      ),
    ).rejects.toThrow('valid calendar date');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
