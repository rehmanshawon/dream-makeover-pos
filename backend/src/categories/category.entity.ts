import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryKind } from './category-kind.enum';

@Entity('categories')
@Unique('uq_categories_kind_slug', ['kind', 'slug'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  slug: string;

  @Index('idx_categories_kind')
  @Column({ type: 'enum', enum: CategoryKind })
  kind: CategoryKind;

  @Index('idx_categories_parent')
  @Column({ name: 'parent_id', type: 'char', length: 36, nullable: true })
  parentId: string | null = null;

  @Column({ name: 'display_order', type: 'int', unsigned: true, default: 0 })
  displayOrder: number = 0;

  @Column({ type: 'boolean', default: true })
  active: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
