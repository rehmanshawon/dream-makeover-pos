export class PayableEmployeeDto {
  employeeId: string;
  employeeName: string;
  role: string;
  joinDate: string;
  monthlySalaryMinor: number;
  payableMinor: number;
  currentObligationMinor: number;
  carriedArrearsMinor: number;
  totalDueMinor: number;
  advanceMinor: number;
  alreadyPaidMinor: number;
  remainingMinor: number;
  hasExistingPayment: boolean;
}
