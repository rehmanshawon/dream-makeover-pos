import { api } from './api-client';
import type { CheckoutRequest, CheckoutResponse } from '../types/checkout';

export const checkoutApi = {
  submit(payload: CheckoutRequest): Promise<CheckoutResponse> {
    return api.post<CheckoutResponse>('/checkout', payload);
  },
};
