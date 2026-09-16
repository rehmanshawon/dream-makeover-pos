import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardApi, type FinancialRangeQuery } from './dashboard';
import type { FinancialSummary } from '../types/reports';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  financialSummary: (query: FinancialRangeQuery) =>
    [...dashboardKeys.all, 'financial-summary', query] as const,
};

export function useFinancialSummary(
  query: FinancialRangeQuery,
): UseQueryResult<FinancialSummary, Error> {
  return useQuery({
    queryKey: dashboardKeys.financialSummary(query),
    queryFn: () => dashboardApi.financialSummary(query),
  });
}
