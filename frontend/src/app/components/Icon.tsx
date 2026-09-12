import type { JSX, SVGProps } from 'react';

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
  | 'settings';

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
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...rest,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'pos':
      return (
        <svg {...common}>
          <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          <circle cx="10" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M19 14l0.8 2.1L22 17l-2.2 0.9L19 20l-0.8-2.1L16 17l2.2-0.9z" />
        </svg>
      );
    case 'lipstick':
      return (
        <svg {...common}>
          <path d="M9 3h6v8H9z" />
          <path d="M7 11h10v10H7z" />
        </svg>
      );
    case 'saree':
      return (
        <svg {...common}>
          <path d="M5 3h14l-2 18H7z" />
          <path d="M9 7h6" />
        </svg>
      );
    case 'three-piece':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="7" height="16" />
          <rect x="14" y="4" width="7" height="16" />
        </svg>
      );
    case 'inventory':
      return (
        <svg {...common}>
          <path d="M3 7l9-4 9 4-9 4z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </svg>
      );
    case 'package':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="1" />
          <path d="M3 7l3-4h12l3 4" />
          <path d="M10 7v3h4V7" />
        </svg>
      );
    case 'customers':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
          <circle cx="17.5" cy="9" r="2.5" />
          <path d="M14 20c0-2.5 1.5-4 3.5-4 2.5 0 3.5 1.5 3.5 4" />
        </svg>
      );
    case 'report':
      return (
        <svg {...common}>
          <path d="M5 3h9l5 5v13H5z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    case 'accounts':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
        </svg>
      );
    case 'staff':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.1-6.5 7-6.5s7 3 7 6.5" />
        </svg>
      );
    case 'expenditure':
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.5 12H5.5z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
