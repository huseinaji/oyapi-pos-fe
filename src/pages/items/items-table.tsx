import type { Table as TanStackTable } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { ApiItem } from '@/lib/product/product-types';

type ItemsTableProps = {
  desktopTable: TanStackTable<ApiItem>;
  mobileTable: TanStackTable<ApiItem>;
  onRowClick: (item: ApiItem) => void;
};

export function ItemsTable({
  desktopTable,
  mobileTable,
  onRowClick,
}: ItemsTableProps) {
  return (
    <>
      <DataTable
        table={desktopTable}
        onRowClick={onRowClick}
        containerClassName="hidden md:block"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
      <DataTable
        table={mobileTable}
        onRowClick={onRowClick}
        containerClassName="md:hidden"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
    </>
  );
}
