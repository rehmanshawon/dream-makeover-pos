export type PayPeriodStatus = 'OPEN' | 'CLOSED';

export interface PayPeriod {
  id: string;
  year: number;
  month: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PayPeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayPeriodRequest {
  year: number;
  month: number;
}

export interface NextReminder {
  shouldRemind: boolean;
  nextMonth: { year: number; month: number; name: string };
  hasNextPeriod: boolean;
}

export interface PayableEmployee {
  employeeId: string;
  employeeName: string;
  role: string;
  monthlySalaryMinor: number;
  payableMinor: number;
  currentObligationMinor: number;
  carriedArrearsMinor: number;
  totalDueMinor: number;
  alreadyPaidMinor: number;
  remainingMinor: number;
  hasExistingPayment: boolean;
}

export interface CreatePayrollSalaryPaymentRequest {
  employeeId: string;
  amountMinor: number;
  paymentMethod: 'CASH' | 'BANK' | 'MOBILE';
  paidOn: string;
  note?: string;
  checkNumber?: string;
  bankAccountNumber?: string;
  mobileWalletProvider?: 'bKash' | 'Rocket' | 'Nagad';
  mobileWalletNumber?: string;
}

export interface RunPayrollResult {
  payPeriodId: string;
  createdCount: number;
  skippedCount: number;
  totalPaidMinor: number;
  payments: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    amountMinor: number;
  }>;
}
