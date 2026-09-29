import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  paymentDate: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor: number;

  @IsString()
  @Length(1, 150)
  supplierName: string;

  @IsString()
  @Matches(/^(CASH|BANK|MOBILE)$/)
  paymentAccountCode: 'CASH' | 'BANK' | 'MOBILE';

  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;
}
