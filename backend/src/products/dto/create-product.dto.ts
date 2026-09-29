import { Equals, IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name: string;

  /**
   * Category name or slug. The backend resolves this to a category id
   * of kind PRODUCT.
   */
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsInt()
  @Equals(0, {
    message: 'New products must start with zero stock; record a purchase to receive stock.',
  })
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
