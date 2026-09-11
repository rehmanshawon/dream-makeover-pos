import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_packages_name', { unique: true })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null = null;

  /**
   * Sum of component prices at the time this package was configured.
   * This is a snapshot, not a live calculation.
   */
  @Column({
    name: 'normal_price_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  normalPriceMinor: number;

  /**
   * Actual selling price of the package. Must be <= normalPriceMinor.
   */
  @Column({
    name: 'package_price_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  packagePriceMinor: number;

  /**
   * Explicitly stored savings. Equals normalPriceMinor - packagePriceMinor.
   * Stored so that historical receipts and reports remain auditable.
   */
  @Column({
    name: 'savings_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  savingsMinor: number;

  @Column({ type: 'boolean', default: true })
  active: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
