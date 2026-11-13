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
    <div className="w-full border-t border-[var(--border)]">
      <DataTable
        table={desktopTable}
        onRowClick={onRowClick}
        containerClassName="hidden md:block w-full"
        tableClassName="[&_th]:border-b [&_th]:border-[var(--border)] [&_td]:border-b [&_td]:border-[var(--border)] [&_tr]:border-b [&_tr]:border-[var(--border)]/[0.5]"
        headerClassName="[&_th]:bg-[var(--surface-muted)]"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
      <DataTable
        table={mobileTable}
        onRowClick={onRowClick}
        containerClassName="md:hidden w-full"
        tableClassName="[&_th]:border-b [&_th]:border-[var(--border)] [&_td]:border-b [&_td]:border-[var(--border)]"
        rowClassName="transition-colors duration-200 hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"
      />
    </div>
  );
}
