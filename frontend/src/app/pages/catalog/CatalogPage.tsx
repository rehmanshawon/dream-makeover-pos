import { useMemo, useState, type JSX } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCategoryTree } from '../../../api/category-hooks';
import { useProducts } from '../../../api/product-hooks';
import { useSalonServices } from '../../../api/salon-service-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge, type BadgeVariant } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { Table, type TableColumn } from '../../../ui/Table';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../auth/AuthContext';
import { formatBdt } from '../../../utils/format';
import type { Category, CategoryNode } from '../../../types/categories';
import type { Product } from '../../../types/products';
import type { SalonService } from '../../../types/services';
import { ProductFormModal } from '../products/ProductFormModal';
import { ServiceFormModal } from '../services/ServiceFormModal';
import './CatalogPage.css';

function collectIds(node: CategoryNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: CategoryNode): void => {
    ids.add(n.id);
    for (const child of n.children) walk(child);
  };
  walk(node);
  return ids;
}

function findNode(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const found = findNode(node.children, slug);
    if (found) return found;
  }
  return null;
}

function findPath(
  nodes: CategoryNode[],
  targetId: string,
  acc: Category[] = [],
): Category[] | null {
  for (const node of nodes) {
    const nextAcc = [...acc, node];
    if (node.id === targetId) return nextAcc;
    const found = findPath(node.children, targetId, nextAcc);
    if (found) return found;
  }
  return null;
}

type StockStatus = 'out' | 'low' | 'ok';

function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.minimumStockThreshold) return 'low';
  return 'ok';
}

const STOCK_VARIANT: Record<StockStatus, BadgeVariant> = {
  out: 'danger',
  low: 'warning',
  ok: 'success',
};

const STOCK_LABEL: Record<StockStatus, string> = {
  out: 'Out of stock',
  low: 'Low',
  ok: 'In stock',
};

