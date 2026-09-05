import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerRewardTier } from './customer-reward-tier.enum';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Index('uq_customers_phone', { unique: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({
    name: 'reward_tier',
    type: 'enum',
    enum: CustomerRewardTier,
    default: CustomerRewardTier.SILVER,
  })
  rewardTier: CustomerRewardTier;

  @Column({ name: 'reward_points', type: 'int', unsigned: true, default: 0 })
  rewardPoints: number;

  @Column({
    name: 'lifetime_spend_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
  })
  lifetimeSpendMinor: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
