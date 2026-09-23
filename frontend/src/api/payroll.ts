import { api } from './api-client';
import type {
  PayPeriod,
  PayableEmployee,
  RunPayrollResult,
  CreatePayPeriodRequest,
  NextReminder,
} from '../types/payroll';

export const payrollApi = {
  listPeriods(): Promise<PayPeriod[]> {
    return api.get<PayPeriod[]>('/pay-periods');
  },

  getPeriod(id: string): Promise<PayPeriod> {
    return api.get<PayPeriod>(`/pay-periods/${id}`);
  },

  getPayables(id: string): Promise<PayableEmployee[]> {
    return api.get<PayableEmployee[]>(`/pay-periods/${id}/payables`);
  },

  createPeriod(payload: CreatePayPeriodRequest): Promise<PayPeriod> {
    return api.post<PayPeriod>('/pay-periods', payload);
  },

  deletePeriod(id: string): Promise<void> {
    return api.delete<void>(`/pay-periods/${id}`);
  },

  closePeriod(id: string): Promise<PayPeriod> {
    return api.post<PayPeriod>(`/pay-periods/${id}/close`, {});
  },

  runPayroll(id: string): Promise<RunPayrollResult> {
    return api.post<RunPayrollResult>(`/pay-periods/${id}/run`, {});
  },

  getNextReminder(): Promise<NextReminder> {
    return api.get<NextReminder>('/pay-periods/next-reminder');
  },

  deletePayments(ids: string[]): Promise<{ deletedCount: number }> {
    return api.post<{ deletedCount: number }>('/pay-periods/payments/delete', {
      ids,
    });
  },
};
