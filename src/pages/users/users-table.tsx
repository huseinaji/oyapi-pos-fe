import type { Table as TanStackTable } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { StoreMember } from '@/lib/stores/store-types';

type UsersTableProps = {
  desktopTable: TanStackTable<StoreMember>;
  mobileTable: TanStackTable<StoreMember>;
  onRowClick: (user: StoreMember) => void;
};

export function UsersTable({
  desktopTable,
  mobileTable,
  onRowClick,
}: UsersTableProps) {
  return (
    <>
      <DataTable
        table={desktopTable}
        onRowClick={onRowClick}
        emptyContent="No users found."
        containerClassName="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--border)] md:block"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)]/50 focus-visible:bg-[var(--surface-muted)]/50"
      />
      <DataTable
        table={mobileTable}
        onRowClick={onRowClick}
        emptyContent="No users found."
        containerClassName="mt-3 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] md:hidden"
        tableClassName="table-fixed"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)]/60 focus-visible:bg-[var(--surface-muted)]/60"
      />
    </>
  );
}
