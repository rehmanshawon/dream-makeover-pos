import { useCallback, useMemo, useReducer } from 'react';
import type { MobileWalletProvider, SalePaymentMethod } from '../../../types/checkout';

export type CartItemKind = 'PRODUCT' | 'SERVICE' | 'PACKAGE';

export interface CartItem {
  kind: CartItemKind;
  id: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  customerTier: string | null;
  customerRewardPoints: number;
  discountMinor: number;
  redeemRewardPoints: boolean;
  rewardDiscountMinor: number;
  cashReceivedMinor: number;
  paymentMethod: SalePaymentMethod;
  mobileWalletProvider: MobileWalletProvider | null;
  paymentReference: string;
}

const INITIAL_STATE: CartState = {
  items: [],
  customerId: null,
  customerName: null,
  customerTier: null,
  customerRewardPoints: 0,
  discountMinor: 0,
  redeemRewardPoints: false,
  rewardDiscountMinor: 0,
  cashReceivedMinor: 0,
  paymentMethod: 'CASH',
  mobileWalletProvider: null,
  paymentReference: '',
};

type CartAction =
  | { type: 'ADD_ITEM'; item: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; kind: CartItemKind; id: string }
  | { type: 'SET_QUANTITY'; kind: CartItemKind; id: string; quantity: number }
  | {
      type: 'SET_CUSTOMER';
      customerId: string;
      customerName: string;
      customerTier: string;
      customerRewardPoints: number;
    }
  | { type: 'CLEAR_CUSTOMER' }
  | { type: 'SET_DISCOUNT'; discountMinor: number }
  | { type: 'SET_REWARD_REDEMPTION'; enabled: boolean; discountMinor: number }
  | { type: 'SET_CASH_RECEIVED'; cashReceivedMinor: number }
  | { type: 'SET_PAYMENT_METHOD'; paymentMethod: SalePaymentMethod }
  | { type: 'SET_MOBILE_WALLET_PROVIDER'; provider: MobileWalletProvider | null }
  | { type: 'SET_PAYMENT_REFERENCE'; reference: string }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        (i) => i.kind === action.item.kind && i.id === action.item.id,
      );

      if (existingIndex >= 0) {
        const updated = [...state.items];
        const existing = updated[existingIndex];
        if (!existing) return state;
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return { ...state, items: updated };
      }

      return {
        ...state,
        items: [...state.items, { ...action.item, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => !(i.kind === action.kind && i.id === action.id)),
      };

    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => !(i.kind === action.kind && i.id === action.id)),
        };
      }

      return {
        ...state,
        items: state.items.map((i) =>
          i.kind === action.kind && i.id === action.id ? { ...i, quantity: action.quantity } : i,
        ),
      };
    }

    case 'SET_CUSTOMER':
      return {
        ...state,
        customerId: action.customerId,
        customerName: action.customerName,
        customerTier: action.customerTier,
        customerRewardPoints: action.customerRewardPoints,
        redeemRewardPoints: false,
        rewardDiscountMinor: 0,
      };

    case 'CLEAR_CUSTOMER':
      return {
        ...state,
        customerId: null,
        customerName: null,
        customerTier: null,
        customerRewardPoints: 0,
        redeemRewardPoints: false,
        rewardDiscountMinor: 0,
      };

    case 'SET_DISCOUNT':
      return { ...state, discountMinor: Math.max(0, action.discountMinor) };

    case 'SET_REWARD_REDEMPTION':
      return {
        ...state,
        redeemRewardPoints: action.enabled,
        rewardDiscountMinor: action.enabled ? Math.max(0, action.discountMinor) : 0,
      };

    case 'SET_CASH_RECEIVED':
      return {
        ...state,
        cashReceivedMinor: Math.max(0, action.cashReceivedMinor),
      };

    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.paymentMethod };

    case 'SET_MOBILE_WALLET_PROVIDER':
      return { ...state, mobileWalletProvider: action.provider };

    case 'SET_PAYMENT_REFERENCE':
      return { ...state, paymentReference: action.reference };

    case 'CLEAR':
      return INITIAL_STATE;

    default:
      return state;
  }
}

export interface CartTotals {
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  itemCount: number;
  redeemRewardPoints: boolean;
  rewardDiscountMinor: number;
  redemptionAffordable: boolean;
}

/**
 * Cart state for the POS.
 *
 * The cart is client-only state. It has no server representation until
 * checkout is submitted, so React Query is deliberately not used here.
 */
