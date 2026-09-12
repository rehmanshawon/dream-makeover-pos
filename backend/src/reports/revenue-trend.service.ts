import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { FinancialSummaryService } from './financial-summary.service';
import { RevenueTrendQueryDto } from './dto/revenue-trend-query.dto';
import { RevenueTrendResponseDto } from './dto/revenue-trend-response.dto';

interface RawRow {
  day: string;
  revenue: string | number | null;
  transactionCount: string | number;
}

@Injectable()
export class RevenueTrendService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly summaryService: FinancialSummaryService,
  ) {}

  /**
   * Returns daily revenue and transaction counts for the requested range.
   *
   * Days with no transactions are included with zeros so that charts do
   * not need to fill gaps.
   */
  async daily(query: RevenueTrendQueryDto): Promise<RevenueTrendResponseDto> {
    const range = this.summaryService.resolveRange(query);

    const transactionRepo = this.dataSource.getRepository(Transaction);

    const rows: RawRow[] = await transactionRepo
      .createQueryBuilder('tx')
      .select('DATE(tx.created_at)', 'day')
      .addSelect('SUM(tx.total_minor)', 'revenue')
      .addSelect('COUNT(tx.id)', 'transactionCount')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .groupBy('DATE(tx.created_at)')
      .orderBy('DATE(tx.created_at)', 'ASC')
      .getRawMany();

    const map = new Map<string, { revenueMinor: number; transactionCount: number }>();
    for (const row of rows) {
      const day = this.normalizeDayKey(row.day);
      map.set(day, {
        revenueMinor: row.revenue === null ? 0 : Number(row.revenue),
        transactionCount: Number(row.transactionCount),
      });
    }

    const points: RevenueTrendResponseDto['points'] = [];
    const cursor = this.parseDate(range.from);
    const end = this.parseDate(range.to);

    while (cursor <= end) {
      const key = this.formatDate(cursor);
      const entry = map.get(key);
      points.push({
        date: key,
        revenueMinor: entry?.revenueMinor ?? 0,
        transactionCount: entry?.transactionCount ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      from: range.from,
      to: range.to,
      points,
    };
  }

  /**
   * MySQL DATE() returns either a Date object or a string depending on
   * the driver's configuration and MySQL version. Normalize to YYYY-MM-DD.
   */
  private normalizeDayKey(value: string | Date): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    return this.formatDate(value);
  }

  private parseDate(dateString: string): Date {
    const [y = 0, m = 1, d = 1] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private nextDay(dateString: string): string {
    const date = this.parseDate(dateString);
    date.setDate(date.getDate() + 1);
    return `${this.formatDate(date)} 00:00:00`;
  }
}
