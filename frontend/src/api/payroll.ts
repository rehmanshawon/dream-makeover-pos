import { api } from './api-client';
import type {
  PayPeriod,
  PayableEmployee,
  RunPayrollResult,
  RunPayrollRequest,
  CreatePayPeriodRequest,
  CreatePayrollSalaryPaymentRequest,
  AdjustAdvanceRequest,
} from '../types/payroll';
import type { SalaryPayment } from '../types/salary-payments';

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

  runPayroll(id: string, payload: RunPayrollRequest = {}): Promise<RunPayrollResult> {
    return api.post<RunPayrollResult>(`/pay-periods/${id}/run`, payload);
  },

  createSalaryPayment(
    periodId: string,
    payload: CreatePayrollSalaryPaymentRequest,
  ): Promise<SalaryPayment> {
    return api.post<SalaryPayment>(
      `/pay-periods/${periodId}/employees/${payload.employeeId}/salary-payments`,
      payload,
    );
  },

  adjustAdvance(periodId: string, payload: AdjustAdvanceRequest): Promise<SalaryPayment> {
    return api.post<SalaryPayment>(
      `/pay-periods/${periodId}/employees/${payload.employeeId}/advance-adjustments`,
      { amountMinor: payload.amountMinor },
    );
  },

  deletePayments(ids: string[]): Promise<{ deletedCount: number }> {
    return api.post<{ deletedCount: number }>('/pay-periods/payments/delete', {
      ids,
    });
  },
};
