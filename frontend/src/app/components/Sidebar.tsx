import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { NAV_ITEMS, NAV_GROUP_LABELS, type NavGroup } from '../nav-items';
import { useAuth } from '../auth/AuthContext';
import './Sidebar.css';

/**
 * Primary navigation. Renders the logo, grouped links, and a footer with
 * the authenticated user.
 *
 * Links marked adminOnly are hidden from staff users. This is a UX
 * convenience; the server enforces real authorization.
 */
export function Sidebar(): JSX.Element {
  const { user, isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const groupedItems: Record<NavGroup, typeof visibleItems> = {
    main: [],
    catalog: [],
    operations: [],
    admin: [],
  };
  for (const item of visibleItems) {
    groupedItems[item.group].push(item);
  }

  const groupOrder: NavGroup[] = ['main', 'catalog', 'operations', 'admin'];

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">DM</span>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">Dream Makeover</span>
          <span className="sidebar__brand-tagline">A Luxury Beauty Salon</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {groupOrder.map((group) => {
          const items = groupedItems[group];
          if (items.length === 0) return null;

          const label = NAV_GROUP_LABELS[group];

          return (
            <div key={group} className="sidebar__group">
              {label && <div className="sidebar__group-label">{label}</div>}
              <ul className="sidebar__list">
                {items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                      }
                    >
                      <Icon name={item.icon} />
                      <span className="sidebar__link-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className="sidebar__user-name">{user?.displayName ?? 'Not signed in'}</span>
          <span className="sidebar__user-role">{user?.role ?? '—'}</span>
        </div>
      </div>
    </aside>
  );
}
