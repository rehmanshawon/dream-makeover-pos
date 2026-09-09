import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductCategory } from './product-category.enum';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_products_category')
  @Column({
    type: 'enum',
    enum: ProductCategory,
  })
  category: ProductCategory;

  // Added property initializers (= 0) so pure unit tests see default values
  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number = 0;

  @Column({ name: 'purchase_cost_minor', type: 'bigint', unsigned: true, default: 0 })
  purchaseCostMinor: number = 0;

  @Column({ name: 'selling_price_minor', type: 'bigint', unsigned: true })
  sellingPriceMinor: number;

  @Column({
    name: 'minimum_stock_threshold',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  minimumStockThreshold: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Domain behavior method suitable for unit testing
  decrementStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
  }

  isLowStock(): boolean {
    return this.stock <= this.minimumStockThreshold;
  }
}
