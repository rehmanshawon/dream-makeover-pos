import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { PurchasePaymentMethod } from './purchase-payment-method.enum';
import { SupplierReturnLine } from './supplier-return-line.entity';

@Entity('supplier_returns')
export class SupplierReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_id', type: 'char', length: 36 })
  purchaseId: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 150 })
  supplierName: string;

  @Column({ name: 'refund_method', type: 'enum', enum: PurchasePaymentMethod })
  refundMethod: PurchasePaymentMethod;

  @Column({ name: 'credit_minor', type: 'bigint', unsigned: true, transformer: bigintTransformer })
  creditMinor: number;

  @Column({
    name: 'inventory_value_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  inventoryValueMinor: number;

  @Column({
    name: 'variance_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  varianceMinor: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => SupplierReturnLine, (line) => line.supplierReturn)
  lines: SupplierReturnLine[];
}
