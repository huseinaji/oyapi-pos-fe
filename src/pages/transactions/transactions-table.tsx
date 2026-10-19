import type { Table as TanStackTable } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';

type TransactionsTableProps<T> = {
  desktopTable: TanStackTable<T>;
  mobileTable: TanStackTable<T>;
  onRowClick: (transaction: T) => void;
};

export function TransactionsTable<T>({
  desktopTable,
  mobileTable,
  onRowClick,
}: TransactionsTableProps<T>) {
  return (
    <>
      <DataTable
        table={desktopTable}
        onRowClick={onRowClick}
        containerClassName="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--border)] md:block"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
      <DataTable
        table={mobileTable}
        onRowClick={onRowClick}
        containerClassName="mt-3 w-full overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] md:hidden"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
    </>
  );
}
