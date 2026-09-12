import type { JSX } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { NAV_ITEMS } from '../nav-items';
import './AppLayout.css';

/**
 * The persistent shell for every authenticated page.
 *
 * The sidebar and topbar are rendered once. Only the Outlet area
 * re-renders when the route changes.
 */
export function AppLayout(): JSX.Element {
  const location = useLocation();

  const currentItem = NAV_ITEMS.find((item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  });

  const pageTitle = currentItem?.label ?? 'Dream Makeover';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Topbar title={pageTitle} />
        <div className="app-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
