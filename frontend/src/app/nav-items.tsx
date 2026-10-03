import type { IconName } from './components/Icon';

export type NavGroup = 'main' | 'operations' | 'admin';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  group: NavGroup;
  adminOnly: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', group: 'main', adminOnly: true },
  { path: '/pos', label: 'New Sale', icon: 'pos', group: 'main', adminOnly: false },

  {
    path: '/stock',
    label: 'Inventory',
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
    label: 'Accounts',
    icon: 'accounts',
    group: 'admin',
    adminOnly: true,
  },
  { path: '/staff', label: 'Staff', icon: 'staff', group: 'admin', adminOnly: true },
  {
    path: '/expenditure',
    label: 'Expenditure',
    icon: 'expenditure',
    group: 'admin',
    adminOnly: true,
  },
  {
    path: '/payroll',
    label: 'Payroll',
    icon: 'payroll', // reuse an existing icon until we have a dedicated one
    group: 'admin',
    adminOnly: true,
  },
  { path: '/settings', label: 'Settings', icon: 'settings', group: 'admin', adminOnly: true },
];

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  main: '',
  operations: 'Operations',
  admin: 'Administration',
};
