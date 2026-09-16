import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole } from '../user-role.enum';

/**
 * Partial update for a user. Admin-only.
 *
 * Username and password are intentionally NOT editable here.
 * - Username changes break audit logs.
 * - Password changes are self-service (see /auth/change-password).
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  displayName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
