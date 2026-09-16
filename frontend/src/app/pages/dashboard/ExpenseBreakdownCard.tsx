import type { JSX } from 'react';
import { Card } from '../../../ui/Card';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { useExpenseBreakdown } from '../../../api/report-hooks';
import { ApiError } from '../../../api/api-error';
import { formatBdt } from '../../../utils/format';
import { formatCategoryLabel } from './category-labels';
import './ExpenseBreakdownCard.css';

export function ExpenseBreakdownCard(): JSX.Element {
  const { data, isLoading, error } = useExpenseBreakdown({
    range: 'this_month',
  });

  const hasData = data && (data.salaryPaymentsMinor > 0 || data.categories.length > 0);

  const totalForBars = data?.categories.reduce((sum, c) => sum + c.amountMinor, 0) ?? 0;

  return (
    <Card title="Expenses" subtitle="This month by category">
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
            title="No expenses yet"
            description="Expenses recorded this month will appear here."
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
