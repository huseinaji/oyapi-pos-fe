import { CalendarClock, Mail, ShieldCheck, UserRound, X } from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { StoreMember } from '@/lib/stores/store-types';

type UserDetailDrawerProps = {
  user: StoreMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatDate(value: string | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export function UserDetailDrawer({
  user,
  open,
  onOpenChange,
}: UserDetailDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="w-full md:w-[26rem]">
        {user && (
          <>
            <DrawerHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    Store member
                  </p>
                  <DrawerTitle className="mt-1 truncate text-left text-lg font-semibold text-[var(--foreground)]">
                    {user.username}
                  </DrawerTitle>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-label="Close user details"
                >
                  <X size={16} />
                </button>
              </div>
              <DrawerDescription className="text-left">
                Platform account and active-store membership
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pt-3">
              <div className="flex items-center gap-4 rounded-xl border border-[var(--border)]/70 bg-[var(--surface-muted)] p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-sm font-semibold text-[var(--accent)]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--foreground)]">
                    {user.username}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-[var(--border)]/70 border-y border-[var(--border)]/70">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <ShieldCheck size={14} />
                    Role
                  </dt>
                  <dd className="rounded-full bg-[var(--surface-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                    {user.role}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <UserRound size={14} />
                    Status
                  </dt>
                  <dd
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.status === 'ACTIVE'
                        ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                        : user.status === 'INACTIVE'
                          ? 'bg-[var(--surface-muted)] text-[var(--muted)]'
                          : 'text-[var(--muted)]'
                    }`}
                  >
                    {user.status ?? '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Mail size={14} />
                    Email
                  </dt>
                  <dd className="max-w-[65%] truncate text-right text-sm font-medium text-[var(--foreground)]">
                    {user.email}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CalendarClock size={14} />
                    Joined
                  </dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-[var(--muted)]">Updated</dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {formatDate(user.updatedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-[var(--muted)]">User ID</dt>
                  <dd className="max-w-[55%] truncate text-right text-xs font-medium text-[var(--foreground)]">
                    {user.id}
                  </dd>
                </div>
              </dl>
            </div>

            <DrawerFooter className="flex-row justify-end border-t border-[var(--border)]/70 pt-4">
              <AppButton
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </AppButton>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
