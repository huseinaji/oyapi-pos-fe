import { useLocation, useNavigate } from 'react-router';
import {
  ShoppingCart,
  Package,
  Receipt,
  LayoutDashboard,
  MoreHorizontal,
} from 'lucide-react';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
};

const navItems: NavItem[] = [
  { id: 'pos', label: 'POS', icon: ShoppingCart, path: '/pos' },
  { id: 'items', label: 'Items', icon: Package, path: '/items' },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: Receipt,
    path: '/transactions',
  },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'more', label: 'More', icon: MoreHorizontal, path: '/settings' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t lg:hidden"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 transition active:scale-95"
              style={{
                color: active ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
