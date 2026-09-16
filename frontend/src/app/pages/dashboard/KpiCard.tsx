import type { JSX, ReactNode } from 'react';
import './KpiCard.css';

export type KpiTone = 'default' | 'positive' | 'negative' | 'warning';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: KpiTone;
  loading?: boolean;
}

/**
 * A single KPI tile for the dashboard.
 *
 * Values are rendered as-is. Callers format money, counts, or other
 * values before passing them in.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  loading = false,
}: KpiCardProps): JSX.Element {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">
        {loading ? <span className="kpi-card__placeholder">—</span> : value}
      </span>
      {hint && <span className="kpi-card__hint">{hint}</span>}
    </div>
  );
}
