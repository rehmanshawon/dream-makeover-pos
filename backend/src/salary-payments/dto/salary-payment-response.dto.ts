import { SalaryPaymentType } from '../salary-payment-type.enum';
import { PaymentMethod } from '../payment-method.enum';

export class SalaryPaymentResponseDto {
  id: string;
  employeeId: string;
  amountMinor: number;
  paymentType: SalaryPaymentType;
  paymentMethod: PaymentMethod;
  paidOn: string;
  note: string | null;
  paidBy: string;
  createdAt: Date;
}
