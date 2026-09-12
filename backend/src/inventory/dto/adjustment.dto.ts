import { IsInt, IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

/**
 * Manual stock adjustment.
 *
 * `delta` may be positive or negative. It must not be zero.
 * The service validates that the resulting stock is not negative.
 */
export class AdjustmentDto {
  @IsUUID()
  productId: string;

  @IsInt()
  delta: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  note: string;
}
