import { api } from './api-client';

export type PayrollTimeTrustState =
  'SYNCING' | 'ONLINE' | 'OFFLINE' | 'OFFLINE_WARNING' | 'LOCKED' | 'CLOCK_SKEW';

export interface PayrollTimeTrustStatus {
  state: PayrollTimeTrustState;
  payrollAllowed: boolean;
  warning: boolean;
  message: string | null;
  lastVerifiedAt: string | null;
  offlineForMs: number | null;
  remainingMs: number | null;
}

export const timeTrustApi = {
  getStatus(): Promise<PayrollTimeTrustStatus> {
    return api.get<PayrollTimeTrustStatus>('/system/time-trust');
  },
};
