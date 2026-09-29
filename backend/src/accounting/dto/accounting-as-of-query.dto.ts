import { IsDateString } from 'class-validator';

export class AccountingAsOfQueryDto {
  @IsDateString()
  asOf: string;
}
