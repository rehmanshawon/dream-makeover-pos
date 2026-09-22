import { SalaryFrequency } from '../salary-frequency.enum';
import { EmployeeStatus } from '../employee-status.enum';
import { PaymentMethod } from '../../salary-payments/payment-method.enum';

export class EmployeeResponseDto {
  id: string;
  fullName: string;
  role: string;
  salaryMinor: number;
  salaryFrequency: SalaryFrequency;
  defaultPaymentMethod: PaymentMethod;
  joinDate: string;
  status: EmployeeStatus;
  phone: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
