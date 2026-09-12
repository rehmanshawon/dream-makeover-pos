import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpenseCategory } from './expense-category.enum';
import { ExpensePaymentMethod } from './expense-payment-method.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

/**
 * A non-salary business expense (rent, utilities, supplies, etc.).
 *
 * Salary payments are recorded separately in the salary_payments table.
 * The two are conceptually distinct and are unified only in reporting.
 *
 * `expenseDate` records when the expense occurred. `createdAt` records
 * when the row was written. Reports use `expenseDate`.
 */
@Entity('expenses')
@Index('idx_expenses_category', ['category'])
@Index('idx_expenses_expense_date', ['expenseDate'])
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
  })
  category: ExpenseCategory;

  @Column({
    name: 'amount_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  amountMinor: number;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ExpensePaymentMethod,
    default: ExpensePaymentMethod.CASH,
  })
  paymentMethod: ExpensePaymentMethod = ExpensePaymentMethod.CASH;

  @Column({ type: 'varchar', length: 150, nullable: true })
  payee: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null = null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
