import type { Table as TanStackTable } from '@tanstack/react-table';
import { TanStackTablePagination } from '@/components/ui/tanstack-table-pagination';
import type { StoreMember } from '@/lib/stores/store-types';

type UsersPaginationProps = {
  table: TanStackTable<StoreMember>;
};

export function UsersPagination({ table }: UsersPaginationProps) {
  if (table.getPageCount() <= 1) return null;

  return (
    <div className="mt-3 border-t border-[var(--border)] px-3 md:px-4">
      <TanStackTablePagination table={table} pageSizeOptions={[10, 25, 50]} />
    </div>
  );
}
