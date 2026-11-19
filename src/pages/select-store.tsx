import { useNavigate } from 'react-router';
import { ChevronRight, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useLogoutMutation, useMeQuery } from '../lib/auth/auth-store';
import {
  useListMyStoreQuery,
  useSelectStoreMutation,
} from '@/lib/stores/store-store';

export default function SelectStorePage() {
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
  const currentUserQuery = useMeQuery?.();
  const { data, isLoading, isError } = useListMyStoreQuery();
  const selectStoreMutation = useSelectStoreMutation();

  const stores = data?.rows ?? [];
  const username =
    currentUserQuery?.data?.username ?? currentUserQuery?.data?.email ?? '';

  const handleSelect = async (id: string) => {
    try {
      await selectStoreMutation.mutateAsync(id);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Tidak dapat memilih toko', {
        description:
          error instanceof Error ? error.message : 'Silakan coba lagi.',
      });
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: 'var(--background)',
        fontFamily: 'var(--font-jakarta)',
      }}
    >
      {/* Logo ikon */}
      <div className="mb-6 flex flex-col items-center gap-4">
        <img
          src="/Asset-3svg.svg"
          alt=""
          aria-hidden="true"
          className="h-15 w-15"
          draggable={false}
        />

        <div className="text-center">
          <h1
            className="text-[1.75rem] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--primary)' }}
          >
            Pilih toko Anda
          </h1>
          {username && (
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Masuk sebagai {username}
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        {/* Store list */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl"
                style={{ backgroundColor: 'var(--surface-muted)' }}
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              borderColor: 'rgba(200,32,20,0.3)',
              backgroundColor: 'var(--card)',
            }}
          >
            <p
              className="font-semibold"
              style={{ color: 'var(--status-danger)' }}
            >
              Gagal memuat toko
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Silakan coba lagi atau masuk kembali.
            </p>
          </div>
        ) : stores.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed p-8 text-center"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card)',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--primary)' }}>
              Belum ada toko
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Buat toko pertama Anda untuk memulai.
            </p>
          </div>
        ) : (
          stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void handleSelect(s.id)}
              disabled={selectStoreMutation.isPending}
              className="group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.99]"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(31,77,58,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'var(--border)';
              }}
            >
              {/* Avatar */}
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-base font-bold"
                style={{
                  backgroundColor: 'var(--primary-foreground)',
                  color: 'var(--primary)',
                }}
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span>{s.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: 'var(--primary)' }}
                >
                  {s.name}
                </p>
                <p
                  className="mt-0.5 truncate text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  Pemilik · terakhir dibuka hari ini
                </p>
              </div>

              <ChevronRight
                size={16}
                strokeWidth={1.8}
                className="shrink-0 transition group-hover:translate-x-0.5"
                style={{ color: 'var(--muted)' }}
              />
            </button>
          ))
        )}

        {/* Create new store */}
        {!isLoading && !isError && (
          <button
            type="button"
            onClick={() => navigate('/create-store')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3.5 text-sm font-medium transition active:scale-[0.99]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                'rgba(31,77,58,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--muted)';
            }}
          >
            <Plus size={15} strokeWidth={1.8} />
            {stores.length === 0 ? 'Buat toko pertama Anda' : 'Buat toko baru'}
          </button>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={() => void logoutMutation.mutateAsync()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.99]"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              'var(--status-danger)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
          }}
        >
          <LogOut size={14} strokeWidth={1.8} />
          Keluar
        </button>
      </div>
    </div>
  );
}
