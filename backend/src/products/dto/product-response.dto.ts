import { ProductCategory } from '../product-category.enum';

export class ProductResponseDto {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  /**
   * Omitted when the caller is not an ADMIN. The field is optional to
   * allow the service to strip it for staff users.
   */
  purchaseCostMinor?: number;
  sellingPriceMinor: number;
  minimumStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
