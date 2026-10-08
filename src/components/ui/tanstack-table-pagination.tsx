import { useId } from 'react';
import type { Table as TanStackTable } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from './button';
import { Label } from './label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from './pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

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
  const id = useId();
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalItems = table.getRowCount();
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalItems);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 py-3', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-xs text-[var(--muted)] max-sm:sr-only">
          Rows per page
        </Label>
        <Select
          items={pageSizeOptions.map((size) => ({ label: String(size), value: String(size) }))}
          value={String(pageSize)}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger id={id} className="h-9 w-fit min-w-16 whitespace-nowrap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="p-1">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-[var(--muted)]" aria-live="polite">
        <span className="font-medium text-[var(--foreground)]">{start}-{end}</span>{' '}
        of <span className="font-medium text-[var(--foreground)]">{totalItems}</span>
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
            >
              <ChevronsLeft aria-hidden="true" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
            >
              <ChevronsRight aria-hidden="true" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}