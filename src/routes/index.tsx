import { AppShell } from '#components/layout/app-shell';
import ForgotPasswordPage from '@/pages/forgot-password';
import Login from '@/pages/Login';
import PosPage from '@/pages/pos';
import ProductsPage from '@/pages/product';
import ProductDetailPage from '@/pages/product-detail';
import SelectStorePage from '@/pages/select-store';
import SettingsPage from '@/pages/setting';
import TransactionDetailPage from '@/pages/transaction-detail';
import TransactionPrintPage from '@/pages/transaction-print';
import TransactionsPage from '@/pages/transactions';
import UsersPage from '@/pages/user';
import StockLedgerPage from '@/pages/stock-ledger';
import StockAdjustmentPage from '@/pages/stock-adjustment';
import ItemCategoriesPage from '@/pages/item-categories';
import CashierSessionsPage from '@/pages/cashier-sessions';
import { useAuthStore, useMeQuery } from '#lib/auth/auth-store';
import { useEffect, type FC } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import Home from '../pages/dashboard';

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Verifies the session on first mount.
 * Redirects to /login if unauthenticated.
 */
function RequireAuth({
  children,
  requireStore = false,
}: {
  children: React.ReactNode;
  requireStore?: boolean;
}) {
  const { data: currentUser, isLoading, isError } = useMeQuery();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setUser(currentUser ?? null);
  }, [currentUser, setUser]);

  if (isLoading) return null;
  if (isError || !currentUser) return <Navigate to="/login" replace />;
  if (requireStore && !currentUser.store) {
    return <Navigate to="/select-store" replace />;
  }
  return <>{children}</>;
}

export const RoutesIndex: FC = () => {
  return (
    <Routes>
      {/* Public — no shell */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Authenticated but no store selected yet — no shell */}
      <Route
        path="/select-store"
        element={
          <RequireAuth>
            <SelectStorePage />
          </RequireAuth>
        }
      />

      {/* Fully protected — needs auth + store selection */}
      <Route
        path="/*"
        element={
          <RequireAuth requireStore>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/pos" element={<PosPage />} />
                <Route path="/cashier-sessions" element={<CashierSessionsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/item-categories" element={<ItemCategoriesPage />} />
                <Route path="/stock-ledger" element={<StockLedgerPage />} />
                <Route path="/stock-adjustment" element={<StockAdjustmentPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                <Route path="/transactions/print/:id" element={<TransactionPrintPage />} />
                <Route path="/setting" element={<SettingsPage />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
