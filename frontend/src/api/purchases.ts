import { api } from './api-client';
import type { CreatePurchaseRequest, Purchase } from '../types/purchases';

export const purchasesApi = {
  create(payload: CreatePurchaseRequest): Promise<Purchase> {
    return api.post<Purchase>('/purchases', payload);
  },
};
