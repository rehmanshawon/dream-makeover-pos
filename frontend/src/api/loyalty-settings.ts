import { api } from './api-client';
import type { LoyaltySettings, UpdateLoyaltySettingsRequest } from '../types/loyalty';

export const loyaltySettingsApi = {
  get(): Promise<LoyaltySettings> {
    return api.get<LoyaltySettings>('/loyalty-settings');
  },

  update(payload: UpdateLoyaltySettingsRequest): Promise<LoyaltySettings> {
    return api.patch<LoyaltySettings>('/loyalty-settings', payload);
  },
};
