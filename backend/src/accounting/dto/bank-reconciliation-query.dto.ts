import { IsDateString } from 'class-validator';

export class BankReconciliationQueryDto {
  @IsDateString()
  statementDate: string;
}
