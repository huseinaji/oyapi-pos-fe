import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { AppSelect } from './app-select';

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const from = Math.min((page - 1) * pageSize + 1, totalItems);
  const to = Math.min(page * pageSize, totalItems);

  // Build page number window: always show first, last, current ±1
  const pages = buildPageWindow(page, totalPages);

  const btnBase =
    'flex h-8 w-8 items-center justify-center rounded-full border text-sm transition active:scale-95';
  const btnActive =
    'border-[var(--accent)] bg-[var(--surface-accent)] font-semibold text-[var(--accent)]';
  const btnInactive =
    'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]';
  const btnDisabled =
    'border-[var(--border)] text-[var(--muted)] opacity-40 cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm">
      {/* Left: count */}
      <p className="text-[var(--muted)]">
        {totalItems === 0 ? 'No results' : `${from}–${to} of ${totalItems}`}
      </p>

      {/* Centre: page buttons */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
          className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 w-8 items-center justify-center text-[var(--muted)]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={page === p ? 'page' : undefined}
              className={`${btnBase} ${page === p ? btnActive : btnInactive}`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
        >
          <ChevronRight size={14} />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
        >
          <ChevronsRight size={14} />
        </button>
      </div>

      {/* Right: page size picker */}
      {onPageSizeChange && (
        <label className="flex items-center gap-2 text-[var(--muted)]">
          Rows
          <AppSelect
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            aria-label="Rows per page"
            className="w-24"
          />
        </label>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function buildPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) set.add(p);
  }

  const sorted = [...set].sort((a, b) => a - b);
  const result: (number | '…')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }

  return result;
}
