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
import { PurchasePaymentMethod } from '../purchase-payment-method.enum';

export class CreateSupplierReturnLineDto {
  @IsUUID()
  purchaseLineId: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity: number;
}

export class CreateSupplierReturnDto {
  @IsUUID()
  purchaseId: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnDate: string;

  @IsEnum(PurchasePaymentMethod)
  refundMethod: PurchasePaymentMethod;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierReturnLineDto)
  lines: CreateSupplierReturnLineDto[];
}
