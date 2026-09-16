import { useMemo, useState, type JSX } from 'react';
import { useFinancialSummary } from '../../../api/dashboard-hooks';
import { ApiError } from '../../../api/api-error';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { KpiCard } from '../dashboard/KpiCard';
import {
  DateRangeFilter,
  resolvePreset,
  type DateRangeValue,
} from '../../components/DateRangeFilter';
import { formatBdt } from '../../../utils/format';
import { ProfitAndLossTable } from './ProfitAndLossTable';
import './AccountsPage.css';

function initialRange(): DateRangeValue {
  return {
    preset: 'this_month',
    range: resolvePreset('this_month'),
  };
}

export function AccountsPage(): JSX.Element {
  const [range, setRange] = useState<DateRangeValue>(initialRange);

  const query = useMemo(
    () => ({
      range: range.preset === 'custom' ? ('custom' as const) : ('custom' as const),
      from: range.range.from,
      to: range.range.to,
    }),
    [range.preset, range.range.from, range.range.to],
  );

  const { data, isLoading, error } = useFinancialSummary(query);

  const net = data?.netOperatingResultMinor ?? 0;
  const netTone = !data ? 'default' : net >= 0 ? 'positive' : 'negative';

  return (
    <div className="accounts-page">
      <Card title="Accounts" subtitle="Financial summary for the selected period">
        <div className="accounts-page__filter">
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
      </Card>

      <section className="accounts-page__summary" aria-label="Headline metrics">
        <KpiCard
          label="Net Revenue"
          value={formatBdt(
            (data?.revenue.totalRevenueMinor ?? 0) - (data?.discountsGivenMinor ?? 0),
          )}
          loading={isLoading}
        />
        <KpiCard
          label="Gross Profit"
          value={formatBdt(data?.grossProfitMinor ?? 0)}
          loading={isLoading}
        />
        <KpiCard
          label="Operating Expenses"
          value={formatBdt(data?.expenses.totalOperatingExpensesMinor ?? 0)}
          tone="warning"
          loading={isLoading}
        />
        <KpiCard
          label="Net Operating Result"
          value={formatBdt(net)}
          tone={netTone}
          {...(data
            ? {
                hint:
                  net >= 0 ? 'Operating profit for the period' : 'Operating loss for the period',
              }
            : {})}
          loading={isLoading}
        />
      </section>

      <Card title="Profit & loss statement" subtitle={`${range.range.from} → ${range.range.to}`}>
        {isLoading && (
          <div className="accounts-page__center">
            <Spinner label="Loading financial summary" />
          </div>
        )}

        {error && (
          <div className="accounts-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load financial summary.'}
          </div>
        )}

        {!isLoading && !error && !data && (
          <EmptyState title="No data for this period" description="Try a different date range." />
        )}

        {!isLoading && !error && data && (
          <>
            <ProfitAndLossTable summary={data} />

            <div className="accounts-page__footer">
              <p className="accounts-page__methodology">
                <strong>Cost of goods sold methodology:</strong>{' '}
                {data.metadata.cogsMethod === 'current_purchase_cost'
                  ? 'calculated using the current purchase cost of each product, not the historical cost at the time of sale.'
                  : data.metadata.cogsMethod}
              </p>
              <p className="accounts-page__disclaimer">
                This is a pragmatic operating profit-and-loss view. It does not include taxes,
                depreciation, loans, investments, or other balance-sheet items. It is not a complete
                accounting statement.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
