import { UserRole } from '../user-role.enum';

export class UserResponseDto {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
