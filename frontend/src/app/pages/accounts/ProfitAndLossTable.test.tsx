import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfitAndLossTable } from './ProfitAndLossTable';
import type { FinancialSummary } from '../../../types/reports';

function summary(overrides: Partial<FinancialSummary> = {}): FinancialSummary {
  return {
    range: { from: '2026-09-01', to: '2026-09-30' },
    revenue: {
      productSalesMinor: 2000000,
      serviceSalesMinor: 5000000,
      packageSalesMinor: 500000,
      totalRevenueMinor: 7500000,
    },
    discountsGivenMinor: 100000,
    cogsMinor: 800000,
    grossProfitMinor: 6600000,
    expenses: {
      salaryPaymentsMinor: 3000000,
      shopExpensesMinor: 250000,
      totalOperatingExpensesMinor: 3250000,
      shopExpensesByCategory: [{ category: 'ELECTRICITY', amountMinor: 250000 }],
    },
    netOperatingResultMinor: 3350000,
    metadata: {
      cogsMethod: 'current_purchase_cost',
      generatedAt: '2026-09-16T10:00:00.000Z',
    },
    ...overrides,
  };
}

describe('ProfitAndLossTable', () => {
  it('renders all major sections', () => {
    render(<ProfitAndLossTable summary={summary()} />);

    expect(screen.getAllByText(/revenue/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/cost of goods sold/i)).toBeInTheDocument();
    expect(screen.getByText(/gross profit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operating expenses/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/net operating result/i)).toBeInTheDocument();
  });

  it('shows revenue broken down by type', () => {
    render(<ProfitAndLossTable summary={summary()} />);

    expect(screen.getByText(/product sales/i)).toBeInTheDocument();
    expect(screen.getByText(/service sales/i)).toBeInTheDocument();
    expect(screen.getByText(/package sales/i)).toBeInTheDocument();
    expect(screen.getByText('৳20,000.00')).toBeInTheDocument();
    expect(screen.getByText('৳50,000.00')).toBeInTheDocument();
    expect(screen.getByText('৳5,000.00')).toBeInTheDocument();
  });

  it('shows discounts in parentheses', () => {
    render(<ProfitAndLossTable summary={summary()} />);
    expect(screen.getByText('(৳1,000.00)')).toBeInTheDocument();
  });

  it('shows COGS in parentheses', () => {
    render(<ProfitAndLossTable summary={summary()} />);
    expect(screen.getByText('(৳8,000.00)')).toBeInTheDocument();
  });

  it('lists salaries and expense categories', () => {
    render(<ProfitAndLossTable summary={summary()} />);

    expect(screen.getByText('Salaries')).toBeInTheDocument();
    expect(screen.getByText('৳30,000.00')).toBeInTheDocument();

    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('৳2,500.00')).toBeInTheDocument();
  });

  it('shows the net operating result', () => {
    render(<ProfitAndLossTable summary={summary()} />);
    expect(screen.getByText('৳33,500.00')).toBeInTheDocument();
  });

  it('shows "no expenses" when there are none', () => {
    render(
      <ProfitAndLossTable
        summary={summary({
          expenses: {
            salaryPaymentsMinor: 0,
            shopExpensesMinor: 0,
            totalOperatingExpensesMinor: 0,
            shopExpensesByCategory: [],
          },
        })}
      />,
    );
    expect(screen.getByText(/no expenses recorded/i)).toBeInTheDocument();
  });

  it('applies a positive tone for a positive net result', () => {
    const { container } = render(<ProfitAndLossTable summary={summary()} />);
    expect(container.querySelector('.pl-table__row--positive')).toBeInTheDocument();
  });

  it('applies a negative tone for a negative net result', () => {
    const { container } = render(
      <ProfitAndLossTable summary={summary({ netOperatingResultMinor: -500000 })} />,
    );
    expect(container.querySelector('.pl-table__row--negative')).toBeInTheDocument();
  });
});
