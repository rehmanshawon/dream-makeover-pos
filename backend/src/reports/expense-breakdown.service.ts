import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Expense } from '../expenses/expense.entity';
import { SalaryPayment } from '../salary-payments/salary-payment.entity';
import { FinancialSummaryService } from './financial-summary.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import {
  ExpenseBreakdownResponseDto,
  ExpenseCategoryTotalDto,
} from './dto/expense-breakdown-response.dto';

interface RawRow {
  category: string;
  total: string | number | null;
  count: string | number;
}

@Injectable()
export class ExpenseBreakdownService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly summaryService: FinancialSummaryService,
  ) {}

  async breakdown(query: DateRangeQueryDto): Promise<ExpenseBreakdownResponseDto> {
    const range = this.summaryService.resolveRange(query);

    const expenseRepo = this.dataSource.getRepository(Expense);
    const categoryRows: RawRow[] = await expenseRepo
      .createQueryBuilder('e')
      .select('e.category', 'category')
      .addSelect('SUM(e.amount_minor)', 'total')
      .addSelect('COUNT(e.id)', 'count')
      .where('e.expense_date >= :from AND e.expense_date <= :to', {
        from: range.from,
        to: range.to,
      })
      .groupBy('e.category')
      .orderBy('total', 'DESC')
      .getRawMany();

    const categories: ExpenseCategoryTotalDto[] = categoryRows.map((row) => ({
      category: row.category,
      amountMinor: row.total === null ? 0 : Number(row.total),
      count: Number(row.count),
    }));

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

    const categoriesTotal = categories.reduce((sum, c) => sum + c.amountMinor, 0);
    const totalMinor = categoriesTotal + salaryPaymentsMinor;

    return {
      from: range.from,
      to: range.to,
      totalMinor,
      salaryPaymentsMinor,
      categories,
    };
  }
}
