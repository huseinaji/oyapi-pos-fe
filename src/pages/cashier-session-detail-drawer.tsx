import { useEffect, useMemo, useState, type TransitionEvent } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogIn,
  LogOut,
  Package,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CashierSession } from '@/lib/cashier-sessions/cashier-sessions-types';
import { useTransactionsQuery } from '@/lib/transaction/transaction-store';
import { formatRp } from '@/lib/transaction-utils';

export type SessionClosingMockData = {
  actualStockByItem: Record<string, number>;
  actualCash: number;
  recordedAt: string;
};

type SessionClosingInput = Omit<SessionClosingMockData, 'recordedAt'>;

type CashierSessionDetailDrawerProps = {
  session: CashierSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAnimationEnd: () => void;
  canClose: boolean;
  isClosing: boolean;
  mockClosingData?: SessionClosingMockData;
  onCloseSession: (values: SessionClosingInput) => void;
};

type SessionStockRow = {
  itemId: string;
  name: string;
  uom: string;
  openingQty: number;
  soldQuantity?: number;
  expectedFinalQty?: number;
  closingQty?: number;
};

const SESSION_ITEMS_PAGE_SIZE = 5;

function filterStockRows(rows: SessionStockRow[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter(
    (row) =>
      row.name.toLocaleLowerCase().includes(normalizedQuery) ||
      row.itemId.toLocaleLowerCase().includes(normalizedQuery),
  );
}

function getStockPageCount(totalItems: number) {
  return Math.max(1, Math.ceil(totalItems / SESSION_ITEMS_PAGE_SIZE));
}

function getStockPage(rows: SessionStockRow[], page: number) {
  const start = page * SESSION_ITEMS_PAGE_SIZE;
  return rows.slice(start, start + SESSION_ITEMS_PAGE_SIZE);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

function buildStockRows(session: CashierSession): SessionStockRow[] {
  const closingStockByItem = new Map(
    (session.closingStock ?? []).map((item) => [item.itemId, item.quantity]),
  );

  return session.openingStock.map((item) => ({
    itemId: item.itemId,
    name: item.itemName,
    uom: item.uom,
    openingQty: item.quantity,
    soldQuantity: item.soldQuantity,
    expectedFinalQty:
      item.soldQuantity === undefined
        ? undefined
        : item.quantity - item.soldQuantity,
    closingQty: closingStockByItem.get(item.itemId),
  }));
}

function formatQuantity(value: number, uom: string) {
  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(value)} ${uom}`;
}

function getStockVariance(expectedQty?: number, actualQty?: number, uom = '') {
  if (expectedQty === undefined || actualQty === undefined) return null;
  const difference = Number((actualQty - expectedQty).toFixed(2));

  if (difference === 0) {
    return { label: 'On target', className: 'text-[var(--status-success)]' };
  }

  return {
    label: `${difference > 0 ? '+' : '-'}${formatQuantity(Math.abs(difference), uom)} ${difference > 0 ? 'over' : 'short'}`,
    className: 'text-[var(--status-pending)]',
  };
}

function getActualStock(
  row: SessionStockRow,
  mockClosingData?: SessionClosingMockData,
) {
  return mockClosingData?.actualStockByItem[row.itemId] ?? row.closingQty;
}

export function CashierSessionDetailDrawer({
  session,
  open,
  onOpenChange,
  onCloseAnimationEnd,
  canClose,
  isClosing,
  mockClosingData,
  onCloseSession,
}: CashierSessionDetailDrawerProps) {
  const isMobile = useIsMobile();
  const [actualStockByItem, setActualStockByItem] = useState<
    Record<string, string>
  >({});
  const [actualCash, setActualCash] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPage, setItemPage] = useState(0);
  const [closingItemSearch, setClosingItemSearch] = useState('');
  const [closingItemPage, setClosingItemPage] = useState(0);
  const [closingDialogStep, setClosingDialogStep] = useState<
    'closed' | 'count' | 'confirm'
  >('closed');
  const transactionsQuery = useTransactionsQuery({ posSessionId: session?.id });
  const stockRows = useMemo(
    () => (session ? buildStockRows(session) : []),
    [session],
  );
  const filteredStockRows = useMemo(
    () => filterStockRows(stockRows, itemSearch),
    [itemSearch, stockRows],
  );
  const visibleStockRows = useMemo(
    () => getStockPage(filteredStockRows, itemPage),
    [filteredStockRows, itemPage],
  );
  const filteredClosingStockRows = useMemo(
    () => filterStockRows(stockRows, closingItemSearch),
    [closingItemSearch, stockRows],
  );
  const visibleClosingStockRows = useMemo(
    () => getStockPage(filteredClosingStockRows, closingItemPage),
    [closingItemPage, filteredClosingStockRows],
  );
  const countedItems = stockRows.reduce(
    (count, row) =>
      actualStockByItem[row.itemId]?.trim() &&
      Number.isFinite(Number(actualStockByItem[row.itemId])) &&
      Number(actualStockByItem[row.itemId]) >= 0
        ? count + 1
        : count,
    0,
  );
  const salesSummary = useMemo(
    () =>
      (transactionsQuery.data ?? [])
        .filter((transaction) => transaction.status === 'complete')
        .reduce(
          (summary, transaction) => {
            summary.total += transaction.total;
            summary[transaction.paymentMethod] += transaction.total;
            return summary;
          },
          { total: 0, cash: 0, qris: 0 },
        ),
    [transactionsQuery.data],
  );

  useEffect(() => {
    setActualStockByItem({});
    setActualCash('');
    setValidationError(null);
    setClosingDialogStep('closed');
    setItemSearch('');
    setItemPage(0);
    setClosingItemSearch('');
    setClosingItemPage(0);
  }, [session?.id, open]);

  const reviewClosingCounts = () => {
    if (!session) return;

    for (const [index, row] of stockRows.entries()) {
      const value = actualStockByItem[row.itemId]?.trim() ?? '';
      const quantity = Number(value);
      if (value === '' || !Number.isFinite(quantity) || quantity < 0) {
        setClosingItemSearch('');
        setClosingItemPage(Math.floor(index / SESSION_ITEMS_PAGE_SIZE));
        setValidationError(`Enter a valid real stock count for ${row.name}.`);
        return;
      }
    }

    const cashValue = actualCash.trim();
    const cashAmount = Number(cashValue);
    if (cashValue === '' || !Number.isFinite(cashAmount) || cashAmount < 0) {
      setValidationError('Enter the actual cash counted before closing.');
      return;
    }

    setValidationError(null);
    setClosingDialogStep('confirm');
  };

  const confirmClosing = () => {
    if (!session) return;

    onCloseSession({
      actualStockByItem: Object.fromEntries(
        stockRows.map((row) => [
          row.itemId,
          Number(actualStockByItem[row.itemId]),
        ]),
      ),
      actualCash: Number(actualCash),
    });
  };

  const handleDrawerTransitionEnd = (
    event: TransitionEvent<HTMLDivElement>,
  ) => {
    if (
      !open &&
      closingDialogStep === 'closed' &&
      event.target === event.currentTarget &&
      (event.propertyName === 'transform' || event.propertyName === 'opacity')
    ) {
      onCloseAnimationEnd();
    }
  };

  const isOpenSession = session?.status === 'OPEN';
  const showRecordedStock = Boolean(
    mockClosingData || session?.closingStock?.length,
  );

  return (
    <>
      <Drawer
        open={open && closingDialogStep === 'closed'}
        onOpenChange={onOpenChange}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent
          className="w-full md:w-[min(42rem,88vw)]"
          onTransitionEnd={handleDrawerTransitionEnd}
        >
          {session && (
            <>
              <DrawerHeader className="gap-3 px-5 pt-5 ">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-left font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                      Cashier session
                    </p>
                    <DrawerTitle className="mt-1 truncate text-left text-lg font-semibold text-[var(--foreground)]">
                      Session {session.id.slice(0, 8)}
                    </DrawerTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label="Close cashier session details"
                  >
                    <X size={16} />
                  </button>
                </div>
                <DrawerDescription className="flex flex-wrap items-center gap-2 text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isOpenSession
                        ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                        : 'bg-[var(--surface-muted)] text-[var(--muted)]'
                    }`}
                  >
                    {isOpenSession ? (
                      <Package size={13} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={13} aria-hidden="true" />
                    )}
                    {isOpenSession ? 'Open' : 'Closed'}
                  </span>
                  <span>
                    {session.openingStock.length} tracked{' '}
                    {session.openingStock.length === 1 ? 'item' : 'items'}
                  </span>
                </DrawerDescription>
              </DrawerHeader>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                <dl className="grid gap-x-5 gap-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 sm:grid-cols-2">
                  <SessionInfo
                    icon={LogIn}
                    label="Opened"
                    value={formatDate(session.openedAt)}
                  />
                  <SessionInfo
                    icon={FileText}
                    label="Opened by"
                    value={session.openedBy.username}
                  />
                  <SessionInfo
                    icon={LogOut}
                    label="Closed"
                    value={formatDate(session.closedAt)}
                  />
                  <SessionInfo
                    icon={CalendarClock}
                    label="Closed by"
                    value={session.closer?.username ?? 'Not closed'}
                  />
                </dl>

                {transactionsQuery.isError ? (
                  <p
                    className="text-sm text-[var(--status-danger)]"
                    role="alert"
                  >
                    Unable to load session sales:{' '}
                    {transactionsQuery.error instanceof Error
                      ? transactionsQuery.error.message
                      : 'Please try again.'}
                  </p>
                ) : (
                  <section aria-label="Session revenue summary">
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <div className="bg-[var(--band-bg)] px-4 py-4 text-[var(--band-text)]">
                        <p className="text-xs font-medium text-[var(--band-text-muted)]">
                          Total sales
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                          {transactionsQuery.isLoading
                            ? 'Loading...'
                            : formatRp(salesSummary.total)}
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 divide-x divide-[var(--border)] bg-[var(--card)]">
                        {[
                          { label: 'Cash sales', value: salesSummary.cash },
                          { label: 'QRIS sales', value: salesSummary.qris },
                        ].map((item) => (
                          <div key={item.label} className="px-4 py-3">
                            <dt className="text-xs text-[var(--muted)]">
                              {item.label}
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[var(--foreground)]">
                              {transactionsQuery.isLoading
                                ? 'Loading...'
                                : formatRp(item.value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--foreground)]">
                        Session items
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Compare starting stock with sales and expected stock.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                      {stockRows.length}{' '}
                      {stockRows.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative w-full sm:max-w-xs">
                        <Search
                          size={15}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                          aria-hidden="true"
                        />
                        <Input
                          value={itemSearch}
                          onChange={(event) => {
                            setItemSearch(event.target.value);
                            setItemPage(0);
                          }}
                          placeholder="Search session items"
                          aria-label="Search session items"
                          className="h-10 rounded-full pl-9"
                        />
                      </div>
                      <p
                        className="text-xs text-[var(--muted)]"
                        aria-live="polite"
                      >
                        Showing{' '}
                        {filteredStockRows.length === 0
                          ? 0
                          : itemPage * SESSION_ITEMS_PAGE_SIZE + 1}
                        –
                        {Math.min(
                          (itemPage + 1) * SESSION_ITEMS_PAGE_SIZE,
                          filteredStockRows.length,
                        )}{' '}
                        of {filteredStockRows.length} matching items
                      </p>
                    </div>
                  )}

                  {filteredStockRows.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                        <Table>
                          <TableHeader className="bg-[var(--surface-muted)]">
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">
                                Opening
                              </TableHead>
                              <TableHead className="text-right">Sold</TableHead>
                              <TableHead className="text-right">
                                Expected
                              </TableHead>
                              {showRecordedStock && (
                                <TableHead className="w-36 text-right">
                                  Counted
                                </TableHead>
                              )}
                              {showRecordedStock && (
                                <TableHead className="text-right">
                                  Difference
                                </TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleStockRows.map((row) => (
                              <TableRow key={row.itemId}>
                                <TableCell>
                                  <p className="font-medium uppercase">{row.name}</p>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatQuantity(row.openingQty, row.uom)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.soldQuantity === undefined
                                    ? '—'
                                    : formatQuantity(row.soldQuantity, row.uom)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.expectedFinalQty === undefined
                                    ? '—'
                                    : formatQuantity(
                                        row.expectedFinalQty,
                                        row.uom,
                                      )}
                                </TableCell>
                                {showRecordedStock && (
                                  <TableCell className="text-right">
                                    <StockValue
                                      row={row}
                                      value={getActualStock(
                                        row,
                                        mockClosingData,
                                      )}
                                    />
                                  </TableCell>
                                )}
                                {showRecordedStock && (
                                  <TableCell className="text-right">
                                    <StockVariance
                                      expectedQty={row.expectedFinalQty}
                                      actualQty={getActualStock(
                                        row,
                                        mockClosingData,
                                      )}
                                      uom={row.uom}
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      
                      {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                        <SessionItemsPager
                          page={itemPage}
                          pageCount={getStockPageCount(
                            filteredStockRows.length,
                          )}
                          onPageChange={setItemPage}
                        />
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                      {stockRows.length === 0
                        ? 'No items were recorded for this session.'
                        : `No session items match “${itemSearch}”.`}
                    </p>
                  )}
                </section>

                {isOpenSession && !canClose && (
                  <p className="text-sm text-[var(--muted)]">
                    Only the cashier who opened this session can record the
                    closing count and close it.
                  </p>
                )}
                {session.status === 'CLOSED' && !mockClosingData && (
                  <p className="text-xs text-[var(--muted)]">
                    Real counts are mock-only and were not recorded for this
                    session in the current page session.
                  </p>
                )}
              </div>

              <DrawerFooter className="flex-row justify-end border-t border-[var(--border)]/70 bg-[var(--card)] pt-4">
                {isOpenSession && canClose ? (
                  <AppButton
                    onClick={() => {
                      setValidationError(null);
                      setClosingDialogStep('count');
                    }}
                    disabled={isClosing}
                  >
                    <LogOut size={15} />
                    <span className="ml-2">Close session</span>
                  </AppButton>
                ) : (
                  <AppButton
                    variant="secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </AppButton>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {session && (
        <AppDialog
          open={closingDialogStep !== 'closed'}
          onClose={() => {
            if (isClosing) return;
            setClosingDialogStep('closed');
            setValidationError(null);
          }}
          title={
            closingDialogStep === 'confirm'
              ? 'Review and confirm close'
              : 'Count closing stock and cash'
          }
          description={
            closingDialogStep === 'confirm'
              ? 'Check the physical counts before closing this POS session.'
              : 'Enter actual stock for every item and the total cash counted.'
          }
          size="lg"
        >
          {closingDialogStep === 'count' ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                reviewClosingCounts();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {countedItems} of {stockRows.length} items counted
                </p>
                {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                      aria-hidden="true"
                    />
                    <Input
                      value={closingItemSearch}
                      onChange={(event) => {
                        setClosingItemSearch(event.target.value);
                        setClosingItemPage(0);
                      }}
                      placeholder="Find an item to count"
                      aria-label="Search items to count"
                      className="h-10 rounded-full pl-9"
                    />
                  </div>
                )}
              </div>

              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {filteredClosingStockRows.length > 0 ? (
                  visibleClosingStockRows.map((row) => (
                    <li
                      key={row.itemId}
                      className="flex items-center justify-between gap-4 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {row.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Expected{' '}
                          {row.expectedFinalQty === undefined
                            ? '—'
                            : formatQuantity(row.expectedFinalQty, row.uom)}
                        </p>
                      </div>
                      <label className="w-32 shrink-0 text-xs font-medium text-[var(--muted)]">
                        Real stock
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          value={actualStockByItem[row.itemId] ?? ''}
                          onChange={(event) => {
                            setActualStockByItem((current) => ({
                              ...current,
                              [row.itemId]: event.target.value,
                            }));
                            setValidationError(null);
                          }}
                          className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-right text-sm tabular-nums text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                          aria-label={`Real stock count for ${row.name}`}
                          aria-invalid={Boolean(
                            validationError?.startsWith(
                              'Enter a valid real stock count',
                            ),
                          )}
                          placeholder="0"
                        />
                      </label>
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-sm text-[var(--muted)]">
                    {stockRows.length === 0
                      ? 'No tracked stock items. Enter the session cash count to continue.'
                      : `No session items match “${closingItemSearch}”.`}
                  </li>
                )}
              </ul>

              {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                <SessionItemsPager
                  page={closingItemPage}
                  pageCount={getStockPageCount(filteredClosingStockRows.length)}
                  onPageChange={setClosingItemPage}
                />
              )}

              <label className="block text-xs font-medium text-[var(--muted)]">
                Real cash counted
                <div className="mt-1 flex h-11 items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
                  <span className="pl-3 text-sm text-[var(--muted)]">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={actualCash}
                    onChange={(event) => {
                      setActualCash(event.target.value);
                      setValidationError(null);
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-sm tabular-nums text-[var(--foreground)] outline-none"
                    aria-label="Real cash counted for the session"
                    aria-invalid={
                      validationError ===
                      'Enter the actual cash counted before closing.'
                    }
                    placeholder="0"
                  />
                </div>
              </label>

              <div className="flex items-start gap-3 rounded-xl border border-[var(--status-pending)]/30 bg-[var(--status-pending)]/10 p-3">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--status-pending)]"
                  aria-hidden="true"
                />
                <p className="text-xs leading-5 text-[var(--foreground)]">
                  These closing counts are mock data for this page session and
                  are not sent to the server.
                </p>
              </div>

              {validationError && (
                <p className="text-sm text-[var(--status-danger)]" role="alert">
                  {validationError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
                <AppButton
                  variant="secondary"
                  onClick={() => {
                    setClosingDialogStep('closed');
                    setValidationError(null);
                  }}
                  disabled={isClosing}
                >
                  Cancel
                </AppButton>
                <AppButton type="submit" disabled={isClosing}>
                  Review counts
                </AppButton>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--status-pending)]/30 bg-[var(--status-pending)]/10 p-4">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--status-pending)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Close this POS session?
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                    Confirm the stock and cash counts below before continuing.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Physical stock
                </h3>
                <ul className="max-h-52 divide-y divide-[var(--border)] overflow-y-auto rounded-xl border border-[var(--border)]">
                  {stockRows.map((row) => (
                    <li
                      key={row.itemId}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 truncate text-[var(--muted)]">
                        {row.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-[var(--foreground)]">
                        {formatQuantity(
                          Number(actualStockByItem[row.itemId]),
                          row.uom,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-muted)] px-4 py-3">
                <span className="text-sm text-[var(--muted)]">
                  Real cash counted
                </span>
                <span className="text-base font-semibold tabular-nums text-[var(--foreground)]">
                  {formatRp(Number(actualCash))}
                </span>
              </div>

              {validationError && (
                <p className="text-sm text-[var(--status-danger)]" role="alert">
                  {validationError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
                <AppButton
                  variant="secondary"
                  onClick={() => setClosingDialogStep('count')}
                  disabled={isClosing}
                >
                  Edit counts
                </AppButton>
                <AppButton onClick={confirmClosing} disabled={isClosing}>
                  <LogOut size={15} />
                  <span className="ml-2">
                    {isClosing ? 'Closing...' : 'Confirm close session'}
                  </span>
                </AppButton>
              </div>
            </div>
          )}
        </AppDialog>
      )}
    </>
  );
}

function SessionInfo({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const Icon = icon;
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon
        size={15}
        className="mt-0.5 shrink-0 text-[var(--accent)]"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <dt className="text-xs text-[var(--muted)]">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-[var(--foreground)]">
          {value}
        </dd>
      </div>
    </div>
  );
}

function SessionItemsPager({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const buttonClassName =
    'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45';

  return (
    <nav
      className="flex items-center justify-between gap-3"
      aria-label="Session items pagination"
    >
      <button
        type="button"
        className={buttonClassName}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous session items"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Previous
      </button>
      <span
        className="text-xs tabular-nums text-[var(--muted)]"
        aria-live="polite"
      >
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount - 1}
        aria-label="Next session items"
      >
        Next
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  );
}

function StockVariance({
  expectedQty,
  actualQty,
  uom,
}: {
  expectedQty?: number;
  actualQty?: number;
  uom: string;
}) {
  const variance = getStockVariance(expectedQty, actualQty, uom);

  return (
    <span
      className={`text-xs font-semibold tabular-nums ${variance?.className ?? 'text-[var(--muted)]'}`}
      title={
        variance
          ? variance.label
          : 'Difference is unavailable because expected stock or physical count was not recorded.'
      }
    >
      {variance?.label ?? 'Not available'}
    </span>
  );
}

function StockValue({ row, value }: { row: SessionStockRow; value?: number }) {
  if (value === undefined) {
    return <span className="text-sm text-[var(--muted)]">—</span>;
  }

  return (
    <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">
      {formatQuantity(value, row.uom)}
    </span>
  );
}
