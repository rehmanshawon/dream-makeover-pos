import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

@Entity('services')
export class SalonService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index('idx_services_category')
  @Column({ name: 'category_id', type: 'char', length: 36 })
  categoryId: string;

  @Column({
    name: 'price_minor',
    type: 'bigint',
    unsigned: true,
    transformer: bigintTransformer,
  })
  priceMinor: number;

  @Column({
    name: 'duration_minutes',
    type: 'int',
    unsigned: true,
  })
  durationMinutes: number;

  @Column({
    name: 'reward_point_weight',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  rewardPointWeight: number = 1;

  @Column({ type: 'boolean', default: true })
  active: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
