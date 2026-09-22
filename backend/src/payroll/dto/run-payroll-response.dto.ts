export class RunPayrollResponseDto {
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
