export type SalaryPaymentType = 'REGULAR' | 'BONUS' | 'OVERTIME' | 'ADVANCE';

export type SalaryPaymentMethod = 'CASH' | 'BANK' | 'MOBILE';

export interface SalaryPayment {
  id: string;
  employeeId: string;
  amountMinor: number;
  paymentType: SalaryPaymentType;
  paymentMethod: SalaryPaymentMethod;
  paidOn: string;
  payPeriodId: string | null;
  note: string | null;
  checkNumber: string | null;
  bankAccountNumber: string | null;
  mobileWalletProvider: string | null;
  mobileWalletNumber: string | null;
  paidBy: string;
  createdAt: string;
}

export interface CreateSalaryPaymentRequest {
  employeeId: string;
  amountMinor: number;
  paymentType?: SalaryPaymentType;
  paymentMethod?: SalaryPaymentMethod;
  paidOn: string;
  note?: string;
  checkNumber?: string;
  bankAccountNumber?: string;
  mobileWalletProvider?: string;
  mobileWalletNumber?: string;
}

export const SALARY_PAYMENT_TYPE_LABELS: Record<SalaryPaymentType, string> = {
  REGULAR: 'Regular salary',
  BONUS: 'Bonus',
  OVERTIME: 'Overtime',
  ADVANCE: 'Advance',
};

export const SALARY_PAYMENT_METHOD_LABELS: Record<SalaryPaymentMethod, string> = {
  CASH: 'Cash',
  BANK: 'Bank transfer',
  MOBILE: 'Mobile banking',
};
