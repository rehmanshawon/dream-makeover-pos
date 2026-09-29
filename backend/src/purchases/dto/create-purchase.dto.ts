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

export class CreatePurchaseLineDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity: number;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  unitCostMinor: number;
}

export class CreatePurchaseDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  purchaseDate: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  supplierReference?: string;

  @IsEnum(PurchasePaymentMethod)
  paymentMethod: PurchasePaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseLineDto)
  lines: CreatePurchaseLineDto[];
}
