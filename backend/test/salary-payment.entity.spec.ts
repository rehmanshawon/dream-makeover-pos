import { SalaryPayment } from '../src/salary-payments/salary-payment.entity';
import { SalaryPaymentType } from '../src/salary-payments/salary-payment-type.enum';
import { PaymentMethod } from '../src/salary-payments/payment-method.enum';
import { describe, expect, it } from '@jest/globals';

describe('SalaryPayment entity', () => {
  it('should default payment type to REGULAR', () => {
    const payment = new SalaryPayment();
    expect(payment.paymentType).toBe(SalaryPaymentType.REGULAR);
  });

  it('should default payment method to CASH', () => {
    const payment = new SalaryPayment();
    expect(payment.paymentMethod).toBe(PaymentMethod.CASH);
  });

  it('should default note to null', () => {
    const payment = new SalaryPayment();
    expect(payment.note).toBeNull();
  });

  it('should store amount in minor units', () => {
    const payment = new SalaryPayment();
    payment.amountMinor = 3500000;
    expect(payment.amountMinor).toBe(3500000);
  });

  it('should support all payment types', () => {
    expect(SalaryPaymentType.REGULAR).toBe('REGULAR');
    expect(SalaryPaymentType.BONUS).toBe('BONUS');
    expect(SalaryPaymentType.OVERTIME).toBe('OVERTIME');
    expect(SalaryPaymentType.ADVANCE).toBe('ADVANCE');
  });

  it('should support all payment methods', () => {
    expect(PaymentMethod.CASH).toBe('CASH');
    expect(PaymentMethod.BANK).toBe('BANK');
    expect(PaymentMethod.MOBILE).toBe('MOBILE');
  });
});
