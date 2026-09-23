import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PayPeriodStatus } from './pay-period-status.enum';

/**
 * A pay period represents one calendar month.
 *
 * `year` and `month` are the source of truth. `startDate` and `endDate`
 * are derived and stored for query convenience. They are updated
 * whenever the entity is saved.
 *
 * Closed periods are immutable. Open periods can be deleted only before
 * any salary payments have been recorded against them.
 */
@Entity('pay_periods')
@Unique('uq_pay_periods_year_month', ['year', 'month'])
export class PayPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unsigned: true })
  year: number;

  @Column({ type: 'tinyint', unsigned: true })
  month: number;

  @Index('uq_pay_periods_name', { unique: true })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_pay_periods_dates')
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({
    type: 'enum',
    enum: PayPeriodStatus,
    default: PayPeriodStatus.OPEN,
  })
  status: PayPeriodStatus = PayPeriodStatus.OPEN;

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date | null = null;

  @Column({ name: 'closed_by', type: 'varchar', length: 80, nullable: true })
  closedBy: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
