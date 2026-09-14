export type ProductCategory = 'Cosmetics' | 'Saree' | 'Three-piece';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  purchaseCostMinor: number;
  sellingPriceMinor: number;
  minimumStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  category: ProductCategory;
  stock: number;
  purchaseCostMinor: number;
  sellingPriceMinor: number;
  minimumStockThreshold: number;
}

export type StockMovementReason = 'SALE' | 'STOCK_IN' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: string;
  productId: string;
  delta: number;
  reason: StockMovementReason;
  referenceId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface UpdateProductRequest {
  name?: string;
  category?: ProductCategory;
  purchaseCostMinor?: number;
  sellingPriceMinor?: number;
  minimumStockThreshold?: number;
}

export interface StockInRequest {
  productId: string;
  quantity: number;
  note?: string;
}

export interface AdjustmentRequest {
  productId: string;
  delta: number;
  note: string;
}
