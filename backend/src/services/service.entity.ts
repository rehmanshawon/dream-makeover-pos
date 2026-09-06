import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('services')
export class SalonService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'price_minor', type: 'bigint', unsigned: true })
  priceMinor: number;

  @Column({ name: 'duration_minutes', type: 'int', unsigned: true })
  durationMinutes: number;

  @Column({
    name: 'reward_point_weight',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  rewardPointWeight: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
