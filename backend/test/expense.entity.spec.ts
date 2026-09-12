import { Expense } from '../src/expenses/expense.entity';
import { ExpenseCategory } from '../src/expenses/expense-category.enum';
import { ExpensePaymentMethod } from '../src/expenses/expense-payment-method.enum';
import { describe, expect, it } from '@jest/globals';

describe('Expense entity', () => {
  it('should default payment method to CASH', () => {
    const expense = new Expense();
    expect(expense.paymentMethod).toBe(ExpensePaymentMethod.CASH);
  });

  it('should default nullable fields to null', () => {
    const expense = new Expense();
    expect(expense.payee).toBeNull();
    expect(expense.reference).toBeNull();
    expect(expense.note).toBeNull();
  });

  it('should store amount in minor units', () => {
    const expense = new Expense();
    expense.amountMinor = 150000;
    expect(expense.amountMinor).toBe(150000);
  });

  it('should support every category', () => {
    expect(ExpenseCategory.ELECTRICITY).toBe('ELECTRICITY');
    expect(ExpenseCategory.WATER).toBe('WATER');
    expect(ExpenseCategory.INTERNET).toBe('INTERNET');
    expect(ExpenseCategory.RENT).toBe('RENT');
    expect(ExpenseCategory.MAINTENANCE).toBe('MAINTENANCE');
    expect(ExpenseCategory.CLEANING).toBe('CLEANING');
    expect(ExpenseCategory.STATIONERY).toBe('STATIONERY');
    expect(ExpenseCategory.TRANSPORTATION).toBe('TRANSPORTATION');
    expect(ExpenseCategory.MARKETING).toBe('MARKETING');
    expect(ExpenseCategory.EQUIPMENT).toBe('EQUIPMENT');
    expect(ExpenseCategory.MISC).toBe('MISC');
  });

  it('should support every payment method', () => {
    expect(ExpensePaymentMethod.CASH).toBe('CASH');
    expect(ExpensePaymentMethod.BANK).toBe('BANK');
    expect(ExpensePaymentMethod.MOBILE).toBe('MOBILE');
    expect(ExpensePaymentMethod.CARD).toBe('CARD');
    expect(ExpensePaymentMethod.OTHER).toBe('OTHER');
  });

  it('should have an undefined ID before database insertion', () => {
    const expense = new Expense();
    expect(expense.id).toBeUndefined();
  });
});
