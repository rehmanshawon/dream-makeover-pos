export class LowStockProductDto {
  id: string;
  name: string;
  category: string;
  stock: number;
  minimumStockThreshold: number;
  sellingPriceMinor: number;
  outOfStock: boolean;
}
