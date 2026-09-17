import { useMemo, useState, type JSX } from 'react';
import { useExpenses, useDeleteExpense } from '../../../api/expense-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Select, type SelectOption } from '../../../ui/Select';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Icon } from '../../components/Icon';
import { KpiCard } from '../dashboard/KpiCard';
import { formatCategoryLabel } from '../dashboard/category-labels';
import { formatBdt, formatDate } from '../../../utils/format';
import {
  DateRangeFilter,
  resolvePreset,
  type DateRangeValue,
} from '../../components/DateRangeFilter';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHOD_LABELS,
  type Expense,
  type ExpenseCategory,
} from '../../../types/expenses';
import { ExpenseFormModal } from './ExpenseFormModal';
import './ExpenditurePage.css';

type CategoryFilter = 'all' | ExpenseCategory;

function initialRange(): DateRangeValue {
  return {
    preset: 'this_month',
    range: resolvePreset('this_month'),
  };
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const CATEGORY_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All categories' },
  ...EXPENSE_CATEGORIES.map((c) => ({
    value: c,
    label: formatCategoryLabel(c),
  })),
];

export function ExpenditurePage(): JSX.Element {
  const [range, setRange] = useState<DateRangeValue>(initialRange);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      from: range.range.from,
      to: range.range.to,
      ...(categoryFilter === 'all' ? {} : { category: categoryFilter }),
    }),
    [range.range.from, range.range.to, categoryFilter],
  );

  const { data, isLoading, error } = useExpenses(query);
  const deleteMutation = useDeleteExpense();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((e) => {
      const payee = (e.payee ?? '').toLowerCase();
      const reference = (e.reference ?? '').toLowerCase();
      const note = (e.note ?? '').toLowerCase();
      return payee.includes(q) || reference.includes(q) || note.includes(q);
    });
  }, [data, search]);

  const summary = useMemo(() => {
    if (filtered.length === 0) {
      return {
        count: 0,
        totalMinor: 0,
        thisMonthMinor: 0,
        averageMinor: 0,
      };
    }
    const monthKey = currentMonthKey();
    let total = 0;
    let thisMonth = 0;
    for (const e of filtered) {
      total += e.amountMinor;
      if (e.expenseDate.startsWith(monthKey)) {
        thisMonth += e.amountMinor;
      }
    }
    return {
      count: filtered.length,
      totalMinor: total,
      thisMonthMinor: thisMonth,
      averageMinor: Math.round(total / filtered.length),
    };
  }, [filtered]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to delete expense.');
      setPendingDelete(null);
    }
  };

  const columns: TableColumn<Expense>[] = [
    {
      key: 'expenseDate',
      header: 'Date',
      render: (e) => formatDate(e.expenseDate),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => <Badge variant="neutral">{formatCategoryLabel(e.category)}</Badge>,
    },
    {
      key: 'payee',
      header: 'Payee',
      render: (e) => e.payee ?? '—',
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (e) =>
        e.reference ? <span className="expenditure__reference">{e.reference}</span> : '—',
    },
    {
      key: 'method',
      header: 'Method',
      render: (e) => EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod],
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (e) => <span className="expenditure__amount">{formatBdt(e.amountMinor)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className="expenditure__row-actions" onClick={(ev) => ev.stopPropagation()}>
          <Button
            size="sm"
            variant="secondary"
            className="button--icon"
            aria-label="Edit"
            title="Edit expense"
            onClick={() => setEditing(e)}
          >
            <Icon name="edit" size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="button--icon"
            aria-label="Delete"
            title="Delete expense"
            onClick={() => setPendingDelete(e)}
            disabled={deleteMutation.isPending}
          >
            <Icon name="trash" size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="expenditure">
      <Card
        title="Office / Shop Expenditure"
        subtitle="Non-salary operating expenses"
        actions={<Button onClick={() => setCreateOpen(true)}>New expense</Button>}
      >
        <div className="expenditure__filters">
          <DateRangeFilter value={range} onChange={setRange} />

          <div className="expenditure__filters-row">
            <div className="expenditure__category">
              <Select
                label="Category"
                options={CATEGORY_FILTER_OPTIONS}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              />
            </div>

            <div className="expenditure__search">
              <Input
                label="Search"
                placeholder="Search payee, reference, or note"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <section className="expenditure__summary" aria-label="Summary">
        <KpiCard
          label="Expenses"
          value={summary.count.toLocaleString('en-BD')}
          loading={isLoading}
        />
        <KpiCard
          label="Total"
          value={formatBdt(summary.totalMinor)}
          tone="warning"
          loading={isLoading}
        />
        <KpiCard label="This Month" value={formatBdt(summary.thisMonthMinor)} loading={isLoading} />
        <KpiCard label="Average" value={formatBdt(summary.averageMinor)} loading={isLoading} />
      </section>

      <Card title="Expenses" subtitle={`${range.range.from} → ${range.range.to}`}>
        {actionError && (
          <div className="expenditure__error" role="alert">
            {actionError}
          </div>
        )}

        {isLoading && !data && (
          <div className="expenditure__center">
            <Spinner label="Loading expenses" />
          </div>
        )}

        {error && (
          <div className="expenditure__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load expenses.'}
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            title="No expenses in this range"
            description="Try a different date range or category, or add a new expense."
            action={<Button onClick={() => setCreateOpen(true)}>Add expense</Button>}
          />
        )}

        {!isLoading && !error && data && data.length > 0 && filtered.length === 0 && (
          <EmptyState
            title="No matching expenses"
            description="Adjust the search term to see more results."
          />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Table columns={columns} rows={filtered} getRowKey={(e) => e.id} />
        )}
      </Card>

      <ExpenseFormModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {editing !== undefined && (
        <ExpenseFormModal open expense={editing} onClose={() => setEditing(undefined)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete expense"
        message={
          pendingDelete
            ? `Delete the expense of ${formatBdt(pendingDelete.amountMinor)} on ${formatDate(pendingDelete.expenseDate)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
