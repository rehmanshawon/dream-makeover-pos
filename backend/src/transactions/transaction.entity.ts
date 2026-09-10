import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';
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

  @Column({ name: 'customer_id', type: 'char', length: 36, nullable: true })
  customerId: string | null = null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null = null;

  @Column({
    name: 'subtotal_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  subtotalMinor: number;

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
    transformer: bigintTransformer,
  })
  totalMinor: number;

  @Column({
    name: 'cash_received_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  cashReceivedMinor: number;

  @Column({
    name: 'change_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  changeMinor: number;

  @Column({ type: 'varchar', length: 100 })
  cashier: string;

  /**
   * Calculates total after discount. Falls back to subtotal when discount
   * is not set.
   */
  calculateTotal(): number {
    const discount = this.discountMinor ?? 0;
    return this.subtotalMinor - discount;
  }

  /**
   * Calculates change owed to the customer. Uses the explicitly computed
   * totalMinor when present; otherwise computes it. Never returns a
   * negative number.
   */
  calculateChange(): number {
    const total = this.totalMinor ?? this.calculateTotal();
    const change = this.cashReceivedMinor - total;
    return change > 0 ? change : 0;
  }
}
