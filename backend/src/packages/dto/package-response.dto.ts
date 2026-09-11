import { PackageItemKind } from '../package-item-kind.enum';

export class PackageItemResponseDto {
  id: string;
  itemKind: PackageItemKind;
  itemId: string;
  itemName: string;
  snapshotPriceMinor: number;
}

export class PackageResponseDto {
  id: string;
  name: string;
  description: string | null;
  normalPriceMinor: number;
  packagePriceMinor: number;
  savingsMinor: number;
  active: boolean;
  items: PackageItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
