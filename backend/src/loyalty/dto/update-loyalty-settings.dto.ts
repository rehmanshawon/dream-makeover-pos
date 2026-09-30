import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { LoyaltyTierSettingsDto } from './loyalty-tier-settings.dto';

export class UpdateLoyaltySettingsDto {
  @IsInt()
  @Min(1)
  earningSpendMinor: number;

  @IsInt()
  @Min(1)
  earningPoints: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => LoyaltyTierSettingsDto)
  tiers: LoyaltyTierSettingsDto[];
}
