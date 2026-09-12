import type { IconName } from './components/Icon';

export type NavGroup = 'main' | 'catalog' | 'operations' | 'admin';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  group: NavGroup;
  /**
   * When true, the item is hidden from staff users. This is a UX
   * convenience only. Server-side RBAC is authoritative.
   */
  adminOnly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', group: 'main', adminOnly: true },
  { path: '/pos', label: 'New Sale', icon: 'pos', group: 'main', adminOnly: false },

  {
    path: '/parlour',
    label: 'Parlour Service',
    icon: 'sparkles',
    group: 'catalog',
    adminOnly: false,
  },
  { path: '/cosmetics', label: 'Cosmetics', icon: 'lipstick', group: 'catalog', adminOnly: false },
  { path: '/shari', label: 'Shari', icon: 'saree', group: 'catalog', adminOnly: false },
  {
    path: '/three-piece',
    label: 'Three-piece',
    icon: 'three-piece',
    group: 'catalog',
    adminOnly: false,
  },

  {
    path: '/stock',
    label: 'Stock / Inventory',
    icon: 'inventory',
    group: 'operations',
    adminOnly: false,
  },
  { path: '/packages', label: 'Packages', icon: 'package', group: 'operations', adminOnly: false },
  {
    path: '/customers',
    label: 'Customers',
    icon: 'customers',
    group: 'operations',
    adminOnly: false,
  },
  {
    path: '/sales-report',
    label: 'Sales Report',
    icon: 'report',
    group: 'operations',
    adminOnly: true,
  },

  {
    path: '/accounts',
    label: 'Accounts / Financial Summary',
    icon: 'accounts',
    group: 'admin',
    adminOnly: true,
  },
  { path: '/staff', label: 'Staff', icon: 'staff', group: 'admin', adminOnly: true },
  {
    path: '/expenditure',
    label: 'Office / Shop Expenditure',
    icon: 'expenditure',
    group: 'admin',
    adminOnly: true,
  },
  { path: '/settings', label: 'Settings', icon: 'settings', group: 'admin', adminOnly: true },
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  main: '',
  catalog: 'Catalog',
  operations: 'Operations',
  admin: 'Administration',
};
