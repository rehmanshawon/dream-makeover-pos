import {
  Column,
  CreateDateColumn,
  Entity,
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

  @Column({
    name: 'price_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  priceMinor: number = 0;

  @Column({ name: 'duration_minutes', type: 'int', unsigned: true })
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
