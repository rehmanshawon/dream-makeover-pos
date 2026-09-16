import { api } from './api-client';
import type { InventoryStats, LowStockProduct } from '../types/inventory';

export const inventoryStatsApi = {
  getStats(): Promise<InventoryStats> {
    return api.get<InventoryStats>('/inventory/stats');
  },

  getLowStock(): Promise<LowStockProduct[]> {
    return api.get<LowStockProduct[]>('/inventory/low-stock');
  },

  getOutOfStock(): Promise<LowStockProduct[]> {
    return api.get<LowStockProduct[]>('/inventory/out-of-stock');
  },
};
