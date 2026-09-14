import type { ProductCategory } from './products';

export type PackageItemKind = 'SERVICE' | 'PRODUCT';

export interface PackageItem {
  id: string;
  itemKind: PackageItemKind;
  itemId: string;
  itemName: string;
  snapshotPriceMinor: number;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  normalPriceMinor: number;
  packagePriceMinor: number;
  savingsMinor: number;
  active: boolean;
  items: PackageItem[];
  createdAt: string;
  updatedAt: string;
}

// Re-export for convenience
export type { ProductCategory };
