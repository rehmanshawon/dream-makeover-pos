import type { ProductCategory } from '../../../types/products';

export interface CategoryRouteConfig {
  /** URL segment used in /cosmetics, /shari, /three-piece. */
  slug: 'cosmetics' | 'shari' | 'three-piece';
  /** Category value used by the backend. */
  category: ProductCategory;
  /** Human-readable page title. */
  title: string;
  /** Singular label used in the "New X" button. */
  singular: string;
}

export const CATEGORY_ROUTES: Record<CategoryRouteConfig['slug'], CategoryRouteConfig> = {
  cosmetics: {
    slug: 'cosmetics',
    category: 'Cosmetics',
    title: 'Cosmetics',
    singular: 'cosmetic product',
  },
  shari: {
    slug: 'shari',
    category: 'Saree',
    title: 'Shari',
    singular: 'saree',
  },
  'three-piece': {
    slug: 'three-piece',
    category: 'Three-piece',
    title: 'Three-piece',
    singular: 'three-piece',
  },
};
