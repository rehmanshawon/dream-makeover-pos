import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCart } from './use-cart';

describe('useCart', () => {
  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.state.items).toEqual([]);
    expect(result.current.totals.subtotalMinor).toBe(0);
    expect(result.current.totals.totalMinor).toBe(0);
  });

  it('adds items and increments quantity on repeat', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
    });

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
    });

    expect(result.current.state.items).toHaveLength(1);
    expect(result.current.state.items[0]!.quantity).toBe(2);
    expect(result.current.totals.subtotalMinor).toBe(240000);
  });

  it('adds different kinds as separate items', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'x1',
        name: 'Product',
        unitPriceMinor: 100000,
      });
      result.current.addItem({
        kind: 'SERVICE',
        id: 'x1',
        name: 'Service',
        unitPriceMinor: 200000,
      });
    });

    expect(result.current.state.items).toHaveLength(2);
    expect(result.current.totals.subtotalMinor).toBe(300000);
  });

  it('removes an item', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.removeItem('PRODUCT', 'p1');
    });

    expect(result.current.state.items).toHaveLength(0);
  });

  it('setting quantity to 0 removes the item', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.setQuantity('PRODUCT', 'p1', 0);
    });

    expect(result.current.state.items).toHaveLength(0);
  });

  it('calculates subtotal and total after discount', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.setDiscount(10000);
    });

    expect(result.current.totals.subtotalMinor).toBe(120000);
    expect(result.current.totals.discountMinor).toBe(10000);
    expect(result.current.totals.totalMinor).toBe(110000);
  });

  it('clamps discount to subtotal', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 50000,
      });
      result.current.setDiscount(999999);
    });

    expect(result.current.totals.discountMinor).toBe(50000);
    expect(result.current.totals.totalMinor).toBe(0);
  });

  it('calculates change when cash is sufficient', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.setCashReceived(200000);
    });

    expect(result.current.totals.changeMinor).toBe(80000);
  });

  it('reports zero change when cash is insufficient', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.setCashReceived(50000);
    });

    expect(result.current.totals.changeMinor).toBe(0);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem({
        kind: 'PRODUCT',
        id: 'p1',
        name: 'Lipstick',
        unitPriceMinor: 120000,
      });
      result.current.setDiscount(5000);
      result.current.setCustomer('c1', 'Alice', 'Gold');
      result.current.clear();
    });

    expect(result.current.state.items).toHaveLength(0);
    expect(result.current.state.discountMinor).toBe(0);
    expect(result.current.state.customerId).toBeNull();
  });

  it('rejects negative discount and cash values', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.setDiscount(-5000);
      result.current.setCashReceived(-10000);
    });

    expect(result.current.state.discountMinor).toBe(0);
    expect(result.current.state.cashReceivedMinor).toBe(0);
  });
});
