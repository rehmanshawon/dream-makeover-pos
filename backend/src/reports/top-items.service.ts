import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionItem, TransactionItemType } from '../transactions/transaction-item.entity';
import { Transaction } from '../transactions/transaction.entity';
import { FinancialSummaryService } from './financial-summary.service';
import { TopItemsQueryDto } from './dto/top-items-query.dto';
import { TopItemDto, TopItemsResponseDto } from './dto/top-item-response.dto';

const DEFAULT_LIMIT = 10;

interface RawRow {
  itemId: string | null;
  itemName: string;
  quantitySold: string | number;
  revenue: string | number | null;
}

@Injectable()
export class TopItemsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly summaryService: FinancialSummaryService,
  ) {}

  async topProducts(query: TopItemsQueryDto): Promise<TopItemsResponseDto> {
    return this.topByType(query, TransactionItemType.PRODUCT);
  }

  async topServices(query: TopItemsQueryDto): Promise<TopItemsResponseDto> {
    return this.topByType(query, TransactionItemType.SERVICE);
  }

  private async topByType(
    query: TopItemsQueryDto,
    itemType: TransactionItemType,
  ): Promise<TopItemsResponseDto> {
    const range = this.summaryService.resolveRange(query);
    const limit = query.limit ?? DEFAULT_LIMIT;

    const itemRepo = this.dataSource.getRepository(TransactionItem);

    const rows: RawRow[] = await itemRepo
      .createQueryBuilder('item')
      .innerJoin(Transaction, 'tx', 'tx.id = item.transaction_id')
      .select('item.item_name', 'itemName')
      .addSelect(
        itemType === TransactionItemType.PRODUCT ? 'item.product_id' : 'item.service_id',
        'itemId',
      )
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.total_price_minor)', 'revenue')
      .where('tx.created_at >= :from AND tx.created_at < :toPlusOne', {
        from: `${range.from} 00:00:00`,
        toPlusOne: this.nextDay(range.to),
      })
      .andWhere('item.item_type = :type', { type: itemType })
      .groupBy('item.item_name')
      .addGroupBy(itemType === TransactionItemType.PRODUCT ? 'item.product_id' : 'item.service_id')
      .orderBy('revenue', 'DESC')
      .addOrderBy('quantitySold', 'DESC')
      .addOrderBy('itemName', 'ASC')
      .limit(limit)
      .getRawMany();

    const items: TopItemDto[] = rows.map((row) => ({
      itemId: row.itemId ?? '',
      itemName: row.itemName,
      quantitySold: Number(row.quantitySold),
      revenueMinor: row.revenue === null ? 0 : Number(row.revenue),
    }));

    return {
      from: range.from,
      to: range.to,
      items,
    };
  }

  private nextDay(dateString: string): string {
    const [y = 0, m = 1, d = 1] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  }
}
