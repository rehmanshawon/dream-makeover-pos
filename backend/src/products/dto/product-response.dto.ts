import { ProductCategory } from '../product-category.enum';

export class ProductResponseDto {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  purchaseCostMinor: number;
  sellingPriceMinor: number;
  minimumStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}
