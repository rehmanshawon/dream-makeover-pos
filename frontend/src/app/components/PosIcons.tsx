import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const defaultProps = {
  width: '1em',
  height: '1em',
  fill: 'none',
  viewBox: '0 0 24 24',
};

export const IconDashboard: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <rect x="3" y="3" width="8" height="8" rx="2" fill="#3B82F6" />
    <rect x="13" y="3" width="8" height="5" rx="2" fill="#8B5CF6" />
    <rect x="13" y="10" width="8" height="11" rx="2" fill="#10B981" />
    <rect x="3" y="13" width="8" height="8" rx="2" fill="#F59E0B" />
  </svg>
);

export const IconPos: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" fill="#10B981" />
    <path d="M7 8h10M7 12h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="15" r="4" fill="#EF4444" />
    <path d="M17 13v4M15 15h4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSparkles: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    {/* Salon Services / Scissors & Comb */}
    <path d="M14 4l-4 4M10 4l4 4" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
    <circle cx="8" cy="10" r="2" fill="#EC4899" />
    <circle cx="16" cy="10" r="2" fill="#EC4899" />
    <path d="M5 14h14M5 17h14M5 20h14" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 14v6" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconLipstick: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    {/* Base Tube */}
    <rect x="8" y="13" width="8" height="8" rx="1.5" fill="#334155" />
    {/* Metallic Collar */}
    <rect x="9" y="9" width="6" height="4" fill="#F59E0B" />
    {/* Bullet / Lipstick Top */}
    <path d="M10 9V4.5L14 2v7h-4z" fill="#E11D48" />
  </svg>
);

export const IconSaree: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    {/* Draped Fabric Body */}
    <path
      d="M4 5c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V5z"
      fill="#8B5CF6"
    />
    {/* Zari Border */}
    <path d="M4 17h16v4H4z" fill="#F59E0B" />
    {/* Pleats / Waves */}
    <path
      d="M7 3c2 4 2 10 0 14M11 3c2 4 2 10 0 14M15 3c2 4 2 10 0 14"
      stroke="#DDD6FE"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Pallu Accent */}
    <path d="M16 3l4 4v10l-4-4V3z" fill="#D97706" />
  </svg>
);

export const IconThreePiece: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path d="M8 3l2 2h4l2-2 3 3-2 3v5H7V9L5 6l3-3z" fill="#06B6D4" />

    <path d="M10 5l2 3 2-3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    {/* Salwar / Bottom */}
    <path d="M9 14h6l1.5 7h-9L9 14z" fill="#0891B2" />
    {/* Dupatta / Scarf Overlay */}
    <path d="M5 4c3 3 3 9 0 15" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconInventory: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path d="M12 2L3 7l9 5 9-5-9-5z" fill="#F59E0B" />
    <path d="M3 7v10l9 5V12L3 7z" fill="#D97706" />
    <path d="M21 7v10l-9 5V12l9-5z" fill="#B45309" />
  </svg>
);

export const IconPackage: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <rect x="3" y="8" width="18" height="13" rx="2" fill="#8B5CF6" />
    <path d="M3 12h18" stroke="#A78BFA" strokeWidth="1.5" />
    <path d="M12 8v13" stroke="#A78BFA" strokeWidth="1.5" />
    <path
      d="M7.5 8C7.5 6 9 4.5 12 4.5C15 4.5 16.5 6 16.5 8"
      stroke="#EC4899"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const IconCustomers: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <circle cx="9" cy="8" r="4" fill="#3B82F6" />
    <path d="M2 19c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1H2v-1z" fill="#1D4ED8" />
    <circle cx="17" cy="9" r="3" fill="#60A5FA" />
    <path
      d="M16 14.2c2.4.5 4 2.2 4 4.8v1h-3.2v-1c0-1.8-1-3.4-2.5-4.3.5-.3 1.1-.5 1.7-.5z"
      fill="#3B82F6"
    />
  </svg>
);

export const IconReport: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path
      d="M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth="2"
    />
    <rect x="6" y="13" width="3" height="5" rx="1" fill="#3B82F6" />
    <rect x="10.5" y="9" width="3" height="9" rx="1" fill="#10B981" />
    <rect x="15" y="6" width="3" height="12" rx="1" fill="#F59E0B" />
  </svg>
);

export const IconAccounts: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="3" fill="#10B981" />
    <path d="M2 9h20" stroke="#059669" strokeWidth="2" />
    <circle cx="17" cy="14" r="2" fill="#F59E0B" />
  </svg>
);

export const IconStaff: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#64748B" />
    <path d="M8 3h8v3H8z" fill="#94A3B8" />
    <circle cx="12" cy="11" r="2.5" fill="#38BDF8" />
    <path d="M8.5 17c0-1.9 1.6-3.5 3.5-3.5s3.5 1.6 3.5 3.5v0.5h-7V17z" fill="#38BDF8" />
  </svg>
);

export const IconExpenditure: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <circle cx="12" cy="12" r="9" fill="#EF4444" />
    <path
      d="M12 7v10M8.5 10.5l7 3M15.5 10.5l-7 3"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill="#64748B" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.29 2.1c.38-.21.84-.13 1.13.2l.62.7c.33.38.88.48 1.32.25l.84-.44c.4-.2.9-.03 1.11.36l1.23 2.13c.2.39.08.88-.28 1.13l-.71.5c-.38.27-.52.79-.34 1.21l.34.89c.17.43.63.68 1.08.58l.91-.2c.43-.1.88.16.98.59l.52 2.39c.09.43-.15.86-.56.98l-.89.26c-.43.12-.73.52-.71.97l.03.95c.01.45-.33.83-.77.87l-2.43.2c-.44.04-.84-.25-.92-.68l-.18-.93c-.08-.44-.47-.76-.92-.76h-.95c-.45 0-.84.32-.92.76l-.18.93c-.08.43-.48.72-.92.68l-2.43-.2c-.44-.04-.78-.42-.77-.87l.03-.95c.02-.45-.28-.85-.71-.97l-.89-.26c-.41-.12-.65-.55-.56-.98l.52-2.39c.1-.43.55-.69.98-.59l.91.2c.45.1.91-.15 1.08-.58l.34-.89c.18-.42.04-.94-.34-1.21l-.71-.5c-.36-.25-.48-.74-.28-1.13l1.23-2.13z"
      fill="#94A3B8"
    />
  </svg>
);

export const IconEdit: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      stroke="#3B82F6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconPower: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path d="M12 3v9" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M18.36 6.64a9 9 0 11-12.72 0"
      stroke="#EF4444"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size, style, ...props }) => (
  <svg {...defaultProps} style={{ fontSize: size, ...style }} {...props}>
    <path
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      stroke="#EF4444"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
