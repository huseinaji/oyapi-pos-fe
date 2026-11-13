import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';

import { FormField } from '@/components/layout/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { TableSkeleton, CardGridSkeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/auth/auth-store';
import { ApiError } from '@/lib/api';
import {
  useAssignStoreMemberMutation,
  useDisableStoreMemberMutation,
  useStoreMembersQuery,
} from '@/lib/stores/store-store';
import { usersApi } from '@/lib/user/users-api';
import type { StoreMember } from '@/lib/stores/store-types';
import { UsersPagination } from './users-pagination';
import { UsersTable } from './users-table';
import { UserDetailDrawer } from './user-detail-drawer';

const ROLE_OPTIONS = ['all', 'admin', 'cashier'] as const;
const STORE_ROLE_OPTIONS = [
  { label: 'Cashier', value: 'cashier' },
  { label: 'Admin', value: 'admin' },
] as const;
type RoleFilter = (typeof ROLE_OPTIONS)[number];

function extractApiError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

function RoleBadge({ role }: { role: StoreMember['role'] }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--surface-accent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
      {role}
    </span>
  );
}

function inputClass(hasError: boolean) {
  return `h-[52px] w-full rounded-[12px] border bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:ring-2 ${
    hasError
      ? 'border-[var(--status-danger)] focus:ring-[var(--status-danger)]/20'
      : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/20'
  }`;
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const storeId = currentUser?.store?.storeId;
  const membersQuery = useStoreMembersQuery(storeId);
  const assignMutation = useAssignStoreMemberMutation(storeId);
  const disableMemberMutation = useDisableStoreMemberMutation(storeId);
  const members = membersQuery.data?.rows ?? [];
  console.log(members);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUsername, setAssignUsername] = useState('');
  const [isAssignUsernameFocused, setIsAssignUsernameFocused] = useState(false);
  const [selectedAssignUsername, setSelectedAssignUsername] = useState<
    string | null
  >(null);
  const [assignRole, setAssignRole] = useState<StoreMember['role']>('cashier');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [detailMember, setDetailMember] = useState<StoreMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [membershipAction, setMembershipAction] = useState<
    'disable' | 'enable' | null
  >(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'username', desc: false },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const assignUsernameFieldRef = useRef<HTMLDivElement>(null);
  const normalizedAssignUsername = assignUsername.trim();
  const [debouncedAssignUsername, setDebouncedAssignUsername] = useState('');

  useEffect(() => {
    if (!assignOpen) return;

    const closeSuggestionsOnOutsidePointer = (event: PointerEvent) => {
      if (!assignUsernameFieldRef.current?.contains(event.target as Node)) {
        setIsAssignUsernameFocused(false);
      }
    };

    document.addEventListener('pointerdown', closeSuggestionsOnOutsidePointer);
    return () =>
      document.removeEventListener(
        'pointerdown',
        closeSuggestionsOnOutsidePointer,
      );
  }, [assignOpen]);

  useEffect(() => {
    if (!assignOpen || normalizedAssignUsername.length < 3) {
      setDebouncedAssignUsername('');
      return;
    }

    const timeoutId = window.setTimeout(
      () => setDebouncedAssignUsername(normalizedAssignUsername),
      250,
    );
    return () => window.clearTimeout(timeoutId);
  }, [assignOpen, normalizedAssignUsername]);

  const usernameSearchQuery = useQuery({
    queryKey: ['users', 'username-search', debouncedAssignUsername],
    queryFn: () => usersApi.searchByUsername(debouncedAssignUsername),
    enabled: assignOpen && debouncedAssignUsername.length >= 3,
  });
  console.log(usernameSearchQuery);
  const isUsernameSearchReady =
    normalizedAssignUsername.length >= 3 &&
    debouncedAssignUsername === normalizedAssignUsername;
  const showUsernameSuggestions =
    assignOpen &&
    isAssignUsernameFocused &&
    normalizedAssignUsername.length >= 3 &&
    selectedAssignUsername !== normalizedAssignUsername;

  const currentMember = members.find(
    (member) => member.userId === currentUser?.sub,
  );
  const isStoreAdmin = currentMember
    ? currentMember.role === 'admin'
    : currentUser?.store?.role === 'admin';

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        !normalizedQuery ||
        `${member.user.username} ${member.user.email}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [members, query, roleFilter]);

  const openAssign = () => {
    setAssignUsername('');
    setSelectedAssignUsername(null);
    setAssignRole('cashier');
    setAssignError(null);
    setAssignOpen(true);
  };

  const closeAssign = () => {
    if (isAssigning) return;
    setAssignOpen(false);
    setAssignUsername('');
    setSelectedAssignUsername(null);
    setAssignError(null);
  };

  const handleAssignMember = async () => {
    const username = assignUsername.trim();
    if (!isStoreAdmin) {
      setAssignError('Only an administrator of this store can add members.');
      return;
    }
    if (!storeId) {
      setAssignError('Select an active store before adding a member.');
      return;
    }
    if (!username) {
      setAssignError('Username is required.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    try {
      const user = await usersApi.findByUsername(username);
      if (!user) {
        setAssignError(`No platform account found for "${username}".`);
        return;
      }
      if (members.some((member) => member.userId === user.id)) {
        setAssignError(`"${user.username}" is already a member of this store.`);
        return;
      }

      await assignMutation.mutateAsync({ userId: user.id, role: assignRole });
      toast.success('Member added', {
        description: `"${user.username}" now has access to this store.`,
      });
      setAssignOpen(false);
      setAssignUsername('');
      setSelectedAssignUsername(null);
    } catch (error) {
      setAssignError(extractApiError(error));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDisableMember = async (member: StoreMember) => {
    if (!isStoreAdmin || !storeId) {
      toast.error('Unable to disable member', {
        description: !storeId
          ? 'Select an active store and try again.'
          : 'Only an administrator of this store can disable members.',
      });
      return false;
    }

    try {
      await disableMemberMutation.mutateAsync(member.userId);
      toast.success('Member disabled', {
        description: `${member.user.username} no longer has access to this store.`,
      });
      setDetailOpen(false);
      return true;
    } catch (error) {
      toast.error('Unable to disable member', {
        description: extractApiError(error),
      });
      return false;
    }
  };

  const handleEnableMember = async (member: StoreMember) => {
    if (!isStoreAdmin || !storeId) {
      toast.error('Unable to enable member', {
        description: !storeId
          ? 'Select an active store and try again.'
          : 'Only an administrator of this store can enable members.',
      });
      return false;
    }

    try {
      await assignMutation.mutateAsync({
        userId: member.userId,
        role: member.role,
      });
      toast.success('Member enabled', {
        description: `${member.user.username} can access this store again.`,
      });
      setDetailOpen(false);
      return true;
    } catch (error) {
      toast.error('Unable to enable member', {
        description: extractApiError(error),
      });
      return false;
    }
  };

  const handleConfirmMembershipAction = async () => {
    if (!membershipAction || !detailMember) return;

    const succeeded =
      membershipAction === 'disable'
        ? await handleDisableMember(detailMember)
        : await handleEnableMember(detailMember);
    if (succeeded) setMembershipAction(null);
  };

  const isUpdatingMember =
    disableMemberMutation.isPending || assignMutation.isPending;

  const columns = useMemo<ColumnDef<StoreMember>[]>(
    () => [
      {
        accessorFn: (member) => member.user.username,
        id: 'username',
        header: 'Member',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-xs font-semibold text-[var(--accent)]">
              {row.original.user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.user.username}</span>
              {row.original.userId === currentUser?.sub && (
                <span className="rounded-full bg-[var(--accent-strong)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  You
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorFn: (member) => member.user.email,
        id: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">{row.original.user.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Store role',
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
      {
        accessorFn: (member) => member.status,
        id: 'status',
        header: 'Member status',
        cell: ({ row }) => {
          const isActive = row.original.status === 'active';
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs uppercase font-semibold ${
                isActive
                  ? 'bg-[var(--surface-accent)] text-[var(--status-success)]'
                  : 'bg-[var(--surface-muted)] text-[var(--muted)]'
              }`}
            >
              {row.original.status}
            </span>
          );
        },
      },
    ],
    [currentUser?.sub],
  );
  const mobileColumns = useMemo<ColumnDef<StoreMember>[]>(
    () => [
      {
        accessorFn: (member) => member.user.username,
        id: 'username',
        header: 'Member',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {row.original.user.username}
              {row.original.userId === currentUser?.sub && (
                <span className="ml-1.5 text-[10px] font-semibold text-[var(--accent)]">
                  You
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {row.original.user.email}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                row.original.status === 'active'
                  ? 'bg-[var(--surface-accent)] text-[var(--status-success)]'
                  : 'bg-[var(--surface-muted)] text-[var(--muted)]'
              }`}
            >
              {row.original.status}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Store role',
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
    ],
    [currentUser?.sub],
  );

  const table = useReactTable({
    data: filteredMembers,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (member) => member.id,
  });
  const mobileTable = useReactTable({
    data: filteredMembers,
    columns: mobileColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (member) => member.id,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access control"
        title="Store members"
        description="Manage the people who have access to the active store."
        action={
          <div
            title={
              isStoreAdmin
                ? undefined
                : 'Only a store administrator can add members.'
            }
          >
            <AppButton
              variant="secondary-inverted"
              onClick={openAssign}
              disabled={!isStoreAdmin}
            >
              <Users size={14} />
              <span className="ml-2">Add member</span>
            </AppButton>
          </div>
        }
      />

      <SectionCard
        title="Team access"
        description="Store membership is separate from platform user accounts."
      >
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPagination((page) => ({ ...page, pageIndex: 0 }));
              }}
              placeholder="Search members by username or email…"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter(role);
                  setPagination((page) => ({ ...page, pageIndex: 0 }));
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition active:scale-95 ${
                  roleFilter === role
                    ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40'
                }`}
              >
                {role === 'all' ? 'All' : role.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {membersQuery.isLoading && (
          <div className="mt-6">
            <div className="hidden md:block">
              <TableSkeleton rows={6} cols={4} />
            </div>
            <div className="md:hidden">
              <CardGridSkeleton count={4} />
            </div>
          </div>
        )}

        {membersQuery.isError && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-6 text-center">
            <p className="text-sm font-medium text-[var(--status-danger)]">
              Failed to load store members:{' '}
              {extractApiError(membersQuery.error)}
            </p>
            <AppButton
              variant="secondary"
              onClick={() => void membersQuery.refetch()}
            >
              <RefreshCw size={14} />
              <span className="ml-2">Retry</span>
            </AppButton>
          </div>
        )}

        {membersQuery.isSuccess && (
          <>
            {filteredMembers.length > 0 ? (
              <>
                <UsersTable
                  desktopTable={table}
                  mobileTable={mobileTable}
                  onRowClick={(member) => {
                    setDetailMember(member);
                    setDetailOpen(true);
                  }}
                />
                <UsersPagination table={table} />
              </>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center">
                <UserCircle2 className="mb-3 text-[var(--accent)]" size={28} />
                <p className="font-medium">
                  {members.length === 0
                    ? 'No members have been added to this store.'
                    : 'No members match your search.'}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {members.length === 0
                    ? 'A store administrator can add an existing platform account.'
                    : 'Try a different username, email, or role filter.'}
                </p>
                {(query || roleFilter !== 'all') && (
                  <div className="mt-4">
                    <AppButton
                      variant="secondary"
                      onClick={() => {
                        setQuery('');
                        setRoleFilter('all');
                        setPagination((page) => ({ ...page, pageIndex: 0 }));
                      }}
                    >
                      Clear filters
                    </AppButton>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SectionCard>

      <UserDetailDrawer
        user={detailMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canDisableMember={
          isStoreAdmin && detailMember?.userId !== currentUser?.sub
        }
        isUpdatingMember={isUpdatingMember}
        onRequestMembershipAction={setMembershipAction}
      />

      <AppDialog
        open={Boolean(membershipAction && detailMember)}
        onClose={() => {
          if (!isUpdatingMember) setMembershipAction(null);
        }}
        title={
          membershipAction === 'disable'
            ? 'Disable this member?'
            : 'Enable this member?'
        }
        description={
          membershipAction === 'disable'
            ? `${detailMember?.user.username} will lose access to this store.`
            : `${detailMember?.user.username} will regain access to this store.`
        }
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl bg-[var(--status-pending)]/10 p-3.5">
            {membershipAction === 'disable' ? (
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-[var(--status-pending)]"
                aria-hidden="true"
              />
            ) : (
              <UserRoundPlus
                size={18}
                className="mt-0.5 shrink-0 text-[var(--accent)]"
                aria-hidden="true"
              />
            )}
            <p className="text-sm leading-5 text-[var(--muted)]">
              {membershipAction === 'disable'
                ? 'You can enable this member again later.'
                : 'This restores the member’s access to the store.'}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <AppButton
              variant="secondary"
              onClick={() => setMembershipAction(null)}
              disabled={isUpdatingMember}
            >
              Cancel
            </AppButton>
            <AppButton
              onClick={() => void handleConfirmMembershipAction()}
              disabled={isUpdatingMember || !membershipAction || !detailMember}
            >
              {isUpdatingMember
                ? membershipAction === 'disable'
                  ? 'Disabling...'
                  : 'Enabling...'
                : membershipAction === 'disable'
                  ? 'Confirm disable'
                  : 'Confirm enable'}
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={assignOpen}
        onClose={closeAssign}
        title="Add store member"
        description="Assign an existing platform account to this store."
        size="sm"
      >
        {assignError && (
          <div
            role="alert"
            className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]"
          >
            {assignError}
          </div>
        )}
        <FormField
          label="Platform username"
          htmlFor="assign-platform-username"
          required
        >
          <div ref={assignUsernameFieldRef} className="relative">
            <input
              id="assign-platform-username"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showUsernameSuggestions}
              aria-controls="assign-platform-username-options"
              autoComplete="off"
              value={assignUsername}
              onFocus={() => setIsAssignUsernameFocused(true)}
              onBlur={() => setIsAssignUsernameFocused(false)}
              onChange={(event) => {
                setAssignUsername(event.target.value);
                setSelectedAssignUsername(null);
                if (assignError) setAssignError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleAssignMember();
                }
              }}
              className={inputClass(Boolean(assignError))}
              placeholder="e.g. jane.cashier"
              disabled={isAssigning}
            />
            {showUsernameSuggestions && (
              <div
                id="assign-platform-username-options"
                role="listbox"
                aria-label="Matching platform accounts"
                className="mt-1 max-h-56 w-full overflow-auto rounded-[14px] border border-[var(--accent)]/35 bg-[var(--card)] p-1.5 shadow-[0_0_24px_rgba(0,0,0,0.2),0_0_18px_rgba(88,166,255,0.12)]"
              >
                {!isUsernameSearchReady || usernameSearchQuery.isFetching ? (
                  <p className="px-3 py-2 text-sm text-[var(--muted)]">
                    Searching users…
                  </p>
                ) : usernameSearchQuery.isError ? (
                  <p
                    role="alert"
                    className="px-3 py-2 text-sm text-[var(--status-danger)]"
                  >
                    Unable to search accounts:{' '}
                    {extractApiError(usernameSearchQuery.error)}
                  </p>
                ) : usernameSearchQuery.data?.length ? (
                  usernameSearchQuery.data.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      role="option"
                      aria-selected={selectedAssignUsername === user.username}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setAssignUsername(user.username);
                        setSelectedAssignUsername(user.username);
                        if (assignError) setAssignError(null);
                      }}
                      className={`flex w-full flex-col rounded-[10px] px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                        selectedAssignUsername === user.username
                          ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--accent)]/8 hover:text-[var(--accent)]'
                      }`}
                    >
                      <span className="font-medium">{user.username}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {user.email}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-[var(--muted)]">
                    No platform accounts found.
                  </p>
                )}
              </div>
            )}
          </div>
        </FormField>
        <FormField
          label="Store Role"
          htmlFor="assign-store-role"
          required
          description="The account must already exist. No new user account will be created."
        >
          <Select
            value={assignRole}
            onValueChange={(value) => {
              if (value === 'admin' || value === 'cashier') {
                setAssignRole(value);
              }
            }}
          >
            <SelectTrigger
              id="assign-store-role"
              className={`${inputClass(false)} !h-[52px]`}
              disabled={isAssigning}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="box-border rounded-xl border border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-0"
            >
              {STORE_ROLE_OPTIONS.map((role) => (
                <SelectItem
                  key={role.value}
                  value={role.value}
                  className="rounded-lg px-3 py-2 transition-colors duration-150 data-[highlighted]:bg-[var(--surface-accent)] data-[highlighted]:text-[var(--accent)] focus:bg-[var(--surface-accent)] focus:text-[var(--accent)]"
                >
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="mt-6 flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={closeAssign}
            disabled={isAssigning}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            onClick={() => void handleAssignMember()}
            disabled={isAssigning || !isStoreAdmin}
          >
            <ShieldCheck size={14} />
            <span className="ml-2">
              {isAssigning ? 'Adding…' : 'Add member'}
            </span>
          </AppButton>
        </div>
      </AppDialog>
    </div>
  );
}
