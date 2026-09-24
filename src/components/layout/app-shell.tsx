import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutGrid,
  Package2,
  ReceiptText,
  ShoppingCart,
  Users,
  Menu,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuthStore, useLogoutMutation } from '../../lib/auth/auth-store';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useOnlineStatus } from '../../hooks/use-online-status';
import type { ApiUserRole } from '../../types/api';

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: ApiUserRole[];
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/',             label: 'Dashboard',    icon: LayoutGrid,  roles: ['ADMIN'] },
  { href: '/products',     label: 'Products',     icon: Package2,    roles: ['ADMIN'] },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/pos',          label: 'POS',          icon: ShoppingCart },
  { href: '/users',        label: 'Users',        icon: Users,       roles: ['ADMIN'] },
  { href: '/settings',     label: 'Settings',     icon: Settings,    roles: ['ADMIN'] },
];

function getVisibleNavItems(role: ApiUserRole | undefined): NavItem[] {
  return ALL_NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );
}

const ADMIN_ONLY_ROUTES = ['/products', '/users', '/settings', '/categories'];

// ---------------------------------------------------------------------------
// Breadcrumb helpers
// ---------------------------------------------------------------------------

type Crumb = { label: string; href?: string };

function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname.startsWith('/auth')) return [];
  if (pathname === '/') return [{ label: 'Dashboard' }];

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Dashboard', href: '/' }];

  const root = ALL_NAV_ITEMS.find((n) => n.href === `/${segments[0]}`);
  const rootLabel = root?.label ?? capitalise(segments[0]);
  const rootHref = `/${segments[0]}`;

  if (segments.length === 1) {
    crumbs.push({ label: rootLabel });
    return crumbs;
  }

  crumbs.push({ label: rootLabel, href: rootHref });

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const isDynamic =
      /^[a-z]+-?\d+$/i.test(seg) ||
      seg.startsWith('t-') ||
      seg.startsWith('p-') ||
      seg.startsWith('u-');
    if (!isDynamic) {
      const isLast = i === segments.length - 1;
      const nextIsDynamic = segments[i + 1]
        ? /^[a-z]+-?\d+$/i.test(segments[i + 1]) || segments[i + 1].startsWith('t-')
        : false;
      const href =
        !isLast && !nextIsDynamic
          ? '/' + segments.slice(0, i + 1).join('/')
          : undefined;
      crumbs.push({ label: capitalise(seg), href });
    }
  }

  return crumbs;
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

