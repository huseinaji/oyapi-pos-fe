import { useMemo, useState } from 'react';
import {
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle2,
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
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { TableSkeleton, CardGridSkeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/auth/auth-store';
import { ApiError } from '@/lib/api';
import {
  useAssignStoreMemberMutation,
  useStoreMembersQuery,
} from '@/lib/stores/store-store';
import { usersApi } from '@/lib/user/users-api';
import type { StoreMember } from '@/lib/stores/store-types';
import { UsersPagination } from './users-pagination';
import { UsersTable } from './users-table';
import { UserDetailDrawer } from './user-detail-drawer';

const ROLE_OPTIONS = ['all', 'ADMIN', 'USER', 'CASHIER'] as const;
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
  return `w-full rounded-[12px] border bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:ring-2 ${
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
  const members = membersQuery.data ?? [];

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUsername, setAssignUsername] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [detailMember, setDetailMember] = useState<StoreMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'username', desc: false },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const currentMember = members.find((member) => member.id === currentUser?.id);
  const isStoreAdmin = currentMember
    ? currentMember.role === 'ADMIN'
    : currentUser?.store?.role === 'ADMIN';

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        !normalizedQuery ||
        `${member.username} ${member.email}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [members, query, roleFilter]);

  const openAssign = () => {
    setAssignUsername('');
    setAssignError(null);
    setAssignOpen(true);
  };

  const closeAssign = () => {
    if (isAssigning) return;
    setAssignOpen(false);
    setAssignUsername('');
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
      if (members.some((member) => member.id === user.id)) {
        setAssignError(`"${user.username}" is already a member of this store.`);
        return;
      }

      await assignMutation.mutateAsync(user.id);
      toast.success('Member added', {
        description: `"${user.username}" now has access to this store.`,
      });
      setAssignOpen(false);
      setAssignUsername('');
    } catch (error) {
      setAssignError(extractApiError(error));
    } finally {
      setIsAssigning(false);
    }
  };

  const columns = useMemo<ColumnDef<StoreMember>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Member',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-accent)] text-xs font-semibold text-[var(--accent)]">
              {row.original.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.username}</span>
              {row.original.id === currentUser?.id && (
                <span className="rounded-full bg-[var(--accent-strong)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  You
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Store role',
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
      {
        accessorKey: 'status',
        header: 'Account status',
        cell: ({ row }) =>
          row.original.status ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                row.original.status === 'ACTIVE'
                  ? 'bg-[var(--surface-accent)] text-[var(--status-success)]'
                  : 'bg-[var(--surface-muted)] text-[var(--muted)]'
              }`}
            >
              {row.original.status}
            </span>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      },
    ],
    [currentUser?.id],
  );
  const mobileColumns = useMemo<ColumnDef<StoreMember>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Member',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {row.original.username}
              {row.original.id === currentUser?.id && (
                <span className="ml-1.5 text-[10px] font-semibold text-[var(--accent)]">
                  You
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Store role',
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
      },
    ],
    [currentUser?.id],
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
                {role === 'all' ? 'All' : role}
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
      />

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
          required
        >
          <input
            autoComplete="username"
            value={assignUsername}
            onChange={(event) => {
              setAssignUsername(event.target.value);
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
        </FormField>
        <FormField
          label="Store Role"
          required
          description="The account must already exist. No new user account will be created."
        >
          <input
            autoComplete="role"
            value={assignUsername}
            onChange={(event) => {
              setAssignUsername(event.target.value);
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
