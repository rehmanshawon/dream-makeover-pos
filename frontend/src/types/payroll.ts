export type PayPeriodStatus = 'OPEN' | 'CLOSED';

export interface PayPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayPeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayableEmployee {
  employeeId: string;
  employeeName: string;
  role: string;
  monthlySalaryMinor: number;
  payableMinor: number;
  alreadyPaidMinor: number;
  remainingMinor: number;
  hasExistingPayment: boolean;
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

export interface CreatePayPeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePayPeriodRequest extends CreatePayPeriodRequest {}
