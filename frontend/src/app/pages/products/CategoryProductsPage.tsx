import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../../api/product-hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { ApiError } from '../../../api/api-error';
import { formatBdt } from '../../../utils/format';
import { useAuth } from '../../auth/AuthContext';
import type { Product } from '../../../types/products';
import { ProductFormModal } from './ProductFormModal';
import { CATEGORY_ROUTES, type CategoryRouteConfig } from './product-categories';
import './CategoryProductsPage.css';

interface CategoryProductsPageProps {
  slug: CategoryRouteConfig['slug'];
}

type StockStatus = 'out' | 'low' | 'ok';

function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.minimumStockThreshold) return 'low';
  return 'ok';
}

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

export function CategoryProductsPage({ slug }: CategoryProductsPageProps): JSX.Element {
  const config = CATEGORY_ROUTES[slug];
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useProducts();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const inCategory = data.filter((p) => p.category === config.category);
    const q = search.trim().toLowerCase();
    if (!q) return inCategory;
    return inCategory.filter((p) => p.name.toLowerCase().includes(q));
  }, [data, search, config.category]);

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Name',
      width: isAdmin ? '28%' : '34%',
      render: (p) => <span className="product-cell__name">{p.name}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      width: isAdmin ? '14%' : '16%',
      align: 'right',
      render: (p) => p.stock.toLocaleString('en-BD'),
    },
    {
      key: 'status',
      header: 'Status',
      width: isAdmin ? '18%' : '20%',
      render: (p) => {
        const status = stockStatus(p);
        return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
      },
    },
    {
      key: 'sellingPrice',
      header: 'Selling price',
      width: isAdmin ? '20%' : '30%',
      align: 'right',
      render: (p) => formatBdt(p.sellingPriceMinor),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: 'purchaseCost',
      header: 'Purchase cost',
      width: '20%',
      align: 'right',
      render: (p) => formatBdt(p.purchaseCostMinor),
    });
  }

  return (
    <div className="products-page">
      <Card
        title={config.title}
        subtitle={`Manage ${config.title.toLowerCase()} inventory`}
        actions={
          isAdmin ? (
            <Button onClick={() => setModalOpen(true)}>New {config.singular}</Button>
          ) : undefined
        }
      >
        <div className="products-page__toolbar">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="products-page__loading">
            <Spinner label="Loading products" />
          </div>
        )}

        {error && (
          <div className="products-page__error" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to load products.'}
          </div>
        )}

        {!isLoading && !error && data && filtered.length === 0 && (
          <EmptyState
            title={search ? 'No matching products' : `No ${config.title.toLowerCase()} yet`}
            description={
              search
                ? 'Try a different search term.'
                : isAdmin
                  ? `Add the first ${config.singular} to start selling it.`
                  : `Ask an administrator to add ${config.singular}s.`
            }
            action={
              !search && isAdmin ? (
                <Button onClick={() => setModalOpen(true)}>Add {config.singular}</Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Table
            columns={columns}
            rows={filtered}
            getRowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
          />
        )}
      </Card>

      {isAdmin && (
        <ProductFormModal
          open={modalOpen}
          defaultCategory={config.category}
          onClose={() => setModalOpen(false)}
          onCreated={(id) => navigate(`/products/${id}`)}
        />
      )}
    </div>
  );
}
