import { Product } from '../src/products/product.entity';
//import { ProductCategory } from '../src/products/product-category.enum';
import { describe, expect, it } from '@jest/globals';

describe('Product entity', () => {
  it('should initialize with default stock values', () => {
    const product = new Product();

    // Verifies that default values are applied upon instantiation
    expect(product.stock).toBe(0);
    expect(product.purchaseCostMinor).toBe(0);
    expect(product.minimumStockThreshold).toBe(0);
  });

  it('should correctly reduce stock when decrementStock is called', () => {
    const product = new Product();
    product.stock = 10;

    product.decrementStock(3);

    expect(product.stock).toBe(7);
  });

  it('should throw an error when attempting to decrement more stock than available', () => {
    const product = new Product();
    product.stock = 2;

    expect(() => product.decrementStock(5)).toThrow('Insufficient stock');
  });

  it('should correctly identify when stock is below or equal to threshold', () => {
    const product = new Product();
    product.stock = 3;
    product.minimumStockThreshold = 5;

    expect(product.isLowStock()).toBe(true);

    product.stock = 10;
    expect(product.isLowStock()).toBe(false);
  });
});
