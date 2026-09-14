import { IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * Partial update for a customer.
 *
 * Only fullName and phoneNumber are editable. Loyalty fields
 * (rewardTier, rewardPoints, lifetimeSpendMinor) are derived from
 * transactions and must never be edited directly.
 */
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(3, 150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'phoneNumber must contain only digits, spaces, +, -, (, )',
  })
  phoneNumber?: string;
}
