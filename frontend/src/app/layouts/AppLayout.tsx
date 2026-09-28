import type { JSX } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { NAV_ITEMS } from '../nav-items';
import { usePayrollTimeTrust } from '../../api/time-trust-hooks';
import './AppLayout.css';

/**
 * The persistent shell for every authenticated page.
 *
 * The sidebar and topbar are rendered once. Only the Outlet area
 * re-renders when the route changes.
 */
export function AppLayout(): JSX.Element {
  const location = useLocation();
  const timeTrust = usePayrollTimeTrust();

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

        {(timeTrust.data?.warning || timeTrust.isError) && (
          <div
            className={`app-layout__time-warning${timeTrust.data?.payrollAllowed ? '' : ' app-layout__time-warning--locked'}`}
            role={timeTrust.data?.payrollAllowed ? 'status' : 'alert'}
          >
            <strong>
              {timeTrust.data?.payrollAllowed ? 'Time verification warning' : 'Payroll is locked'}
            </strong>
            <span>
              {timeTrust.isError
                ? ' Trusted time status could not be checked. Payroll actions will remain unavailable. POS operations can continue.'
                : ` ${timeTrust.data?.message ?? 'Payroll operations are temporarily unavailable.'}${
                    timeTrust.data?.payrollAllowed && timeTrust.data.remainingMs !== null
                      ? ` About ${Math.ceil(timeTrust.data.remainingMs / 3_600_000)} hour(s) remain before payroll is locked.`
                      : ''
                  } POS operations can continue.`}
            </span>
          </div>
        )}

        <div className="app-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
