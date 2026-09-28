import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Matches,
} from 'class-validator';
import { JournalEntryType } from '../journal-entry-type.enum';

export class CreateVoucherDto {
  @IsEnum(JournalEntryType)
  entryType: JournalEntryType;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  entryDate: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  memo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(CASH|BANK)$/)
  cashBankAccountCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(CASH|BANK)$/)
  fromAccountCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(CASH|BANK)$/)
  toAccountCode?: string;
}
