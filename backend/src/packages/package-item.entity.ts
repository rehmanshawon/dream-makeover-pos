import {
  Column,
  CreateDateColumn,
  Entity,
  Check,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';
import { Product } from '../products/product.entity';
import { SalonService } from '../services/service.entity';
import { PackageItemKind } from './package-item-kind.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

@Entity('package_items')
@Index('idx_package_items_package', ['packageId'])
@Check(
  'chk_package_items_kind',
  `(item_kind = 'SERVICE' AND service_id IS NOT NULL AND product_id IS NULL) OR (item_kind = 'PRODUCT' AND product_id IS NOT NULL AND service_id IS NULL)`,
)
export class PackageItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'package_id', type: 'char', length: 36 })
  packageId: string;

  @ManyToOne(() => Package, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({
    name: 'item_kind',
    type: 'enum',
    enum: PackageItemKind,
  })
  itemKind: PackageItemKind;

  @Column({ name: 'service_id', type: 'char', length: 36, nullable: true })
  serviceId: string | null = null;

  @ManyToOne(() => SalonService, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service: SalonService | null = null;

  @Column({ name: 'product_id', type: 'char', length: 36, nullable: true })
  productId: string | null = null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null = null;

  /**
   * Snapshot of the referenced item's price at the moment it was added
   * to the package. Used to compute normalPriceMinor when the package
   * is configured.
   */
  @Column({
    name: 'snapshot_price_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  snapshotPriceMinor: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
