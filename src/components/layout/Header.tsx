import { useEffect, useRef, useState } from 'react';
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router';
import { Bell, LogOut, Moon, Settings, Sun, Users } from 'lucide-react';
import type { AuthUser } from '@/lib/auth/auth-store';
import { useLogoutMutation } from '@/lib/auth/auth-store';
import { useUIStore } from '@/stores/ui-store';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { SidebarTrigger, useSidebar } from '../ui/sidebar';

type Crumb = { label: string; href?: string };

type HeaderProps = {
  currentUser: AuthUser | null;
  isDark: boolean;
  theme: 'light' | 'dark';
};

const NAV_LABELS: Record<string, string> = {
  'cashier-sessions': 'Cashier Sessions',
  'item-categories': 'Item Categories',
  'stock-adjustment': 'Stock Adjustment',
  'stock-ledger': 'Stock Ledger',
  transactions: 'Transactions',
  products: 'Items',
  users: 'Users',
  settings: 'Settings',
  pos: 'POS',
};

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname.startsWith('/auth')) return [];
  if (pathname === '/') return [{ label: 'Dashboard' }];

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Dashboard', href: '/' }];
  const rootLabel = NAV_LABELS[segments[0]] ?? capitalise(segments[0]);

  if (segments.length === 1) {
    crumbs.push({ label: rootLabel });
    return crumbs;
  }

  crumbs.push({ label: rootLabel, href: `/${segments[0]}` });
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index];
    const isDynamic =
      /^[a-z]+-?\d+$/i.test(segment) ||
      segment.startsWith('t-') ||
      segment.startsWith('p-') ||
      segment.startsWith('u-');
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsDynamic = nextSegment
      ? /^[a-z]+-?\d+$/i.test(nextSegment) ||
        nextSegment.startsWith('t-') ||
        nextSegment.startsWith('p-') ||
        nextSegment.startsWith('u-')
      : false;

    if (segment.toLowerCase() === 'detail') continue;
    if (isDynamic) {
      crumbs.push({ label: segment });
      continue;
    }

    const href =
      !isLast && !nextIsDynamic
        ? `/${segments.slice(0, index + 1).join('/')}`
        : undefined;
    crumbs.push({ label: capitalise(segment), href });
  }

  return crumbs;
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-accent)] text-sm font-semibold text-[var(--accent)] ring-1 ring-[var(--border)]"
    >
      {initials}
    </div>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb className="min-w-0 max-w-full overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden whitespace-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="min-w-0 shrink">
                {!isLast && crumb.href ? (
                  <BreadcrumbLink
                    href={crumb.href}
                    className="block min-w-0 max-w-[min(40vw,12rem)] truncate"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : isLast ? (
                  <BreadcrumbPage className="block min-w-0 max-w-[min(55vw,24rem)] truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function Header({ currentUser, isDark, theme }: HeaderProps) {
  const { pathname } = useLocation();
  const { isMobile, state } = useSidebar();
  const logoutMutation = useLogoutMutation();
  const setTheme = useUIStore((state) => state.setTheme);
  const [headerPanel, setHeaderPanel] = useState<
    'notifications' | 'profile' | null
  >(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const crumbs = buildBreadcrumbs(pathname);
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? 'Dashboard';

  useEffect(() => {
    if (headerPanel !== 'profile') return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !profileMenuRef.current?.contains(event.target)
      ) {
        setHeaderPanel(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHeaderPanel(null);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [headerPanel]);

  const logout = () => {
    void logoutMutation.mutateAsync();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <SidebarTrigger
            className="shrink-0"
            aria-label={
              isMobile
                ? 'Open menu'
                : state === 'collapsed'
                  ? 'Expand sidebar'
                  : 'Collapse sidebar'
            }
          />

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

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setHeaderPanel((panel) =>
                  panel === 'notifications' ? null : 'notifications',
                )
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Notifications"
              aria-expanded={headerPanel === 'notifications'}
              aria-controls="header-notifications"
              title="Notifications"
            >
              <Bell size={18} />
            </button>
            {headerPanel === 'notifications' && (
              <div
                id="header-notifications"
                className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl sm:w-80"
              >
                <p className="text-sm font-semibold">Notifications</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  You’re all caught up.
                </p>
              </div>
            )}
          </div>

          {currentUser && (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() =>
                  setHeaderPanel((panel) =>
                    panel === 'profile' ? null : 'profile',
                  )
                }
                className="rounded-full p-1 transition hover:bg-[var(--surface-muted)]"
                aria-label="Profile menu"
                aria-expanded={headerPanel === 'profile'}
                aria-controls="header-profile"
              >
                <UserAvatar name={currentUser.username} />
              </button>
              {headerPanel === 'profile' && (
                <div
                  id="header-profile"
                  className="absolute right-0 top-12 z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
                >
                  <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
                    <UserAvatar name={currentUser.username} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {currentUser.username}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 border-b border-[var(--border)] p-2">
                    <Link
                      to="/setting"
                      onClick={() => setHeaderPanel(null)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--surface-muted)]"
                    >
                      <Settings size={17} className="text-[var(--muted)]" />
                      <span>Settings</span>
                    </Link>
                    {currentUser.role === 'ADMIN' && (
                      <Link
                        to="/users"
                        onClick={() => setHeaderPanel(null)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--surface-muted)]"
                      >
                        <Users size={17} className="text-[var(--muted)]" />
                        <span>Manage team</span>
                      </Link>
                    )}
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--status-danger)] transition hover:bg-[var(--status-danger)]/5"
                    >
                      <LogOut size={17} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
