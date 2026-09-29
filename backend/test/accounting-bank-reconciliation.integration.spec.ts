import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { DataSource } from 'typeorm';
import { Account } from '../src/accounting/account.entity';
import { AccountingService } from '../src/accounting/accounting.service';
import { BankReconciliation } from '../src/accounting/bank-reconciliation.entity';
import { BankReconciliationLine } from '../src/accounting/bank-reconciliation-line.entity';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryType } from '../src/accounting/journal-entry-type.enum';
import { JournalLine } from '../src/accounting/journal-line.entity';
import { createTestDataSource, truncateAllTables } from './helpers/test-data-source';

describe('Bank reconciliation (integration)', () => {
  let dataSource: DataSource;
  let accounting: AccountingService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    accounting = new AccountingService(
      dataSource,
      dataSource.getRepository(Account),
      dataSource.getRepository(JournalEntry),
    );
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('finalizes a statement against selected bank postings', async () => {
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_CONTRIBUTION,
        entryDate: '2026-09-02',
        amountMinor: 10000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_WITHDRAWAL,
        entryDate: '2026-09-03',
        amountMinor: 2500,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    const candidateData = await accounting.getBankReconciliation('2026-09-30');
    expect(candidateData.openingBalanceMinor).toBe(0);
    expect(candidateData.candidates).toHaveLength(2);

    const reconciliation = await accounting.createBankReconciliation(
      {
        statementDate: '2026-09-30',
        openingBalanceMinor: 0,
        closingBalanceMinor: 7500,
        clearedJournalLineIds: candidateData.candidates.map((candidate) => candidate.journalLineId),
      },
      'admin',
    );

    expect(reconciliation.clearedMovementMinor).toBe(7500);
    expect(await dataSource.getRepository(BankReconciliationLine).count()).toBe(2);
    expect(await dataSource.getRepository(BankReconciliation).count()).toBe(1);
    await expect(accounting.getBankReconciliation('2026-09-30')).resolves.toMatchObject({
      openingBalanceMinor: 0,
      completedReconciliation: {
        id: reconciliation.id,
        closingBalanceMinor: 7500,
      },
      candidates: [],
    });
  });

  it('reports an as-of trial balance and a balanced balance sheet', async () => {
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_CONTRIBUTION,
        entryDate: '2026-09-02',
        amountMinor: 10000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_WITHDRAWAL,
        entryDate: '2026-10-01',
        amountMinor: 2000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );

    const trialBalance = await accounting.getTrialBalance('2026-09-30');
    expect(trialBalance.totalDebitsMinor).toBe(10000);
    expect(trialBalance.totalCreditsMinor).toBe(10000);
    expect(trialBalance.lines.find((line) => line.code === 'BANK')).toMatchObject({
      debitBalanceMinor: 10000,
      creditBalanceMinor: 0,
    });

    const balanceSheet = await accounting.getBalanceSheet('2026-09-30');
    expect(balanceSheet.totalAssetsMinor).toBe(10000);
    expect(balanceSheet.totalLiabilitiesAndEquityMinor).toBe(10000);
    expect(balanceSheet.currentEarningsMinor).toBe(0);
  });

  it('carries uncleared bank entries forward and uses the prior closing balance', async () => {
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_CONTRIBUTION,
        entryDate: '2026-09-01',
        amountMinor: 10000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_WITHDRAWAL,
        entryDate: '2026-09-30',
        amountMinor: 2000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    const september = await accounting.getBankReconciliation('2026-09-30');
    const deposit = september.candidates.find((candidate) => candidate.debitMinor > 0)!;
    await accounting.createBankReconciliation(
      {
        statementDate: '2026-09-30',
        openingBalanceMinor: 0,
        closingBalanceMinor: 10000,
        clearedJournalLineIds: [deposit.journalLineId],
      },
      'admin',
    );

    const october = await accounting.getBankReconciliation('2026-10-31');
    expect(october.openingBalanceMinor).toBe(10000);
    expect(october.previousStatementDate).toBe('2026-09-30');
    expect(october.candidates).toHaveLength(1);
    expect(october.candidates[0].movementMinor).toBe(-2000);
    await accounting.createBankReconciliation(
      {
        statementDate: '2026-10-31',
        openingBalanceMinor: october.openingBalanceMinor,
        closingBalanceMinor: 8000,
        clearedJournalLineIds: [october.candidates[0].journalLineId],
      },
      'admin',
    );
  });

  it('rejects a mismatched closing balance, an already reconciled line, and an earlier statement date', async () => {
    await accounting.createVoucher(
      {
        entryType: JournalEntryType.OWNER_CONTRIBUTION,
        entryDate: '2026-09-02',
        amountMinor: 10000,
        cashBankAccountCode: 'BANK',
      },
      'admin',
    );
    const { candidates } = await accounting.getBankReconciliation('2026-09-30');
    const lineId = candidates[0].journalLineId;
    const payload = {
      statementDate: '2026-09-30',
      openingBalanceMinor: 0,
      closingBalanceMinor: 10000,
      clearedJournalLineIds: [lineId],
    };
    await expect(
      accounting.createBankReconciliation({ ...payload, closingBalanceMinor: 9999 }, 'admin'),
    ).rejects.toThrow('Selected transactions do not reconcile');
    await accounting.createBankReconciliation(payload, 'admin');
    await expect(accounting.createBankReconciliation(payload, 'admin')).rejects.toThrow(
      'statementDate must be after the latest reconciliation',
    );
    await expect(
      accounting.createBankReconciliation(
        {
          ...payload,
          statementDate: '2026-10-31',
          openingBalanceMinor: 10000,
          clearedJournalLineIds: [lineId],
        },
        'admin',
      ),
    ).rejects.toThrow('already reconciled');
  });
});
