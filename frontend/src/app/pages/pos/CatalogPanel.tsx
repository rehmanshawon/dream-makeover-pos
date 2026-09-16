import { useMemo, useState, type JSX } from 'react';
import { useProducts } from '../../../api/product-hooks';
import { useSalonServices } from '../../../api/salon-service-hooks';
import { usePackages } from '../../../api/package-hooks';
import { useCategoryTree } from '../../../api/category-hooks';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { ItemCard } from './ItemCard';
import type { CartItemKind } from './use-cart';
import './CatalogPanel.css';

interface CatalogPanelProps {
  onAdd: (item: { kind: CartItemKind; id: string; name: string; unitPriceMinor: number }) => void;
}

interface DisplayItem {
  id: string;
  name: string;
  priceMinor: number;
  kind: CartItemKind;
  disabled: boolean;
  disabledReason?: string;
  subtitle?: string;
}

export function CatalogPanel({ onAdd }: CatalogPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('');
  const [search, setSearch] = useState('');

  const products = useProducts();
  const services = useSalonServices(true);
  const packages = usePackages(true);
  const categories = useCategoryTree();

  const topLevelCategories = useMemo(() => {
    return (categories.data ?? []).filter((c) => c.active);
  }, [categories.data]);

  const effectiveTab = useMemo(() => {
    if (activeTab) return activeTab;
    return topLevelCategories[0]?.id ?? 'PACKAGE';
  }, [activeTab, topLevelCategories]);

  const items: DisplayItem[] = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (effectiveTab === 'PACKAGE') {
      return (packages.data ?? [])
        .filter((p) => p.active)
        .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
        .map((p) => ({
          id: p.id,
          name: p.name,
          priceMinor: p.packagePriceMinor,
          kind: 'PACKAGE' as const,
          disabled: false,
          subtitle: `Save ${(p.savingsMinor / 100).toFixed(0)}৳`,
        }));
    }

    const category = topLevelCategories.find((c) => c.id === effectiveTab);
    if (!category) return [];

    const descendantIds = new Set<string>([category.id]);
    const walk = (nodes: typeof topLevelCategories): void => {
      for (const n of nodes) {
        if (n.id === category.id) {
          collectChildren(n, descendantIds);
        } else {
          walk(n.children);
        }
      }
    };
    walk(topLevelCategories);

    if (category.kind === 'SERVICE') {
      return (services.data ?? [])
        .filter((s) => s.active)
        .filter((s) => descendantIds.has(s.categoryId))
        .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
        .map((s) => ({
          id: s.id,
          name: s.name,
          priceMinor: s.priceMinor,
          kind: 'SERVICE' as const,
          disabled: false,
          subtitle: `${s.durationMinutes} min`,
        }));
    }

    return (products.data ?? [])
      .filter((p) => descendantIds.has(p.categoryId))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .map((p) => {
        const outOfStock = p.stock <= 0;
        return {
          id: p.id,
          name: p.name,
          priceMinor: p.sellingPriceMinor,
          kind: 'PRODUCT' as const,
          disabled: outOfStock,
          ...(outOfStock ? { disabledReason: 'Out of stock' } : {}),
          subtitle: `${p.stock} in stock`,
        };
      });
  }, [effectiveTab, search, products.data, services.data, packages.data, topLevelCategories]);

  const anyLoading =
    products.isLoading || services.isLoading || packages.isLoading || categories.isLoading;
  const anyError = products.error || services.error || packages.error || categories.error;

  return (
    <div className="catalog-panel">
      <div className="catalog-panel__tabs">
        {topLevelCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`catalog-panel__tab${
              effectiveTab === c.id ? ' catalog-panel__tab--active' : ''
            }`}
            onClick={() => setActiveTab(c.id)}
          >
            {c.name}
          </button>
        ))}
        <button
          type="button"
          className={`catalog-panel__tab${
            effectiveTab === 'PACKAGE' ? ' catalog-panel__tab--active' : ''
          }`}
          onClick={() => setActiveTab('PACKAGE')}
        >
          Packages
        </button>
      </div>

      <div className="catalog-panel__search">
        <Input
          placeholder="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="catalog-panel__content">
        {anyLoading && (
          <div className="catalog-panel__loading">
            <Spinner label="Loading catalog" />
          </div>
        )}

        {anyError && !anyLoading && (
          <div className="catalog-panel__error" role="alert">
            Unable to load catalog. Please try again.
          </div>
        )}

        {!anyLoading && !anyError && items.length === 0 && (
          <EmptyState
            title="No items"
            description={
              search
                ? 'Try a different search term.'
                : 'No items are available in this category yet.'
            }
          />
        )}

        {!anyLoading && !anyError && items.length > 0 && (
          <div className="catalog-panel__grid">
            {items.map((item) => (
              <ItemCard
                key={`${item.kind}:${item.id}`}
                name={item.name}
                priceMinor={item.priceMinor}
                {...(item.subtitle !== undefined ? { subtitle: item.subtitle } : {})}
                disabled={item.disabled}
                {...(item.disabledReason !== undefined
                  ? { disabledReason: item.disabledReason }
                  : {})}
                onClick={() =>
                  onAdd({
                    kind: item.kind,
                    id: item.id,
                    name: item.name,
                    unitPriceMinor: item.priceMinor,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function collectChildren(
  node: { id: string; children: { id: string; children: unknown[] }[] },
  acc: Set<string>,
): void {
  for (const child of node.children) {
    acc.add(child.id);
    collectChildren(child as never, acc);
  }
}
