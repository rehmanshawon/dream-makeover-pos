import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';
import { PurchasePaymentMethod } from './purchase-payment-method.enum';
import { PurchaseLine } from './purchase-line.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 150, nullable: true })
  supplierName: string | null;

  @Column({ name: 'supplier_reference', type: 'varchar', length: 100, nullable: true })
  supplierReference: string | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PurchasePaymentMethod,
  })
  paymentMethod: PurchasePaymentMethod;

  @Column({
    name: 'total_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  totalMinor: number;

  @Column({ name: 'created_by', type: 'varchar', length: 80 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => PurchaseLine, (line) => line.purchase)
  lines: PurchaseLine[];
}
