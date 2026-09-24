import { SalaryPaymentType } from '../salary-payment-type.enum';
import { PaymentMethod } from '../payment-method.enum';
import { BonusType } from '../bonus-type.enum';

export class SalaryPaymentResponseDto {
  id: string;
  employeeId: string;
  amountMinor: number;
  paymentType: SalaryPaymentType;
  paymentMethod: PaymentMethod;
  paidOn: string;
  payPeriodId: string | null;
  note: string | null;
  bonusType: BonusType | null;
  overtimeHours: number | null;
  overtimeDate: string | null;
  checkNumber: string | null;
  bankAccountNumber: string | null;
  mobileWalletProvider: string | null;
  mobileWalletNumber: string | null;
  paidBy: string;
  createdAt: Date;
}
