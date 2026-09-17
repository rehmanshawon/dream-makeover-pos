import { useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProduct } from '../../../api/product-hooks';
import { useProductStockHistory } from '../../../api/inventory-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { useAuth } from '../../auth/AuthContext';
import { formatBdt, formatDateTime } from '../../../utils/format';
import type { Product, StockMovement } from '../../../types/products';
import { Button } from '../../../ui/Button';
import { Icon } from '../../components/Icon';
import { ProductFormModal } from './ProductFormModal';
import { StockInModal } from './StockInModal';
import { AdjustStockModal } from './AdjustStockModal';
import './ProductDetailPage.css';

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
  low: 'Low stock',
  ok: 'In stock',
};

const REASON_LABEL: Record<StockMovement['reason'], string> = {
  SALE: 'Sale',
  STOCK_IN: 'Stock in',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
};

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useProduct(id);
  const [editOpen, setEditOpen] = useState(false);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const history = useProductStockHistory(id);

  if (isLoading) {
    return (
      <div className="product-detail__loading">
        <Spinner label="Loading product" />
      </div>
    );
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="product-detail">
        <EmptyState
          title={notFound ? 'Product not found' : 'Unable to load product'}
          description={
            notFound
              ? 'The product may have been removed, or the link is incorrect.'
              : 'Please try again in a moment.'
          }
          action={
            <Link to="/cosmetics" className="product-detail__back">
              Back to products
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) return <></>;

  const status = stockStatus(data);

  const historyColumns: TableColumn<StockMovement>[] = [
    {
      key: 'createdAt',
      header: 'When',
      render: (m) => formatDateTime(m.createdAt),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (m) => REASON_LABEL[m.reason],
    },
    {
      key: 'delta',
      header: 'Change',
      align: 'right',
      render: (m) => (
        <span className={m.delta > 0 ? 'delta--positive' : 'delta--negative'}>
          {m.delta > 0 ? '+' : ''}
          {m.delta}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (m) => m.note ?? '—',
    },
    {
      key: 'createdBy',
      header: 'By',
      render: (m) => m.createdBy,
    },
  ];

  return (
    <div className="product-detail">
      <div className="product-detail__breadcrumb">
        <Link to="/cosmetics">Products</Link>
        <span aria-hidden="true"> / </span>
        <span>{data.name}</span>
      </div>

      <div className="product-detail__grid">
        <Card
          title={data.name}
          subtitle={data.category}
          actions={
            <div className="product-detail__actions">
              <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="button--icon"
                    aria-label="Edit"
                    title="Edit product"
                    onClick={() => setEditOpen(true)}
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setStockInOpen(true)}>
                    Stock in
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAdjustOpen(true)}>
                    Adjust
                  </Button>
                </>
              )}
            </div>
          }
        >
          <dl className="product-detail__facts">
            <div className="product-detail__fact">
              <dt>Current stock</dt>
              <dd>
                {data.stock.toLocaleString('en-BD')}
                {data.minimumStockThreshold > 0 && (
                  <span className="product-detail__threshold">
                    {' '}
                    (threshold {data.minimumStockThreshold})
                  </span>
                )}
              </dd>
            </div>
            <div className="product-detail__fact">
              <dt>Selling price</dt>
              <dd>{formatBdt(data.sellingPriceMinor)}</dd>
            </div>
            {isAdmin && (
              <div className="product-detail__fact">
                <dt>Purchase cost</dt>
                <dd>{formatBdt(data.purchaseCostMinor ?? 0)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title="Stock history" subtitle="Every change to this product's stock">
          {history.isLoading && (
            <div className="product-detail__loading">
              <Spinner label="Loading stock history" />
            </div>
          )}

          {history.error && (
            <div className="product-detail__error" role="alert">
              Unable to load stock history.
            </div>
          )}

          {!history.isLoading && !history.error && history.data?.length === 0 && (
            <EmptyState
              title="No stock movements yet"
              description="Changes to this product's stock will appear here."
            />
          )}

          {!history.isLoading && !history.error && history.data && history.data.length > 0 && (
            <Table columns={historyColumns} rows={history.data} getRowKey={(m) => m.id} />
          )}
        </Card>
      </div>
      {isAdmin && (
        <>
          <ProductFormModal
            open={editOpen}
            defaultCategory={data.category}
            product={data}
            onClose={() => setEditOpen(false)}
          />
          <StockInModal
            open={stockInOpen}
            productId={data.id}
            productName={data.name}
            onClose={() => setStockInOpen(false)}
          />
          <AdjustStockModal
            open={adjustOpen}
            productId={data.id}
            productName={data.name}
            currentStock={data.stock}
            onClose={() => setAdjustOpen(false)}
          />
        </>
      )}
    </div>
  );
}
