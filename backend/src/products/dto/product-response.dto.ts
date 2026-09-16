export class ProductResponseDto {
  id: string;
  name: string;
  categoryId: string;
  /** The category name. Kept as a string for backward compatibility. */
  category: string;
  stock: number;
  purchaseCostMinor?: number;
  sellingPriceMinor: number;
  minimumStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
