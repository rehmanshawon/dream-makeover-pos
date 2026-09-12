import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalaryFrequency } from './salary-frequency.enum';
import { EmployeeStatus } from './employee-status.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

/**
 * An employee of the salon.
 *
 * This is distinct from User: an employee draws a salary, while a User
 * logs into the POS. The two may overlap but are not the same concept.
 *
 * Employees are never deleted. They are marked INACTIVE so that past
 * salary payments and reports remain accurate.
 */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_employees_full_name')
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @Column({
    name: 'salary_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  salaryMinor: number;

  @Column({
    name: 'salary_frequency',
    type: 'enum',
    enum: SalaryFrequency,
  })
  salaryFrequency: SalaryFrequency;

  @Column({ name: 'join_date', type: 'date' })
  joinDate: string;

  @Index('idx_employees_status')
  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus = EmployeeStatus.ACTIVE;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null = null;

  @Column({ type: 'text', nullable: true })
  note: string | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
