import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JournalEntryType } from './journal-entry-type.enum';
import { JournalLine } from './journal-line.entity';

@Entity('accounting_journal_entries')
@Index('idx_accounting_journal_entries_date', ['entryDate', 'createdAt'])
@Index('uq_accounting_journal_entries_source_expense', ['sourceExpenseId'], { unique: true })
@Index('uq_accounting_journal_entries_source_transaction', ['sourceTransactionId'], {
  unique: true,
})
@Index('uq_accounting_journal_entries_source_salary_payment', ['sourceSalaryPaymentId'], {
  unique: true,
})
@Index('uq_accounting_journal_entries_source_stock_movement', ['sourceStockMovementId'], {
  unique: true,
})
@Index('uq_accounting_journal_entries_source_sales_return', ['sourceSalesReturnId'], {
  unique: true,
})
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_type', type: 'enum', enum: JournalEntryType })
  entryType: JournalEntryType;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: string;

  @Column({ type: 'varchar', length: 255 })
  memo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'source_expense_id', type: 'char', length: 36, nullable: true })
  sourceExpenseId: string | null;

  @Column({ name: 'source_transaction_id', type: 'char', length: 36, nullable: true })
  sourceTransactionId: string | null;

  @Column({ name: 'source_purchase_id', type: 'char', length: 36, nullable: true })
  sourcePurchaseId: string | null;

  @Column({ name: 'source_salary_payment_id', type: 'char', length: 36, nullable: true })
  sourceSalaryPaymentId: string | null;

  @Column({ name: 'source_stock_movement_id', type: 'char', length: 36, nullable: true })
  sourceStockMovementId: string | null;

  @Column({ name: 'source_sales_return_id', type: 'char', length: 36, nullable: true })
  sourceSalesReturnId: string | null;

  @Index('uq_accounting_journal_entries_source_supplier_return', { unique: true })
  @Column({ name: 'source_supplier_return_id', type: 'char', length: 36, nullable: true })
  sourceSupplierReturnId: string | null;

  @Index('uq_accounting_journal_entries_source_cost_revaluation', { unique: true })
  @Column({ name: 'source_cost_revaluation_id', type: 'char', length: 36, nullable: true })
  sourceCostRevaluationId: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => JournalLine, (line) => line.entry, { cascade: false })
  lines: JournalLine[];
}
