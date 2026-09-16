import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { ProductCategory } from '../product-category.enum';

/**
 * Partial update for a product.
 *
 * Note: `stock` is intentionally NOT part of this DTO. Stock changes
 * must be recorded as StockMovement rows. Use the inventory endpoints
 * (`/inventory/stock-in`, `/inventory/adjust`) for that.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchaseCostMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sellingPriceMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStockThreshold?: number;
}
