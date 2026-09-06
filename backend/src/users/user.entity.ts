import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';
import * as bcrypt from 'bcryptjs';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_users_username', { unique: true })
  @Column({ type: 'varchar', length: 80 })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName: string;

  // We assign the default value directly to the property so it exists in memory
  // immediately upon instantiation, making it perfectly unit-testable.
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role: UserRole = UserRole.STAFF;

  // Same here for the active status.
  @Column({ type: 'boolean', default: true })
  active: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Hashes a plaintext password and assigns it to the entity.
   */
  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(password, salt);
  }
}
