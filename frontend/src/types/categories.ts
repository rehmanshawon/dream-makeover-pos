export type CategoryKind = 'SERVICE' | 'PRODUCT';

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  parentId: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface CreateCategoryRequest {
  name: string;
  kind: CategoryKind;
  parentId?: string;
  displayOrder?: number;
  active?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  displayOrder?: number;
  active?: boolean;
}

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  SERVICE: 'Service',
  PRODUCT: 'Product',
};
