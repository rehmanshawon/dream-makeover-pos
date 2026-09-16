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

interface RevenueTrendChartProps {
  /**
   * Start of the range (YYYY-MM-DD). When omitted, the chart defaults
   * to the last 30 days, including today.
   */
  from?: string;
  /**
   * End of the range (YYYY-MM-DD). When omitted, defaults to today.
   */
  to?: string;
  /** Optional override for the card title. */
  title?: string;
  /** Optional override for the card subtitle. */
  subtitle?: string;
}

function defaultRange(): { from: string; to: string } {
  const today = todayIso();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}`, to: today };
}

export function RevenueTrendChart({
  from,
  to,
  title = 'Revenue trend',
  subtitle,
}: RevenueTrendChartProps = {}): JSX.Element {
  const defaults = defaultRange();
  const rangeFrom = from ?? defaults.from;
  const rangeTo = to ?? defaults.to;

  const { data, isLoading, error } = useRevenueTrend({
    range: 'custom',
    from: rangeFrom,
    to: rangeTo,
  });

  const effectiveSubtitle = subtitle ?? `Daily sales from ${rangeFrom} to ${rangeTo}`;

  return (
    <Card title={title} subtitle={effectiveSubtitle}>
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
          <EmptyState title="No revenue in this range" description="Try a different date range." />
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
