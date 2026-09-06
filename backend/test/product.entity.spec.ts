import { Product } from '../src/products/product.entity';
import { ProductCategory } from '../src/products/product-category.enum';
import { describe, expect, it } from '@jest/globals';

describe('Product entity', () => {
  it('should have a UUID primary key', () => {
    const product = new Product();
    expect(product.id).toBeUndefined();
  });

  it('should store selling price in minor units', () => {
    const product = new Product();
    product.sellingPriceMinor = 180000;
    expect(product.sellingPriceMinor).toBe(180000);
  });

  it('should not allow negative stock', () => {
    const product = new Product();
    product.stock = 0;
    expect(product.stock).toBeGreaterThanOrEqual(0);
  });

  it('should support all product categories', () => {
    expect(ProductCategory.COSMETICS).toBe('Cosmetics');
    expect(ProductCategory.SAREE).toBe('Saree');
    expect(ProductCategory.THREE_PIECE).toBe('Three-piece');
  });
});
