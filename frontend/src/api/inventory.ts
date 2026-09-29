import { api } from './api-client';
import type { AdjustmentRequest, StockInRequest, StockMovement } from '../types/products';

export interface CreateCostRevaluationRequest {
  productId: string;
  effectiveDate: string;
  newUnitCostMinor: number;
  note?: string;
}

export const inventoryApi = {
  historyForProduct(productId: string): Promise<StockMovement[]> {
    return api.get<StockMovement[]>(`/inventory/products/${productId}/history`);
  },

  stockIn(payload: StockInRequest): Promise<StockMovement> {
    return api.post<StockMovement>('/inventory/stock-in', payload);
  },

  adjust(payload: AdjustmentRequest): Promise<StockMovement> {
    return api.post<StockMovement>('/inventory/adjust', payload);
  },

  revalueCost(payload: CreateCostRevaluationRequest): Promise<unknown> {
    return api.post<unknown>('/inventory/revaluations', payload);
  },
};
