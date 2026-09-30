import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { Transaction } from '../transactions/transaction.entity';
import { PaymentMethod } from '../salary-payments/payment-method.enum';
import { SalesReturnLine } from './sales-return-line.entity';

@Entity('sales_returns')
export class SalesReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'char', length: 36 })
  transactionId: string;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Relation<Transaction>;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({ name: 'refund_method', type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  refundMethod: PaymentMethod = PaymentMethod.CASH;

  @Column({
    name: 'refund_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  refundMinor: number;

  @Column({ name: 'reward_points_removed', type: 'int', unsigned: true, default: 0 })
  rewardPointsRemoved: number = 0;

  @Column({ name: 'reward_points_restored', type: 'int', unsigned: true, default: 0 })
  rewardPointsRestored: number = 0;

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
    name: 'cogs_reversal_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  cogsReversalMinor: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => SalesReturnLine, (line) => line.salesReturn)
  lines: Relation<SalesReturnLine[]>;
}
