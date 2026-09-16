import type { JSX } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../ui/Card';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { useRevenueTrend } from '../../../api/report-hooks';
import { ApiError } from '../../../api/api-error';
import { formatBdt, todayIso } from '../../../utils/format';
import { formatCompactTaka, formatShortDate } from './compact-format';
import './RevenueTrendChart.css';

/**
 * Daily revenue over the last 30 days.
 *
 * The backend returns one point per day in the range, filling gaps with
 * zero. That makes the chart a straightforward pass-through of the data
 * with no client-side gap filling.
 */
export function RevenueTrendChart(): JSX.Element {
  const today = todayIso();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const from = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

  const { data, isLoading, error } = useRevenueTrend({
    range: 'custom',
    from,
    to: today,
  });

  return (
    <Card title="Revenue trend" subtitle="Daily sales over the last 30 days">
      <div className="trend-chart" data-testid="trend-chart">
        {isLoading && (
          <div className="trend-chart__center">
            <Spinner label="Loading revenue trend" />
          </div>
        )}

        {error && (
          <div className="trend-chart__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load revenue trend.'}
          </div>
        )}

        {!isLoading && !error && data && data.points.length === 0 && (
          <EmptyState
            title="No revenue yet"
            description="Sales will appear here once the salon starts making them."
          />
        )}

        {!isLoading && !error && data && data.points.length > 0 && (
          <div className="trend-chart__canvas">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dcda" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11, fill: '#6b605c' }}
                  stroke="#d4c6c2"
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={formatCompactTaka}
                  tick={{ fontSize: 11, fill: '#6b605c' }}
                  stroke="#d4c6c2"
                  width={56}
                />
                <Tooltip
                  formatter={(value) => formatBdt(Number(value))}
                  labelFormatter={(label) => formatShortDate(String(label))}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5dcda',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenueMinor"
                  name="Revenue"
                  stroke="#c98a8a"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#c98a8a' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
