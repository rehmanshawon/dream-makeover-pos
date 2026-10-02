import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CheckoutItemDto } from './checkout-item.dto';
import { SalePaymentMethod } from '../../sale-payment-method.enum';
import { MobileWalletProvider } from '../../mobile-wallet-provider.enum';

export class CheckoutRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  redeemRewardPoints?: boolean;

  @IsInt()
  @Min(0)
  discountMinor: number;

  @IsInt()
  @Min(0)
  cashReceivedMinor: number;

  @IsOptional()
  @IsEnum(SalePaymentMethod)
  paymentMethod?: SalePaymentMethod;

  @IsOptional()
  @IsEnum(MobileWalletProvider)
  mobileWalletProvider?: MobileWalletProvider;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
