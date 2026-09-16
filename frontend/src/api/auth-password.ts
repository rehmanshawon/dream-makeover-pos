import { api } from './api-client';
import type { ChangePasswordRequest } from '../types/users';

export const authPasswordApi = {
  changePassword(payload: ChangePasswordRequest): Promise<void> {
    return api.post<void>('/auth/change-password', payload);
  },
};
