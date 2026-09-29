import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { Product } from '../products/product.entity';
import { Purchase } from './purchase.entity';

@Entity('purchase_lines')
export class PurchaseLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_id', type: 'char', length: 36 })
  purchaseId: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.lines, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Relation<Purchase>;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({
    name: 'unit_cost_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  unitCostMinor: number;

  @Column({
    name: 'total_cost_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  totalCostMinor: number;
}