export function useCart(): {
  state: CartState;
  totals: CartTotals;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (kind: CartItemKind, id: string) => void;
  setQuantity: (kind: CartItemKind, id: string, quantity: number) => void;
  setCustomer: (
    customerId: string,
    customerName: string,
    customerTier: string,
    customerRewardPoints: number,
  ) => void;
  clearCustomer: () => void;
  setDiscount: (discountMinor: number) => void;
  setRewardRedemption: (enabled: boolean, discountMinor: number) => void;
  setCashReceived: (cashReceivedMinor: number) => void;
  setPaymentMethod: (paymentMethod: SalePaymentMethod) => void;
  setMobileWalletProvider: (provider: MobileWalletProvider | null) => void;
  setPaymentReference: (reference: string) => void;
  clear: () => void;
} {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE);

  const totals = useMemo<CartTotals>(() => {
    const subtotalMinor = state.items.reduce(
      (sum, item) => sum + item.unitPriceMinor * item.quantity,
      0,
    );

    const redemptionAffordable =
      !state.redeemRewardPoints || state.rewardDiscountMinor <= subtotalMinor;
    const effectiveRewardDiscount =
      state.redeemRewardPoints && redemptionAffordable ? state.rewardDiscountMinor : 0;
    const effectiveDiscount = Math.min(
      state.discountMinor,
      Math.max(0, subtotalMinor - effectiveRewardDiscount),
    );
    const totalMinor = subtotalMinor - effectiveDiscount - effectiveRewardDiscount;

    const changeMinor =
      state.cashReceivedMinor >= totalMinor ? state.cashReceivedMinor - totalMinor : 0;

    const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotalMinor,
      discountMinor: effectiveDiscount,
      redeemRewardPoints: state.redeemRewardPoints && redemptionAffordable,
      rewardDiscountMinor: effectiveRewardDiscount,
      redemptionAffordable,
      totalMinor,
      cashReceivedMinor: state.cashReceivedMinor,
      changeMinor,
      itemCount,
    };
  }, [
    state.items,
    state.discountMinor,
    state.redeemRewardPoints,
    state.rewardDiscountMinor,
    state.cashReceivedMinor,
  ]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>): void => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const removeItem = useCallback((kind: CartItemKind, id: string): void => {
    dispatch({ type: 'REMOVE_ITEM', kind, id });
  }, []);

  const setQuantity = useCallback((kind: CartItemKind, id: string, quantity: number): void => {
    dispatch({ type: 'SET_QUANTITY', kind, id, quantity });
  }, []);

  const setCustomer = useCallback(
    (
      customerId: string,
      customerName: string,
      customerTier: string,
      customerRewardPoints: number,
    ): void => {
      dispatch({
        type: 'SET_CUSTOMER',
        customerId,
        customerName,
        customerTier,
        customerRewardPoints,
      });
    },
    [],
  );

  const clearCustomer = useCallback((): void => {
    dispatch({ type: 'CLEAR_CUSTOMER' });
  }, []);

  const setDiscount = useCallback((discountMinor: number): void => {
    dispatch({ type: 'SET_DISCOUNT', discountMinor });
  }, []);

  const setRewardRedemption = useCallback((enabled: boolean, discountMinor: number): void => {
    dispatch({ type: 'SET_REWARD_REDEMPTION', enabled, discountMinor });
  }, []);

  const setCashReceived = useCallback((cashReceivedMinor: number): void => {
    dispatch({ type: 'SET_CASH_RECEIVED', cashReceivedMinor });
  }, []);

  const setPaymentMethod = useCallback((paymentMethod: SalePaymentMethod): void => {
    dispatch({ type: 'SET_PAYMENT_METHOD', paymentMethod });
  }, []);

  const setMobileWalletProvider = useCallback((provider: MobileWalletProvider | null): void => {
    dispatch({ type: 'SET_MOBILE_WALLET_PROVIDER', provider });
  }, []);

  const setPaymentReference = useCallback((reference: string): void => {
    dispatch({ type: 'SET_PAYMENT_REFERENCE', reference });
  }, []);

  const clear = useCallback((): void => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return {
    state,
    totals,
    addItem,
    removeItem,
    setQuantity,
    setCustomer,
    clearCustomer,
    setDiscount,
    setRewardRedemption,
    setCashReceived,
    setPaymentMethod,
    setMobileWalletProvider,
    setPaymentReference,
    clear,
  };
}
