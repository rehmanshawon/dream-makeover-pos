import { api } from './api-client';

export interface CreateSalesReturnRequest {
  transactionId: string;
  returnDate: string;
  refundMethod: 'CASH' | 'BANK' | 'MOBILE';
  note?: string;
  lines: Array<{ transactionItemId: string; quantity: number }>;
}

export interface SalesReturnResult {
  id: string;
  refundMinor: number;
  revenueReversalMinor: number;
  vatReversalMinor: number;
  cogsReversalMinor: number;
}

export const salesReturnsApi = {
  create(payload: CreateSalesReturnRequest): Promise<SalesReturnResult> {
    return api.post<SalesReturnResult>('/sales-returns', payload);
  },
};
