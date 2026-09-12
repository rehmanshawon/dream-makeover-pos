import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { SalaryPaymentType } from '../salary-payment-type.enum';
import { PaymentMethod } from '../payment-method.enum';

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
}
