import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { Account } from './account.entity';
import { JournalEntry } from './journal-entry.entity';

@Entity('accounting_journal_lines')
@Check('chk_journal_line_one_sided', '(debit_minor = 0) <> (credit_minor = 0)')
export class JournalLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_id', type: 'char', length: 36 })
  entryId: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entry_id' })
  entry: Relation<JournalEntry>;

  @Column({ name: 'account_id', type: 'char', length: 36 })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Relation<Account>;

  @Column({ name: 'debit_minor', type: 'bigint', unsigned: true, transformer: bigintTransformer })
  debitMinor: number;

  @Column({ name: 'credit_minor', type: 'bigint', unsigned: true, transformer: bigintTransformer })
  creditMinor: number;
}
