import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Account } from './account.entity';
import { AccountType } from './account-type.enum';
import { JournalEntry } from './journal-entry.entity';
import { JournalEntryType } from './journal-entry-type.enum';
import { JournalLine } from './journal-line.entity';
import { AccountingJournalQueryDto } from './dto/accounting-journal-query.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';

interface AccountBalanceRow {
  accountId: string;
  debitMinor: string | number | null;
  creditMinor: string | number | null;
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
