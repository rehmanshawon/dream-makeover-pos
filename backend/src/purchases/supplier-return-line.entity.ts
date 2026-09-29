import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { PurchaseLine } from './purchase-line.entity';
import { SupplierReturn } from './supplier-return.entity';

@Entity('supplier_return_lines')
export class SupplierReturnLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_return_id', type: 'char', length: 36 })
  supplierReturnId: string;

  @ManyToOne(() => SupplierReturn, (supplierReturn) => supplierReturn.lines, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_return_id' })
  supplierReturn: Relation<SupplierReturn>;

  @Column({ name: 'purchase_line_id', type: 'char', length: 36 })
  purchaseLineId: string;

  @ManyToOne(() => PurchaseLine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_line_id' })
  purchaseLine: Relation<PurchaseLine>;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId: string;

  @Column({ type: 'int', unsigned: true })
  quantity: number;

  @Column({
    name: 'supplier_credit_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  supplierCreditMinor: number;

  @Column({
    name: 'inventory_value_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  inventoryValueMinor: number;
}
