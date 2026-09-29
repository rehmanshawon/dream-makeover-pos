import { IsArray, IsDateString, IsInt, IsUUID } from 'class-validator';

export class CreateBankReconciliationDto {
  @IsDateString()
  statementDate: string;

  @IsInt()
  openingBalanceMinor: number;

  @IsInt()
  closingBalanceMinor: number;

  @IsArray()
  @IsUUID('all', { each: true })
  clearedJournalLineIds: string[];
}
