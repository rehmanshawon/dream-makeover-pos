import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { SalaryFrequency } from '../salary-frequency.enum';
import { EmployeeStatus } from '../employee-status.enum';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  role: string;

  @IsInt()
  @Min(1)
  salaryMinor: number;

  @IsEnum(SalaryFrequency)
  salaryFrequency: SalaryFrequency;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'joinDate must be in YYYY-MM-DD format',
  })
  joinDate: string;

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
