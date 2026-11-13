import { useId } from 'react';
import type { Table as TanStackTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TablePaginationBaseProps = {
  hideWhenSinglePage?: boolean;
  className?: string;
  pagination?: { pageIndex: number; pageSize: number };
  totalItems?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
};

type TablePaginationProps<TData> = TablePaginationBaseProps &
  (
    | { table: TanStackTable<TData> }
    | {
        table?: never;
        pagination: { pageIndex: number; pageSize: number };
        totalItems: number;
        onPageChange: (pageIndex: number) => void;
        onPageSizeChange: (pageSize: number) => void;
      }
  );

type VisiblePage = number | 'ellipsis';

function getVisiblePages(
  currentPage: number,
  pageCount: number,
  compact: boolean,
): VisiblePage[] {
  if (pageCount <= 0) return [];
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (compact) {
    if (currentPage <= 2) return [1, 2, 'ellipsis', pageCount];
    if (currentPage >= pageCount - 1) {
      return [1, 'ellipsis', pageCount - 1, pageCount];
    }
    return [1, 'ellipsis', currentPage, 'ellipsis', pageCount];
  }

  if (currentPage <= 3) return [1, 2, 3, 4, 'ellipsis', pageCount];
  if (currentPage >= pageCount - 2) {
    return [
      1,
      'ellipsis',
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ];
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    pageCount,
  ];
}

export function TablePagination<TData>({
  table,
  hideWhenSinglePage = false,
  className = '',
  pagination,
  totalItems: totalItemsOverride,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: TablePaginationProps<TData>) {
  const pageSizeId = useId();
  const tablePagination = table?.getState().pagination;
  const pageIndex = pagination?.pageIndex ?? tablePagination?.pageIndex ?? 0;
  const pageSize = pagination?.pageSize ?? tablePagination?.pageSize ?? 10;
  const totalItems = totalItemsOverride ?? table?.getRowCount() ?? 0;
  const pageCount =
    pagination || totalItemsOverride !== undefined
      ? Math.ceil(totalItems / pageSize)
      : (table?.getPageCount() ?? 0);
  const currentPage = pageCount === 0 ? 0 : pageIndex + 1;
  const canPreviousPage = onPageChange
    ? pageIndex > 0
    : (table?.getCanPreviousPage() ?? false);
  const canNextPage = onPageChange
    ? pageIndex < pageCount - 1
    : (table?.getCanNextPage() ?? false);
  const changePage = (nextPageIndex: number) => {
    if (onPageChange) {
      onPageChange(nextPageIndex);
      return;
    }

    table?.setPageIndex(nextPageIndex);
  };
  const changePageSize = (nextPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
      return;
    }

    table?.setPageSize(nextPageSize);
  };

  if (hideWhenSinglePage && pageCount <= 1) return null;

  const renderPageButtons = (pages: VisiblePage[], breakpointClass: string) =>
    pages.map((page, index) =>
      page === 'ellipsis' ? (
        <PaginationItem
          key={`${breakpointClass}-ellipsis-${index}`}
          className={breakpointClass}
        >
          <PaginationEllipsis />
        </PaginationItem>
      ) : (
        <PaginationItem
          key={`${breakpointClass}-page-${page}`}
          className={breakpointClass}
        >
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
    );
  const desktopPages = getVisiblePages(currentPage, pageCount, false);
  const mobilePages = getVisiblePages(currentPage, pageCount, true);

  return (
    <div
      className={`flex flex-col items-center gap-3 px-1 py-4 sm:flex-row sm:justify-between ${className}`}
    >
      <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-start sm:gap-4">
        <label
          htmlFor={pageSizeId}
          className="whitespace-nowrap text-sm text-[var(--muted)]"
        >
          Show
        </label>
        
        <Select
          items={pageSizeOptions.map((size) => ({
            label: String(size),
            value: String(size),
          }))}
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value) changePageSize(Number(value));
          }}
        >
          <SelectTrigger
            id={pageSizeId}
            className="h-9 min-w-16 border-[var(--border)] bg-[var(--card)]"
            aria-label="Rows per page"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectGroup>
              <SelectLabel>Row per page</SelectLabel>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Pagination className="mx-0 w-full justify-center sm:w-auto">
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
              <span className="hidden sm:inline">Previous</span>
            </Button>
          </PaginationItem>

          {renderPageButtons(mobilePages, 'sm:hidden')}
          {renderPageButtons(desktopPages, 'hidden sm:block')}

          <PaginationItem>
            <Button
              variant="ghost"
              className="gap-1 px-2 text-[var(--foreground)] disabled:opacity-50 sm:px-3"
              onClick={() => changePage(pageIndex + 1)}
              disabled={!canNextPage}
              aria-label="Go to next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
