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

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  @Column({ name: 'purchase_cost_minor', type: 'bigint', unsigned: true, default: 0 })
  purchaseCostMinor: number;

  @Column({ name: 'selling_price_minor', type: 'bigint', unsigned: true })
  sellingPriceMinor: number;

  @Column({
    name: 'minimum_stock_threshold',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  minimumStockThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
