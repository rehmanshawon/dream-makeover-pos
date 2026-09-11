import { Package } from '../src/packages/package.entity';
import { describe, expect, it } from '@jest/globals';

describe('Package entity', () => {
  it('should default to active true', () => {
    const pkg = new Package();
    expect(pkg.active).toBe(true);
  });

  it('should default description to null', () => {
    const pkg = new Package();
    expect(pkg.description).toBeNull();
  });

  it('should allow setting prices in minor units', () => {
    const pkg = new Package();
    pkg.normalPriceMinor = 570000;
    pkg.packagePriceMinor = 499900;
    pkg.savingsMinor = 70100;

    expect(pkg.normalPriceMinor).toBe(570000);
    expect(pkg.packagePriceMinor).toBe(499900);
    expect(pkg.savingsMinor).toBe(70100);
  });
});
