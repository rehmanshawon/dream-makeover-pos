import { useMemo, type JSX } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useFinancialSummary } from '../../../api/dashboard-hooks';
import { useCustomers } from '../../../api/customer-hooks';
import { formatBdt, todayIso } from '../../../utils/format';
import { KpiCard } from './KpiCard';
import './DashboardPage.css';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();

  const today = todayIso();

  const todaySummary = useFinancialSummary({
    range: 'custom',
    from: today,
    to: today,
  });

  const monthSummary = useFinancialSummary({ range: 'this_month' });

  const customers = useCustomers();

  const customerCount = customers.data?.length ?? 0;

  const monthNet = monthSummary.data?.netOperatingResultMinor ?? 0;
  const monthNetTone = monthSummary.isLoading ? 'default' : monthNet >= 0 ? 'positive' : 'negative';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h2 className="dashboard__greeting">
            {greeting}
            {user ? `, ${user.displayName}` : ''}
          </h2>
          <p className="dashboard__subtitle">Here is how the salon is doing today.</p>
        </div>
      </header>

      <section className="dashboard__section" aria-labelledby="dashboard-today">
        <h3 id="dashboard-today" className="dashboard__section-title">
          Today
        </h3>
        <div className="dashboard__grid">
          <KpiCard
            label="Today's Sales"
            value={formatBdt(todaySummary.data?.revenue.totalRevenueMinor ?? 0)}
            loading={todaySummary.isLoading}
          />
          <KpiCard
            label="Today's Services"
            value={formatBdt(todaySummary.data?.revenue.serviceSalesMinor ?? 0)}
            loading={todaySummary.isLoading}
          />
          <KpiCard
            label="Today's Product Sales"
            value={formatBdt(todaySummary.data?.revenue.productSalesMinor ?? 0)}
            loading={todaySummary.isLoading}
          />
          <KpiCard
            label="Total Customers"
            value={customerCount.toLocaleString('en-BD')}
            loading={customers.isLoading}
          />
        </div>
      </section>

      <section className="dashboard__section" aria-labelledby="dashboard-month">
        <h3 id="dashboard-month" className="dashboard__section-title">
          This month
        </h3>
        <div className="dashboard__grid dashboard__grid--three">
          <KpiCard
            label="Monthly Revenue"
            value={formatBdt(monthSummary.data?.revenue.totalRevenueMinor ?? 0)}
            loading={monthSummary.isLoading}
          />
          <KpiCard
            label="Monthly Expenses"
            value={formatBdt(monthSummary.data?.expenses.totalOperatingExpensesMinor ?? 0)}
            tone="warning"
            loading={monthSummary.isLoading}
          />
          <KpiCard
            label="Net Result"
            value={formatBdt(monthNet)}
            tone={monthNetTone}
            {...(monthSummary.data
              ? {
                  hint: monthNet >= 0 ? 'Operating profit this month' : 'Operating loss this month',
                }
              : {})}
            loading={monthSummary.isLoading}
          />
        </div>
      </section>
    </div>
  );
}
