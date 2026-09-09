import { UserRole } from '../../users/user-role.enum';

export class LoginResponseDto {
  accessToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
  };
}