function isNavActive(itemHref: string, pathname: string): boolean {
  if (itemHref === '/') return pathname === '/';
  return pathname === itemHref || pathname.startsWith(itemHref + '/');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ name, collapsed }: { name: string; collapsed: boolean }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] font-semibold text-[var(--accent)] ${
        collapsed ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
      }`}
    >
      {initials}
    </div>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} className="opacity-50" />}
              {!isLast && crumb.href ? (
                <Link
                  to={crumb.href}
                  className="transition hover:text-[var(--foreground)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-[var(--foreground)]' : ''}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function OnlineIndicator({ expanded }: { expanded: boolean }) {
  const isOnline = useOnlineStatus();
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
        isOnline
          ? 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]'
          : 'border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
      }`}
      title={isOnline ? 'Connected' : 'No internet connection'}
    >
      
      {isOnline ? (
        <Wifi size={14} className="text-[var(--status-success)]" />
      ) : (
        <WifiOff size={14} />
      )}
      {expanded && (
        <span className="hidden sm:inline">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.currentUser);
  const logoutMutation = useLogoutMutation();
  const logout = () => {
    void logoutMutation.mutateAsync();
  };

  const {
    sidebarOpen,
    sidebarCollapsed,
    isMobile,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
    setMobile,
    theme,
    setTheme,
    initializeTheme,
  } = useUIStore();

  const [mounted, setMounted] = useState(false);
  const { settings } = useSettingsStore();

  // Route guard — redirect non-ADMIN away from admin-only pages
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'ADMIN') {
      const restricted = ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/'),
      );
      if (restricted) void navigate('/', { replace: true });
    }
  }, [currentUser, pathname, navigate]);

  useEffect(() => {
    initializeTheme();
    setMounted(true);
    const update = () => {
      const mobile = window.innerWidth < 1024;
      setMobile(mobile);
      if (mobile) collapseSidebar();
      else expandSidebar();
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [collapseSidebar, expandSidebar, setMobile]);

  const isDark = mounted && document.documentElement.classList.contains('dark');
  const mobileVisible = isMobile && sidebarOpen;
  const sidebarExpanded = !sidebarCollapsed || isMobile;

  const crumbs = buildBreadcrumbs(pathname);
  const visibleNavItems = getVisibleNavItems(currentUser?.role);
  const activeNav = ALL_NAV_ITEMS.find((item) => isNavActive(item.href, pathname));
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? activeNav?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Mobile backdrop */}
      {mobileVisible && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isMobile
              ? 'fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200'
              : `fixed inset-y-0 left-0 z-20 ${sidebarCollapsed ? 'w-24' : 'w-72'} transition-[width] duration-200`
          } ${
            isMobile
              ? sidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full'
              : 'translate-x-0'
          } border-r border-[var(--border)] bg-[var(--card)]`}
        >
          <div className="flex h-full flex-col overflow-hidden">
            {/* Brand + collapse toggle */}
            <div className="flex shrink-0 items-center justify-between px-4 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent)]/15">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings.storeName}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <ShoppingCart size={18} className="text-[var(--accent)]" />
                  )}
                </div>
                {sidebarExpanded && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {settings.storeName}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {settings.ownerName || 'Retail command center'}
                    </p>
                  </div>
                )}
              </div>
              {!isMobile && (
                <button
                  onClick={sidebarCollapsed ? expandSidebar : collapseSidebar}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                  aria-label="Toggle sidebar"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen size={18} />
                  ) : (
                    <PanelLeftClose size={18} />
                  )}
                </button>
              )}
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 overflow-hidden px-3">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => isMobile && toggleSidebar()}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      active
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                    } ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}
                    title={sidebarCollapsed && !isMobile ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} />
                    {sidebarExpanded && <span>{item.label}</span>}
                    {active && sidebarCollapsed && !isMobile && (
                      <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom — theme + user + logout */}
            <div className="shrink-0 border-t border-[var(--border)] p-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)] ${
                  sidebarCollapsed && !isMobile ? 'justify-center' : ''
                }`}
                title={
                  sidebarCollapsed && !isMobile
                    ? isDark
                      ? 'Light mode'
                      : 'Dark mode'
                    : undefined
                }
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {sidebarExpanded && (
                  <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                )}
              </button>

              <div
                className={`mt-2 rounded-2xl bg-[var(--surface-muted)]/70 p-3 ${
                  sidebarCollapsed && !isMobile
                    ? 'flex flex-col items-center gap-2'
                    : ''
                }`}
              >
                <div
                  className={`flex items-center gap-3 ${
                    sidebarCollapsed && !isMobile ? 'flex-col' : ''
                  }`}
                >
                  <UserAvatar
                    name={currentUser?.username ?? 'User'}
                    collapsed={sidebarCollapsed && !isMobile}
                  />
                  {sidebarExpanded && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {currentUser?.username ?? '—'}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {currentUser?.email ?? ''}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                        {currentUser?.role ?? ''}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={logout}
                  className={`mt-3 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--status-danger)] transition hover:border-[var(--status-danger)]/30 hover:bg-[var(--status-danger)]/5 active:scale-95 ${
                    sidebarCollapsed && !isMobile
                      ? 'w-full justify-center p-2.5'
                      : 'w-full justify-center px-3 py-2'
                  }`}
                  title={sidebarCollapsed && !isMobile ? 'Logout' : undefined}
                >
                  <LogOut size={16} />
                  {sidebarExpanded && <span>Logout</span>}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div
          className={`flex-1 ${
            isMobile ? '' : sidebarCollapsed ? 'ml-24' : 'ml-72'
          } transition-[margin-left] duration-200`}
        >
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  onClick={toggleSidebar}
                  className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>

                <div className="min-w-0">
                  {crumbs.length > 1 ? (
                    <>
                      <Breadcrumbs crumbs={crumbs} />
                      <h1 className="mt-0.5 truncate text-lg font-semibold leading-tight">
                        {pageTitle}
                      </h1>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-[var(--muted)]">
                        Operations
                      </p>
                      <h1 className="truncate text-lg font-semibold leading-tight">
                        {pageTitle}
                      </h1>
                    </>
                  )}
                </div>
              </div>
              <OnlineIndicator expanded={!sidebarCollapsed || isMobile} />
            </div>
          </header>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
