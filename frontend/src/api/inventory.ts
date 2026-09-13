import { api } from './api-client';
import type { StockMovement } from '../types/products';

export const inventoryApi = {
  historyForProduct(productId: string): Promise<StockMovement[]> {
    return api.get<StockMovement[]>(`/inventory/products/${productId}/history`);
  },
};
