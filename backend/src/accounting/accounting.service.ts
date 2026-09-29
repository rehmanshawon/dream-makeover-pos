import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Account } from './account.entity';
import { AccountType } from './account-type.enum';
import { JournalEntry } from './journal-entry.entity';
import { JournalEntryType } from './journal-entry-type.enum';
import { JournalLine } from './journal-line.entity';
import { AccountingJournalQueryDto } from './dto/accounting-journal-query.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../salary-payments/payment-method.enum';
import { PurchasePaymentMethod } from '../purchases/purchase-payment-method.enum';
import { BankReconciliation } from './bank-reconciliation.entity';
import { BankReconciliationLine } from './bank-reconciliation-line.entity';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { AccountingPeriod } from './accounting-period.entity';
import { ReverseJournalEntryDto } from './dto/reverse-journal-entry.dto';

interface AccountBalanceRow {
  accountId: string;
  debitMinor: string | number | null;
  creditMinor: string | number | null;
}

interface TrialBalanceRawRow extends AccountBalanceRow {
  code: string;
  name: string;
  type: AccountType;
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly entryRepository: Repository<JournalEntry>,
  ) {}

  /** Returns chart-of-account rows with signed balances from posted journal lines. */
  async getAccounts(): Promise<
    Array<{ id: string; code: string; name: string; type: AccountType; balanceMinor: number }>
  > {
    const accounts = await this.accountRepository.find({ order: { code: 'ASC' } });
    const balanceRows = (await this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .select('line.accountId', 'accountId')
      .addSelect('SUM(line.debitMinor)', 'debitMinor')
      .addSelect('SUM(line.creditMinor)', 'creditMinor')
      .groupBy('line.accountId')
      .getRawMany()) as AccountBalanceRow[];
    const balances = new Map(balanceRows.map((row) => [row.accountId, row]));

    return accounts.map((account) => {
      const totals = balances.get(account.id);
      const debits = Number(totals?.debitMinor ?? 0);
      const credits = Number(totals?.creditMinor ?? 0);
      const debitNormal =
        account.type === AccountType.ASSET ||
        account.type === AccountType.CONTRA_EQUITY ||
        account.type === AccountType.EXPENSE;
      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balanceMinor: debitNormal ? debits - credits : credits - debits,
      };
    });
  }

  async getTrialBalance(asOf: string): Promise<{
    asOf: string;
    lines: Array<{
      accountId: string;
      code: string;
      name: string;
      type: AccountType;
      debitBalanceMinor: number;
      creditBalanceMinor: number;
    }>;
    totalDebitsMinor: number;
    totalCreditsMinor: number;
  }> {
    if (!this.isRealDate(asOf))
      throw new BadRequestException('asOf must be a valid calendar date.');
    const accounts = await this.accountRepository.find({ order: { code: 'ASC' } });
    const rawRows = (await this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .innerJoin('line.account', 'account')
      .select('account.id', 'accountId')
      .addSelect('account.code', 'code')
      .addSelect('account.name', 'name')
      .addSelect('account.type', 'type')
      .addSelect('SUM(line.debitMinor)', 'debitMinor')
      .addSelect('SUM(line.creditMinor)', 'creditMinor')
      .where('entry.entryDate <= :asOf', { asOf })
      .groupBy('account.id')
      .addGroupBy('account.code')
      .addGroupBy('account.name')
      .addGroupBy('account.type')
      .getRawMany()) as TrialBalanceRawRow[];
    const balances = new Map(rawRows.map((row) => [row.accountId, row]));
    const lines = accounts.map((account) => {
      const totals = balances.get(account.id);
      const netDebitMinor = Number(totals?.debitMinor ?? 0) - Number(totals?.creditMinor ?? 0);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debitBalanceMinor: Math.max(netDebitMinor, 0),
        creditBalanceMinor: Math.max(-netDebitMinor, 0),
      };
    });
    return {
      asOf,
      lines,
      totalDebitsMinor: lines.reduce((sum, line) => sum + line.debitBalanceMinor, 0),
      totalCreditsMinor: lines.reduce((sum, line) => sum + line.creditBalanceMinor, 0),
    };
  }

  async getBalanceSheet(asOf: string): Promise<{
    asOf: string;
    assets: Array<{ code: string; name: string; balanceMinor: number }>;
    liabilities: Array<{ code: string; name: string; balanceMinor: number }>;
    equity: Array<{ code: string; name: string; balanceMinor: number }>;
    currentEarningsMinor: number;
    totalAssetsMinor: number;
    totalLiabilitiesMinor: number;
    totalEquityMinor: number;
    totalLiabilitiesAndEquityMinor: number;
  }> {
    const trialBalance = await this.getTrialBalance(asOf);
    const balanceFor = (line: (typeof trialBalance.lines)[number]): number => {
      if (
        line.type === AccountType.ASSET ||
        line.type === AccountType.CONTRA_EQUITY ||
        line.type === AccountType.EXPENSE
      ) {
        return line.debitBalanceMinor - line.creditBalanceMinor;
      }
      return line.creditBalanceMinor - line.debitBalanceMinor;
    };
    const assets = trialBalance.lines
      .filter((line) => line.type === AccountType.ASSET)
      .map((line) => ({ code: line.code, name: line.name, balanceMinor: balanceFor(line) }));
    const liabilities = trialBalance.lines
      .filter((line) => line.type === AccountType.LIABILITY)
      .map((line) => ({ code: line.code, name: line.name, balanceMinor: balanceFor(line) }));
    const equity = trialBalance.lines
      .filter((line) => line.type === AccountType.EQUITY || line.type === AccountType.CONTRA_EQUITY)
      .map((line) => ({ code: line.code, name: line.name, balanceMinor: balanceFor(line) }));
    const currentEarningsMinor = trialBalance.lines.reduce((total, line) => {
      if (line.type === AccountType.REVENUE) {
        return total + line.creditBalanceMinor - line.debitBalanceMinor;
      }
      if (line.type === AccountType.EXPENSE) {
        return total - line.debitBalanceMinor + line.creditBalanceMinor;
      }
      return total;
    }, 0);
    const totalAssetsMinor = assets.reduce((sum, line) => sum + line.balanceMinor, 0);
    const totalLiabilitiesMinor = liabilities.reduce((sum, line) => sum + line.balanceMinor, 0);
    const totalEquityMinor =
      equity.reduce((sum, line) => sum + line.balanceMinor, 0) + currentEarningsMinor;
    return {
      asOf,
      assets,
      liabilities,
      equity: [
        ...equity,
        {
          code: 'CURRENT_EARNINGS',
          name: 'Current and retained earnings',
          balanceMinor: currentEarningsMinor,
        },
      ],
      currentEarningsMinor,
      totalAssetsMinor,
      totalLiabilitiesMinor,
      totalEquityMinor,
      totalLiabilitiesAndEquityMinor: totalLiabilitiesMinor + totalEquityMinor,
    };
  }

  /** Returns posted vouchers with their account lines, newest first. */
  async getJournal(query: AccountingJournalQueryDto): Promise<JournalEntry[]> {
    if ((query.from && !this.isRealDate(query.from)) || (query.to && !this.isRealDate(query.to))) {
      throw new BadRequestException('Journal filters must be valid calendar dates.');
    }
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must not be after to');
    }

    const where: Record<string, unknown> = {};
    if (query.from && query.to) where.entryDate = Between(query.from, query.to);
    else if (query.from) where.entryDate = MoreThanOrEqual(query.from);
    else if (query.to) where.entryDate = LessThanOrEqual(query.to);

    return this.entryRepository.find({
      where,
      relations: { lines: { account: true } },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
      take: 500,
    });
  }

  async getAccountingPeriods(): Promise<AccountingPeriod[]> {
    return this.dataSource.getRepository(AccountingPeriod).find({
      where: { closedAt: Not(IsNull()) },
      order: { periodKey: 'DESC' },
    });
  }

  async closeAccountingPeriod(period: string, closedBy: string): Promise<AccountingPeriod> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new BadRequestException('period must be a valid YYYY-MM month.');
    }
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (period >= currentMonth)
      throw new BadRequestException('Only a completed accounting month can be closed.');

    return this.dataSource.transaction(async (manager) => {
      const periodRepo = manager.getRepository(AccountingPeriod);
      try {
        await periodRepo.insert({ periodKey: period, closedAt: null, closedBy: null });
      } catch (error) {
        const databaseError = error as { code?: string; driverError?: { code?: string } };
        if (
          databaseError.code !== 'ER_DUP_ENTRY' &&
          databaseError.driverError?.code !== 'ER_DUP_ENTRY'
        ) {
          throw error;
        }
      }
      const rows: AccountingPeriod[] = await manager.query(
        'SELECT period_key AS periodKey, closed_at AS closedAt, closed_by AS closedBy FROM accounting_periods WHERE period_key = ? FOR UPDATE',
        [period],
      );
      if (rows[0]?.closedAt)
        throw new BadRequestException(`Accounting period ${period} is already closed.`);

      const closed = await periodRepo.save({
        periodKey: period,
        closedAt: new Date(),
        closedBy,
      });
      return closed;
    });
  }

  async reverseJournalEntry(
    entryId: string,
    dto: ReverseJournalEntryDto,
    createdBy: string,
  ): Promise<JournalEntry> {
    if (!this.isRealDate(dto.reversalDate)) {
      throw new BadRequestException('reversalDate must be a valid calendar date.');
    }
    return this.dataSource.transaction(async (manager) => {
      const entryRepo = manager.getRepository(JournalEntry);
      const original = await entryRepo.findOne({
        where: { id: entryId },
        relations: { lines: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!original) throw new BadRequestException('Journal entry was not found.');
      if (
        original.entryType === JournalEntryType.JOURNAL_REVERSAL ||
        original.sourceReversalEntryId
      ) {
        throw new BadRequestException('A reversal entry cannot itself be reversed.');
      }
      if (await entryRepo.exist({ where: { sourceReversalEntryId: original.id } })) {
        throw new BadRequestException('This journal entry has already been reversed.');
      }
      if (!original.lines.length)
        throw new BadRequestException('Journal entry has no lines to reverse.');

      const reversal = await entryRepo.save(
        entryRepo.create({
          entryType: JournalEntryType.JOURNAL_REVERSAL,
          entryDate: dto.reversalDate,
          memo: `Reversal: ${dto.reason.trim()}`,
          reference: original.reference ?? original.id,
          sourceReversalEntryId: original.id,
          createdBy,
        }),
      );
      const lineRepo = manager.getRepository(JournalLine);
      await lineRepo.save(
        original.lines.map((line) =>
          lineRepo.create({
            entryId: reversal.id,
            accountId: line.accountId,
            debitMinor: line.creditMinor,
            creditMinor: line.debitMinor,
          }),
        ),
      );
      const saved = await entryRepo.findOne({
        where: { id: reversal.id },
        relations: { lines: { account: true } },
      });
      if (!saved) throw new Error('Reversal entry could not be reloaded.');
      return saved;
    });
  }

  async getBankReconciliation(statementDate: string): Promise<{
    openingBalanceMinor: number;
    previousStatementDate: string | null;
    completedReconciliation: BankReconciliation | null;
    candidates: Array<{
      journalLineId: string;
      entryDate: string;
      memo: string;
      reference: string | null;
      debitMinor: number;
      creditMinor: number;
      movementMinor: number;
    }>;
  }> {
    if (!this.isRealDate(statementDate)) {
      throw new BadRequestException('statementDate must be a valid calendar date.');
    }
    const bankAccount = await this.accountRepository.findOne({ where: { code: 'BANK' } });
    if (!bankAccount) throw new BadRequestException('Business bank account is missing.');
    const reconciliationRepo = this.dataSource.getRepository(BankReconciliation);
    const previous = await reconciliationRepo.findOne({
      where: { accountId: bankAccount.id },
      order: { statementDate: 'DESC' },
    });
    const completed = await reconciliationRepo.findOne({
      where: { accountId: bankAccount.id, statementDate },
    });
    if (completed) {
      return {
        openingBalanceMinor: completed.openingBalanceMinor,
        previousStatementDate: null,
        completedReconciliation: completed,
        candidates: [],
      };
    }
    if (previous && statementDate <= previous.statementDate) {
      throw new BadRequestException('statementDate must be after the latest reconciliation.');
    }

    const reconciled = await this.dataSource
      .getRepository(BankReconciliationLine)
      .find({ select: { journalLineId: true } });
    const reconciledIds = reconciled.map((line) => line.journalLineId);
    const lineRepo = this.dataSource.getRepository(JournalLine);
    const query = lineRepo
      .createQueryBuilder('line')
      .innerJoinAndSelect('line.entry', 'entry')
      .innerJoinAndSelect('line.account', 'account')
      .where('account.code = :accountCode', { accountCode: 'BANK' })
      .andWhere('entry.entryDate <= :statementDate', { statementDate })
      .orderBy('entry.entryDate', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC');
    if (reconciledIds.length > 0)
      query.andWhere('line.id NOT IN (:...reconciledIds)', { reconciledIds });
    const lines = await query.getMany();

    return {
      openingBalanceMinor: previous?.closingBalanceMinor ?? 0,
      previousStatementDate: previous?.statementDate ?? null,
      completedReconciliation: null,
      candidates: lines.map((line) => ({
        journalLineId: line.id,
        entryDate: line.entry.entryDate,
        memo: line.entry.memo,
        reference: line.entry.reference,
        debitMinor: line.debitMinor,
        creditMinor: line.creditMinor,
        movementMinor: line.debitMinor - line.creditMinor,
      })),
    };
  }

  async createBankReconciliation(
    dto: CreateBankReconciliationDto,
    createdBy: string,
  ): Promise<BankReconciliation> {
    if (!this.isRealDate(dto.statementDate)) {
      throw new BadRequestException('statementDate must be a valid calendar date.');
    }
    if (
      !Number.isSafeInteger(dto.openingBalanceMinor) ||
      !Number.isSafeInteger(dto.closingBalanceMinor)
    ) {
      throw new BadRequestException('Statement balances exceed supported accounting limits.');
    }
    if (new Set(dto.clearedJournalLineIds).size !== dto.clearedJournalLineIds.length) {
      throw new BadRequestException('A bank journal line may only be selected once.');
    }

    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const bankAccount = await accountRepo.findOne({
        where: { code: 'BANK' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bankAccount) throw new BadRequestException('Business bank account is missing.');

      const reconciliationRepo = manager.getRepository(BankReconciliation);
      const previous = await reconciliationRepo.findOne({
        where: { accountId: bankAccount.id },
        order: { statementDate: 'DESC' },
      });
      if (previous && dto.statementDate <= previous.statementDate) {
        throw new BadRequestException('statementDate must be after the latest reconciliation.');
      }
      if (previous && dto.openingBalanceMinor !== previous.closingBalanceMinor) {
        throw new BadRequestException(
          'Opening balance must equal the prior statement closing balance.',
        );
      }

      const ids = dto.clearedJournalLineIds;
      const selectedLines = ids.length
        ? await manager.getRepository(JournalLine).find({
            where: { id: In(ids) },
            relations: { entry: true, account: true },
          })
        : [];
      if (selectedLines.length !== ids.length) {
        throw new BadRequestException('One or more selected bank transactions were not found.');
      }
      if (
        selectedLines.some(
          (line) => line.account.code !== 'BANK' || line.entry.entryDate > dto.statementDate,
        )
      ) {
        throw new BadRequestException(
          'Only bank transactions dated on or before the statement can be cleared.',
        );
      }
      const alreadyReconciled = ids.length
        ? await manager.getRepository(BankReconciliationLine).find({
            where: { journalLineId: In(ids) },
          })
        : [];
      if (alreadyReconciled.length > 0) {
        throw new BadRequestException(
          'One or more selected bank transactions were already reconciled.',
        );
      }

      const clearedMovementMinor = selectedLines.reduce(
        (sum, line) => sum + line.debitMinor - line.creditMinor,
        0,
      );
      if (
        !Number.isSafeInteger(clearedMovementMinor) ||
        dto.openingBalanceMinor + clearedMovementMinor !== dto.closingBalanceMinor
      ) {
        throw new BadRequestException(
          'Selected transactions do not reconcile to the statement closing balance.',
        );
      }

      const reconciliation = await reconciliationRepo.save(
        reconciliationRepo.create({
          accountId: bankAccount.id,
          statementDate: dto.statementDate,
          openingBalanceMinor: dto.openingBalanceMinor,
          closingBalanceMinor: dto.closingBalanceMinor,
          clearedMovementMinor,
          createdBy,
        }),
      );
      if (selectedLines.length > 0) {
        await manager.getRepository(BankReconciliationLine).save(
          selectedLines.map((line) =>
            manager.getRepository(BankReconciliationLine).create({
              reconciliationId: reconciliation.id,
              journalLineId: line.id,
            }),
          ),
        );
      }
      reconciliation.lines = [];
      return reconciliation;
    });
  }

  /** Posts a supported cash/bank voucher as balanced debit and credit lines atomically. */
  async createVoucher(dto: CreateVoucherDto, createdBy: string): Promise<JournalEntry> {
    if (!this.isRealDate(dto.entryDate)) {
      throw new BadRequestException('entryDate must be a valid calendar date.');
    }

    const postings = this.resolvePostings(dto);
    if (postings.debitMinor !== postings.creditMinor) {
      throw new BadRequestException('Journal entry debits and credits must balance.');
    }

    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(Account);
      const entryRepo = manager.getRepository(JournalEntry);
      const lineRepo = manager.getRepository(JournalLine);
      const accounts = await Promise.all(
        [...new Set(postings.lines.map((line) => line.code))].map((code) =>
          accountRepo.findOne({ where: { code } }),
        ),
      );
      const accountsByCode = new Map(
        accounts
          .filter((account): account is Account => account !== null)
          .map((account) => [account.code, account]),
      );
      if (accountsByCode.size !== new Set(postings.lines.map((line) => line.code)).size) {
        throw new BadRequestException('A required accounting account is missing.');
      }

      const entry = await entryRepo.save(
        entryRepo.create({
          entryType: dto.entryType,
          entryDate: dto.entryDate,
          memo: dto.memo?.trim() || postings.defaultMemo,
          reference: dto.reference?.trim() || null,
          createdBy,
        }),
      );
      await lineRepo.save(
        postings.lines.map((line) =>
          lineRepo.create({
            entryId: entry.id,
            accountId: accountsByCode.get(line.code)!.id,
            debitMinor: line.debitMinor,
            creditMinor: line.creditMinor,
          }),
        ),
      );

      const saved = await entryRepo.findOne({
        where: { id: entry.id },
        relations: { lines: { account: true } },
      });
      if (!saved) throw new Error('Posted journal entry could not be reloaded.');
      return saved;
    });
  }

  async upsertExpenseEntry(
    manager: EntityManager,
    posting: {
      sourceExpenseId: string;
      entryDate: string;
      amountMinor: number;
      expenseAccountCode: string;
      paymentAccountCode: string;
      memo: string;
      reference: string | null;
      createdBy: string;
    },
  ): Promise<void> {
    const accountRepo = manager.getRepository(Account);
    const [expenseAccount, paymentAccount] = await Promise.all([
      accountRepo.findOne({ where: { code: posting.expenseAccountCode } }),
      accountRepo.findOne({ where: { code: posting.paymentAccountCode } }),
    ]);
    if (!expenseAccount || !paymentAccount) {
      throw new Error('A required expense accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    let entry = await entryRepo.findOne({ where: { sourceExpenseId: posting.sourceExpenseId } });
    if (entry) {
      await lineRepo.delete({ entryId: entry.id });
    } else {
      entry = entryRepo.create({
        entryType: JournalEntryType.EXPENSE_PAYMENT,
        sourceExpenseId: posting.sourceExpenseId,
      });
    }

    entry.entryType = JournalEntryType.EXPENSE_PAYMENT;
    entry.entryDate = posting.entryDate;
    entry.memo = posting.memo;
    entry.reference = posting.reference;
    entry.createdBy = posting.createdBy;
    const savedEntry = await entryRepo.save(entry);
    await lineRepo.save([
      lineRepo.create({
        entryId: savedEntry.id,
        accountId: expenseAccount.id,
        debitMinor: posting.amountMinor,
        creditMinor: 0,
      }),
      lineRepo.create({
        entryId: savedEntry.id,
        accountId: paymentAccount.id,
        debitMinor: 0,
        creditMinor: posting.amountMinor,
      }),
    ]);
  }

  async removeExpenseEntry(manager: EntityManager, sourceExpenseId: string): Promise<void> {
    const entryRepo = manager.getRepository(JournalEntry);
    const entry = await entryRepo.findOne({ where: { sourceExpenseId } });
    if (!entry) return;

    const lineRepo = manager.getRepository(JournalLine);
    await lineRepo.delete({ entryId: entry.id });
    await entryRepo.remove(entry);
  }

  async createSalaryPaymentEntry(
    manager: EntityManager,
    payment: {
      sourceSalaryPaymentId: string;
      entryDate: string;
      amountMinor: number;
      paymentType: SalaryPaymentType;
      paymentMethod: PaymentMethod;
      employeeName: string;
      createdBy: string;
    },
  ): Promise<void> {
    const advance = payment.paymentType === SalaryPaymentType.ADVANCE;
    const adjustment = payment.paymentType === SalaryPaymentType.ADVANCE_ADJUSTMENT;
    const debitCode = advance ? 'EMPLOYEE_ADVANCES' : 'PAYROLL_EXPENSE';
    const creditCode = adjustment
      ? 'EMPLOYEE_ADVANCES'
      : payment.paymentMethod === PaymentMethod.BANK
        ? 'BANK'
        : payment.paymentMethod === PaymentMethod.MOBILE
          ? 'MOBILE_WALLET'
          : 'CASH';
    const accountRepo = manager.getRepository(Account);
    const [debitAccount, creditAccount] = await Promise.all([
      accountRepo.findOne({ where: { code: debitCode } }),
      accountRepo.findOne({ where: { code: creditCode } }),
    ]);
    if (!debitAccount || !creditAccount) {
      throw new Error('A required payroll accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.SALARY_PAYMENT,
        entryDate: payment.entryDate,
        memo: `${payment.paymentType.replaceAll('_', ' ')} - ${payment.employeeName}`,
        reference: payment.sourceSalaryPaymentId,
        sourceSalaryPaymentId: payment.sourceSalaryPaymentId,
        createdBy: payment.createdBy,
      }),
    );
    await lineRepo.save([
      lineRepo.create({
        entryId: entry.id,
        accountId: debitAccount.id,
        debitMinor: payment.amountMinor,
        creditMinor: 0,
      }),
      lineRepo.create({
        entryId: entry.id,
        accountId: creditAccount.id,
        debitMinor: 0,
        creditMinor: payment.amountMinor,
      }),
    ]);
  }

  async removeSalaryPaymentEntry(
    manager: EntityManager,
    sourceSalaryPaymentId: string,
  ): Promise<void> {
    const entryRepo = manager.getRepository(JournalEntry);
    const entry = await entryRepo.findOne({ where: { sourceSalaryPaymentId } });
    if (!entry) return;

    await manager.getRepository(JournalLine).delete({ entryId: entry.id });
    await entryRepo.remove(entry);
  }

  async createInventoryAdjustmentEntry(
    manager: EntityManager,
    adjustment: {
      sourceStockMovementId: string;
      entryDate: string;
      delta: number;
      inventoryValueMinor: number;
      note: string | null;
      createdBy: string;
    },
  ): Promise<void> {
    if (adjustment.inventoryValueMinor <= 0) return;

    const shortage = adjustment.delta < 0;
    const inventoryAccountCode = 'INVENTORY';
    const varianceAccountCode = shortage ? 'INVENTORY_SHRINKAGE' : 'INVENTORY_ADJUSTMENT_GAIN';
    const accountRepo = manager.getRepository(Account);
    const [inventoryAccount, varianceAccount] = await Promise.all([
      accountRepo.findOne({ where: { code: inventoryAccountCode } }),
      accountRepo.findOne({ where: { code: varianceAccountCode } }),
    ]);
    if (!inventoryAccount || !varianceAccount) {
      throw new Error('A required inventory adjustment accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.INVENTORY_ADJUSTMENT,
        entryDate: adjustment.entryDate,
        memo:
          adjustment.note?.trim() ||
          (shortage ? 'Inventory count shortage' : 'Inventory count surplus'),
        reference: adjustment.sourceStockMovementId,
        sourceStockMovementId: adjustment.sourceStockMovementId,
        createdBy: adjustment.createdBy,
      }),
    );
    await lineRepo.save(
      shortage
        ? [
            lineRepo.create({
              entryId: entry.id,
              accountId: varianceAccount.id,
              debitMinor: adjustment.inventoryValueMinor,
              creditMinor: 0,
            }),
            lineRepo.create({
              entryId: entry.id,
              accountId: inventoryAccount.id,
              debitMinor: 0,
              creditMinor: adjustment.inventoryValueMinor,
            }),
          ]
        : [
            lineRepo.create({
              entryId: entry.id,
              accountId: inventoryAccount.id,
              debitMinor: adjustment.inventoryValueMinor,
              creditMinor: 0,
            }),
            lineRepo.create({
              entryId: entry.id,
              accountId: varianceAccount.id,
              debitMinor: 0,
              creditMinor: adjustment.inventoryValueMinor,
            }),
          ],
    );
  }

  async createSalesReturnEntry(
    manager: EntityManager,
    salesReturn: {
      sourceSalesReturnId: string;
      returnDate: string;
      refundMethod: PaymentMethod;
      refundMinor: number;
      revenueReversalMinor: number;
      vatReversalMinor: number;
      cogsReversalMinor: number;
      createdBy: string;
    },
  ): Promise<void> {
    const refundAccountCode = {
      [PaymentMethod.CASH]: 'CASH',
      [PaymentMethod.BANK]: 'BANK',
      [PaymentMethod.MOBILE]: 'MOBILE_WALLET',
    }[salesReturn.refundMethod];
    const accountRepo = manager.getRepository(Account);
    const codes = [refundAccountCode];
    if (salesReturn.revenueReversalMinor > 0) codes.push('SALES_REVENUE');
    if (salesReturn.vatReversalMinor > 0) codes.push('VAT_PAYABLE');
    if (salesReturn.cogsReversalMinor > 0) codes.push('COST_OF_GOODS_SOLD', 'INVENTORY');
    const foundAccounts = await Promise.all(
      [...new Set(codes)].map((code) => accountRepo.findOne({ where: { code } })),
    );
    const accounts = new Map(
      foundAccounts
        .filter((account): account is Account => account !== null)
        .map((account) => [account.code, account]),
    );
    if (accounts.size !== new Set(codes).size) {
      throw new Error('A required sales return accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.SALES_RETURN,
        entryDate: salesReturn.returnDate,
        memo: 'Customer product return',
        reference: salesReturn.sourceSalesReturnId,
        sourceSalesReturnId: salesReturn.sourceSalesReturnId,
        createdBy: salesReturn.createdBy,
      }),
    );
    const lines = [];
    if (salesReturn.revenueReversalMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get('SALES_REVENUE')!.id,
          debitMinor: salesReturn.revenueReversalMinor,
          creditMinor: 0,
        }),
      );
    }
    if (salesReturn.vatReversalMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get('VAT_PAYABLE')!.id,
          debitMinor: salesReturn.vatReversalMinor,
          creditMinor: 0,
        }),
      );
    }
    if (salesReturn.cogsReversalMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get('INVENTORY')!.id,
          debitMinor: salesReturn.cogsReversalMinor,
          creditMinor: 0,
        }),
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get('COST_OF_GOODS_SOLD')!.id,
          debitMinor: 0,
          creditMinor: salesReturn.cogsReversalMinor,
        }),
      );
    }
    if (salesReturn.refundMinor > 0) {
      if (salesReturn.refundMinor > 0) {
        lines.push(
          lineRepo.create({
            entryId: entry.id,
            accountId: accounts.get(refundAccountCode)!.id,
            debitMinor: 0,
            creditMinor: salesReturn.refundMinor,
          }),
        );
      }
    }
    await lineRepo.save(lines);
  }

  async createSupplierReturnEntry(
    manager: EntityManager,
    supplierReturn: {
      sourceSupplierReturnId: string;
      returnDate: string;
      refundMethod: PurchasePaymentMethod;
      creditMinor: number;
      inventoryValueMinor: number;
      createdBy: string;
    },
  ): Promise<void> {
    const settlementAccountCode = {
      [PurchasePaymentMethod.CASH]: 'CASH',
      [PurchasePaymentMethod.BANK]: 'BANK',
      [PurchasePaymentMethod.MOBILE]: 'MOBILE_WALLET',
      [PurchasePaymentMethod.CREDIT]: 'ACCOUNTS_PAYABLE',
    }[supplierReturn.refundMethod];
    const varianceMinor = Math.abs(supplierReturn.creditMinor - supplierReturn.inventoryValueMinor);
    const varianceAccountCode =
      supplierReturn.creditMinor > supplierReturn.inventoryValueMinor
        ? 'SUPPLIER_RETURN_GAIN'
        : 'SUPPLIER_RETURN_LOSS';
    const codes = ['INVENTORY', settlementAccountCode];
    if (varianceMinor > 0) codes.push(varianceAccountCode);
    const accountRepo = manager.getRepository(Account);
    const foundAccounts = await Promise.all(
      [...new Set(codes)].map((code) => accountRepo.findOne({ where: { code } })),
    );
    const accounts = new Map(
      foundAccounts
        .filter((account): account is Account => account !== null)
        .map((account) => [account.code, account]),
    );
    if (accounts.size !== new Set(codes).size) {
      throw new Error('A required supplier return accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.SUPPLIER_RETURN,
        entryDate: supplierReturn.returnDate,
        memo: 'Supplier inventory return',
        reference: supplierReturn.sourceSupplierReturnId,
        sourceSupplierReturnId: supplierReturn.sourceSupplierReturnId,
        createdBy: supplierReturn.createdBy,
      }),
    );
    const lines = [
      lineRepo.create({
        entryId: entry.id,
        accountId: accounts.get(settlementAccountCode)!.id,
        debitMinor: supplierReturn.creditMinor,
        creditMinor: 0,
      }),
    ];
    if (supplierReturn.inventoryValueMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get('INVENTORY')!.id,
          debitMinor: 0,
          creditMinor: supplierReturn.inventoryValueMinor,
        }),
      );
    }
    if (varianceMinor > 0) {
      const loss = supplierReturn.creditMinor < supplierReturn.inventoryValueMinor;
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: accounts.get(varianceAccountCode)!.id,
          debitMinor: loss ? varianceMinor : 0,
          creditMinor: loss ? 0 : varianceMinor,
        }),
      );
    }
    await lineRepo.save(lines);
  }

  async createInventoryRevaluationEntry(
    manager: EntityManager,
    revaluation: {
      sourceCostRevaluationId: string;
      effectiveDate: string;
      inventoryValueDeltaMinor: number;
      createdBy: string;
    },
  ): Promise<void> {
    if (revaluation.inventoryValueDeltaMinor === 0) return;
    const increase = revaluation.inventoryValueDeltaMinor > 0;
    const varianceCode = increase ? 'INVENTORY_REVALUATION_GAIN' : 'INVENTORY_REVALUATION_LOSS';
    const accountRepo = manager.getRepository(Account);
    const [inventory, variance] = await Promise.all([
      accountRepo.findOne({ where: { code: 'INVENTORY' } }),
      accountRepo.findOne({ where: { code: varianceCode } }),
    ]);
    if (!inventory || !variance) {
      throw new Error('A required inventory revaluation accounting account is missing.');
    }
    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.INVENTORY_REVALUATION,
        entryDate: revaluation.effectiveDate,
        memo: increase
          ? 'Inventory cost revaluation increase'
          : 'Inventory cost revaluation decrease',
        reference: revaluation.sourceCostRevaluationId,
        sourceCostRevaluationId: revaluation.sourceCostRevaluationId,
        createdBy: revaluation.createdBy,
      }),
    );
    await lineRepo.save(
      increase
        ? [
            lineRepo.create({
              entryId: entry.id,
              accountId: inventory.id,
              debitMinor: revaluation.inventoryValueDeltaMinor,
              creditMinor: 0,
            }),
            lineRepo.create({
              entryId: entry.id,
              accountId: variance.id,
              debitMinor: 0,
              creditMinor: revaluation.inventoryValueDeltaMinor,
            }),
          ]
        : [
            lineRepo.create({
              entryId: entry.id,
              accountId: variance.id,
              debitMinor: -revaluation.inventoryValueDeltaMinor,
              creditMinor: 0,
            }),
            lineRepo.create({
              entryId: entry.id,
              accountId: inventory.id,
              debitMinor: 0,
              creditMinor: -revaluation.inventoryValueDeltaMinor,
            }),
          ],
    );
  }

  async createSaleEntry(
    manager: EntityManager,
    sale: {
      sourceTransactionId: string;
      entryDate: string;
      invoiceId: string;
      totalMinor: number;
      revenueMinor: number;
      vatMinor: number;
      cogsMinor: number;
      createdBy: string;
    },
  ): Promise<void> {
    if (sale.totalMinor === 0 && sale.cogsMinor === 0) return;

    const accountRepo = manager.getRepository(Account);
    const [cashAccount, revenueAccount, vatAccount, cogsAccount, inventoryAccount] =
      await Promise.all([
        sale.totalMinor > 0
          ? accountRepo.findOne({ where: { code: 'CASH' } })
          : Promise.resolve(null),
        sale.revenueMinor > 0
          ? accountRepo.findOne({ where: { code: 'SALES_REVENUE' } })
          : Promise.resolve(null),
        sale.vatMinor > 0
          ? accountRepo.findOne({ where: { code: 'VAT_PAYABLE' } })
          : Promise.resolve(null),
        sale.cogsMinor > 0
          ? accountRepo.findOne({ where: { code: 'COST_OF_GOODS_SOLD' } })
          : Promise.resolve(null),
        sale.cogsMinor > 0
          ? accountRepo.findOne({ where: { code: 'INVENTORY' } })
          : Promise.resolve(null),
      ]);
    if (
      (sale.totalMinor > 0 && !cashAccount) ||
      (sale.revenueMinor > 0 && !revenueAccount) ||
      (sale.vatMinor > 0 && !vatAccount) ||
      (sale.cogsMinor > 0 && (!cogsAccount || !inventoryAccount))
    ) {
      throw new Error('A required sales accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.SALE_RECEIPT,
        entryDate: sale.entryDate,
        memo: `POS sale ${sale.invoiceId}`,
        reference: sale.invoiceId,
        sourceTransactionId: sale.sourceTransactionId,
        createdBy: sale.createdBy,
      }),
    );

    const lines = [];
    if (cashAccount && sale.totalMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: cashAccount.id,
          debitMinor: sale.totalMinor,
          creditMinor: 0,
        }),
      );
    }
    if (revenueAccount && sale.revenueMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: revenueAccount.id,
          debitMinor: 0,
          creditMinor: sale.revenueMinor,
        }),
      );
    }
    if (vatAccount && sale.vatMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: vatAccount.id,
          debitMinor: 0,
          creditMinor: sale.vatMinor,
        }),
      );
    }
    if (cogsAccount && inventoryAccount && sale.cogsMinor > 0) {
      lines.push(
        lineRepo.create({
          entryId: entry.id,
          accountId: cogsAccount.id,
          debitMinor: sale.cogsMinor,
          creditMinor: 0,
        }),
        lineRepo.create({
          entryId: entry.id,
          accountId: inventoryAccount.id,
          debitMinor: 0,
          creditMinor: sale.cogsMinor,
        }),
      );
    }
    await lineRepo.save(lines);
  }

  async createPurchaseEntry(
    manager: EntityManager,
    purchase: {
      sourcePurchaseId: string;
      purchaseDate: string;
      supplierName: string | null;
      supplierReference: string | null;
      paymentMethod: 'CASH' | 'BANK' | 'MOBILE' | 'CREDIT';
      totalMinor: number;
      createdBy: string;
    },
  ): Promise<void> {
    const accountRepo = manager.getRepository(Account);
    const paymentCode = {
      CASH: 'CASH',
      BANK: 'BANK',
      MOBILE: 'MOBILE_WALLET',
      CREDIT: 'ACCOUNTS_PAYABLE',
    }[purchase.paymentMethod];
    const [inventoryAccount, paymentAccount] = await Promise.all([
      accountRepo.findOne({ where: { code: 'INVENTORY' } }),
      accountRepo.findOne({ where: { code: paymentCode } }),
    ]);
    if (!inventoryAccount || !paymentAccount) {
      throw new Error('A required purchase accounting account is missing.');
    }

    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const memo = `Inventory purchase${purchase.supplierName ? ` from ${purchase.supplierName}` : ''}`;
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.PURCHASE,
        entryDate: purchase.purchaseDate,
        memo,
        reference: purchase.supplierReference,
        sourcePurchaseId: purchase.sourcePurchaseId,
        createdBy: purchase.createdBy,
      }),
    );
    await lineRepo.save([
      lineRepo.create({
        entryId: entry.id,
        accountId: inventoryAccount.id,
        debitMinor: purchase.totalMinor,
        creditMinor: 0,
      }),
      lineRepo.create({
        entryId: entry.id,
        accountId: paymentAccount.id,
        debitMinor: 0,
        creditMinor: purchase.totalMinor,
      }),
    ]);
  }

  async createSupplierPaymentEntry(
    manager: EntityManager,
    payment: {
      paymentDate: string;
      amountMinor: number;
      supplierName: string;
      paymentAccountCode: string;
      reference: string | null;
      createdBy: string;
    },
  ): Promise<void> {
    const accountRepo = manager.getRepository(Account);
    const [payableAccount, paymentAccount] = await Promise.all([
      accountRepo.findOne({ where: { code: 'ACCOUNTS_PAYABLE' } }),
      accountRepo.findOne({ where: { code: payment.paymentAccountCode } }),
    ]);
    if (!payableAccount || !paymentAccount) {
      throw new Error('A required supplier-payment accounting account is missing.');
    }
    const entryRepo = manager.getRepository(JournalEntry);
    const lineRepo = manager.getRepository(JournalLine);
    const entry = await entryRepo.save(
      entryRepo.create({
        entryType: JournalEntryType.SUPPLIER_PAYMENT,
        entryDate: payment.paymentDate,
        memo: `Payment to ${payment.supplierName}`,
        reference: payment.reference,
        createdBy: payment.createdBy,
      }),
    );
    await lineRepo.save([
      lineRepo.create({
        entryId: entry.id,
        accountId: payableAccount.id,
        debitMinor: payment.amountMinor,
        creditMinor: 0,
      }),
      lineRepo.create({
        entryId: entry.id,
        accountId: paymentAccount.id,
        debitMinor: 0,
        creditMinor: payment.amountMinor,
      }),
    ]);
  }

  private resolvePostings(dto: CreateVoucherDto): {
    defaultMemo: string;
    debitMinor: number;
    creditMinor: number;
    lines: Array<{ code: string; debitMinor: number; creditMinor: number }>;
  } {
    const amountMinor = dto.amountMinor;
    const cashBankCode = dto.cashBankAccountCode;
    if (dto.entryType === JournalEntryType.OWNER_CONTRIBUTION) {
      if (!cashBankCode || dto.fromAccountCode || dto.toAccountCode) {
        throw new BadRequestException('Choose cash or bank for an owner contribution.');
      }
      return {
        defaultMemo: `Owner contribution to ${cashBankCode.toLowerCase()}`,
        debitMinor: amountMinor,
        creditMinor: amountMinor,
        lines: [
          { code: cashBankCode, debitMinor: amountMinor, creditMinor: 0 },
          { code: 'OWNER_CAPITAL', debitMinor: 0, creditMinor: amountMinor },
        ],
      };
    }

    if (dto.entryType === JournalEntryType.OWNER_WITHDRAWAL) {
      if (!cashBankCode || dto.fromAccountCode || dto.toAccountCode) {
        throw new BadRequestException('Choose cash or bank for an owner withdrawal.');
      }
      return {
        defaultMemo: `Owner withdrawal from ${cashBankCode.toLowerCase()}`,
        debitMinor: amountMinor,
        creditMinor: amountMinor,
        lines: [
          { code: 'OWNER_DRAWINGS', debitMinor: amountMinor, creditMinor: 0 },
          { code: cashBankCode, debitMinor: 0, creditMinor: amountMinor },
        ],
      };
    }

    const fromCode = dto.fromAccountCode;
    const toCode = dto.toAccountCode;
    if (
      !fromCode ||
      !toCode ||
      fromCode === toCode ||
      cashBankCode ||
      !['CASH', 'BANK'].includes(fromCode) ||
      !['CASH', 'BANK'].includes(toCode)
    ) {
      throw new BadRequestException('Choose two different accounts: cash and bank.');
    }
    return {
      defaultMemo: `Transfer from ${fromCode.toLowerCase()} to ${toCode.toLowerCase()}`,
      debitMinor: amountMinor,
      creditMinor: amountMinor,
      lines: [
        { code: toCode, debitMinor: amountMinor, creditMinor: 0 },
        { code: fromCode, debitMinor: 0, creditMinor: amountMinor },
      ],
    };
  }

  private isRealDate(value: string): boolean {
    const [yearText, monthText, dayText] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }
}
