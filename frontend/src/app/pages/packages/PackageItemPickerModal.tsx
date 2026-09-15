import { useMemo, useState, type JSX } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { Spinner } from '../../../ui/Spinner';
import { EmptyState } from '../../../ui/EmptyState';
import { formatBdt } from '../../../utils/format';
import { useProducts } from '../../../api/product-hooks';
import { useSalonServices } from '../../../api/salon-service-hooks';
import type { PackageItemKind } from '../../../types/packages';
import './PackageItemPickerModal.css';

export interface PickedComponent {
  itemKind: PackageItemKind;
  itemId: string;
  itemName: string;
  snapshotPriceMinor: number;
}

interface PackageItemPickerModalProps {
  open: boolean;
  /** Set of keys of components already selected, in "KIND:id" form. */
  selectedKeys: Set<string>;
  onAdd: (item: PickedComponent) => void;
  onClose: () => void;
}

type Tab = 'SERVICE' | 'PRODUCT';

interface DisplayItem {
  key: string;
  itemKind: PackageItemKind;
  itemId: string;
  name: string;
  priceMinor: number;
  subtitle: string;
}

export function PackageItemPickerModal({
  open,
  selectedKeys,
  onAdd,
  onClose,
}: PackageItemPickerModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('SERVICE');
  const [search, setSearch] = useState('');

  const products = useProducts();
  const services = useSalonServices(true);

  const items: DisplayItem[] = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (activeTab === 'SERVICE') {
      return (services.data ?? [])
        .filter((s) => s.active)
        .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
        .map((s) => ({
          key: `SERVICE:${s.id}`,
          itemKind: 'SERVICE' as const,
          itemId: s.id,
          name: s.name,
          priceMinor: s.priceMinor,
          subtitle: `${s.durationMinutes} min`,
        }));
    }

    return (products.data ?? [])
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .map((p) => ({
        key: `PRODUCT:${p.id}`,
        itemKind: 'PRODUCT' as const,
        itemId: p.id,
        name: p.name,
        priceMinor: p.sellingPriceMinor,
        subtitle: p.category,
      }));
  }, [activeTab, search, products.data, services.data]);

  const anyLoading = products.isLoading || services.isLoading;
  const anyError = products.error || services.error;

  return (
    <Modal open={open} title="Add component" onClose={onClose} size="lg">
      <div className="picker">
        <div className="picker__tabs">
          <button
            type="button"
            className={`picker__tab${activeTab === 'SERVICE' ? ' picker__tab--active' : ''}`}
            onClick={() => setActiveTab('SERVICE')}
          >
            Services
          </button>
          <button
            type="button"
            className={`picker__tab${activeTab === 'PRODUCT' ? ' picker__tab--active' : ''}`}
            onClick={() => setActiveTab('PRODUCT')}
          >
            Products
          </button>
        </div>

        <Input
          placeholder="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="picker__list">
          {anyLoading && (
            <div className="picker__loading">
              <Spinner label="Loading items" />
            </div>
          )}

          {anyError && !anyLoading && (
            <div className="picker__error" role="alert">
              Unable to load items.
            </div>
          )}

          {!anyLoading && !anyError && items.length === 0 && (
            <EmptyState
              title="No items"
              description={
                search ? 'Try a different search term.' : 'No items are available in this category.'
              }
            />
          )}

          {!anyLoading && !anyError && items.length > 0 && (
            <ul className="picker__items">
              {items.map((item) => {
                const alreadyAdded = selectedKeys.has(item.key);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={`picker__item${alreadyAdded ? ' picker__item--added' : ''}`}
                      onClick={() => {
                        if (alreadyAdded) return;
                        onAdd({
                          itemKind: item.itemKind,
                          itemId: item.itemId,
                          itemName: item.name,
                          snapshotPriceMinor: item.priceMinor,
                        });
                      }}
                      disabled={alreadyAdded}
                    >
                      <span className="picker__item-main">
                        <span className="picker__item-name">{item.name}</span>
                        <span className="picker__item-subtitle">{item.subtitle}</span>
                      </span>
                      <span className="picker__item-price">{formatBdt(item.priceMinor)}</span>
                      <span className="picker__item-state">{alreadyAdded ? 'Added' : 'Add'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="picker__footer">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
