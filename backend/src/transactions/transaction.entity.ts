import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { TransactionItem } from './transaction-item.entity';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_transactions_invoice', { unique: true })
  @Column({ name: 'invoice_id', type: 'varchar', length: 40 })
  invoiceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Initialized to null for in-memory unit tests
  @Column({ name: 'customer_id', type: 'char', length: 36, nullable: true })
  customerId: string | null = null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null = null;

  @Column({
    name: 'subtotal_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  subtotalMinor: number = 0;

  // Property initialized with default value
  @Column({
    name: 'discount_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  discountMinor: number = 0;

  @Column({
    name: 'total_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  totalMinor: number = 0;

  @Column({
    name: 'cash_received_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  cashReceivedMinor: number = 0;

  @Column({
    name: 'change_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  changeMinor: number = 0;

  @Column({ type: 'varchar', length: 100 })
  cashier: string;

  @OneToMany(() => TransactionItem, (item) => item.transaction)
  items: TransactionItem[];

  /**
   * Calculates total amount after discount.
   *
   * Returns subtotal minus discount. Discount defaults to 0.
   */
  calculateTotal(): number {
    const discount = this.discountMinor ?? 0;
    return this.subtotalMinor - discount;
  }

  /**
   * Calculates change owed to the customer.
   *
   * Uses the explicitly set totalMinor when available. Falls back to
   * calculateTotal() when the total has not been computed yet.
   * Never returns a negative number — insufficient cash yields 0 change.
   */
  calculateChange(): number {
    const total = this.totalMinor ?? this.calculateTotal();
    const change = this.cashReceivedMinor - total;
    return change > 0 ? change : 0;
  }
}
