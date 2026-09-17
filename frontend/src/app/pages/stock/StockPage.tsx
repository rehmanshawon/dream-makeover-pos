import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../../api/product-hooks';
import { useInventoryStats } from '../../../api/inventory-stats-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { formatBdt } from '../../../utils/format';
import type { Product, ProductCategory } from '../../../types/products';
import { StockStatsCards } from './StockStatsCards';
import './StockPage.css';

type StatusFilter = 'all' | 'low' | 'out';
type CategoryFilter = 'all' | ProductCategory;
type StockStatus = 'out' | 'low' | 'ok';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All products' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All categories' },
  { key: 'Cosmetics', label: 'Cosmetics' },
  { key: 'Saree', label: 'Shari' },
  { key: 'Three-piece', label: 'Three-piece' },
];

const STATUS_VARIANT: Record<StockStatus, BadgeVariant> = {
  out: 'danger',
  low: 'warning',
  ok: 'success',
};

const STATUS_LABEL: Record<StockStatus, string> = {
  out: 'Out of stock',
  low: 'Low',
  ok: 'In stock',
};

function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.minimumStockThreshold) return 'low';
  return 'ok';
}

export function StockPage(): JSX.Element {
  const navigate = useNavigate();
  const stats = useInventoryStats();
  const products = useProducts();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!products.data) return [];

    const q = search.trim().toLowerCase();

    return products.data.filter((p) => {
      const status = stockStatus(p);

      if (statusFilter === 'low' && status === 'ok') return false;
      if (statusFilter === 'out' && status !== 'out') return false;

      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      if (q && !p.name.toLowerCase().includes(q)) return false;

      return true;
    });
  }, [products.data, statusFilter, categoryFilter, search]);

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => <span className="stock-cell__name">{p.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      align: 'center',
      render: (p) => p.category,
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'center',
      render: (p) => p.stock.toLocaleString('en-BD'),
    },
    {
      key: 'threshold',
      header: 'Threshold',
      align: 'center',
      render: (p) => p.minimumStockThreshold.toLocaleString('en-BD'),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => {
        const status = stockStatus(p);
        return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
      },
    },
    {
      key: 'sellingPrice',
      header: 'Selling price',
      align: 'right',
      render: (p) => formatBdt(p.sellingPriceMinor),
    },
  ];

  const productsError = products.error;
  const empty = !products.isLoading && !productsError && filtered.length === 0;

  return (
    <div className="stock-page">
      <StockStatsCards stats={stats.data} loading={stats.isLoading} />

      <Card title="Inventory" subtitle="Cross-category stock overview">
        <div className="stock-page__filters">
          <div className="stock-page__filter-group" role="group" aria-label="Status filter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`stock-page__chip${
                  statusFilter === filter.key ? ' stock-page__chip--active' : ''
                }`}
                onClick={() => setStatusFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="stock-page__filter-group" role="group" aria-label="Category filter">
            {CATEGORY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`stock-page__chip${
                  categoryFilter === filter.key ? ' stock-page__chip--active' : ''
                }`}
                onClick={() => setCategoryFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="stock-page__search">
            <Input
              placeholder="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {products.isLoading && (
          <div className="stock-page__loading">
            <Spinner label="Loading products" />
          </div>
        )}

        {productsError && (
          <div className="stock-page__error" role="alert">
            {productsError instanceof ApiError ? productsError.message : 'Unable to load products.'}
          </div>
        )}

        {empty && (
          <EmptyState
            title={
              search || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No matching products'
                : 'No products yet'
            }
            description={
              search || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Adjust the filters or search term to see more results.'
                : 'Add products from the Cosmetics, Shari, or Three-piece pages.'
            }
          />
        )}

        {!products.isLoading && !productsError && filtered.length > 0 && (
          <Table
            columns={columns}
            rows={filtered}
            getRowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
