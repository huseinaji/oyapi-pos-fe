import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ShieldCheck,
  PencilLine,
  Trash2,
  Save,
  UserCircle2,
  RefreshCw,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppButton } from '../components/ui/app-button';
import { AppDialog } from '../components/ui/app-dialog';
import { ConfirmDeleteDialog } from '../components/ui/confirm-delete-dialog';
import { PageHeader } from '../components/ui/page-header';
import { RowActions } from '../components/ui/row-actions';
import { SectionCard } from '../components/ui/section-card';
import { AppSelect } from '../components/ui/app-select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TableSkeleton, CardGridSkeleton } from '../components/ui/skeleton';
import { useAuthStore } from '../lib/auth/auth-store';
import { ApiError } from '../lib/api';
import { usersApi } from '../lib/user/users-api';
import type {
  ApiUser,
  ApiUserRole,
  UpdateUserDto,
  ChangePasswordDto,
  SignupDto,
} from '../types/api';
import { useUserStore } from '#lib/user/user-store';
import { FormField } from '#components/layout/form-field';
import { DataTable } from '#components/ui/data-table';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = ['all', 'ADMIN', 'USER', 'CASHIER'] as const;
type RoleFilter = (typeof ROLE_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const isLoading = useUserStore((state) => state.isLoading);
  const storeError = useUserStore((state) => state.error);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const updateUser = useUserStore((state) => state.updateUser);
  const deleteUser = useUserStore((state) => state.deleteUser);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ApiUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<ApiUser | null>(null);
  const [formState, setFormState] = useState<UpdateUserDto>({});
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof UpdateUserDto, string>>
  >({});
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Create user state
  const [createForm, setCreateForm] = useState<SignupDto>({
    username: '',
    email: '',
    password: '',
    role: 'USER',
  });
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<keyof SignupDto, string>>
  >({});
  const [createApiError, setCreateApiError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordDto>({
    currentPassword: '',
    newPassword: '',
  });
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof ChangePasswordDto | 'confirmPassword', string>>
  >({});
  const [passwordApiError, setPasswordApiError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'username', desc: false },
  ]);

  // Fetch on mount
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery = `${user.username} ${user.email}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesQuery && matchesRole;
      }),
    [users, query, roleFilter],
  );

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  const openEdit = (user: ApiUser) => {
    setEditingUser(user);
    setFormState({
      username: user.username,
      email: user.email,
      role: user.role,
    });
    setFormErrors({});
    setFormApiError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
    setFormErrors({});
    setFormApiError(null);
  };

  const openPassword = (user: ApiUser) => {
    setPasswordUser(user);
    setPasswordForm({ currentPassword: '', newPassword: '' });
    setPasswordConfirm('');
    setPasswordErrors({});
    setPasswordApiError(null);
    setPasswordOpen(true);
  };

  const closePassword = () => {
    setPasswordOpen(false);
    setPasswordUser(null);
    setPasswordForm({ currentPassword: '', newPassword: '' });
    setPasswordConfirm('');
    setPasswordErrors({});
    setPasswordApiError(null);
  };

  const openDelete = (user: ApiUser) => {
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeletingUser(null);
  };

  const openCreate = () => {
    setCreateForm({ username: '', email: '', password: '', role: 'USER' });
    setCreateErrors({});
    setCreateApiError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm({ username: '', email: '', password: '', role: 'USER' });
    setCreateErrors({});
    setCreateApiError(null);
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = (): boolean => {
    const next: Partial<Record<keyof UpdateUserDto, string>> = {};
    const username = formState.username?.trim() ?? '';
    const email = formState.email?.trim() ?? '';

    if (!username) next.username = 'Username is required.';
    if (!email) {
      next.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Enter a valid email address.';
    } else {
      const duplicate = users.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.id !== editingUser?.id,
      );
      if (duplicate) next.email = 'This email is already registered.';
    }

    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const validatePassword = (): boolean => {
    const next: Partial<
      Record<keyof ChangePasswordDto | 'confirmPassword', string>
    > = {};

    if (!passwordForm.currentPassword) {
      next.currentPassword = 'Current password is required.';
    }

    if (!passwordForm.newPassword) {
      next.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 8) {
      next.newPassword = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      next.newPassword = 'Password must contain at least one uppercase letter.';
    } else if (!/[a-z]/.test(passwordForm.newPassword)) {
      next.newPassword = 'Password must contain at least one lowercase letter.';
    } else if (!/[0-9]/.test(passwordForm.newPassword)) {
      next.newPassword = 'Password must contain at least one number.';
    }

    if (passwordForm.newPassword !== passwordConfirm) {
      next.confirmPassword = 'Passwords do not match.';
    }

    if (
      passwordForm.currentPassword &&
      passwordForm.newPassword &&
      passwordForm.currentPassword === passwordForm.newPassword
    ) {
      next.newPassword =
        'New password must be different from current password.';
    }

    setPasswordErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateCreate = (): boolean => {
    const next: Partial<Record<keyof SignupDto, string>> = {};
    const username = createForm.username.trim();
    const email = createForm.email.trim();
    const password = createForm.password;

    if (!username) {
      next.username = 'Username is required.';
    }

    if (!email) {
      next.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Enter a valid email address.';
    } else {
      const duplicate = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (duplicate) next.email = 'This email is already registered.';
    }

    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(password)) {
      next.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[a-z]/.test(password)) {
      next.password = 'Password must contain at least one lowercase letter.';
    } else if (!/[0-9]/.test(password)) {
      next.password = 'Password must contain at least one number.';
    }

    setCreateErrors(next);
    return Object.keys(next).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!editingUser || !validate()) return;
    setIsSaving(true);
    setFormApiError(null);
    try {
      const dto: UpdateUserDto = {
        username: formState.username?.trim(),
        email: formState.email?.trim(),
        role: formState.role,
      };
      await updateUser(editingUser.id, dto);
      toast.success('User updated', {
        description: `"${dto.username}" saved.`,
      });
      closeForm();
    } catch (err) {
      setFormApiError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id);
      toast.success('User removed', {
        description: `"${deletingUser.username}" was deleted.`,
      });
      closeDelete();
    } catch (err) {
      toast.error('Failed to delete user', {
        description: extractApiError(err),
      });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUser || !validatePassword()) return;
    setIsChangingPassword(true);
    setPasswordApiError(null);
    try {
      await usersApi.changePassword(passwordUser.id, passwordForm);
      toast.success('Password changed', {
        description: `Password updated for "${passwordUser.username}".`,
      });
      closePassword();
    } catch (err) {
      setPasswordApiError(extractApiError(err));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setIsCreating(true);
    setCreateApiError(null);
    try {
      const dto: SignupDto = {
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      };
      await usersApi.register(dto);
      await fetchUsers(); // Refresh the list
      toast.success('User created', {
        description: `"${dto.username}" has been registered.`,
      });
      closeCreate();
    } catch (err) {
      setCreateApiError(extractApiError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const updateField = <K extends keyof UpdateUserDto>(
    key: K,
    value: UpdateUserDto[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key])
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const isSelf = deletingUser?.id === currentUser?.id;
  const actionsForUser = (user: ApiUser) => [
    { label: 'Edit', icon: PencilLine, onClick: () => openEdit(user) },
    ...(user.role !== 'ADMIN'
      ? [{ label: 'Change Password', icon: KeyRound, onClick: () => openPassword(user) }]
      : []),
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      disabled: user.id === currentUser?.id,
      onClick: () => openDelete(user),
    },
  ];
  const desktopColumns = useMemo<ColumnDef<ApiUser>[]>(() => [
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
              <span className="rounded-full bg-[var(--accent-strong)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">You</span>
            )}
          </div>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-[var(--muted)]">{row.original.email}</span> },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <RoleBadge role={row.original.role} /> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.original.status === 'ACTIVE' ? 'bg-[var(--surface-accent)] text-[var(--status-success)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]'}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: 'Actions',
      cell: ({ row }) => (
        <div onClick={(event) => event.stopPropagation()}>
          <RowActions label={`Actions for ${row.original.username}`} actions={actionsForUser(row.original)} />
        </div>
      ),
    },
  ], [currentUser?.id]);
  const mobileColumns = useMemo<ColumnDef<ApiUser>[]>(() => [
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{row.original.username}</p>
            {row.original.id === currentUser?.id && <span className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">You</span>}
          </div>
          <p className="truncate text-[11px] text-[var(--muted)]">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <RoleBadge role={row.original.role} /> },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right" onClick={(event) => event.stopPropagation()}>
          <RowActions label={`Actions for ${row.original.username}`} actions={actionsForUser(row.original)} />
        </div>
      ),
    },
  ], [currentUser?.id]);
  const desktopTable = useReactTable({
    data: filteredUsers,
    columns: desktopColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (user) => user.id,
  });
  const mobileTable = useReactTable({
    data: filteredUsers,
    columns: mobileColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (user) => user.id,
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access control"
        title="Users"
        description={`${users.length} team members · ${users.filter((u) => u.role === 'ADMIN').length} admins`}
        action={
          <AppButton variant="inverted" onClick={openCreate}>
            <UserPlus size={14} />
            <span className="ml-2">Add User</span>
          </AppButton>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total members</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Admins</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-[var(--heading)]">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cashiers</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {users.filter((u) => u.role === 'CASHIER').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <SectionCard
        title="Team access"
        description="Manage user accounts and roles."
      >
        {/* Search + role filter */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or email…"
              className="w-full bg-transparent outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition active:scale-95 ${roleFilter === role
                  ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                  : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40'
                  }`}
              >
                {role === 'all' ? 'All' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="mt-6">
            <div className="hidden md:block">
              <TableSkeleton rows={6} cols={5} />
            </div>
            <div className="md:hidden">
              <CardGridSkeleton count={4} />
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && storeError && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-6 text-center">
            <p className="text-sm font-medium text-[var(--status-danger)]">
              Failed to load users. Please try again.
            </p>
            <AppButton variant="secondary" onClick={() => void fetchUsers()}>
              <RefreshCw size={14} />
              <span className="ml-2">Retry</span>
            </AppButton>
          </div>
        )}

        {/* Table */}
        {!isLoading && !storeError && (
          <>
            {filteredUsers.length > 0 && (
              <>
                <DataTable
                  table={desktopTable}
                  onRowClick={openEdit}
                  emptyContent="No users found."
                  containerClassName="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--border)] md:block"
                  rowClassName="transition hover:bg-[var(--surface-muted)]/50"
                />
                <DataTable
                  table={mobileTable}
                  onRowClick={openEdit}
                  emptyContent="No users found."
                  containerClassName="mt-3 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] md:hidden"
                  tableClassName="table-fixed"
                  rowClassName="transition hover:bg-[var(--surface-muted)]/60"
                />
              </>
            )}

            {/* Empty state */}
            {filteredUsers.length === 0 && (
              <div className="mt-6 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center">
                <UserCircle2 className="mb-3 text-[var(--accent)]" size={28} />
                <p className="font-medium">No users matched your search.</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Try a different name, email, or role filter.
                </p>
                {(query || roleFilter !== 'all') && (
                  <div className="mt-4">
                    <AppButton
                      variant="secondary"
                      onClick={() => {
                        setQuery('');
                        setRoleFilter('all');
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


      {/* Edit dialog */}
      <AppDialog
        open={formOpen}
        onClose={closeForm}
        title="Edit user"
        description="Update the user's account details."
        size="sm"
      >
        {formApiError && (
          <div className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">
            {formApiError}
          </div>
        )}
        <div className="space-y-4">
          <FormField label="Username" required error={formErrors.username}>
            <input
              value={formState.username ?? ''}
              onChange={(e) => updateField('username', e.target.value)}
              className={inputClass(!!formErrors.username)}
              placeholder="e.g. johndoe"
            />
          </FormField>
          <FormField label="Email" required error={formErrors.email}>
            <input
              type="email"
              value={formState.email ?? ''}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass(!!formErrors.email)}
              placeholder="user@mail.com"
            />
          </FormField>
          <FormField label="Role">
            <AppSelect
              value={formState.role ?? 'USER'}
              onValueChange={(value) =>
                updateField('role', value as ApiUserRole)
              }
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'CASHIER', label: 'CASHIER' },
              ]}
              className={selectClass()}
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={closeForm}
            disabled={isSaving}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            <Save size={14} />
            <span className="ml-2">
              {isSaving ? 'Saving…' : 'Save changes'}
            </span>
          </AppButton>
        </div>
      </AppDialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={closeDelete}
        onConfirm={() => void handleDelete()}
        title="Delete user"
        description="Remove this user from the team?"
        itemName={deletingUser?.username}
        blocked={isSelf}
        blockedReason="You cannot delete your own account while signed in."
      />

      {/* Change Password dialog */}
      <AppDialog
        open={passwordOpen}
        onClose={closePassword}
        title="Change Password"
        description={`Update password for "${passwordUser?.username}"`}
        size="sm"
      >
        {passwordApiError && (
          <div className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">
            {passwordApiError}
          </div>
        )}
        <div className="space-y-4">
          <FormField
            label="Current Password"
            required
            error={passwordErrors.currentPassword}
          >
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => {
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                });
                if (passwordErrors.currentPassword) {
                  setPasswordErrors({
                    ...passwordErrors,
                    currentPassword: undefined,
                  });
                }
              }}
              className={inputClass(!!passwordErrors.currentPassword)}
              placeholder="Enter current password"
            />
          </FormField>
          <FormField
            label="New Password"
            required
            error={passwordErrors.newPassword}
          >
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => {
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                });
                if (passwordErrors.newPassword) {
                  setPasswordErrors({
                    ...passwordErrors,
                    newPassword: undefined,
                  });
                }
              }}
              className={inputClass(!!passwordErrors.newPassword)}
              placeholder="Enter new password"
            />
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              At least 8 characters with uppercase, lowercase, and number.
            </p>
          </FormField>
          <FormField
            label="Confirm New Password"
            required
            error={passwordErrors.confirmPassword}
          >
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors({
                    ...passwordErrors,
                    confirmPassword: undefined,
                  });
                }
              }}
              className={inputClass(!!passwordErrors.confirmPassword)}
              placeholder="Re-enter new password"
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={closePassword}
            disabled={isChangingPassword}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            onClick={() => void handleChangePassword()}
            disabled={isChangingPassword}
          >
            <KeyRound size={14} />
            <span className="ml-2">
              {isChangingPassword ? 'Changing…' : 'Change Password'}
            </span>
          </AppButton>
        </div>
      </AppDialog>

      {/* Create User dialog */}
      <AppDialog
        open={createOpen}
        onClose={closeCreate}
        title="Add New User"
        description="Create a new user account for your team."
        size="sm"
      >
        {createApiError && (
          <div className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">
            {createApiError}
          </div>
        )}
        <div className="space-y-4">
          <FormField label="Username" required error={createErrors.username}>
            <input
              value={createForm.username}
              onChange={(e) => {
                setCreateForm({ ...createForm, username: e.target.value });
                if (createErrors.username) {
                  setCreateErrors({ ...createErrors, username: undefined });
                }
              }}
              className={inputClass(!!createErrors.username)}
              placeholder="e.g. johndoe"
            />
          </FormField>
          <FormField label="Email" required error={createErrors.email}>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => {
                setCreateForm({ ...createForm, email: e.target.value });
                if (createErrors.email) {
                  setCreateErrors({ ...createErrors, email: undefined });
                }
              }}
              className={inputClass(!!createErrors.email)}
              placeholder="user@mail.com"
            />
          </FormField>
          <FormField label="Password" required error={createErrors.password}>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => {
                setCreateForm({ ...createForm, password: e.target.value });
                if (createErrors.password) {
                  setCreateErrors({ ...createErrors, password: undefined });
                }
              }}
              className={inputClass(!!createErrors.password)}
              placeholder="Enter password"
            />
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              At least 8 characters with uppercase, lowercase, and number.
            </p>
          </FormField>
          <FormField label="Role" required>
            <AppSelect
              value={createForm.role}
              onValueChange={(value) =>
                setCreateForm({ ...createForm, role: value as ApiUserRole })
              }
              options={[
                { value: 'CASHIER', label: 'CASHIER' },
                { value: 'USER', label: 'USER' },
              ]}
              className={selectClass()}
            />
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={closeCreate}
            disabled={isCreating}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            onClick={() => void handleCreate()}
            disabled={isCreating}
          >
            <UserPlus size={14} />
            <span className="ml-2">
              {isCreating ? 'Creating…' : 'Create User'}
            </span>
          </AppButton>
        </div>
      </AppDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: ApiUserRole }) {
  const colors: Record<ApiUserRole, string> = {
    ADMIN: 'bg-[var(--surface-accent)] text-[var(--accent)]',
    USER: 'bg-[var(--surface-muted)] text-[var(--muted)]',
    CASHIER: 'bg-[var(--status-pending)]/15 text-[var(--status-pending)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[role]}`}
    >
      <ShieldCheck size={11} />
      {role}
    </span>
  );
}




function inputClass(hasError: boolean) {
  return `w-full rounded-[12px] border bg-[var(--surface-muted)] px-4 py-3 text-sm outline-none transition focus:ring-2 ${hasError
    ? 'border-[var(--status-danger)] focus:ring-[var(--status-danger)]/15'
    : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15'
    }`;
}

function selectClass() {
  return 'w-full rounded-[12px] bg-[var(--surface-muted)]';
}
