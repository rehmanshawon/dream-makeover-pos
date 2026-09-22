import { api } from './api-client';
import type {
  PayPeriod,
  PayableEmployee,
  RunPayrollResult,
  CreatePayPeriodRequest,
  UpdatePayPeriodRequest,
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

  updatePeriod(id: string, payload: UpdatePayPeriodRequest): Promise<PayPeriod> {
    return api.patch<PayPeriod>(`/pay-periods/${id}`, payload);
  },

  closePeriod(id: string): Promise<PayPeriod> {
    return api.post<PayPeriod>(`/pay-periods/${id}/close`, {});
  },

  runPayroll(id: string): Promise<RunPayrollResult> {
    return api.post<RunPayrollResult>(`/pay-periods/${id}/run`, {});
  },
};
