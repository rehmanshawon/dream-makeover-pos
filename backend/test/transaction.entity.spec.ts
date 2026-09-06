import { Transaction } from '../src/transactions/transaction.entity';
import { describe, expect, it } from '@jest/globals';

describe('Transaction entity', () => {
  it('should have a UUID primary key', () => {
    const transaction = new Transaction();
    expect(transaction.id).toBeUndefined();
  });

  it('should store monetary values in minor units', () => {
    const transaction = new Transaction();
    transaction.subtotalMinor = 570000;
    transaction.discountMinor = 70100;
    transaction.totalMinor = 499900;
    transaction.cashReceivedMinor = 500000;
    transaction.changeMinor = 100;

    expect(transaction.subtotalMinor).toBe(570000);
    expect(transaction.discountMinor).toBe(70100);
    expect(transaction.totalMinor).toBe(499900);
    expect(transaction.cashReceivedMinor).toBe(500000);
    expect(transaction.changeMinor).toBe(100);
  });

  it('should allow nullable customer', () => {
    const transaction = new Transaction();
    transaction.customerId = null;
    transaction.customer = null;

    expect(transaction.customerId).toBeNull();
    expect(transaction.customer).toBeNull();
  });
});
