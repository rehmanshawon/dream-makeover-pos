import { api } from './api-client';
import type { Package } from '../types/packages';

export const packagesApi = {
  list(activeOnly = true): Promise<Package[]> {
    const query = activeOnly ? '?activeOnly=true' : '';
    return api.get<Package[]>(`/packages${query}`);
  },
};
