import { SalaryFrequency } from '../salary-frequency.enum';
import { EmployeeStatus } from '../employee-status.enum';

export class EmployeeResponseDto {
  id: string;
  fullName: string;
  role: string;
  salaryMinor: number;
  salaryFrequency: SalaryFrequency;
  joinDate: string;
  status: EmployeeStatus;
  phone: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
