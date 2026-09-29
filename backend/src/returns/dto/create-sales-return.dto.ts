import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../salary-payments/payment-method.enum';

export class CreateSalesReturnLineDto {
  @IsUUID()
  transactionItemId: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity: number;
}

export class CreateSalesReturnDto {
  @IsUUID()
  transactionId: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnDate: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnLineDto)
  lines: CreateSalesReturnLineDto[];
}
