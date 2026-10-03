import { api } from './api-client';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  ResetUserPasswordRequest,
} from '../types/users';

export const usersApi = {
  list(): Promise<User[]> {
    return api.get<User[]>('/users');
  },

  create(payload: CreateUserRequest): Promise<User> {
    return api.post<User>('/users', payload);
  },

  update(id: string, payload: UpdateUserRequest): Promise<User> {
    return api.patch<User>(`/users/${id}`, payload);
  },

  resetPassword(id: string, payload: ResetUserPasswordRequest): Promise<void> {
    return api.patch<void>(`/users/${id}/password`, payload);
  },
};
