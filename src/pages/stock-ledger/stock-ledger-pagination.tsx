import type { Table as TanStackTable } from '@tanstack/react-table';
import { TablePagination } from '@/components/ui/table-pagination';

type StockLedgerPaginationProps<TData> = {
  table: TanStackTable<TData>;
};

export function StockLedgerPagination<TData>({
  table,
}: StockLedgerPaginationProps<TData>) {
  return <TablePagination table={table} />;
}
