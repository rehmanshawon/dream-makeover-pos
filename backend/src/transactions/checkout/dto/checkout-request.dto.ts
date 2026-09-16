import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CheckoutItemDto } from './checkout-item.dto';

export class CheckoutRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsInt()
  @Min(0)
  discountMinor: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRatePercent?: number;

  @IsInt()
  @Min(0)
  cashReceivedMinor: number;
}
