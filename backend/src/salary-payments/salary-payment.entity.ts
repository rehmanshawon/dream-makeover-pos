import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SalaryPaymentType } from './salary-payment-type.enum';
import { PaymentMethod } from './payment-method.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

/**
 * A single salary payment to an employee.
 *
 * This table is an append-only log of financial events. It is separate
 * from Employee because employee configuration (salary, frequency) is
 * mutable state, while payments are immutable history.
 *
 * `paidOn` records when the money moved. `createdAt` records when the
 * record was made. Accounting uses `paidOn`.
 */
@Entity('salary_payments')
@Index('idx_salary_payments_employee', ['employeeId'])
@Index('idx_salary_payments_paid_on', ['paidOn'])
export class SalaryPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', type: 'char', length: 36 })
  employeeId: string;

  @Index('idx_salary_payments_period')
  @Column({ name: 'pay_period_id', type: 'char', length: 36, nullable: true })
  payPeriodId: string | null = null;

  @Column({
    name: 'amount_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  amountMinor: number;

  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: SalaryPaymentType,
    default: SalaryPaymentType.REGULAR,
  })
  paymentType: SalaryPaymentType = SalaryPaymentType.REGULAR;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod = PaymentMethod.CASH;

  /**
   * Date the payment was made. Stored as YYYY-MM-DD because it is a
   * calendar day, not an instant.
   */
  @Column({ name: 'paid_on', type: 'date' })
  paidOn: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null = null;

  @Column({ name: 'check_number', type: 'varchar', length: 80, nullable: true })
  checkNumber: string | null = null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 120, nullable: true })
  bankAccountNumber: string | null = null;

  @Column({ name: 'mobile_wallet_provider', type: 'varchar', length: 20, nullable: true })
  mobileWalletProvider: string | null = null;

  @Column({ name: 'mobile_wallet_number', type: 'varchar', length: 30, nullable: true })
  mobileWalletNumber: string | null = null;

  @Column({ name: 'paid_by', type: 'varchar', length: 80 })
  paidBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
