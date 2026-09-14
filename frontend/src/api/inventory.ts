import { api } from './api-client';
import type { AdjustmentRequest, StockInRequest, StockMovement } from '../types/products';

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
};
