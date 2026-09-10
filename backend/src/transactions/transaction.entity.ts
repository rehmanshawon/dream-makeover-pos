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

  @Column({ name: 'subtotal_minor', type: 'bigint', unsigned: true })
  subtotalMinor: number;

  // Property initialized with default value
  @Column({ name: 'discount_minor', type: 'bigint', unsigned: true, default: 0 })
  discountMinor: number = 0;

  @Column({ name: 'total_minor', type: 'bigint', unsigned: true })
  totalMinor: number;

  @Column({ name: 'cash_received_minor', type: 'bigint', unsigned: true })
  cashReceivedMinor: number;

  @Column({ name: 'change_minor', type: 'bigint', unsigned: true })
  changeMinor: number;

  @Column({ type: 'varchar', length: 100 })
  cashier: string;

  @OneToMany(() => TransactionItem, (item) => item.transaction)
  items: TransactionItem[];

  /**
   * Calculates net total amount after discount in minor units.
   */
  calculateTotal(): number {
    return Math.max(0, (this.subtotalMinor || 0) - (this.discountMinor || 0));
  }

  /**
   * Calculates change due based on cash received.
   */
  calculateChange(): number {
    const total = this.totalMinor ?? this.calculateTotal();
    return Math.max(0, (this.cashReceivedMinor || 0) - total);
  }
}
