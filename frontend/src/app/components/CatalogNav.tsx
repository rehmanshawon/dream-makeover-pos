import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useCategoryTree } from '../../api/category-hooks';
import { Icon } from './Icon';
import './CatalogNav.css';

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
            {/* <NavLink
              to={`/catalog/${category.slug}`}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
              }
            >
              <Icon name={category.kind === 'SERVICE' ? 'sparkles' : 'lipstick'} />
              <span className="sidebar__link-label">{category.name}</span>
            </NavLink> */}
            <NavLink
              to={`/catalog/${category.slug}`}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
              }
            >
              <span className="sidebar__link-icon">
                <Icon name={category.kind === 'SERVICE' ? 'sparkles' : 'lipstick'} size={20} />
              </span>
              <span className="sidebar__link-label">{category.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