export function CatalogPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const tree = useCategoryTree();
  const products = useProducts();
  const services = useSalonServices(false);

  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productCreateOpen, setProductCreateOpen] = useState(false);
  const [serviceEditor, setServiceEditor] = useState<SalonService | null>(null);
  const [serviceCreateOpen, setServiceCreateOpen] = useState(false);

  const category = useMemo(
    () => (tree.data && slug ? findNode(tree.data, slug) : null),
    [tree.data, slug],
  );

  const path = useMemo(
    () => (tree.data && category ? (findPath(tree.data, category.id) ?? []) : []),
    [tree.data, category],
  );

  const visibleChildIds = useMemo(() => {
    if (!category) return new Set<string>();
    if (activeChildId) {
      const child = findNode(
        category.children,
        category.children.find((c) => c.id === activeChildId)?.slug ?? '',
      );
      return child ? collectIds(child) : new Set<string>([activeChildId]);
    }
    return collectIds(category);
  }, [category, activeChildId]);

  const filteredProducts = useMemo(() => {
    if (!category || category.kind !== 'PRODUCT') return [];
    const q = search.trim().toLowerCase();
    return (products.data ?? [])
      .filter((p) => {
        return visibleChildIds.has(p.categoryId);
      })
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [category, products.data, visibleChildIds, search]);

  const filteredServices = useMemo(() => {
    if (!category || category.kind !== 'SERVICE') return [];
    const q = search.trim().toLowerCase();
    return (services.data ?? [])
      .filter((s) => {
        const categoryId = s.categoryId;
        return categoryId !== undefined && visibleChildIds.has(categoryId);
      })
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true));
  }, [category, services.data, visibleChildIds, search]);

  if (tree.isLoading) {
    return (
      <div className="catalog-page__center">
        <Spinner label="Loading catalog" />
      </div>
    );
  }

  if (tree.error) {
    return (
      <div className="catalog-page">
        <EmptyState
          title="Unable to load catalog"
          description={tree.error instanceof ApiError ? tree.error.message : 'Please try again.'}
        />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="catalog-page">
        <EmptyState
          title="Category not found"
          description="The category may have been removed, or the link is incorrect."
          action={<Link to="/">Back to dashboard</Link>}
        />
      </div>
    );
  }

  const isLoadingItems = category.kind === 'PRODUCT' ? products.isLoading : services.isLoading;

  return (
    <div className="catalog-page">
      <div className="catalog-page__breadcrumb">
        <Link to="/">Home</Link>
        {path.slice(0, -1).map((ancestor) => (
          <span key={ancestor.id}>
            <span aria-hidden="true"> / </span>
            <Link to={`/catalog/${ancestor.slug}`}>{ancestor.name}</Link>
          </span>
        ))}
        <span aria-hidden="true"> / </span>
        <span>{category.name}</span>
      </div>

      <Card
        title={category.name}
        subtitle={
          category.kind === 'SERVICE'
            ? 'Salon services in this category'
            : 'Products in this category'
        }
        actions={
          isAdmin ? (
            <div className="catalog-page__actions">
              <Button
                onClick={() =>
                  category.kind === 'SERVICE'
                    ? setServiceCreateOpen(true)
                    : setProductCreateOpen(true)
                }
              >
                {category.kind === 'SERVICE' ? 'New service' : 'New product'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/settings')}>
                Manage categories
              </Button>
            </div>
          ) : undefined
        }
      >
        {category.children.length > 0 && (
          <div className="catalog-page__subtabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeChildId === null}
              className={`catalog-page__subtab${
                activeChildId === null ? ' catalog-page__subtab--active' : ''
              }`}
              onClick={() => setActiveChildId(null)}
            >
              All
            </button>
            {category.children.map((child) => (
              <button
                key={child.id}
                type="button"
                role="tab"
                aria-selected={activeChildId === child.id}
                className={`catalog-page__subtab${
                  activeChildId === child.id ? ' catalog-page__subtab--active' : ''
                }`}
                onClick={() => setActiveChildId(child.id)}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        <div className="catalog-page__toolbar">
          <Input
            placeholder={`Search ${category.kind === 'SERVICE' ? 'services' : 'products'}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoadingItems && (
          <div className="catalog-page__center">
            <Spinner label="Loading items" />
          </div>
        )}

        {!isLoadingItems && category.kind === 'PRODUCT' && (
          <ProductTable rows={filteredProducts} onRowClick={(p) => navigate(`/products/${p.id}`)} />
        )}

        {!isLoadingItems && category.kind === 'SERVICE' && (
          <ServiceTable
            rows={filteredServices}
            {...(isAdmin ? { onEdit: setServiceEditor } : {})}
          />
        )}

        {!isLoadingItems && category.kind === 'PRODUCT' && filteredProducts.length === 0 && (
          <EmptyState
            title={search ? 'No matching products' : 'No products yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Products assigned to this category will appear here.'
            }
          />
        )}

        {!isLoadingItems && category.kind === 'SERVICE' && filteredServices.length === 0 && (
          <EmptyState
            title={search ? 'No matching services' : 'No services yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Services assigned to this category will appear here.'
            }
          />
        )}
      </Card>
      {isAdmin && category.kind === 'PRODUCT' && (
        <ProductFormModal
          open={productCreateOpen}
          defaultCategory={category.name}
          onClose={() => setProductCreateOpen(false)}
          onCreated={(id) => navigate(`/products/${id}`)}
        />
      )}
      {isAdmin && category.kind === 'SERVICE' && (
        <ServiceFormModal
          open={serviceCreateOpen || serviceEditor !== null}
          {...(serviceEditor ? { service: serviceEditor } : {})}
          categoryId={category.id}
          onClose={() => {
            setServiceCreateOpen(false);
            setServiceEditor(null);
          }}
        />
      )}
    </div>
  );
}

interface ProductTableProps {
  rows: Product[];
  onRowClick: (p: Product) => void;
}

function ProductTable({ rows, onRowClick }: ProductTableProps): JSX.Element {
  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Name', width: '34%', render: (p) => p.name },
    {
      key: 'stock',
      header: 'Stock',
      width: '16%',
      align: 'center',
      render: (p) => p.stock.toLocaleString('en-BD'),
    },
    {
      key: 'status',
      header: 'Status',
      width: '20%',
      align: 'center',
      render: (p) => {
        const s = stockStatus(p);
        return <Badge variant={STOCK_VARIANT[s]}>{STOCK_LABEL[s]}</Badge>;
      },
    },
    {
      key: 'price',
      header: 'Selling price',
      width: '30%',
      align: 'right',
      render: (p) => formatBdt(p.sellingPriceMinor),
    },
  ];

  return <Table columns={columns} rows={rows} getRowKey={(p) => p.id} onRowClick={onRowClick} />;
}

interface ServiceTableProps {
  rows: SalonService[];
  onEdit?: (service: SalonService) => void;
}

function ServiceTable({ rows, onEdit }: ServiceTableProps): JSX.Element {
  const columns: TableColumn<SalonService>[] = [
    { key: 'name', header: 'Name', width: onEdit ? '28%' : '34%', render: (s) => s.name },
    {
      key: 'duration',
      header: 'Duration',
      width: onEdit ? '16%' : '20%',
      align: 'center',
      render: (s) => `${s.durationMinutes} min`,
    },
    {
      key: 'active',
      header: 'Status',
      width: onEdit ? '18%' : '22%',
      align: 'center',
      render: (s) => (
        <Badge variant={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      width: onEdit ? '18%' : '24%',
      align: 'right',
      render: (s) => formatBdt(s.priceMinor),
    },
    ...(onEdit
      ? [
          {
            key: 'actions',
            header: 'Action',
            width: '20%',
            align: 'right' as const,
            render: (s: SalonService) => (
              <Button
                size="sm"
                variant="secondary"
                className="button--icon"
                aria-label="Edit"
                title="Edit service"
                onClick={() => onEdit(s)}
              >
                <Icon name="edit" size={16} />
              </Button>
            ),
          } satisfies TableColumn<SalonService>,
        ]
      : []),
  ];

  return <Table columns={columns} rows={rows} getRowKey={(s) => s.id} />;
}
