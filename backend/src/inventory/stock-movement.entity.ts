import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { StockMovementReason } from './stock-movement-reason.enum';

/**
 * Append-only ledger of stock changes.
 *
 * Every change to products.stock must be accompanied by one of these rows,
 * written inside the same database transaction as the stock change itself.
 *
 * The current stock value lives on products.stock. This table explains how
 * the value changed over time.
 */
@Entity('stock_movements')
@Index('idx_stock_movements_product', ['productId'])
@Index('idx_stock_movements_reason', ['reason'])
@Index('idx_stock_movements_created_at', ['createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  /**
   * Signed delta applied to product stock.
   * Positive for stock-in, negative for sale or downward adjustment.
   */
  @Column({ type: 'int' })
  delta: number;

  @Column({
    type: 'enum',
    enum: StockMovementReason,
  })
  reason: StockMovementReason;

  /**
   * Optional UUID of the entity that caused this movement.
   * For SALE, this is the transaction ID.
   */
  @Column({ name: 'reference_id', type: 'char', length: 36, nullable: true })
  referenceId: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null = null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
