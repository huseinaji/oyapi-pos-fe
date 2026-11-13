import {
  CalendarClock,
  Copy,
  Mail,
  MoreHorizontal,
  UserRoundMinus,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  canDisableMember: boolean;
  isUpdatingMember: boolean;
  onRequestMembershipAction: (action: 'disable' | 'enable') => void;
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
  canDisableMember,
  isUpdatingMember,
  onRequestMembershipAction,
}: UserDetailDrawerProps) {
  const isMobile = useIsMobile();
  const isActive = user?.status === 'active';

  const handleCopyUserId = async () => {
    if (!user) return;

    try {
      await navigator.clipboard.writeText(user.userId);
      toast.success('User ID copied');
    } catch {
      toast.error('Unable to copy user ID', {
        description: 'Copy the ID directly from the details below.',
      });
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent
          className={
            isMobile ? 'h-[50dvh] w-full md:h-full md:w-[26rem]' : 'w-[26rem]'
          }
        >
          {user && (
            <>
              <DrawerHeader className="gap-4 px-5 pt-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-sm font-semibold text-[var(--accent)]">
                      {user.user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                        Store member
                      </p>
                      <DrawerTitle className="mt-1 truncate text-left text-lg font-semibold text-[var(--foreground)]">
                        {user.user.username}
                      </DrawerTitle>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[var(--surface-accent)] px-2.5 py-1 text-[11px] font-semibold uppercase text-[var(--accent)]">
                          {user.role}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isActive
                              ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                              : 'bg-[var(--surface-muted)] text-[var(--muted)]'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        />
                      }
                      aria-label="More member actions"
                    >
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleCopyUserId}>
                        <Copy aria-hidden="true" />
                        <span>Copy user ID</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onOpenChange(false)}
                        className="text-[var(--muted)]"
                      >
                        <X aria-hidden="true" />
                        <span>Close details</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <DrawerDescription className="sr-only">
                  Details and actions for {user.user.username}.
                </DrawerDescription>
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {!isActive && (
                  <p className="mb-4 rounded-xl bg-[var(--surface-muted)] px-3.5 py-3 text-sm leading-5 text-[var(--muted)]">
                    This member is inactive and no longer has access to this
                    store.
                  </p>
                )}
                <dl className="divide-y divide-[var(--border)]/70 border-y border-[var(--border)]/70">
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Mail size={15} aria-hidden="true" />
                      Email
                    </dt>
                    <dd className="max-w-[65%] truncate text-right text-sm font-medium text-[var(--foreground)]">
                      {user.user.email}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <CalendarClock size={15} aria-hidden="true" />
                      Joined
                    </dt>
                    <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                      {formatDate(user.createdAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-sm text-[var(--muted)]">Updated</dt>
                    <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                      {formatDate(user.updatedAt)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-sm text-[var(--muted)]">User ID</dt>
                    <dd
                      className="max-w-[55%] truncate text-right text-xs font-medium text-[var(--foreground)]"
                      title={user.userId}
                    >
                      {user.userId}
                    </dd>
                  </div>
                </dl>
              </div>

              <DrawerFooter className="border-t border-[var(--border)]/70 px-5 py-4">
                {canDisableMember ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRequestMembershipAction(isActive ? 'disable' : 'enable')
                    }
                    disabled={isUpdatingMember}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isActive ? (
                      <UserRoundMinus size={16} aria-hidden="true" />
                    ) : (
                      <UserRoundPlus size={16} aria-hidden="true" />
                    )}
                    {isActive ? 'Disable member' : 'Enable member'}
                  </button>
                ) : (
                  <AppButton
                    variant="secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    Close details
                  </AppButton>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
