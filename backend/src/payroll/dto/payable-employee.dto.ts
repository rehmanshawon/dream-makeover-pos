export class PayableEmployeeDto {
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
