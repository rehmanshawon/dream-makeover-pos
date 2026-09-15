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

export interface CreatePackageItemRequest {
  itemKind: PackageItemKind;
  itemId: string;
}

export interface CreatePackageRequest {
  name: string;
  description?: string;
  packagePriceMinor: number;
  items: CreatePackageItemRequest[];
  active?: boolean;
}
