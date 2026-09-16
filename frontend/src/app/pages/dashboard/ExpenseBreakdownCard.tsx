import type { JSX } from 'react';
import { Card } from '../../../ui/Card';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { useExpenseBreakdown } from '../../../api/report-hooks';
import type { FinancialRangeQuery } from '../../../api/dashboard';
import { ApiError } from '../../../api/api-error';
import { formatBdt } from '../../../utils/format';
import { formatCategoryLabel } from './category-labels';
import './ExpenseBreakdownCard.css';

interface ExpenseBreakdownCardProps {
  /**
   * The range to summarize. When omitted, defaults to the current month.
   */
  range?: FinancialRangeQuery;
  /** Optional override for the card title. */
  title?: string;
  /** Optional override for the card subtitle. */
  subtitle?: string;
}

export function ExpenseBreakdownCard({
  range,
  title = 'Expenses',
  subtitle,
}: ExpenseBreakdownCardProps = {}): JSX.Element {
  const effectiveRange: FinancialRangeQuery = range ?? { range: 'this_month' };

  const { data, isLoading, error } = useExpenseBreakdown(effectiveRange);

  const hasData = data && (data.salaryPaymentsMinor > 0 || data.categories.length > 0);

  const totalForBars = data?.categories.reduce((sum, c) => sum + c.amountMinor, 0) ?? 0;

  const effectiveSubtitle =
    subtitle ??
    (effectiveRange.range === 'this_month'
      ? 'This month by category'
      : `From ${effectiveRange.from ?? '?'} to ${effectiveRange.to ?? '?'}`);

  return (
    <Card title={title} subtitle={effectiveSubtitle}>
      <div className="expense-breakdown">
        {isLoading && (
          <div className="expense-breakdown__center">
            <Spinner label="Loading expense breakdown" />
          </div>
        )}

        {error && (
          <div className="expense-breakdown__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load expense breakdown.'}
          </div>
        )}

        {!isLoading && !error && !hasData && (
          <EmptyState
            title="No expenses in this range"
            description="Expenses recorded in this period will appear here."
          />
        )}

        {!isLoading && !error && data && hasData && (
          <>
            <div className="expense-breakdown__total">
              <span className="expense-breakdown__total-label">Total</span>
              <span className="expense-breakdown__total-value">{formatBdt(data.totalMinor)}</span>
            </div>

            {data.salaryPaymentsMinor > 0 && (
              <div className="expense-breakdown__row">
                <span className="expense-breakdown__label">Salaries</span>
                <div className="expense-breakdown__bar">
                  <div
                    className="expense-breakdown__bar-fill expense-breakdown__bar-fill--salary"
                    style={{
                      width: `${Math.round((data.salaryPaymentsMinor / data.totalMinor) * 100)}%`,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <span className="expense-breakdown__amount">
                  {formatBdt(data.salaryPaymentsMinor)}
                </span>
              </div>
            )}

            {data.categories.map((category) => (
              <div key={category.category} className="expense-breakdown__row">
                <span className="expense-breakdown__label">
                  {formatCategoryLabel(category.category)}
                </span>
                <div className="expense-breakdown__bar">
                  <div
                    className="expense-breakdown__bar-fill"
                    style={{
                      width: `${
                        totalForBars > 0
                          ? Math.round((category.amountMinor / totalForBars) * 100)
                          : 0
                      }%`,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <span className="expense-breakdown__amount">{formatBdt(category.amountMinor)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
