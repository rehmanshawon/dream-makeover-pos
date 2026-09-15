import { api } from './api-client';
import type { SalonService, CreateServiceRequest, UpdateServiceRequest } from '../types/services';

export const salonServicesApi = {
  list(activeOnly = false): Promise<SalonService[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    return api.get<SalonService[]>(`/services${query}`);
  },

  getById(id: string): Promise<SalonService> {
    return api.get<SalonService>(`/services/${id}`);
  },

  create(payload: CreateServiceRequest): Promise<SalonService> {
    return api.post<SalonService>('/services', payload);
  },

  update(id: string, payload: UpdateServiceRequest): Promise<SalonService> {
    return api.patch<SalonService>(`/services/${id}`, payload);
  },
};
