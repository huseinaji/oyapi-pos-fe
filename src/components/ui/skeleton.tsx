function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Single shimmer block. Width/height controlled by className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[8px] bg-[var(--border)]',
        className,
      )}
    />
  );
}

// ── Pre-built skeletons ───────────────────────────────────────────────────────

/** Mimics the PageHeader band */
export function PageHeaderSkeleton() {
  return (
    <div className="rounded-[16px] bg-[var(--band-bg)] px-5 py-5 opacity-60">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

/** Mimics the 3-col summary tiles row */
export function SummaryTilesSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div
      className={`grid gap-4 ${cols === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Mimics a standard data table with N rows */
export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)]">
      {/* thead */}
      <div className="flex gap-4 bg-[var(--surface-muted)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-24' : 'w-16'}`} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3.5"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className={`h-3 ${
                col === 0
                  ? 'w-28'
                  : col === cols - 1
                    ? 'w-8 rounded-full'
                    : 'w-20'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Mimics a grid of mobile cards */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-3 flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mimics the POS product catalog grid. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-full" />
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton: header + summary tiles + search bar + table */
export function PageTableSkeleton({
  summaryTiles = 0,
  tableRows = 6,
  tableCols = 5,
}: {
  summaryTiles?: number;
  tableRows?: number;
  tableCols?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {summaryTiles > 0 && <SummaryTilesSkeleton cols={summaryTiles} />}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
        {/* search bar */}
        <Skeleton className="h-10 w-full max-w-sm rounded-full" />
        <div className="mt-4 hidden md:block">
          <TableSkeleton rows={tableRows} cols={tableCols} />
        </div>
        <div className="mt-4 md:hidden">
          <CardGridSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
