import type { JSX, ImgHTMLAttributes, SVGProps } from 'react';

import dashboardIcon from '../../assets/icons/dashboard.png';
import posIcon from '../../assets/icons/pos.png';
import sparklesIcon from '../../assets/icons/sparkles.png';
import lipstickIcon from '../../assets/icons/lipstick.png';
import sareeIcon from '../../assets/icons/saree.png';
import threePieceIcon from '../../assets/icons/three-piece.png';
import inventoryIcon from '../../assets/icons/inventory.png';
import packageIcon from '../../assets/icons/package.png';
import customersIcon from '../../assets/icons/customers.png';
import reportIcon from '../../assets/icons/report.png';
import accountsIcon from '../../assets/icons/accounts.png';
import staffIcon from '../../assets/icons/staff.png';
import expenditureIcon from '../../assets/icons/expenditure.png';
import payrollIcon from '../../assets/icons/payroll.png';
import settingsIcon from '../../assets/icons/settings.png';

export type IllustrationIconName =
  | 'dashboard'
  | 'pos'
  | 'sparkles'
  | 'lipstick'
  | 'saree'
  | 'three-piece'
  | 'inventory'
  | 'package'
  | 'customers'
  | 'report'
  | 'accounts'
  | 'staff'
  | 'expenditure'
  | 'payroll'
  | 'settings';

export type UtilityIconName = 'edit' | 'power' | 'trash' | 'calendar-check' | 'adjust' | 'pay';

export type IconName = IllustrationIconName | UtilityIconName;

const ILLUSTRATION_SRC: Record<IllustrationIconName, string> = {
  dashboard: dashboardIcon,
  pos: posIcon,
  sparkles: sparklesIcon,
  lipstick: lipstickIcon,
  saree: sareeIcon,
  'three-piece': threePieceIcon,
  inventory: inventoryIcon,
  package: packageIcon,
  customers: customersIcon,
  report: reportIcon,
  accounts: accountsIcon,
  staff: staffIcon,
  expenditure: expenditureIcon,
  payroll: payrollIcon,
  settings: settingsIcon,
};

const UTILITY_ICONS: UtilityIconName[] = [
  'edit',
  'power',
  'trash',
  'calendar-check',
  'adjust',
  'pay',
];

function isUtilityIcon(name: IconName): name is UtilityIconName {
  return (UTILITY_ICONS as string[]).includes(name);
}

type IconProps =
  | ({ name: IllustrationIconName } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
        size?: number;
      })
  | ({ name: UtilityIconName } & SVGProps<SVGSVGElement> & { size?: number });

/**
 * Renders a full-color illustration (PNG) or a utility SVG icon.
 *
 * Illustrations use a fixed palette and are not tinted by CSS.
 * Utility icons inherit `currentColor` so they can be colored to match
 * their surroundings (e.g., a red delete button).
 */
export function Icon(props: IconProps): JSX.Element {
  const { name, size = 24 } = props;

  if (isUtilityIcon(name)) {
    const { name: _n, size: _s, ...rest } = props;
    return renderUtilityIcon(name, size, rest as SVGProps<SVGSVGElement>);
  }

  const {
    name: _n,
    size: _s,
    alt = '',
    ...rest
  } = props as {
    name: IllustrationIconName;
    size?: number;
    alt?: string;
  } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>;

  return (
    <img
      src={ILLUSTRATION_SRC[name]}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      aria-hidden={alt === '' ? true : undefined}
      {...rest}
    />
  );
}

function renderUtilityIcon(
  name: UtilityIconName,
  size: number,
  rest: SVGProps<SVGSVGElement>,
): JSX.Element {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...rest,
  };

  switch (name) {
    case 'edit':
      return (
        <svg {...common}>
          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case 'power':
      return (
        <svg {...common}>
          <path d="M12 3v9" />
          <path d="M18.36 6.64a9 9 0 11-12.72 0" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'calendar-check':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18m-13 5 2 2 4-4" />
        </svg>
      );
    case 'adjust':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="8" cy="6" r="2" fill="currentColor" />
          <circle cx="16" cy="12" r="2" fill="currentColor" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    case 'pay':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18m-13 5h3" />
          <circle cx="17" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
