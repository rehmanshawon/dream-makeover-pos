import type { ProductCategory } from './products';

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/**
 * Shape returned by the low-stock and out-of-stock backend endpoints.
 *
 * The current UI computes low and out-of-stock sets client-side from the
 * full product list. This type is kept for future use (e.g., a mobile
 * client or a scheduled alert).
 */
export interface LowStockProduct {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  minimumStockThreshold: number;
  sellingPriceMinor: number;
  outOfStock: boolean;
}
