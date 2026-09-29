import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { TransactionItem } from '../transactions/transaction-item.entity';
import { Product } from '../products/product.entity';
import { SalesReturn } from './sales-return.entity';

@Entity('sales_return_lines')
export class SalesReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sales_return_id', type: 'char', length: 36 })
  salesReturnId: string;

  @ManyToOne(() => SalesReturn, (salesReturn) => salesReturn.lines, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_return_id' })
  salesReturn: Relation<SalesReturn>;

  @Column({ name: 'transaction_item_id', type: 'char', length: 36 })
  transactionItemId: string;

  @ManyToOne(() => TransactionItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_item_id' })
  transactionItem: Relation<TransactionItem>;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({
    name: 'gross_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  grossMinor: number;

  @Column({
    name: 'revenue_reversal_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  revenueReversalMinor: number;

  @Column({
    name: 'vat_reversal_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  vatReversalMinor: number;

  @Column({
    name: 'refund_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  refundMinor: number;

  @Column({
    name: 'cogs_reversal_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  cogsReversalMinor: number;
}
