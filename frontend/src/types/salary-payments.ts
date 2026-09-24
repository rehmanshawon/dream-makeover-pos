export type SalaryPaymentType = 'REGULAR' | 'BONUS' | 'OVERTIME' | 'ADVANCE' | 'ADVANCE_ADJUSTMENT';

export type SalaryPaymentMethod = 'CASH' | 'BANK' | 'MOBILE';
export type BonusType = 'FESTIVAL' | 'ANNUAL' | 'SPECIAL';

export interface SalaryPayment {
  id: string;
  employeeId: string;
  amountMinor: number;
  paymentType: SalaryPaymentType;
  paymentMethod: SalaryPaymentMethod;
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
  createdAt: string;
}

export interface CreateSalaryPaymentRequest {
  employeeId: string;
  amountMinor: number;
  paymentType?: SalaryPaymentType;
  paymentMethod?: SalaryPaymentMethod;
  paidOn: string;
  note?: string;
  bonusType?: BonusType;
  overtimeHours?: number;
  overtimeDate?: string;
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
  ADVANCE_ADJUSTMENT: 'Advance adjustment',
};

export const SALARY_PAYMENT_METHOD_LABELS: Record<SalaryPaymentMethod, string> = {
  CASH: 'Cash',
  BANK: 'Cheque',
  MOBILE: 'Mobile banking',
};

export const BONUS_TYPE_LABELS: Record<BonusType, string> = {
  FESTIVAL: 'Festival bonus',
  ANNUAL: 'Annual bonus',
  SPECIAL: 'Special bonus',
};
