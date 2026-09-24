import { SalaryPaymentType } from '../salary-payment-type.enum';
import { PaymentMethod } from '../payment-method.enum';

export class SalaryPaymentResponseDto {
  id: string;
  employeeId: string;
  amountMinor: number;
  paymentType: SalaryPaymentType;
  paymentMethod: PaymentMethod;
  paidOn: string;
  payPeriodId: string | null;
  note: string | null;
  checkNumber: string | null;
  bankAccountNumber: string | null;
  mobileWalletProvider: string | null;
  mobileWalletNumber: string | null;
  paidBy: string;
  createdAt: Date;
}
