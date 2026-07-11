import { useState } from 'react';
import { BrandMark } from './components/brand-mark';
import { Icon, type IconName } from './components/icons';
import { currentUser, isAuthed, logout } from './lib/api';
import { Dashboard } from './views/dashboard';
import { Login } from './views/login';
import { Orders } from './views/orders';
import { Placeholder } from './views/placeholder';
import { Pos } from './views/pos';

type View =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'pos'
  | 'customers'
  | 'expenses'
  | 'reports'
  | 'settings';

const NAV: Array<{ section?: string; view: View; label: string; icon: IconName }> = [
  { view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { section: 'Catalog', view: 'products', label: 'Products', icon: 'products' },
  { view: 'inventory', label: 'Inventory', icon: 'inventory' },
  { section: 'Sales', view: 'orders', label: 'Orders', icon: 'orders' },
  { view: 'pos', label: 'POS', icon: 'pos' },
  { view: 'customers', label: 'Customers', icon: 'customers' },
  { section: 'Finance', view: 'expenses', label: 'Expenses', icon: 'expenses' },
  { view: 'reports', label: 'Reports', icon: 'reports' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export function App() {
  const [authed, setAuthed] = useState(isAuthed());
  const [view, setView] = useState<View>('dashboard');

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  const user = currentUser();
  const initials = (user?.name ?? 'BH')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-logo">
          <BrandMark className="side-logo-mark" />
          BLACK&nbsp;HORSE
        </div>
        <nav aria-label="Primary">
          {NAV.map((item) => (
            <div key={item.view}>
              {item.section && <div className="side-sec">{item.section}</div>}
              <button
                className="side-link"
                aria-current={view === item.view ? 'page' : undefined}
                onClick={() => setView(item.view)}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            </div>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">{initials}</div>
          <div className="side-user-meta">
            <b>{user?.name ?? 'Signed in'}</b>
            <span>{user?.role ?? ''}</span>
          </div>
          <button
            className="logout-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              logout();
              setAuthed(false);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </aside>

      {view === 'dashboard' && <Dashboard />}
      {view === 'pos' && <Pos />}
      {view === 'orders' && <Orders />}
      {view !== 'dashboard' && view !== 'pos' && view !== 'orders' && (
        <Placeholder title={NAV.find((n) => n.view === view)?.label ?? ''} />
      )}
    </div>
  );
}
