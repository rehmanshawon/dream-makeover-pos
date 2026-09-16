import type { JSX } from 'react';
import { formatBdt } from '../../../utils/format';
import type { TopItem } from '../../../types/dashboard-reports';
import './TopItemsList.css';

interface TopItemsListProps {
  items: TopItem[];
  emptyMessage: string;
}

export function TopItemsList({ items, emptyMessage }: TopItemsListProps): JSX.Element {
  if (items.length === 0) {
    return <p className="top-items__empty">{emptyMessage}</p>;
  }

  const maxRevenue = Math.max(...items.map((i) => i.revenueMinor), 1);

  return (
    <ol className="top-items">
      {items.map((item, index) => {
        const percentage = Math.round((item.revenueMinor / maxRevenue) * 100);
        return (
          <li key={`${item.itemId}-${index}`} className="top-items__row">
            <span className="top-items__rank">{index + 1}</span>
            <div className="top-items__main">
              <div className="top-items__line">
                <span className="top-items__name">{item.itemName}</span>
                <span className="top-items__revenue">{formatBdt(item.revenueMinor)}</span>
              </div>
              <div className="top-items__bar">
                <div
                  className="top-items__bar-fill"
                  style={{ width: `${percentage}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="top-items__quantity">{item.quantitySold} sold</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
