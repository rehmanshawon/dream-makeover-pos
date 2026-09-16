import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { TransactionItem } from './transaction-item.entity';
import { Customer } from '../customers/customer.entity';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { TransactionListItemDto } from './dto/transaction-list-item.dto';
import { TransactionListResponseDto } from './dto/transaction-list-response.dto';
import { TransactionDetailDto } from './dto/transaction-detail.dto';

const DEFAULT_LIMIT = 100;

interface SummaryRow {
  transactionCount: string | number;
  subtotalMinor: string | number | null;
  discountMinor: string | number | null;
  totalMinor: string | number | null;
}

interface ItemCountRow {
  transaction_id: string;
  line_count: string | number;
  quantity_total: string | number | null;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private readonly itemRepository: Repository<TransactionItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Lists transactions with a summary that reflects the full filtered
   * set (not just the paginated page).
   */
  async list(query: TransactionsQueryDto): Promise<TransactionListResponseDto> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;

    const qb = this.transactionRepository.createQueryBuilder('tx');

    if (query.from) {
      qb.andWhere('tx.created_at >= :from', {
        from: `${query.from} 00:00:00`,
      });
    }
    if (query.to) {
      qb.andWhere('tx.created_at < :toPlusOne', {
        toPlusOne: this.nextDayStart(query.to),
      });
    }
    if (query.cashier) {
      qb.andWhere('tx.cashier = :cashier', { cashier: query.cashier });
    }

    // Summary over all matching rows (before pagination)
    const summaryQb = qb.clone();
    const summaryRow: SummaryRow | undefined = await summaryQb
      .select('COUNT(tx.id)', 'transactionCount')
      .addSelect('COALESCE(SUM(tx.subtotal_minor), 0)', 'subtotalMinor')
      .addSelect('COALESCE(SUM(tx.discount_minor), 0)', 'discountMinor')
      .addSelect('COALESCE(SUM(tx.total_minor), 0)', 'totalMinor')
      .getRawOne();

    const transactionCount = summaryRow?.transactionCount ? Number(summaryRow.transactionCount) : 0;
    const subtotalMinor = summaryRow?.subtotalMinor ? Number(summaryRow.subtotalMinor) : 0;
    const discountMinor = summaryRow?.discountMinor ? Number(summaryRow.discountMinor) : 0;
    const totalMinor = summaryRow?.totalMinor ? Number(summaryRow.totalMinor) : 0;
    const averageSaleMinor = transactionCount > 0 ? Math.round(totalMinor / transactionCount) : 0;

    // Paginated rows
    const [rows, total] = await qb
      .orderBy('tx.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Count items per visible transaction
    const transactionIds = rows.map((r) => r.id);
    const itemCounts = new Map<string, { lineCount: number; quantityTotal: number }>();
    if (transactionIds.length > 0) {
      const itemRows: ItemCountRow[] = await this.itemRepository
        .createQueryBuilder('item')
        .select('item.transaction_id', 'transaction_id')
        .addSelect('COUNT(item.id)', 'line_count')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'quantity_total')
        .where('item.transaction_id IN (:...ids)', { ids: transactionIds })
        .groupBy('item.transaction_id')
        .getRawMany();

      for (const row of itemRows) {
        itemCounts.set(row.transaction_id, {
          lineCount: Number(row.line_count),
          quantityTotal: Number(row.quantity_total ?? 0),
        });
      }
    }

    // Resolve customer names in bulk
    const customerIds = rows.map((r) => r.customerId).filter((id): id is string => Boolean(id));

    const customerNames = new Map<string, string>();
    if (customerIds.length > 0) {
      const customers = await this.customerRepository
        .createQueryBuilder('c')
        .select(['c.id', 'c.fullName'])
        .where('c.id IN (:...ids)', { ids: customerIds })
        .getMany();
      for (const c of customers) {
        customerNames.set(c.id, c.fullName);
      }
    }

    const transactions: TransactionListItemDto[] = rows.map((tx) => {
      const counts = itemCounts.get(tx.id);
      return {
        id: tx.id,
        invoiceId: tx.invoiceId,
        createdAt: tx.createdAt,
        cashier: tx.cashier,
        customerId: tx.customerId,
        customerName: tx.customerId ? (customerNames.get(tx.customerId) ?? null) : null,
        subtotalMinor: tx.subtotalMinor,
        discountMinor: tx.discountMinor,
        totalMinor: tx.totalMinor,
        itemLineCount: counts?.lineCount ?? 0,
        itemQuantityTotal: counts?.quantityTotal ?? 0,
      };
    });

    return {
      range: {
        from: query.from ?? null,
        to: query.to ?? null,
      },
      filters: {
        cashier: query.cashier ?? null,
      },
      summary: {
        transactionCount,
        subtotalMinor,
        discountMinor,
        totalMinor,
        averageSaleMinor,
      },
      pagination: {
        total,
        limit,
        offset,
      },
      transactions,
    };
  }

  /**
   * Returns a single transaction with its line items and customer
   * snapshot.
   */
  async findById(id: string): Promise<TransactionDetailDto> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const items = await this.itemRepository.find({
      where: { transactionId: id },
      order: { createdAt: 'ASC' },
    });

    let customer: TransactionDetailDto['customer'] = null;
    if (transaction.customerId) {
      const c = await this.customerRepository.findOne({
        where: { id: transaction.customerId },
      });
      if (c) {
        customer = {
          id: c.id,
          fullName: c.fullName,
          phoneNumber: c.phoneNumber,
          rewardTier: c.rewardTier,
        };
      }
    }

    return {
      id: transaction.id,
      invoiceId: transaction.invoiceId,
      createdAt: transaction.createdAt,
      cashier: transaction.cashier,
      customer,
      subtotalMinor: transaction.subtotalMinor,
      discountMinor: transaction.discountMinor,
      totalMinor: transaction.totalMinor,
      cashReceivedMinor: transaction.cashReceivedMinor,
      changeMinor: transaction.changeMinor,
      items: items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalPriceMinor: item.totalPriceMinor,
      })),
    };
  }

  /**
   * Returns the next-day start timestamp for use as an exclusive upper
   * bound on a date range.
   */
  private nextDayStart(dateString: string): string {
    const [yearText, monthText, dayText] = dateString.split('-');
    const inputYear = Number(yearText ?? 0);
    const inputMonth = Number(monthText ?? 0);
    const inputDay = Number(dayText ?? 0);
    const date = new Date(inputYear, inputMonth - 1, inputDay);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  }
}
