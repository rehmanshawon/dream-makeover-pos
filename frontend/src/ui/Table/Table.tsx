import type { JSX, ReactNode } from 'react';
import './Table.css';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No data',
  onRowClick,
}: TableProps<T>): JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="table-empty" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align ? `table__cell--${column.align}` : undefined}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = getRowKey(row);
            return (
              <tr
                key={key}
                className={onRowClick ? 'table__row--clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align ? `table__cell--${column.align}` : undefined}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
