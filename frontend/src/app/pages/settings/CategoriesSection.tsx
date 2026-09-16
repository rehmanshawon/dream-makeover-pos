import { useMemo, useState, type JSX } from 'react';
import { useCategoryTree, useUpdateCategory, useDeleteCategory } from '../../../api/category-hooks';
import { ApiError } from '../../../api/api-error';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { EmptyState } from '../../../ui/EmptyState';
import { Spinner } from '../../../ui/Spinner';
import type { Category, CategoryNode } from '../../../types/categories';
import { CategoryFormModal } from './CategoryFormModal';
import './CategoriesSection.css';

interface FlatRow {
  category: Category;
  depth: number;
}

function flattenTree(nodes: CategoryNode[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const node of nodes) {
    rows.push({ category: node, depth });
    rows.push(...flattenTree(node.children, depth + 1));
  }
  return rows;
}

export function CategoriesSection(): JSX.Element {
  const { data, isLoading, error } = useCategoryTree();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo(() => (data ? flattenTree(data) : []), [data]);

  const handleToggle = async (category: Category): Promise<void> => {
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        payload: { active: !category.active },
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to update category.');
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to delete category.');
      setPendingDelete(null);
    }
  };

  return (
    <Card
      title="Categories"
      subtitle="Product and service categories shown in the sidebar"
      actions={<Button onClick={() => setCreateOpen(true)}>New category</Button>}
    >
      {actionError && (
        <div className="categories-section__error" role="alert">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="categories-section__center">
          <Spinner label="Loading categories" />
        </div>
      )}

      {error && (
        <div className="categories-section__error" role="alert">
          {error instanceof ApiError ? error.message : 'Unable to load categories.'}
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          title="No categories"
          description="Create the first category to organize your catalog."
          action={<Button onClick={() => setCreateOpen(true)}>Create category</Button>}
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="categories-section__tree">
          {rows.map(({ category, depth }) => (
            <div
              key={category.id}
              className="categories-section__row"
              style={{ paddingLeft: `calc(${depth} * var(--space-5))` }}
            >
              <div className="categories-section__main">
                <span className="categories-section__name">{category.name}</span>
                <Badge variant={category.kind === 'SERVICE' ? 'accent' : 'neutral'}>
                  {category.kind === 'SERVICE' ? 'Service' : 'Product'}
                </Badge>
                {!category.active && <Badge variant="neutral">Inactive</Badge>}
              </div>
              <div className="categories-section__actions">
                <Button size="sm" variant="secondary" onClick={() => setEditing(category)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(category)}
                  disabled={updateMutation.isPending}
                >
                  {category.active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingDelete(category)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryFormModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <CategoryFormModal
        open={editing !== undefined}
        {...(editing !== undefined ? { category: editing } : {})}
        onClose={() => setEditing(undefined)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete category"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}"? This will fail if the category has sub-categories or items assigned to it.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  );
}
