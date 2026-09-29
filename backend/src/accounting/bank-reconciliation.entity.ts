import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { BankReconciliationLine } from './bank-reconciliation-line.entity';

@Entity('accounting_bank_reconciliations')
@Index('uq_accounting_bank_reconciliations_account_date', ['accountId', 'statementDate'], {
  unique: true,
})
export class BankReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'char', length: 36 })
  accountId: string;

  @Column({ name: 'statement_date', type: 'date' })
  statementDate: string;

  @Column({
    name: 'opening_balance_minor',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  openingBalanceMinor: number;

  @Column({
    name: 'closing_balance_minor',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  closingBalanceMinor: number;

  @Column({
    name: 'cleared_movement_minor',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  clearedMovementMinor: number;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => BankReconciliationLine, (line) => line.reconciliation)
  lines: BankReconciliationLine[];
}
