import type { JSX } from 'react';
import { formatBdt } from '../../../utils/format';
import { formatCategoryLabel } from '../dashboard/category-labels';
import type { FinancialSummary } from '../../../types/reports';
import './ProfitAndLossTable.css';

interface ProfitAndLossTableProps {
  summary: FinancialSummary;
}

/**
 * Formats a deduction amount with parentheses, per accounting convention.
 *
 * Example: 10000 → "(৳100.00)"
 */
function formatDeduction(minor: number): string {
  return `(${formatBdt(minor)})`;
}

export function ProfitAndLossTable({ summary }: ProfitAndLossTableProps): JSX.Element {
  const grossRevenue = summary.revenue.totalRevenueMinor;
  const netRevenue = grossRevenue - summary.discountsGivenMinor;
  const grossProfit = summary.grossProfitMinor;
  const totalExpenses = summary.expenses.totalOperatingExpensesMinor;
  const net = summary.netOperatingResultMinor;

  return (
    <div className="pl-table" role="table" aria-label="Profit and loss statement">
      <div className="pl-table__header" role="row">
        <span className="pl-table__header-cell">Item</span>
        <span className="pl-table__header-cell pl-table__header-cell--amount">Amount</span>
      </div>

      {/* Revenue section */}
      <div className="pl-table__section" role="rowgroup">
        <div className="pl-table__section-title">Revenue</div>

        <div className="pl-table__row" role="row">
          <span className="pl-table__label">Product sales</span>
          <span className="pl-table__amount">{formatBdt(summary.revenue.productSalesMinor)}</span>
        </div>

        <div className="pl-table__row" role="row">
          <span className="pl-table__label">Service sales</span>
          <span className="pl-table__amount">{formatBdt(summary.revenue.serviceSalesMinor)}</span>
        </div>

        <div className="pl-table__row" role="row">
          <span className="pl-table__label">Package sales</span>
          <span className="pl-table__amount">{formatBdt(summary.revenue.packageSalesMinor)}</span>
        </div>

        <div className="pl-table__row pl-table__row--subtotal" role="row">
          <span className="pl-table__label">Gross revenue</span>
          <span className="pl-table__amount">{formatBdt(grossRevenue)}</span>
        </div>

        <div className="pl-table__row" role="row">
          <span className="pl-table__label pl-table__label--deduction">Less: discounts</span>
          <span className="pl-table__amount pl-table__amount--deduction">
            {formatDeduction(summary.discountsGivenMinor)}
          </span>
        </div>

        <div className="pl-table__row pl-table__row--subtotal" role="row">
          <span className="pl-table__label">Net revenue</span>
          <span className="pl-table__amount">{formatBdt(netRevenue)}</span>
        </div>
      </div>

      {/* COGS */}
      <div className="pl-table__section" role="rowgroup">
        <div className="pl-table__row pl-table__row--deduction" role="row">
          <span className="pl-table__label">Cost of goods sold</span>
          <span className="pl-table__amount pl-table__amount--deduction">
            {formatDeduction(summary.cogsMinor)}
          </span>
        </div>
      </div>

      {/* Gross Profit */}
      <div className="pl-table__section" role="rowgroup">
        <div className="pl-table__row pl-table__row--emphasis" role="row">
          <span className="pl-table__label">Gross profit</span>
          <span className="pl-table__amount">{formatBdt(grossProfit)}</span>
        </div>
      </div>

      {/* Operating Expenses */}
      <div className="pl-table__section" role="rowgroup">
        <div className="pl-table__section-title">Operating expenses</div>

        {summary.expenses.salaryPaymentsMinor > 0 && (
          <div className="pl-table__row" role="row">
            <span className="pl-table__label">Salaries</span>
            <span className="pl-table__amount">
              {formatBdt(summary.expenses.salaryPaymentsMinor)}
            </span>
          </div>
        )}

        {summary.expenses.shopExpensesByCategory.map((category) => (
          <div key={category.category} className="pl-table__row" role="row">
            <span className="pl-table__label">{formatCategoryLabel(category.category)}</span>
            <span className="pl-table__amount">{formatBdt(category.amountMinor)}</span>
          </div>
        ))}

        {summary.expenses.salaryPaymentsMinor === 0 &&
          summary.expenses.shopExpensesByCategory.length === 0 && (
            <div className="pl-table__row" role="row">
              <span className="pl-table__label pl-table__label--muted">No expenses recorded</span>
              <span className="pl-table__amount pl-table__amount--muted">{formatBdt(0)}</span>
            </div>
          )}

        <div className="pl-table__row pl-table__row--subtotal" role="row">
          <span className="pl-table__label">Total operating expenses</span>
          <span className="pl-table__amount">{formatBdt(totalExpenses)}</span>
        </div>
      </div>

      {/* Net Result */}
      <div className="pl-table__section" role="rowgroup">
        <div
          className={`pl-table__row pl-table__row--grand ${
            net >= 0 ? 'pl-table__row--positive' : 'pl-table__row--negative'
          }`}
          role="row"
        >
          <span className="pl-table__label">Net operating result</span>
          <span className="pl-table__amount">{formatBdt(net)}</span>
        </div>
      </div>
    </div>
  );
}
