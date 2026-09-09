import { Transaction } from '../src/transactions/transaction.entity';
import { describe, expect, it } from '@jest/globals';

describe('Transaction entity', () => {
  it('should initialize with default null customer and 0 discount', () => {
    const transaction = new Transaction();

    expect(transaction.id).toBeUndefined();
    expect(transaction.customerId).toBeNull();
    expect(transaction.customer).toBeNull();
    expect(transaction.discountMinor).toBe(0);
  });

  it('should correctly calculate total minor units after discount', () => {
    const transaction = new Transaction();
    transaction.subtotalMinor = 570000;
    transaction.discountMinor = 70100;

    expect(transaction.calculateTotal()).toBe(499900);
  });

  it('should correctly calculate change minor units', () => {
    const transaction = new Transaction();
    transaction.totalMinor = 499900;
    transaction.cashReceivedMinor = 500000;

    expect(transaction.calculateChange()).toBe(100);
  });

  it('should return 0 change when cash received is less than total', () => {
    const transaction = new Transaction();
    transaction.totalMinor = 500000;
    transaction.cashReceivedMinor = 400000;

    expect(transaction.calculateChange()).toBe(0);
  });

  it('should calculate change correctly when totalMinor is not set', () => {
    const transaction = new Transaction();
    transaction.subtotalMinor = 570000;
    transaction.discountMinor = 70100;
    transaction.cashReceivedMinor = 500000;

    expect(transaction.calculateChange()).toBe(100);
  });
});
