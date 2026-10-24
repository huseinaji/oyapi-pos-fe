import type {
  PaginationState,
  Table as TanStackTable,
} from '@tanstack/react-table';
import { TablePagination } from '@/components/ui/table-pagination';
import type { ApiItem } from '@/lib/product/product-types';

type ItemsPaginationProps = {
  desktopTable: TanStackTable<ApiItem>;
  mobileTable: TanStackTable<ApiItem>;
  pagination: PaginationState;
  totalItems: number;
  onPageChange: (pageIndex: number) => void;
};

export function ItemsPagination({
  desktopTable,
  mobileTable,
  pagination,
  totalItems,
  onPageChange,
}: ItemsPaginationProps) {
  return (
    <div className="mt-3 border-t border-[var(--border)] px-3 md:px-4">
      <div className="hidden md:block">
        <TablePagination
          table={desktopTable}
          pagination={pagination}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      </div>
      <div className="md:hidden">
        <TablePagination
          table={mobileTable}
          pagination={pagination}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
