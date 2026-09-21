import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useCategoryTree } from '../../api/category-hooks';
import { Icon, type IconName } from './Icon';
import type { CategoryNode } from '../../types/categories';
import './CatalogNav.css';

/**
 * Returns the icon name to use for a given category.
 *
 * The mapping is by slug rather than kind so that different product
 * categories (Cosmetics, Saree, Three-piece) each show a distinct
 * icon. Unknown slugs fall back to a kind-appropriate default so a
 * newly created category still renders with a sensible icon.
 */
function iconForCategory(category: CategoryNode): IconName {
  switch (category.slug) {
    case 'cosmetics':
      return 'lipstick';
    case 'saree':
      return 'saree';
    case 'three-piece':
      return 'three-piece';
    case 'services':
      return 'sparkles';
    default:
      return category.kind === 'SERVICE' ? 'sparkles' : 'package';
  }
}

/**
 * Renders the top-level categories as sidebar links.
 *
 * Sub-categories are intentionally not shown in the sidebar. They
 * appear as tabs on the catalog page. This keeps the sidebar stable
 * as the client adds deep hierarchies.
 *
 * If the category tree cannot be loaded, the section renders nothing
 * rather than showing an error. The sidebar is not the right place for
 * error reporting.
 */
export function CatalogNav(): JSX.Element | null {
  const { data, isLoading } = useCategoryTree();

  if (isLoading || !data || data.length === 0) {
    return null;
  }

  const topLevel = data.filter((c) => c.active);

  if (topLevel.length === 0) {
    return null;
  }

  return (
    <div className="sidebar__group">
      <div className="sidebar__group-label">Catalog</div>
      <ul className="sidebar__list">
        {topLevel.map((category) => (
          <li key={category.id}>
            <NavLink
              to={`/catalog/${category.slug}`}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
              }
            >
              <span className="sidebar__link-icon">
                <Icon name={iconForCategory(category)} size={20} />
              </span>
              <span className="sidebar__link-label">{category.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
