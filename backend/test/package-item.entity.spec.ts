import { PackageItem } from '../src/packages/package-item.entity';
import { PackageItemKind } from '../src/packages/package-item-kind.enum';
import { describe, expect, it } from '@jest/globals';

describe('PackageItem entity', () => {
  it('should default nullable FKs to null', () => {
    const item = new PackageItem();
    expect(item.serviceId).toBeNull();
    expect(item.productId).toBeNull();
    expect(item.service).toBeNull();
    expect(item.product).toBeNull();
  });

  it('should represent a service item', () => {
    const item = new PackageItem();
    item.itemKind = PackageItemKind.SERVICE;
    item.serviceId = 'svc-uuid';
    item.productId = null;
    item.snapshotPriceMinor = 350000;

    expect(item.itemKind).toBe(PackageItemKind.SERVICE);
    expect(item.serviceId).toBe('svc-uuid');
    expect(item.productId).toBeNull();
  });

  it('should represent a product item', () => {
    const item = new PackageItem();
    item.itemKind = PackageItemKind.PRODUCT;
    item.productId = 'prod-uuid';
    item.serviceId = null;
    item.snapshotPriceMinor = 120000;

    expect(item.itemKind).toBe(PackageItemKind.PRODUCT);
    expect(item.productId).toBe('prod-uuid');
    expect(item.serviceId).toBeNull();
  });
});
