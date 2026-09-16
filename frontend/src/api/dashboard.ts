import { api } from './api-client';
import type { FinancialSummary } from '../types/reports';

export type FinancialRangePreset = 'this_week' | 'this_month' | 'previous_month' | 'custom';

export interface FinancialRangeQuery {
  range: FinancialRangePreset;
  from?: string;
  to?: string;
}

export const dashboardApi = {
  financialSummary(query: FinancialRangeQuery): Promise<FinancialSummary> {
    const params = new URLSearchParams({ range: query.range });
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    return api.get<FinancialSummary>(`/reports/financial-summary?${params.toString()}`);
  },
};
