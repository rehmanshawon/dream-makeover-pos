import { api } from './api-client';
import type { SalonService } from '../types/services';

export const salonServicesApi = {
  list(activeOnly = true): Promise<SalonService[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    return api.get<SalonService[]>(`/services${query}`);
  },
};
