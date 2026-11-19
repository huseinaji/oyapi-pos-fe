import { useEffect, useMemo, useState, type TransitionEvent } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
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
import type {
  CashierSession,
  CloseCashierSessionDto,
} from '@/lib/cashier-sessions/cashier-sessions-types';
import { useTransactionsQuery } from '@/lib/transaction/transaction-store';
import { formatRp } from '@/lib/transaction-utils';

type CashierSessionDetailDrawerProps = {
  session: CashierSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAnimationEnd: () => void;
  openClosingDialog: boolean;
  onClosingDialogOpenChange: (open: boolean) => void;
  canClose: boolean;
  isClosing: boolean;
  onCloseSession: (values: CloseCashierSessionDto) => void;
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

function formatDuration(startAt: string, endAt?: string) {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return '—';
  }

  const totalMinutes = Math.floor((end - start) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes} min`;
  return `${minutes} min`;
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

export function CashierSessionDetailDrawer({
  session,
  open,
  onOpenChange,
  onCloseAnimationEnd,
  openClosingDialog,
  onClosingDialogOpenChange,
  canClose,
  isClosing,
  onCloseSession,
}: CashierSessionDetailDrawerProps) {
  const isMobile = useIsMobile();
  const [actualStockByItem, setActualStockByItem] = useState<
    Record<string, string>
  >({});
  const [actualCash, setActualCash] = useState('');
  const [remarks, setRemarks] = useState('');
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
  const isCashCountValid =
    actualCash.trim() !== '' &&
    Number.isFinite(Number(actualCash)) &&
    Number(actualCash) >= 0;
  const canReviewCounts =
    countedItems === stockRows.length && isCashCountValid && !isClosing;
  const completedTransactions = useMemo(
    () =>
      (transactionsQuery.data ?? []).filter(
        (transaction) => transaction.status === 'complete',
      ),
    [transactionsQuery.data],
  );
  const salesSummary = useMemo(
    () =>
      completedTransactions.reduce(
        (summary, transaction) => {
          summary.total += transaction.total;
          summary[transaction.paymentMethod] += transaction.total;
          return summary;
        },
        { total: 0, cash: 0, qris: 0 },
      ),
    [completedTransactions],
  );
  const completedTransactionCount = completedTransactions.length;
  const expectedCash = (session?.openingCash ?? 0) + salesSummary.cash;
  const expectedCashAvailable =
    !transactionsQuery.isLoading && !transactionsQuery.isError;
  const cashDifference =
    session?.actualCash === undefined || !expectedCashAvailable
      ? undefined
      : Number((session.actualCash - expectedCash).toFixed(2));

  useEffect(() => {
    setActualStockByItem({});
    setActualCash('');
    setRemarks('');
    setValidationError(null);
    setClosingDialogStep('closed');
    setItemSearch('');
    setItemPage(0);
    setClosingItemSearch('');
    setClosingItemPage(0);
  }, [session?.id, open]);

  useEffect(() => {
    setClosingDialogStep(openClosingDialog ? 'count' : 'closed');
  }, [openClosingDialog]);

  const closeClosingDialog = () => {
    if (isClosing) return;
    setClosingDialogStep('closed');
    setValidationError(null);
    onClosingDialogOpenChange(false);
  };

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
      actualCash: Number(actualCash),
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      items: stockRows.map((row) => ({
        itemId: row.itemId,
        actualQty: Number(actualStockByItem[row.itemId]),
      })),
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
    session?.status === 'CLOSED' || session?.closingStock,
  );
  const cashShare =
    salesSummary.total > 0
      ? Math.min(
          100,
          Math.max(0, (salesSummary.cash / salesSummary.total) * 100),
        )
      : 0;

  return (
    <>
      <Drawer
        open={open && closingDialogStep === 'closed'}
        onOpenChange={onOpenChange}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent
          className="w-full md:w-[min(26rem,92vw)]"
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
                    <DrawerTitle className="mt-1 truncate text-left text-lg font-semibold text-[var(--primary)]">
                      Session {session.id.slice(0, 8)}
                    </DrawerTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
                    icon={CalendarClock}
                    label="Open for"
                    value={formatDuration(session.openedAt, session.closedAt)}
                  />
                  <SessionInfo
                    icon={Package}
                    label="Starting cash"
                    value={
                      session.openingCash === undefined
                        ? '—'
                        : formatRp(session.openingCash)
                    }
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
                      <div className="bg-[var(--band-bg)] px-4 py-4 text-[var(--card)]">
                        <p className="text-xs font-medium text-[var(--card-muted)]">
                          Total sales
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                          {transactionsQuery.isLoading
                            ? 'Loading...'
                            : formatRp(salesSummary.total)}
                        </p>
                        <div
                          className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/25"
                          role="img"
                          aria-label={`${cashShare.toFixed(0)} percent of sales were paid in cash`}
                        >
                          <span
                            className="h-full bg-[var(--card-muted)] transition-[width]"
                            style={{ width: `${cashShare}%` }}
                          />
                          <span
                            className="h-full flex-1 bg-[var(--status-success)]"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 divide-x divide-[var(--border)] bg-[var(--card)]">
                        {[
                          {
                            label: 'Cash sales',
                            value: salesSummary.cash,
                            share: cashShare,
                          },
                          {
                            label: 'QRIS sales',
                            value: salesSummary.qris,
                            share: 100 - cashShare,
                          },
                        ].map((item) => (
                          <div key={item.label} className="px-4 py-3">
                            <dt className="text-xs text-[var(--muted)]">
                              {item.label}{' '}
                              <span className="tabular-nums">
                                {salesSummary.total > 0
                                  ? `${item.share.toFixed(0)}%`
                                  : ''}
                              </span>
                            </dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-[var(--primary)]">
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

                <section
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  aria-label="Cash reconciliation"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--primary)]">
                        Expected cash in drawer
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Starting cash + cash sales
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-[var(--accent)]">
                      {transactionsQuery.isLoading
                        ? 'Loading...'
                        : transactionsQuery.isError
                          ? '—'
                          : formatRp(expectedCash)}
                    </p>
                  </div>
                  {session.actualCash !== undefined && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                      <div>
                        <p className="text-xs text-[var(--muted)]">
                          Actual cash counted
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--primary)]">
                          {formatRp(session.actualCash)}
                        </p>
                      </div>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          cashDifference === 0
                            ? 'text-[var(--status-success)]'
                            : 'text-[var(--status-pending)]'
                        }`}
                      >
                        {cashDifference === undefined
                          ? '—'
                          : `${cashDifference > 0 ? '+' : ''}${formatRp(cashDifference)}`}
                      </p>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--primary)]">
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
                                  <p className="font-medium uppercase">
                                    {row.name}
                                  </p>
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
                                      value={row.closingQty}
                                    />
                                  </TableCell>
                                )}
                                {showRecordedStock && (
                                  <TableCell className="text-right">
                                    <StockVariance
                                      expectedQty={row.expectedFinalQty}
                                      actualQty={row.closingQty}
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

                {session.remarks?.trim() && (
                  <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
                    <h3 className="text-sm font-semibold text-[var(--primary)]">
                      Closing remarks
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-[var(--muted)]">
                      {session.remarks.trim()}
                    </p>
                  </section>
                )}
              </div>

              <DrawerFooter className="flex-row justify-end border-t border-[var(--border)]/70 bg-[var(--card)] pt-4">
                {isOpenSession && canClose && (
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
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {session && (
        <AppDialog
          open={closingDialogStep !== 'closed'}
          onClose={closeClosingDialog}
          title={
            closingDialogStep === 'confirm'
              ? 'Review before closing'
              : 'Close cashier'
          }
          description="Count what is really in the drawer and on the shelf."
          size="lg"
          headerClassName="border-b-0 pb-0"
          closeButtonClassName={'rounded-xl p-2.5'}
          panelClassName="rounded-[24px] shadow-[0_20px_60px_rgba(31,42,36,0.2)]"
          footer={
            closingDialogStep === 'count' ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between [&_button]:h-11 [&_button]:px-5">
                <p className="text-xs text-[var(--muted)]">
                  Count every item and the cash to continue.
                </p>
                <div className="flex justify-end gap-2">
                  <AppButton
                    variant="secondary"
                    onClick={closeClosingDialog}
                    disabled={isClosing}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    type="button"
                    onClick={reviewClosingCounts}
                    disabled={!canReviewCounts}
                  >
                    Review counts
                  </AppButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2 [&_button]:h-11 [&_button]:px-5">
                <AppButton
                  variant="secondary"
                  onClick={() => setClosingDialogStep('count')}
                  disabled={isClosing}
                >
                  Back to count
                </AppButton>
                <AppButton onClick={confirmClosing} disabled={isClosing}>
                  <LogOut size={15} />
                  <span className="ml-2">
                    {isClosing ? 'Closing...' : 'Close cashier'}
                  </span>
                </AppButton>
              </div>
            )
          }
        >
          {closingDialogStep === 'count' ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                reviewClosingCounts();
              }}
            >
              <ClosingStepIndicator step="count" />
              <section
                className="space-y-2"
                aria-labelledby="closing-stock-title"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id="closing-stock-title"
                    className="text-sm font-semibold text-[var(--accent)]"
                  >
                    Stock
                  </h3>
                  <p className="text-xs tabular-nums text-[var(--muted)]">
                    {countedItems} of {stockRows.length} items counted
                  </p>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                  role="progressbar"
                  aria-label="Stock items counted"
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, stockRows.length)}
                  aria-valuenow={stockRows.length === 0 ? 1 : countedItems}
                >
                  <div
                    className="h-full rounded-full bg-[var(--status-success)] transition-[width]"
                    style={{
                      width: `${stockRows.length === 0 ? 100 : (countedItems / stockRows.length) * 100}%`,
                    }}
                  />
                </div>
                {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                  <div className="relative w-full">
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
                <ul className="space-y-2">
                  {filteredClosingStockRows.length > 0 ? (
                    visibleClosingStockRows.map((row) => (
                      <li
                        key={row.itemId}
                        className={`flex flex-col justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:px-4 ${
                          row.expectedFinalQty !== undefined &&
                          actualStockByItem[row.itemId]?.trim() &&
                          Number.isFinite(
                            Number(actualStockByItem[row.itemId]),
                          ) &&
                          Number(actualStockByItem[row.itemId]) ===
                            row.expectedFinalQty
                            ? 'border-[var(--status-success)]/40 bg-[var(--status-success)]/[0.04]'
                            : 'border-[var(--border)] bg-[var(--card)]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--primary)]">
                            {row.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            Expected{' '}
                            {row.expectedFinalQty === undefined
                              ? '—'
                              : formatQuantity(row.expectedFinalQty, row.uom)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-start">
                          {actualStockByItem[row.itemId]?.trim() &&
                            Number.isFinite(
                              Number(actualStockByItem[row.itemId]),
                            ) &&
                            Number(actualStockByItem[row.itemId]) >= 0 &&
                            row.expectedFinalQty !== undefined && (
                              <span
                                className={`hidden text-xs font-semibold sm:inline ${
                                  row.expectedFinalQty ===
                                  Number(actualStockByItem[row.itemId])
                                    ? 'text-[var(--status-success)]'
                                    : 'text-[var(--status-pending)]'
                                }`}
                              >
                                {row.expectedFinalQty ===
                                Number(actualStockByItem[row.itemId])
                                  ? 'Matches'
                                  : 'Different'}
                              </span>
                            )}
                          <label className="flex h-11 w-36 items-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
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
                              className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-sm font-semibold tabular-nums text-[var(--primary)] outline-none"
                              aria-label={`Counted stock for ${row.name}`}
                              aria-invalid={Boolean(
                                validationError?.startsWith(
                                  'Enter a valid real stock count',
                                ),
                              )}
                              placeholder="Enter count"
                            />
                            <span className="pr-3 text-xs text-[var(--muted)]">
                              {row.uom}
                            </span>
                          </label>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
                      {stockRows.length === 0
                        ? 'No tracked stock items. Enter the session cash count to continue.'
                        : `No session items match “${closingItemSearch}”.`}
                    </li>
                  )}
                </ul>

                {stockRows.length > SESSION_ITEMS_PAGE_SIZE && (
                  <SessionItemsPager
                    page={closingItemPage}
                    pageCount={getStockPageCount(
                      filteredClosingStockRows.length,
                    )}
                    onPageChange={setClosingItemPage}
                  />
                )}
              </section>

              <section
                className="space-y-2"
                aria-labelledby="closing-cash-title"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id="closing-cash-title"
                    className="text-sm font-semibold text-[var(--primary)]"
                  >
                    Cash in drawer
                  </h3>
                  <span className="rounded-full bg-[var(--status-pending)]/20 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--primary)]">
                    Expected{' '}
                    {expectedCashAvailable ? formatRp(expectedCash) : '—'}
                  </span>
                </div>
                <label className="flex h-12 items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
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
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-sm text-[var(--primary)] outline-none"
                    aria-label="Counted cash in drawer"
                    aria-invalid={!isCashCountValid && Boolean(actualCash)}
                    placeholder="Enter counted cash"
                  />
                </label>
              </section>

              {validationError && (
                <p className="text-sm text-[var(--status-danger)]" role="alert">
                  {validationError}
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <ClosingStepIndicator step="review" />
              <p className="text-sm text-[var(--muted)]">
                Session sales{' '}
                {transactionsQuery.isLoading || transactionsQuery.isError
                  ? '—'
                  : formatRp(salesSummary.total)}{' '}
                ·{' '}
                {transactionsQuery.isLoading || transactionsQuery.isError
                  ? '—'
                  : `${completedTransactionCount} ${completedTransactionCount === 1 ? 'transaction' : 'transactions'}`}
              </p>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-[var(--surface-muted)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left">
                        Count
                      </th>
                      <th scope="col" className="px-3 py-3 text-right">
                        Expected
                      </th>
                      <th scope="col" className="px-3 py-3 text-right">
                        Counted
                      </th>
                      <th scope="col" className="px-3 py-3 text-right">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {stockRows.map((row) => {
                      const counted = Number(actualStockByItem[row.itemId]);
                      const difference =
                        row.expectedFinalQty === undefined
                          ? undefined
                          : Number((counted - row.expectedFinalQty).toFixed(2));

                      return (
                        <tr key={row.itemId}>
                          <th
                            scope="row"
                            className="px-3 py-3 text-left font-semibold text-[var(--primary)]"
                          >
                            {row.name}
                          </th>
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                            {row.expectedFinalQty === undefined
                              ? '—'
                              : formatQuantity(row.expectedFinalQty, row.uom)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-[var(--primary)]">
                            {formatQuantity(counted, row.uom)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-semibold tabular-nums ${
                              difference === undefined
                                ? 'text-[var(--muted)]'
                                : difference === 0
                                  ? 'text-[var(--status-success)]'
                                  : 'text-[var(--status-danger)]'
                            }`}
                          >
                            {difference === undefined
                              ? '—'
                              : difference === 0
                                ? 'Matches'
                                : `${difference > 0 ? '+' : '−'} ${formatQuantity(Math.abs(difference), row.uom)}`}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <th
                        scope="row"
                        className="px-3 py-3 text-left font-semibold text-[var(--primary)]"
                      >
                        Cash in drawer
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--muted)]">
                        {expectedCashAvailable ? formatRp(expectedCash) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-[var(--primary)]">
                        {formatRp(Number(actualCash))}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold tabular-nums ${
                          !expectedCashAvailable
                            ? 'text-[var(--muted)]'
                            : Number(actualCash) === expectedCash
                              ? 'text-[var(--status-success)]'
                              : 'text-[var(--status-danger)]'
                        }`}
                      >
                        {!expectedCashAvailable
                          ? '—'
                          : Number(actualCash) === expectedCash
                            ? 'Matches'
                            : `${Number(actualCash) > expectedCash ? '+' : '−'} ${formatRp(Math.abs(Number(actualCash) - expectedCash))}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <label className="block text-xs font-semibold text-[var(--primary)]">
                Note for the difference (optional)
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={2}
                  placeholder="Explain any cash or stock difference"
                  className="mt-1.5 min-h-16 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm font-normal text-[var(--primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  aria-label="Note for the difference"
                />
              </label>

              <div className="flex items-start gap-2.5 rounded-xl bg-[var(--status-danger)]/10 px-3 py-2.5 text-[var(--status-danger)]">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-xs leading-5">
                  Closing ends this session. You cannot change the counts
                  afterward.
                </p>
              </div>

              {validationError && (
                <p className="text-sm text-[var(--status-danger)]" role="alert">
                  {validationError}
                </p>
              )}
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
        <dd className="mt-0.5 truncate text-sm font-medium text-[var(--primary)]">
          {value}
        </dd>
      </div>
    </div>
  );
}

function ClosingStepIndicator({ step }: { step: 'count' | 'review' }) {
  const isReview = step === 'review';

  return (
    <ol
      className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"
      aria-label={`Close cashier: ${isReview ? 'review' : 'count'} step`}
    >
      <li
        className={`inline-flex items-center gap-1.5 ${
          isReview ? 'text-[var(--status-success)]' : 'text-[var(--primary)]'
        }`}
        aria-current={isReview ? undefined : 'step'}
      >
        <span
          className={`inline-flex size-5 items-center justify-center rounded-full ${
            isReview
              ? 'bg-[var(--status-success)] text-white'
              : 'bg-[var(--accent)] text-white'
          }`}
        >
          {isReview ? <Check size={12} aria-hidden="true" /> : '1'}
        </span>
        Count
      </li>
      <span className="h-px w-6 bg-[var(--border-strong)]" aria-hidden="true" />
      <li
        className={`inline-flex items-center gap-1.5 ${
          isReview ? 'text-[var(--primary)]' : 'text-[var(--muted)]'
        }`}
        aria-current={isReview ? 'step' : undefined}
      >
        <span
          className={`inline-flex size-5 items-center justify-center rounded-full border ${
            isReview
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-[var(--border-strong)] bg-[var(--card)] text-[var(--muted)]'
          }`}
        >
          2
        </span>
        Review
      </li>
    </ol>
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
    'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-45';

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
    <span className="text-sm font-medium tabular-nums text-[var(--primary)]">
      {formatQuantity(value, row.uom)}
    </span>
  );
}
