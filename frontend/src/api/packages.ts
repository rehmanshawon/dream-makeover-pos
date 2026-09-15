import { api } from './api-client';
import type { Package, CreatePackageRequest } from '../types/packages';

export const packagesApi = {
  list(activeOnly = false): Promise<Package[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    return api.get<Package[]>(`/packages${query}`);
  },

  getById(id: string): Promise<Package> {
    return api.get<Package>(`/packages/${id}`);
  },

  create(payload: CreatePackageRequest): Promise<Package> {
    return api.post<Package>('/packages', payload);
  },
};
