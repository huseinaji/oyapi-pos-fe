import type { Table as TanStackTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination';

type TablePaginationProps<TData> = {
  table: TanStackTable<TData>;
  hideWhenSinglePage?: boolean;
  className?: string;
  pagination?: { pageIndex: number; pageSize: number };
  totalItems?: number;
  onPageChange?: (pageIndex: number) => void;
};

export function TablePagination<TData>({
  table,
  hideWhenSinglePage = false,
  className = '',
  pagination,
  totalItems: totalItemsOverride,
  onPageChange,
}: TablePaginationProps<TData>) {
  const { pageIndex, pageSize } = pagination ?? table.getState().pagination;
  const totalItems = totalItemsOverride ?? table.getRowCount();
  const pageCount =
    pagination || totalItemsOverride !== undefined
      ? Math.ceil(totalItems / pageSize)
      : table.getPageCount();
  const currentPage = pageIndex + 1;
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalItems);
  const canPreviousPage = onPageChange
    ? pageIndex > 0
    : table.getCanPreviousPage();
  const canNextPage = onPageChange
    ? pageIndex < pageCount - 1
    : table.getCanNextPage();
  const changePage = (nextPageIndex: number) => {
    if (onPageChange) {
      onPageChange(nextPageIndex);
      return;
    }

    table.setPageIndex(nextPageIndex);
  };

  if (hideWhenSinglePage && pageCount <= 1) return null;

  const visiblePages: (number | 'ellipsis')[] =
    pageCount <= 3
      ? Array.from({ length: pageCount }, (_, index) => index + 1)
      : currentPage <= 2
        ? [1, 2, 'ellipsis']
        : currentPage >= pageCount - 1
          ? ['ellipsis', pageCount - 1, pageCount]
          : [
              'ellipsis',
              currentPage - 1,
              currentPage,
              currentPage + 1,
              'ellipsis',
            ];

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-1 py-4 ${className}`}
    >
      <p
        className="whitespace-nowrap text-sm text-[var(--muted)]"
        aria-live="polite"
      >
        Showing {start} to {end} of {totalItems} entries
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <Button
              variant="ghost"
              className="gap-1 px-2 text-[var(--muted)] disabled:opacity-50 sm:px-3"
              onClick={() => changePage(pageIndex - 1)}
              disabled={!canPreviousPage}
              aria-label="Go to previous page"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span>Previous</span>
            </Button>
          </PaginationItem>

          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <Button
                  size="icon"
                  variant="ghost"
                  className={
                    page === currentPage
                      ? 'bg-[var(--accent)] text-white hover:bg-[var(--foreground)]/90 hover:text-white'
                      : 'bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)]'
                  }
                  onClick={() => changePage(page - 1)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </Button>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <Button
              variant="ghost"
              className="gap-1 px-2 text-[var(--foreground)] disabled:opacity-50 sm:px-3"
              onClick={() => changePage(pageIndex + 1)}
              disabled={!canNextPage}
              aria-label="Go to next page"
            >
              <span>Next</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
