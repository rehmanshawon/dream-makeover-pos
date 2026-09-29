import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class ReverseJournalEntryDto {
  @IsDateString()
  reversalDate: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  reason: string;
}
