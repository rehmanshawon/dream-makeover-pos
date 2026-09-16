import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopItemsList } from './TopItemsList';

describe('TopItemsList', () => {
  it('renders items with rank, name, revenue, and quantity', () => {
    render(
      <TopItemsList
        items={[
          {
            itemId: 'p1',
            itemName: 'Lipstick',
            quantitySold: 12,
            revenueMinor: 1440000,
          },
          {
            itemId: 'p2',
            itemName: 'Foundation',
            quantitySold: 5,
            revenueMinor: 750000,
          },
        ]}
        emptyMessage="Empty"
      />,
    );

    expect(screen.getByText('Lipstick')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('৳14,400.00')).toBeInTheDocument();
    expect(screen.getByText('৳7,500.00')).toBeInTheDocument();
    expect(screen.getByText('12 sold')).toBeInTheDocument();
    expect(screen.getByText('5 sold')).toBeInTheDocument();
  });

  it('shows the empty message when there are no items', () => {
    render(<TopItemsList items={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
