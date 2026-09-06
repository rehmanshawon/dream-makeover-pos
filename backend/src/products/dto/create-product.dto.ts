import { IsEnum, IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';
import { ProductCategory } from '../product-category.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  @Min(0)
  purchaseCostMinor: number;

  @IsInt()
  @Min(1)
  sellingPriceMinor: number;

  @IsInt()
  @Min(0)
  minimumStockThreshold: number;
}
