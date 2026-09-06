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
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ name: 'subtotal_minor', type: 'bigint', unsigned: true })
  subtotalMinor: number;

  @Column({ name: 'discount_minor', type: 'bigint', unsigned: true, default: 0 })
  discountMinor: number;

  @Column({ name: 'total_minor', type: 'bigint', unsigned: true })
  totalMinor: number;

  @Column({ name: 'cash_received_minor', type: 'bigint', unsigned: true })
  cashReceivedMinor: number;

  @Column({ name: 'change_minor', type: 'bigint', unsigned: true })
  changeMinor: number;

  @Column({ type: 'varchar', length: 100 })
  cashier: string;
}
