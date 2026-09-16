import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  /**
   * Category id. Defaults to the "Services" category when omitted, so
   * the existing frontend continues to work unchanged.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsInt()
  @Min(1)
  priceMinor: number;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsInt()
  @Min(0)
  rewardPointWeight: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
