const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

export type IconName =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'pos'
  | 'customers'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'search'
  | 'plus';

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="13" y="3" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="3" y="13" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="13" y="13" width="8" height="8" rx="1.5" {...stroke} />
    </>
  ),
  products: (
    <>
      <path d="M12 3 21 7.5v9L12 21 3 16.5v-9L12 3Z" {...stroke} />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" {...stroke} />
    </>
  ),
  inventory: <path d="M4 7h16M4 12h16M4 17h10" {...stroke} />,
  orders: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" {...stroke} />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" {...stroke} />
    </>
  ),
  pos: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" {...stroke} />
      <path d="M8 21h8" {...stroke} />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.2" {...stroke} />
      <path
        d="M3.5 19c1-3 3-4.4 5.5-4.4s4.5 1.4 5.5 4.4M15.5 5.6a3.2 3.2 0 0 1 0 4.8M17.5 14.8c1.6.7 2.6 2 3 4.2"
        {...stroke}
      />
    </>
  ),
  expenses: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" {...stroke} />
      <path d="M3 10h18" {...stroke} />
    </>
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" {...stroke} />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" {...stroke} />
      <path
        d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.37.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.37 2.54a7 7 0 0 0-2.42 1.4l-2.37-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .48.05.94.14 1.4l-2 1.55 2 3.46 2.37-.95a7 7 0 0 0 2.42 1.4l.37 2.54h3.4l.37-2.54a7 7 0 0 0 2.42-1.4l2.37.95 2-3.46-2-1.55c.09-.46.14-.92.14-1.4Z"
        {...stroke}
        strokeWidth={1.6}
      />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" {...stroke} />
      <path d="m20 20-3.5-3.5" {...stroke} />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2} />,
};

export function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
