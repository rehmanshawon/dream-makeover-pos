import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { SalaryFrequency } from '../salary-frequency.enum';
import { EmployeeStatus } from '../employee-status.enum';

/**
 * Partial update for an employee.
 *
 * joinDate is intentionally NOT included: join dates are immutable once
 * recorded. If a join date was entered incorrectly, the correct
 * procedure is to deactivate the record and create a new one, preserving
 * an audit trail of the correction.
 */
export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  role?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  salaryMinor?: number;

  @IsOptional()
  @IsEnum(SalaryFrequency)
  salaryFrequency?: SalaryFrequency;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
