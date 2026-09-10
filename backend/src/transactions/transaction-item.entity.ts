import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Transaction } from './transaction.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

export enum TransactionItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

@Entity('transaction_items')
export class TransactionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'char', length: 36 })
  transactionId: string;

  @ManyToOne('Transaction', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'product_id', type: 'char', length: 36, nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ name: 'service_id', type: 'char', length: 36, nullable: true })
  serviceId: string | null;

  @ManyToOne(() => SalonService, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_id' })
  service: SalonService | null;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: TransactionItemType,
  })
  itemType: TransactionItemType;

  @Column({ name: 'item_name', type: 'varchar', length: 150 })
  itemName: string;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({
    name: 'unit_price_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  unitPriceMinor: number = 0;

  @Column({
    name: 'total_price_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  totalPriceMinor: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
