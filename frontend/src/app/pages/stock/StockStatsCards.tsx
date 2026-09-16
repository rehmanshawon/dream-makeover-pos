import type { JSX } from 'react';
import { Spinner } from '../../../ui/Spinner';
import type { InventoryStats } from '../../../types/inventory';
import './StockStatsCards.css';

interface StockStatsCardsProps {
  stats: InventoryStats | undefined;
  loading: boolean;
}

export function StockStatsCards({ stats, loading }: StockStatsCardsProps): JSX.Element {
  if (loading && !stats) {
    return (
      <div className="stock-stats__loading">
        <Spinner label="Loading inventory stats" />
      </div>
    );
  }

  const total = stats?.totalProducts ?? 0;
  const low = stats?.lowStockCount ?? 0;
  const out = stats?.outOfStockCount ?? 0;

  return (
    <div className="stock-stats">
      <div className="stock-stats__card">
        <span className="stock-stats__label">Products tracked</span>
        <span className="stock-stats__value">{total.toLocaleString('en-BD')}</span>
      </div>

      <div className="stock-stats__card stock-stats__card--warning">
        <span className="stock-stats__label">Low stock</span>
        <span className="stock-stats__value">{low.toLocaleString('en-BD')}</span>
      </div>

      <div className="stock-stats__card stock-stats__card--danger">
        <span className="stock-stats__label">Out of stock</span>
        <span className="stock-stats__value">{out.toLocaleString('en-BD')}</span>
      </div>
    </div>
  );
}
