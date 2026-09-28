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

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => JournalLine, (line) => line.entry, { cascade: false })
  lines: JournalLine[];
}
