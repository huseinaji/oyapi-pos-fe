import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useUIStore } from '../../stores/ui-store';
import { useOfflineTransactionSync } from '../../hooks/use-offline-transaction-sync';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from './Sidebar';
import Header from './Header';

const ADMIN_ONLY_ROUTES = [
  '/users',
  '/settings',
  '/categories',
];

// AppShell
// ---------------------------------------------------------------------------

export function AppShell({ children }: { children: ReactNode }) {
  useOfflineTransactionSync();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const theme = useUIStore((state) => state.theme);
  const initializeTheme = useUIStore((state) => state.initializeTheme);

  // Route guard — redirect non-ADMIN away from admin-only pages
  useEffect(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return;

    const restricted = ADMIN_ONLY_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    if (restricted) void navigate('/', { replace: true });
  }, [currentUser, pathname, navigate]);

  // Initialize the saved color theme.
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '18rem',
          '--sidebar-width-icon': '4rem',
        } as CSSProperties
      }
      className="min-h-svh bg-[var(--background)] text-[var(--foreground)]"
    >
      <Sidebar currentUser={currentUser} />
      <SidebarInset className="min-h-svh min-w-0">
        {/* <Header currentUser={currentUser} /> */}
        <Header
          currentUser={currentUser}
          isDark={theme === 'dark'}
          theme={theme}
        />
        <main className="min-h-0 min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
