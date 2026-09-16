import { CategoryKind } from '../category-kind.enum';

export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  parentId: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tree node shape. Each node carries its children as a nested array.
 */
export class CategoryNodeDto extends CategoryResponseDto {
  children: CategoryNodeDto[];
}
