import { api } from './api-client';
import type {
  CreatePurchaseRequest,
  CreateSupplierReturnRequest,
  Purchase,
  ReturnablePurchaseLine,
  SupplierReturnResult,
} from '../types/purchases';

export const purchasesApi = {
  create(payload: CreatePurchaseRequest): Promise<Purchase> {
    return api.post<Purchase>('/purchases', payload);
  },

  returnableLines(productId: string): Promise<ReturnablePurchaseLine[]> {
    return api.get<ReturnablePurchaseLine[]>(`/purchases/returnable-lines/${productId}`);
  },

  createReturn(payload: CreateSupplierReturnRequest): Promise<SupplierReturnResult> {
    return api.post<SupplierReturnResult>('/purchases/returns', payload);
  },
};
