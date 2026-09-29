import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
  Relation,
  Index,
} from 'typeorm';
import { BankReconciliation } from './bank-reconciliation.entity';
import { JournalLine } from './journal-line.entity';

@Entity('accounting_bank_reconciliation_lines')
@Index('uq_accounting_bank_reconciliation_lines_journal_line', ['journalLineId'], { unique: true })
export class BankReconciliationLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reconciliation_id', type: 'char', length: 36 })
  reconciliationId: string;

  @ManyToOne(() => BankReconciliation, (reconciliation) => reconciliation.lines, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reconciliation_id' })
  reconciliation: Relation<BankReconciliation>;

  @Column({ name: 'journal_line_id', type: 'char', length: 36 })
  journalLineId: string;

  @ManyToOne(() => JournalLine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'journal_line_id' })
  journalLine: Relation<JournalLine>;
}
