import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem, TransactionItemType } from '../transactions/transaction-item.entity';
import { Expense } from '../expenses/expense.entity';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../salary-payments/salary-payment-type.enum';
import { SalesReturn } from '../returns/sales-return.entity';
import { SalesReturnLine } from '../returns/sales-return-line.entity';
import { JournalLine } from '../accounting/journal-line.entity';
import { DateRangeQueryDto, DateRangePreset, DateRange } from './dto/date-range-query.dto';
import {
  ExpenseBreakdownDto,
  ExpenseByCategoryDto,
  FinancialSummaryResponseDto,
  RevenueByTypeDto,
} from './dto/financial-summary-response.dto';

const COGS_METHOD = 'sale_time_moving_average_snapshot_with_legacy_estimates';

@Injectable()
export class FinancialSummaryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Produces a financial summary for the requested date range.
   *
   * The summary is a pragmatic P&L, not a complete accounting statement.
   * It does not account for taxes, depreciation, loans, or investments.
   *
   * Cost of goods sold uses the cost snapshot captured when each sale
   * was recorded. Legacy sales are backfilled with a best-effort estimate
   * from costs available when the snapshot migration ran.
   */
  async summarize(query: DateRangeQueryDto): Promise<FinancialSummaryResponseDto> {
    const range = this.resolveRange(query);

    const revenue = await this.computeRevenue(range);
    const discountsGivenMinor = await this.computeDiscounts(range);
    const cogsMinor = await this.computeCogs(range);
    const expenses = await this.computeExpenses(range);

    const grossProfitMinor = revenue.totalRevenueMinor - cogsMinor;
    const netOperatingResultMinor = grossProfitMinor - expenses.totalOperatingExpensesMinor;

    return {
      range: {
        from: range.from,
        to: range.to,
      },
      revenue,
      discountsGivenMinor,
      cogsMinor,
      grossProfitMinor,
      expenses,
      netOperatingResultMinor,
      metadata: {
        cogsMethod: COGS_METHOD,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Resolves a DateRangeQueryDto into concrete from/to dates.
   *
   * For presets, the intervals are inclusive calendar days:
   * - this_week: Monday .. Sunday of the current week
   * - this_month: 1st .. last day of the current month
   * - previous_month: 1st .. last day of the previous month
   *
   * For custom, both `from` and `to` must be provided.
   */
  resolveRange(query: DateRangeQueryDto): DateRange {
    const preset = query.range ?? DateRangePreset.THIS_MONTH;

    if (preset === DateRangePreset.CUSTOM) {
      if (!query.from || !query.to) {
        throw new BadRequestException(
          'custom range requires both from and to in YYYY-MM-DD format',
        );
      }
      if (query.from > query.to) {
        throw new BadRequestException('from must not be after to');
      }
      return { from: query.from, to: query.to };
    }

    const now = new Date();

    if (preset === DateRangePreset.THIS_WEEK) {
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
      // Convert to Monday-based offset
      const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - offsetToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        from: this.formatDate(monday),
        to: this.formatDate(sunday),
      };
    }

    if (preset === DateRangePreset.THIS_MONTH) {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: this.formatDate(first),
        to: this.formatDate(last),
      };
    }

    if (preset === DateRangePreset.PREVIOUS_MONTH) {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: this.formatDate(first),
        to: this.formatDate(last),
      };
    }

    throw new BadRequestException(`Unsupported range preset: ${preset}`);
  }

  private async computeRevenue(range: DateRange): Promise<RevenueByTypeDto> {
    const transactionRepo = this.dataSource.getRepository(Transaction);
    const itemRepo = this.dataSource.getRepository(TransactionItem);

    // Sum each item type explicitly. This avoids relying on database-driver
    // casing/alias behavior when mapping grouped enum values from raw rows.
    const itemTotals: {
      product: string | number | null;
      service: string | number | null;
      package: string | number | null;
    } = (await itemRepo
      .createQueryBuilder('item')
      .innerJoin(Transaction, 'tx', 'tx.id = item.transaction_id')
      .select(
        'COALESCE(SUM(CASE WHEN item.item_type = :productType THEN item.total_price_minor ELSE 0 END), 0)',
        'product',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN item.item_type = :serviceType THEN item.total_price_minor ELSE 0 END), 0)',
        'service',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN item.item_type = :packageType THEN item.total_price_minor ELSE 0 END), 0)',
        'package',
      )
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .setParameters({
        productType: TransactionItemType.PRODUCT,
        serviceType: TransactionItemType.SERVICE,
        packageType: TransactionItemType.PACKAGE,
      })
      .getRawOne()) ?? { product: null, service: null, package: null };

    const productSalesMinor = Number(itemTotals?.product ?? 0);
    const serviceSalesMinor = Number(itemTotals?.service ?? 0);
    const packageSalesMinor = Number(itemTotals?.package ?? 0);

    // Subtract discounts proportionally from revenue so the reported
    // revenue equals what customers actually paid.
    // We apply the discount at the transaction level: total_minor already
    // reflects discount. So we should not double count. Let's use
    // transactions.total_minor for totalRevenue instead of summing items.
    const transactionTotals: { total: string | number | null } | undefined = await transactionRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.total_minor)', 'total')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .getRawOne();

    const returnedProductRevenue = await this.dataSource
      .getRepository(SalesReturnLine)
      .createQueryBuilder('line')
      .innerJoin(SalesReturn, 'salesReturn', 'salesReturn.id = line.sales_return_id')
      .select('COALESCE(SUM(line.revenue_reversal_minor), 0)', 'total')
      .where('salesReturn.return_date >= :from AND salesReturn.return_date <= :to', range)
      .getRawOne<{ total: string | number | null }>();
    const returnedRefunds = await this.dataSource
      .getRepository(SalesReturn)
      .createQueryBuilder('salesReturn')
      .select('COALESCE(SUM(salesReturn.refund_minor), 0)', 'total')
      .where('salesReturn.return_date >= :from AND salesReturn.return_date <= :to', range)
      .getRawOne<{ total: string | number | null }>();
    const otherIncomeMinor = await this.computeInventoryGains(range);
    const totalRevenueMinor =
      (transactionTotals?.total ? Number(transactionTotals.total) : 0) -
      Number(returnedRefunds?.total ?? 0) +
      otherIncomeMinor;

    return {
      productSalesMinor: productSalesMinor - Number(returnedProductRevenue?.total ?? 0),
      serviceSalesMinor,
      packageSalesMinor,
      otherIncomeMinor,
      totalRevenueMinor,
    };
  }

  private async computeDiscounts(range: DateRange): Promise<number> {
    const transactionRepo = this.dataSource.getRepository(Transaction);
    const row: { total: string | number | null } | undefined = await transactionRepo
      .createQueryBuilder('tx')
      .select('SUM(tx.discount_minor)', 'total')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .getRawOne();

    return row?.total ? Number(row.total) : 0;
  }

  private async computeCogs(range: DateRange): Promise<number> {
    const itemRepo = this.dataSource.getRepository(TransactionItem);
    const cogsRow: { total: string | number | null } | undefined = await itemRepo
      .createQueryBuilder('item')
      .innerJoin(Transaction, 'tx', 'tx.id = item.transaction_id')
      .select('SUM(item.cost_of_goods_sold_minor)', 'total')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .getRawOne();

    const returnedCogs = await this.dataSource
      .getRepository(SalesReturn)
      .createQueryBuilder('salesReturn')
      .select('COALESCE(SUM(salesReturn.cogs_reversal_minor), 0)', 'total')
      .where('salesReturn.return_date >= :from AND salesReturn.return_date <= :to', range)
      .getRawOne<{ total: string | number | null }>();

    return (cogsRow?.total ? Number(cogsRow.total) : 0) - Number(returnedCogs?.total ?? 0);
  }

  private async computeExpenses(range: DateRange): Promise<ExpenseBreakdownDto> {
    const salaryRepo = this.dataSource.getRepository(SalaryPayment);
    const salaryRow: { total: string | number | null } | undefined = await salaryRepo
      .createQueryBuilder('sp')
      .select('SUM(sp.amount_minor)', 'total')
      .where('sp.paid_on >= :from AND sp.paid_on <= :to', {
        from: range.from,
        to: range.to,
      })
      .andWhere('sp.payment_type != :advanceType', { advanceType: SalaryPaymentType.ADVANCE })
      .getRawOne();

    const salaryPaymentsMinor = salaryRow?.total ? Number(salaryRow.total) : 0;

    const expenseRepo = this.dataSource.getRepository(Expense);
    const categoryRows: Array<{ category: string; total: string | number | null }> =
      await expenseRepo
        .createQueryBuilder('e')
        .select('e.category', 'category')
        .addSelect('SUM(e.amount_minor)', 'total')
        .where('e.expense_date >= :from AND e.expense_date <= :to', {
          from: range.from,
          to: range.to,
        })
        .groupBy('e.category')
        .getRawMany();

    const shopExpensesByCategory: ExpenseByCategoryDto[] = categoryRows.map((row) => ({
      category: row.category,
      amountMinor: row.total ? Number(row.total) : 0,
    }));

    const shopExpensesMinor = shopExpensesByCategory.reduce((sum, row) => sum + row.amountMinor, 0);
    const inventoryLosses = await this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .innerJoin('line.account', 'account')
      .select('COALESCE(SUM(line.debit_minor - line.credit_minor), 0)', 'total')
      .where('entry.entry_date >= :from AND entry.entry_date <= :to', range)
      .andWhere('account.code IN (:...codes)', {
        codes: ['INVENTORY_SHRINKAGE', 'SUPPLIER_RETURN_LOSS', 'INVENTORY_REVALUATION_LOSS'],
      })
      .getRawOne<{ total: string | number | null }>();
    const inventoryAdjustmentLossesMinor = Number(inventoryLosses?.total ?? 0);

    return {
      salaryPaymentsMinor,
      shopExpensesMinor,
      inventoryAdjustmentLossesMinor,
      totalOperatingExpensesMinor:
        salaryPaymentsMinor + shopExpensesMinor + inventoryAdjustmentLossesMinor,
      shopExpensesByCategory,
    };
  }

  private async computeInventoryGains(range: DateRange): Promise<number> {
    const result = await this.dataSource
      .getRepository(JournalLine)
      .createQueryBuilder('line')
      .innerJoin('line.entry', 'entry')
      .innerJoin('line.account', 'account')
      .select('COALESCE(SUM(line.credit_minor - line.debit_minor), 0)', 'total')
      .where('entry.entry_date >= :from AND entry.entry_date <= :to', range)
      .andWhere('account.code IN (:...codes)', {
        codes: ['INVENTORY_ADJUSTMENT_GAIN', 'SUPPLIER_RETURN_GAIN', 'INVENTORY_REVALUATION_GAIN'],
      })
      .getRawOne<{ total: string | number | null }>();
    return Number(result?.total ?? 0);
  }

  /**
   * Returns the next calendar day after the given YYYY-MM-DD as
   * YYYY-MM-DD 00:00:00, for use as an exclusive upper bound on
   * datetime columns.
   */
  private nextDay(dateString: string): string {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
    date.setDate(date.getDate() + 1);
    return `${this.formatDate(date)} 00:00:00`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  }
}
