import { PayPeriodStatus } from '../pay-period-status.enum';

export class PayPeriodResponseDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayPeriodStatus;
  payrollRunAvailable: boolean;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
