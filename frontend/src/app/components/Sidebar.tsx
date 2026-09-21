// import type { JSX } from 'react';
// import { NavLink } from 'react-router-dom';
// import { Icon } from './Icon';
// import { CatalogNav } from './CatalogNav';
// import { NAV_ITEMS, NAV_GROUP_LABELS, type NavGroup } from '../nav-items';
// import { useAuth } from '../auth/AuthContext';
// import { Button } from '../../ui/Button';
// import './Sidebar.css';

// export function Sidebar(): JSX.Element {
//   const { user, isAdmin, logout } = useAuth();

//   const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

//   const groupedItems: Record<NavGroup, typeof visibleItems> = {
//     main: [],
//     operations: [],
//     admin: [],
//   };
//   for (const item of visibleItems) {
//     groupedItems[item.group].push(item);
//   }

//   return (
//     <aside className="sidebar" aria-label="Primary navigation">
//       <div className="sidebar__brand">
//         <img src="/logo.png" alt="" className="sidebar__brand-logo" width={40} height={40} />
//         <div className="sidebar__brand-text">
//           <span className="sidebar__brand-name">Dream Makeover</span>
//           <span className="sidebar__brand-tagline">A Luxury Beauty Salon</span>
//         </div>
//       </div>

//       <nav className="sidebar__nav">
//         {groupedItems.main.length > 0 && (
//           <div className="sidebar__group">
//             <ul className="sidebar__list">
//               {groupedItems.main.map((item) => (
//                 <li key={item.path}>
//                   <NavLink
//                     to={item.path}
//                     end={item.path === '/'}
//                     className={({ isActive }) =>
//                       'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
//                     }
//                   >
//                     <Icon name={item.icon} />
//                     <span className="sidebar__link-label">{item.label}</span>
//                   </NavLink>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {/* Catalog is dynamic — inserted between main and operations */}
//         <CatalogNav />

//         {groupedItems.operations.length > 0 && (
//           <div className="sidebar__group">
//             <div className="sidebar__group-label">{NAV_GROUP_LABELS.operations}</div>
//             <ul className="sidebar__list">
//               {groupedItems.operations.map((item) => (
//                 <li key={item.path}>
//                   <NavLink
//                     to={item.path}
//                     className={({ isActive }) =>
//                       'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
//                     }
//                   >
//                     <Icon name={item.icon} />
//                     <span className="sidebar__link-label">{item.label}</span>
//                   </NavLink>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {groupedItems.admin.length > 0 && (
//           <div className="sidebar__group">
//             <div className="sidebar__group-label">{NAV_GROUP_LABELS.admin}</div>
//             <ul className="sidebar__list">
//               {groupedItems.admin.map((item) => (
//                 <li key={item.path}>
//                   <NavLink
//                     to={item.path}
//                     className={({ isActive }) =>
//                       'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
//                     }
//                   >
//                     <Icon name={item.icon} />
//                     <span className="sidebar__link-label">{item.label}</span>
//                   </NavLink>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}
//       </nav>

//       <div className="sidebar__footer">
//         <div className="sidebar__user">
//           <span className="sidebar__user-name">{user?.displayName ?? 'Not signed in'}</span>
//           <span className="sidebar__user-role">{user?.role ?? '—'}</span>
//         </div>
//         {user && (
//           <Button variant="ghost" size="sm" onClick={logout} className="sidebar__logout">
//             Sign out
//           </Button>
//         )}
//       </div>
//     </aside>
//   );
// }

import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { CatalogNav } from './CatalogNav';
import { NAV_ITEMS, NAV_GROUP_LABELS, type NavGroup } from '../nav-items';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../ui/Button';
import './Sidebar.css';

export function Sidebar(): JSX.Element {
  const { user, isAdmin, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const groupedItems: Record<NavGroup, typeof visibleItems> = {
    main: [],
    operations: [],
    admin: [],
  };
  for (const item of visibleItems) {
    groupedItems[item.group].push(item);
  }

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <img src="/logo.png" alt="" className="sidebar__brand-logo" width={44} height={44} />
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">Dream Makeover</span>
          <span className="sidebar__brand-tagline">A Luxury Beauty Salon</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {groupedItems.main.length > 0 && (
          <div className="sidebar__group">
            <ul className="sidebar__list">
              {groupedItems.main.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                    }
                  >
                    <span className="sidebar__link-icon">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="sidebar__link-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CatalogNav />

        {groupedItems.operations.length > 0 && (
          <div className="sidebar__group">
            {NAV_GROUP_LABELS.operations && (
              <div className="sidebar__group-label">{NAV_GROUP_LABELS.operations}</div>
            )}
            <ul className="sidebar__list">
              {groupedItems.operations.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                    }
                  >
                    <span className="sidebar__link-icon">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="sidebar__link-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {groupedItems.admin.length > 0 && (
          <div className="sidebar__group">
            {NAV_GROUP_LABELS.admin && (
              <div className="sidebar__group-label">{NAV_GROUP_LABELS.admin}</div>
            )}
            <ul className="sidebar__list">
              {groupedItems.admin.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                    }
                  >
                    <span className="sidebar__link-icon">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="sidebar__link-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <span className="sidebar__user-name">{user?.displayName ?? 'Not signed in'}</span>
          <span className="sidebar__user-role">{user?.role ?? '—'}</span>
        </div>
        {user && (
          <Button variant="ghost" size="sm" onClick={logout} className="sidebar__logout">
            Sign out
          </Button>
        )}
      </div>
    </aside>
  );
}
