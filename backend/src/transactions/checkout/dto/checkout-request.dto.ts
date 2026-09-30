import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
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

  @IsInt()
  @Min(0)
  cashReceivedMinor: number;
}
