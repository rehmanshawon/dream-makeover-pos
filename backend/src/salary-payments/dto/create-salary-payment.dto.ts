import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { SalaryPaymentType } from '../salary-payment-type.enum';
import { PaymentMethod } from '../payment-method.enum';
import { BonusType } from '../bonus-type.enum';

export class CreateSalaryPaymentDto {
  @IsUUID()
  employeeId: string;

  @IsInt()
  @Min(1)
  amountMinor: number;

  @IsOptional()
  @IsEnum(SalaryPaymentType)
  paymentType?: SalaryPaymentType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'paidOn must be in YYYY-MM-DD format',
  })
  paidOn: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  note?: string;

  @ValidateIf((dto: CreateSalaryPaymentDto) => dto.paymentType === SalaryPaymentType.BONUS)
  @IsDefined()
  @IsEnum(BonusType)
  bonusType?: BonusType;

  @ValidateIf((dto: CreateSalaryPaymentDto) => dto.paymentType === SalaryPaymentType.OVERTIME)
  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(12)
  overtimeHours?: number;

  @ValidateIf((dto: CreateSalaryPaymentDto) => dto.paymentType === SalaryPaymentType.OVERTIME)
  @IsDefined()
  @IsDateString({ strict: true })
  overtimeDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  checkNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  mobileWalletProvider?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  mobileWalletNumber?: string;
}
