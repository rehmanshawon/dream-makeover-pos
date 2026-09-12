import { ProductCategory } from '../../products/product-category.enum';

export class LowStockProductDto {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  minimumStockThreshold: number;
  sellingPriceMinor: number;
  outOfStock: boolean;
}
