import type { Table as TanStackTable } from '@tanstack/react-table';
import { TanStackTablePagination } from '@/components/ui/tanstack-table-pagination';
import type { ApiItem } from '@/lib/product/product-types';

type ItemsPaginationProps = {
  desktopTable: TanStackTable<ApiItem>;
  mobileTable: TanStackTable<ApiItem>;
};

export function ItemsPagination({
  desktopTable,
  mobileTable,
}: ItemsPaginationProps) {
  if (desktopTable.getPageCount() <= 1) return null;

  return (
    <div className="mt-3 border-t border-[var(--border)] px-3 md:px-4">
      <div className="hidden md:block">
        <TanStackTablePagination
          table={desktopTable}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>
      <div className="md:hidden">
        <TanStackTablePagination
          table={mobileTable}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>
    </div>
  );
}
