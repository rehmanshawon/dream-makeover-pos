import { Customer } from '../src/customers/customer.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { describe, expect, it } from '@jest/globals';

describe('Customer entity', () => {
  it('should have a UUID primary key', () => {
    const customer = new Customer();
    expect(customer.id).toBeUndefined();
  });

  it('should default to Silver tier', () => {
    const customer = new Customer();
    customer.rewardTier = CustomerRewardTier.SILVER;
    expect(customer.rewardTier).toBe(CustomerRewardTier.SILVER);
  });

  it('should store lifetime spend in minor units', () => {
    const customer = new Customer();
    customer.lifetimeSpendMinor = 570000;
    expect(customer.lifetimeSpendMinor).toBe(570000);
  });
});
