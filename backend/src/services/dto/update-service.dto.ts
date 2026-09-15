import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * Partial update for a salon service.
 *
 * Every field is optional. Only the fields present in the request body
 * are modified.
 *
 * `active` is included here because toggling the active state is a
 * partial update, not a separate operation.
 */
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardPointWeight?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
