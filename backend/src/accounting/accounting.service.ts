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
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../salary-payments/payment-method.enum';

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
    lines.push(
      lineRepo.create({
        entryId: entry.id,
        accountId: accounts.get(refundAccountCode)!.id,
        debitMinor: 0,
        creditMinor: salesReturn.refundMinor,
      }),
    );
    await lineRepo.save(lines);
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
