import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from './attendance-status.enum';

@Entity('attendance_records')
@Unique('uq_attendance_employee_date', ['employeeId', 'date'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_attendance_employee')
  @Column({ name: 'employee_id', type: 'char', length: 36 })
  employeeId: string;

  @Index('idx_attendance_date')
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null = null;

  @Column({ name: 'recorded_by', type: 'varchar', length: 80 })
  recordedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
