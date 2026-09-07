import { Customer } from '../src/customers/customer.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { describe, expect, it } from '@jest/globals';

describe('Customer entity', () => {
  it('should have an undefined ID before database insertion', () => {
    const customer = new Customer();
    expect(customer.id).toBeUndefined();
  });

  it('should initialize with the Silver reward tier by default', () => {
    const customer = new Customer();
    // We expect the class to apply this automatically now
    expect(customer.rewardTier).toBe(CustomerRewardTier.SILVER);
  });

  it('should initialize with 0 lifetime spend and 0 reward points', () => {
    const customer = new Customer();
    // Testing the default initialization logic
    expect(customer.lifetimeSpendMinor).toBe(0);
    expect(customer.rewardPoints).toBe(0);
  });
});
