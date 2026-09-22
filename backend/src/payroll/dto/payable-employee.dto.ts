export class PayableEmployeeDto {
  employeeId: string;
  employeeName: string;
  role: string;
  monthlySalaryMinor: number;
  payableMinor: number;
  alreadyPaidMinor: number;
  remainingMinor: number;
  hasExistingPayment: boolean;
}
