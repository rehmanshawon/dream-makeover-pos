import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('accounting_periods')
export class AccountingPeriod {
  @PrimaryColumn({ name: 'period_key', type: 'char', length: 7 })
  periodKey: string;

  @Column({ name: 'closed_at', type: 'datetime', precision: 6, nullable: true })
  closedAt: Date | null;

  @Column({ name: 'closed_by', type: 'varchar', length: 80, nullable: true })
  closedBy: string | null;
}
