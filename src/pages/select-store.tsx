import { useNavigate } from 'react-router';
import { ShoppingCart, MapPin, Phone, ChevronRight, Plus, LogOut } from 'lucide-react';
import { useAuthStore, useLogoutMutation } from '../lib/auth/auth-store';
import {
  useListMyStoreQuery,
  useSelectStoreMutation,
} from '#lib/stores/store-store';

export default function SelectStorePage() {
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
  const { data, isLoading, isError } = useListMyStoreQuery();
  const selectStoreMutation = useSelectStoreMutation();
  const currentUser = useAuthStore((s) => s.currentUser);

  const stores = data?.rows ?? [];

  const handleSelect = async (id: string) => {
    await selectStoreMutation.mutateAsync(id);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-8">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15">
          <ShoppingCart className="text-[var(--accent)]" size={24} />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Select your store
        </h1>
      </div>

      <div className="w-full max-w-md space-y-3">
        {/* Store list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[16px] bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[16px] border border-[var(--status-danger)]/30 bg-[var(--card)] p-8 text-center">
            <p className="font-medium text-[var(--status-danger)]">
              Unable to load stores
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Please try again or sign in again.
            </p>
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <ShoppingCart size={28} className="mx-auto mb-3 text-[var(--muted)]" />
            <p className="font-medium">No stores yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create your first store to get started.
            </p>
          </div>
        ) : (
          stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void handleSelect(s.id)}
              disabled={selectStoreMutation.isPending}
              className="group flex w-full items-center gap-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-muted)]/50 active:scale-[0.99]"
            >
              {/* Logo / avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent)]/10">
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <ShoppingCart size={20} className="text-[var(--accent)]" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold group-hover:text-[var(--accent)]">
                  {s.name}
                </p>
                {s.address && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                    <MapPin size={11} />
                    {s.address}
                  </p>
                )}
                {s.phone && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                    <Phone size={11} />
                    {s.phone}
                  </p>
                )}
              </div>

              <ChevronRight
                size={18}
                className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
              />
            </button>
          ))
        )}

        {/* Create new store — only for ADMIN */}
        {currentUser?.role === 'ADMIN' && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--border)] bg-transparent px-4 py-3.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)] active:scale-[0.99]"
          >
            <Plus size={16} />
            Create new store
          </button>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={() => void logoutMutation.mutateAsync()}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--status-danger)] active:scale-[0.99]"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
