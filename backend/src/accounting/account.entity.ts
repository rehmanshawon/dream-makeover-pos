import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AccountType } from './account-type.enum';

@Entity('accounting_accounts')
export class Account {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Index('uq_accounting_accounts_code', { unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ name: 'is_system', type: 'boolean', default: true })
  isSystem: boolean;
}
