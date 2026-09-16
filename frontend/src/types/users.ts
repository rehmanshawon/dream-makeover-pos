import type { UserRole } from './auth';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  active?: boolean;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  active?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
