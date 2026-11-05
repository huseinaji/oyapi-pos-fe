import type { Table as TanStackTable } from '@tanstack/react-table';
import { TablePagination } from './table-pagination';

type TanStackTablePaginationProps<TData> = {
  table: TanStackTable<TData>;
  pageSizeOptions?: readonly number[];
  className?: string;
};

export function TanStackTablePagination<TData>({
  table,
  pageSizeOptions = [10, 25, 50],
  className,
}: TanStackTablePaginationProps<TData>) {
  return (
    <TablePagination
      table={table}
      pageSizeOptions={pageSizeOptions}
      className={className}
    />
  );
}
