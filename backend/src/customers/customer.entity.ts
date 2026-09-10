import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerRewardTier } from './customer-reward-tier.enum';
import { bigintTransformer } from '../common/transformers/bigint.transformer';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Index('uq_customers_phone', { unique: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  // Add the default value to the property definition
  @Column({
    name: 'reward_tier',
    type: 'enum',
    enum: CustomerRewardTier,
    default: CustomerRewardTier.SILVER,
  })
  rewardTier: CustomerRewardTier = CustomerRewardTier.SILVER;

  // Add the default value to the property definition
  @Column({ name: 'reward_points', type: 'int', unsigned: true, default: 0 })
  rewardPoints: number = 0;

  // Add the default value to the property definition
  @Column({
    name: 'lifetime_spend_minor',
    type: 'bigint',
    unsigned: true,
    default: 0,
    transformer: bigintTransformer,
  })
  lifetimeSpendMinor: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export { CustomerRewardTier };
