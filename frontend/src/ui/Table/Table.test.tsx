import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table, type TableColumn } from './Table';
import userEvent from '@testing-library/user-event';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: (r) => r.amount.toFixed(2),
  },
];

const ROWS: Row[] = [
  { id: '1', name: 'Alice', amount: 100 },
  { id: '2', name: 'Bob', amount: 250 },
];

describe('Table', () => {
  it('renders headers', () => {
    render(<Table columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument();
  });

  it('renders rows', () => {
    render(<Table columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('250.00')).toBeInTheDocument();
  });

  it('shows empty message when no rows', () => {
    render(<Table columns={COLUMNS} rows={[]} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no data/i);
  });

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = vi.fn();
    render(<Table columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });
});
