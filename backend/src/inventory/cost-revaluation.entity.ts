import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { Product } from '../products/product.entity';

@Entity('inventory_cost_revaluations')
export class CostRevaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'stock_snapshot', type: 'int', unsigned: true })
  stockSnapshot: number;

  @Column({
    name: 'previous_unit_cost_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  previousUnitCostMinor: number;

  @Column({
    name: 'new_unit_cost_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  newUnitCostMinor: number;

  @Column({ name: 'inventory_value_delta_minor', type: 'bigint', transformer: bigintTransformer })
  inventoryValueDeltaMinor: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
