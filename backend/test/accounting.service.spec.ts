import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { DataSource, EntityManager } from 'typeorm';
import { Account } from '../src/accounting/account.entity';
import { AccountType } from '../src/accounting/account-type.enum';
import { AccountingService } from '../src/accounting/accounting.service';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { JournalLine } from '../src/accounting/journal-line.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';

function createService() {
  const accounts: Account[] = [
    { id: 'cash-id', code: 'CASH', name: 'Cash on hand', type: AccountType.ASSET } as Account,
    { id: 'bank-id', code: 'BANK', name: 'Business bank', type: AccountType.ASSET } as Account,
    {
      id: 'mobile-id',
      code: 'MOBILE_WALLET',
      name: 'Mobile wallet',
      type: AccountType.ASSET,
    } as Account,
    {
      id: 'card-clearing-id',
      code: 'CARD_CLEARING',
      name: 'Card clearing receivable',
      type: AccountType.ASSET,
    } as Account,
    {
      id: 'advance-id',
      code: 'EMPLOYEE_ADVANCES',
      name: 'Employee advances',
      type: AccountType.ASSET,
    } as Account,
    {
      id: 'inventory-id',
      code: 'INVENTORY',
      name: 'Inventory',
      type: AccountType.ASSET,
    } as Account,
    {
      id: 'shrinkage-id',
      code: 'INVENTORY_SHRINKAGE',
      name: 'Inventory shrinkage',
      type: AccountType.EXPENSE,
    } as Account,
    {
      id: 'adjustment-gain-id',
      code: 'INVENTORY_ADJUSTMENT_GAIN',
      name: 'Inventory adjustment gain',
      type: AccountType.REVENUE,
    } as Account,
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
    {
      id: 'electricity-id',
      code: 'EXPENSE_ELECTRICITY',
      name: 'Electricity expense',
      type: AccountType.EXPENSE,
    } as Account,
    {
      id: 'payroll-id',
      code: 'PAYROLL_EXPENSE',
      name: 'Payroll expense',
      type: AccountType.EXPENSE,
    } as Account,
    {
      id: 'revenue-id',
      code: 'SALES_REVENUE',
      name: 'Sales revenue',
      type: AccountType.REVENUE,
    } as Account,
    {
      id: 'vat-id',
      code: 'VAT_PAYABLE',
      name: 'VAT payable',
      type: AccountType.LIABILITY,
    } as Account,
  ];
  const lineRepository = {
    create: jest.fn((value: Partial<JournalLine>) => value as JournalLine),
    save: jest.fn(async (value: JournalLine[]) => value),
    delete: jest.fn(async () => ({ affected: 0, raw: [] })),
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
    remove: jest.fn(async (value: JournalEntry) => value),
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
  return { service, dataSource, entryRepository, lineRepository, manager };
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

  it('posts an expense as a debit to its category and a credit to its payment account', async () => {
    const { service, entryRepository, lineRepository, manager } = createService();
    entryRepository.findOne.mockResolvedValueOnce(null);

    await service.upsertExpenseEntry(manager as EntityManager, {
      sourceExpenseId: 'expense-1',
      entryDate: '2026-09-28',
      amountMinor: 42000,
      expenseAccountCode: 'EXPENSE_ELECTRICITY',
      paymentAccountCode: 'BANK',
      memo: 'Expense: electricity - Utility provider',
      reference: 'INV-42',
      createdBy: 'admin',
    });

    expect(entryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: JournalEntryType.EXPENSE_PAYMENT,
        sourceExpenseId: 'expense-1',
      }),
    );
    expect(lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'electricity-id', debitMinor: 42000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'bank-id', debitMinor: 0, creditMinor: 42000 }),
    ]);
  });

  it('posts bonus and overtime to payroll expense and the selected disbursement account', async () => {
    const { service, entryRepository, lineRepository, manager } = createService();

    await service.createSalaryPaymentEntry(manager as EntityManager, {
      sourceSalaryPaymentId: 'salary-payment-1',
      entryDate: '2026-09-28',
      amountMinor: 45000,
      paymentType: SalaryPaymentType.BONUS,
      paymentMethod: PaymentMethod.MOBILE,
      employeeName: 'Asha Rahman',
      createdBy: 'admin',
    });

    expect(entryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: JournalEntryType.SALARY_PAYMENT,
        sourceSalaryPaymentId: 'salary-payment-1',
        memo: 'BONUS - Asha Rahman',
      }),
    );
    expect(lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'payroll-id', debitMinor: 45000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'mobile-id', debitMinor: 0, creditMinor: 45000 }),
    ]);
  });

  it('posts advances to the asset account and adjustments back against that asset', async () => {
    const advance = createService();
    await advance.service.createSalaryPaymentEntry(advance.manager as EntityManager, {
      sourceSalaryPaymentId: 'advance-1',
      entryDate: '2026-09-28',
      amountMinor: 100000,
      paymentType: SalaryPaymentType.ADVANCE,
      paymentMethod: PaymentMethod.BANK,
      employeeName: 'Asha Rahman',
      createdBy: 'admin',
    });
    expect(advance.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'advance-id', debitMinor: 100000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'bank-id', debitMinor: 0, creditMinor: 100000 }),
    ]);

    const adjustment = createService();
    await adjustment.service.createSalaryPaymentEntry(adjustment.manager as EntityManager, {
      sourceSalaryPaymentId: 'adjustment-1',
      entryDate: '2026-09-28',
      amountMinor: 25000,
      paymentType: SalaryPaymentType.ADVANCE_ADJUSTMENT,
      paymentMethod: PaymentMethod.CASH,
      employeeName: 'Asha Rahman',
      createdBy: 'admin',
    });
    expect(adjustment.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'payroll-id', debitMinor: 25000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'advance-id', debitMinor: 0, creditMinor: 25000 }),
    ]);
  });

  it('removes a salary journal entry and its lines by source payment id', async () => {
    const { service, entryRepository, lineRepository, manager } = createService();

    await service.removeSalaryPaymentEntry(manager as EntityManager, 'salary-payment-1');

    expect(lineRepository.delete).toHaveBeenCalledWith({ entryId: 'entry-1' });
    expect(entryRepository.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry-1' }));
  });

  it('posts stock shortages to shrinkage expense and stock surpluses to adjustment gain', async () => {
    const shortage = createService();
    await shortage.service.createInventoryAdjustmentEntry(shortage.manager as EntityManager, {
      sourceStockMovementId: 'movement-shortage',
      entryDate: '2026-09-29',
      delta: -3,
      inventoryValueMinor: 30000,
      note: 'Damaged units',
      createdBy: 'admin',
    });
    expect(shortage.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'shrinkage-id', debitMinor: 30000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'inventory-id', debitMinor: 0, creditMinor: 30000 }),
    ]);

    const surplus = createService();
    await surplus.service.createInventoryAdjustmentEntry(surplus.manager as EntityManager, {
      sourceStockMovementId: 'movement-surplus',
      entryDate: '2026-09-29',
      delta: 2,
      inventoryValueMinor: 20000,
      note: 'Count correction',
      createdBy: 'admin',
    });
    expect(surplus.lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'inventory-id', debitMinor: 20000, creditMinor: 0 }),
      expect.objectContaining({
        accountId: 'adjustment-gain-id',
        debitMinor: 0,
        creditMinor: 20000,
      }),
    ]);
  });

  it('posts POS sale total to cash and separates revenue from VAT', async () => {
    const { service, entryRepository, lineRepository, manager } = createService();

    await service.createSaleEntry(manager as EntityManager, {
      sourceTransactionId: 'transaction-1',
      entryDate: '2026-09-28',
      invoiceId: 'DM-20260928-0001',
      totalMinor: 110000,
      paymentMethod: 'CASH',
      revenueMinor: 100000,
      vatMinor: 10000,
      createdBy: 'admin',
    });

    expect(entryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: JournalEntryType.SALE_RECEIPT,
        sourceTransactionId: 'transaction-1',
        reference: 'DM-20260928-0001',
      }),
    );
    expect(lineRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ accountId: 'cash-id', debitMinor: 110000, creditMinor: 0 }),
      expect.objectContaining({ accountId: 'revenue-id', debitMinor: 0, creditMinor: 100000 }),
      expect.objectContaining({ accountId: 'vat-id', debitMinor: 0, creditMinor: 10000 }),
    ]);
  });

  it.each([
    ['CARD', 'card-clearing-id'],
    ['BANK', 'bank-id'],
    ['MOBILE', 'mobile-id'],
  ] as const)('posts %s sale collections to the matching asset account', async (method, accountId) => {
    const { service, lineRepository, manager } = createService();

    await service.createSaleEntry(manager as EntityManager, {
      sourceTransactionId: 'transaction-2',
      entryDate: '2026-09-28',
      invoiceId: 'DM-20260928-0002',
      totalMinor: 50000,
      paymentMethod: method,
      revenueMinor: 50000,
      vatMinor: 0,
      cogsMinor: 0,
      createdBy: 'admin',
    });

    expect(lineRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ accountId, debitMinor: 50000, creditMinor: 0 }),
        expect.objectContaining({ accountId: 'revenue-id', debitMinor: 0, creditMinor: 50000 }),
      ]),
    );
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
