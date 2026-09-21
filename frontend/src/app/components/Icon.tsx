import type { JSX, SVGProps } from 'react';
import {
  IconDashboard,
  IconSaree,
  IconSettings,
  IconPos,
  IconSparkles,
  IconLipstick,
  IconThreePiece,
  IconInventory,
  IconPackage,
  IconCustomers,
  IconReport,
  IconAccounts,
  IconStaff,
  IconExpenditure,
  IconEdit,
  IconPower,
  IconTrash,
} from './PosIcons';
export type IconName =
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
  | 'settings'
  | 'edit'
  | 'power'
  | 'trash';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/**
 * Renders a small inline SVG icon.
 *
 * Icons use stroke="currentColor" so they inherit the text color of their
 * parent. This makes them themeable without JavaScript.
 *
 * Size defaults to 18px. Callers can override via the size prop.
 */
export function Icon({ name, size = 18, ...rest }: IconProps): JSX.Element {
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
    case 'dashboard':
      return <IconDashboard size={size} {...rest} />;
    case 'pos':
      return <IconPos size={size} {...rest} />;
    case 'sparkles':
      return <IconSparkles size={size} {...rest} />;
    case 'lipstick':
      return <IconLipstick size={size} {...rest} />;
    case 'saree':
      return <IconSaree size={size} {...rest} />;

    case 'three-piece':
      return <IconThreePiece size={size} {...rest} />;
    case 'inventory':
      return <IconInventory size={size} {...rest} />;
    case 'package':
      return <IconPackage size={size} {...rest} />;
    case 'customers':
      return <IconCustomers size={size} {...rest} />;
    case 'report':
      return <IconReport size={size} {...rest} />;
    case 'accounts':
      return <IconAccounts size={size} {...rest} />;
    case 'staff':
      return <IconStaff size={size} {...rest} />;
    case 'expenditure':
      return <IconExpenditure size={size} {...rest} />;
    case 'settings':
      return <IconSettings size={size} {...rest} />;
    case 'edit':
      return <IconEdit size={size} {...rest} />;
    case 'power':
      return <IconPower size={size} {...rest} />;
    case 'trash':
      return <IconTrash size={size} {...rest} />;
    default:
      return <svg {...common} />;
  }
}
