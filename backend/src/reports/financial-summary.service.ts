import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionItem, TransactionItemType } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { Expense } from '../expenses/expense.entity';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { DateRangeQueryDto, DateRangePreset, DateRange } from './dto/date-range-query.dto';
import {
  ExpenseBreakdownDto,
  ExpenseByCategoryDto,
  FinancialSummaryResponseDto,
  RevenueByTypeDto,
} from './dto/financial-summary-response.dto';

const COGS_METHOD = 'current_purchase_cost';

@Injectable()
export class FinancialSummaryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Produces a financial summary for the requested date range.
   *
   * The summary is a pragmatic P&L, not a complete accounting statement.
   * It does not account for taxes, depreciation, loans, or investments.
   *
   * Cost of goods sold is computed using current purchase cost, not
   * historical cost at sale time. A proper weighted-average or FIFO
   * calculation requires a cost history table which is out of scope.
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

    // Sum total per item type.
    // We sum the total_price_minor column because that reflects what was
    // charged for each line before discount (which is applied at the
    // transaction level in this system).
    const rows: Array<{ itemType: TransactionItemType; total: string | number | null }> =
      await itemRepo
        .createQueryBuilder('item')
        .innerJoin(Transaction, 'tx', 'tx.id = item.transaction_id')
        .select('item.item_type', 'itemType')
        .addSelect('SUM(item.total_price_minor)', 'total')
        .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
          from: `${range.from} 00:00:00`,
          toPlusOne: this.nextDay(range.to),
        })
        .groupBy('item.item_type')
        .getRawMany();

    let productSalesMinor = 0;
    let serviceSalesMinor = 0;
    let packageSalesMinor = 0;

    for (const row of rows) {
      const value = row.total === null ? 0 : Number(row.total);
      if (row.itemType === TransactionItemType.PRODUCT) {
        productSalesMinor = value;
      } else if (row.itemType === TransactionItemType.SERVICE) {
        serviceSalesMinor = value;
      } else if (row.itemType === TransactionItemType.PACKAGE) {
        packageSalesMinor = value;
      }
    }

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

    const totalRevenueMinor = transactionTotals?.total ? Number(transactionTotals.total) : 0;

    return {
      productSalesMinor,
      serviceSalesMinor,
      packageSalesMinor,
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
    //const productRepo = this.dataSource.getRepository(Product);

    // Product COGS: sum(item.quantity × product.purchase_cost_minor)
    const productCogsRow: { total: string | number | null } | undefined = await itemRepo
      .createQueryBuilder('item')
      .innerJoin(Transaction, 'tx', 'tx.id = item.transaction_id')
      .innerJoin(Product, 'p', 'p.id = item.product_id')
      .select('SUM(item.quantity * p.purchase_cost_minor)', 'total')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .andWhere('item.item_type = :type', { type: TransactionItemType.PRODUCT })
      .getRawOne();

    const productCogs = productCogsRow?.total ? Number(productCogsRow.total) : 0;

    // Package COGS: for each package sold, sum the purchase cost of its
    // contained products × package quantity.
    // We use a raw query for clarity here because the composition is
    // nested (packages -> package_items -> products).
    const packageCogsRow: Array<{ total: string | number | null }> = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ti.quantity * pi_agg.cost_per_unit), 0) AS total
      FROM transaction_items ti
      INNER JOIN transactions t ON t.id = ti.transaction_id
      INNER JOIN (
        SELECT pkg_item.package_id,
               COALESCE(SUM(prod.purchase_cost_minor), 0) AS cost_per_unit
        FROM package_items pkg_item
        INNER JOIN products prod ON prod.id = pkg_item.product_id
        GROUP BY pkg_item.package_id
      ) AS pi_agg ON pi_agg.package_id = ti.package_id
      WHERE ti.item_type = 'PACKAGE'
        AND t.created_at >= ?
        AND t.created_at < ?
      `,
      [`${range.from} 00:00:00`, this.nextDay(range.to)],
    );

    const packageCogs = packageCogsRow[0]?.total ? Number(packageCogsRow[0].total) : 0;

    return productCogs + packageCogs;
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

    return {
      salaryPaymentsMinor,
      shopExpensesMinor,
      totalOperatingExpensesMinor: salaryPaymentsMinor + shopExpensesMinor,
      shopExpensesByCategory,
    };
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
