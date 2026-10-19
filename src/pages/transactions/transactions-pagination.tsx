import { useId } from 'react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TransactionsPaginationProps = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type VisiblePage = number | 'ellipsis';

function getVisiblePages(
  currentPage: number,
  pageCount: number,
  compact: boolean,
): VisiblePage[] {
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

export function TransactionsPagination({
  pageIndex,
  pageSize,
  totalItems,
  onPageIndexChange,
  onPageSizeChange,
}: TransactionsPaginationProps) {
  const pageSizeId = useId();
  const pageCount = Math.ceil(totalItems / pageSize);
  const currentPage = pageCount === 0 ? 0 : pageIndex + 1;
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalItems);
  const desktopPages = getVisiblePages(currentPage, pageCount, false);
  const mobilePages = getVisiblePages(currentPage, pageCount, true);

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
            onClick={() => onPageIndexChange(page - 1)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
          >
            {page}
          </Button>
        </PaginationItem>
      ),
    );

  return (
    <div className="flex flex-col items-center gap-3 px-1 py-4 sm:flex-row sm:justify-between">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor={pageSizeId}
            className="whitespace-nowrap text-sm text-[var(--muted)]"
          >
            Show
          </label>
          <Select
            items={[10, 25, 50].map((size) => ({
              label: String(size),
              value: String(size),
            }))}
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value) onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger
              id={pageSizeId}
              className="h-9 w-fit min-w-16 whitespace-nowrap"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="p-1">
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p
          className="text-xs text-[var(--muted)] sm:whitespace-nowrap sm:text-sm"
          aria-live="polite"
        >
          Showing {start} to {end} of {totalItems} entries
        </p>
      </div>

      <Pagination className="mx-0 w-full justify-center sm:w-auto">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <Button
              variant="ghost"
              className="gap-1 px-2 text-[var(--muted)] disabled:opacity-50 sm:px-3"
              onClick={() => onPageIndexChange(pageIndex - 1)}
              disabled={pageIndex <= 0}
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
              onClick={() => onPageIndexChange(pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
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
