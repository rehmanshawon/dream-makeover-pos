import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PayPeriodStatus } from './pay-period-status.enum';

/**
 * A defined interval of time for which salaries are computed.
 *
 * Periods must not overlap. A period is OPEN until it is explicitly
 * closed; closed periods cannot receive new payments.
 */
@Entity('pay_periods')
export class PayPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
