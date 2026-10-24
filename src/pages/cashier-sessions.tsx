import { useMemo, useRef, useState } from 'react';
import {
  Clock,
  FileText,
  LogIn,
  LogOut,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { AppSelect } from '@/components/ui/app-select';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMeQuery } from '@/lib/auth/auth-store';
import { useProductsQuery } from '@/lib/product/product-store';
import {
  useCashierSessionsQuery,
  useCloseCashierSessionMutation,
  useOpenCashierSessionMutation,
} from '@/lib/cashier-sessions/cashier-sessions-store';
import { useTransactionsQuery } from '@/lib/transaction/transaction-store';
import type {
  CashierSession,
  CashierStockSnapshot,
} from '@/lib/cashier-sessions/cashier-sessions-types';
import { DataTable } from '@/components/ui/data-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ITEM_TYPE_OPTIONS } from '@/lib/product/product-types';
import { TablePagination } from '@/components/ui/table-pagination';

type OpeningStockRow = {
  id: number;
  itemId: string;
  quantity: string;
};

function formatDate(value?: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function compareStock(session: CashierSession) {
  return session.openingStock.map((openingItem) => {
    const soldQuantity = openingItem.soldQuantity;

    return {
      itemId: openingItem.itemId,
      name: openingItem.itemName,
      uom: openingItem.uom,
      openingQty: openingItem.quantity,
      finalStockQty:
        soldQuantity === undefined
          ? undefined
          : openingItem.quantity - soldQuantity,
      soldQuantity,
    };
  });
}

export default function CashierSessionsPage() {
  const { data: user } = useMeQuery();
  const storeId = user?.store?.storeId;
  const productsQuery = useProductsQuery();
  const sessionsQuery = useCashierSessionsQuery(storeId);
  const openMutation = useOpenCashierSessionMutation(storeId);
  const closeMutation = useCloseCashierSessionMutation(storeId);
  const sessions = sessionsQuery.data ?? [];
  const activeSession = sessions.find((session) => session.status === 'OPEN');
  const canCloseSession = Boolean(
    user && activeSession?.openedBy.userId === user.sub,
  );
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [closingDialogOpen, setClosingDialogOpen] = useState(false);
  const [documentSession, setDocumentSession] = useState<CashierSession | null>(
    null,
  );
  const [openingStockRows, setOpeningStockRows] = useState<OpeningStockRow[]>(
    [],
  );
  const openingRowId = useRef(0);
  const [sessionSorting, setSessionSorting] = useState<SortingState>([
    { id: 'openedAt', desc: true },
  ]);
  const [sessionPagination, setSessionPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const sessionColumns = useMemo<ColumnDef<CashierSession>[]>(
    () => [
      {
        accessorFn: (session) => session.openedAt,
        id: 'openedAt',
        header: 'Opened',
        cell: ({ row }) => formatDate(row.original.openedAt),
      },
      {
        accessorFn: (session) => session.openedBy.username,
        id: 'openedBy',
        header: 'Opened by',
        cell: ({ row }) => row.original.openedBy.username,
      },
      {
        accessorFn: (session) => session.closedAt ?? '',
        id: 'closedAt',
        header: 'Closed',
        cell: ({ row }) => formatDate(row.original.closedAt ?? undefined),
      },
      {
        accessorFn: (session) => session.closer?.username ?? '',
        id: 'closer',
        header: 'Closed by',
        cell: ({ row }) => row.original.closer?.username ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.original.status === 'OPEN' ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]'}`}
          >
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );
  const sessionsTable = useReactTable({
    data: sessions,
    columns: sessionColumns,
    onSortingChange: setSessionSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setSessionPagination,
    state: { sorting: sessionSorting, pagination: sessionPagination },
  });
  const openSessionDetails = (session: CashierSession) =>
    setDocumentSession(session);
  const mobileSessionColumns = useMemo<ColumnDef<CashierSession>[]>(
    () => [
      {
        accessorKey: 'openedAt',
        header: 'Session',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.original.openedBy.username}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              {formatDate(row.original.openedAt)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${row.original.status === 'OPEN' ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]'}`}
          >
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );
  const mobileSessionsTable = useReactTable({
    data: sessionsTable.getRowModel().rows.map((row) => row.original),
    columns: mobileSessionColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (session) => session.id,
  });
  // filter tidak muncul untuk item bundle
  const availableItems = (productsQuery.data?.rows ?? []).filter(
    (i) => i.type !== ITEM_TYPE_OPTIONS[2],
  );

  console.log('available items', availableItems);
  const selectableItems = availableItems.filter(
    (item) => !openingStockRows.some((line) => line.itemId === item.id),
  );
  const openingItemOptions = (currentRowId: number) =>
    availableItems
      .filter(
        (item) =>
          !openingStockRows.some(
            (line) => line.itemId === item.id && line.id !== currentRowId,
          ),
      )
      .map((item) => ({
        value: item.id,
        label: `${item.name} · bin ${item.bin?.actualQty ?? 0} ${item.uom}`,
      }));
  const addOpeningRow = () => {
    openingRowId.current += 1;
    setOpeningStockRows((current) => [
      ...current,
      { id: openingRowId.current, itemId: '', quantity: '' },
    ]);
  };
  const selectOpeningItem = (rowId: number, itemId: string) => {
    const item = availableItems.find((candidate) => candidate.id === itemId);
    if (!item) return;

    setOpeningStockRows((current) => {
      if (current.some((line) => line.itemId === itemId && line.id !== rowId)) {
        return current;
      }

      return current.map((line) =>
        line.id === rowId
          ? {
              ...line,
              itemId: item.id,
              quantity: String(item.bin?.actualQty ?? 0),
            }
          : line,
      );
    });
  };

  const handleOpenCashier = async () => {
    if (!storeId || !user) return;
    const openingStock: CashierStockSnapshot[] = [];
    for (const row of openingStockRows) {
      if (!row.itemId) continue;
      const item = availableItems.find(
        (candidate) => candidate.id === row.itemId,
      );
      const quantity = Number(row.quantity);
      if (
        !item ||
        row.quantity.trim() === '' ||
        !Number.isFinite(quantity) ||
        quantity < 0
      ) {
        toast.error('Enter a valid physical count for each selected item.');
        return;
      }
      openingStock.push({
        itemId: item.id,
        itemName: item.name,
        uom: item.uom,
        quantity,
      });
    }
    try {
      await openMutation.mutateAsync(openingStock);
      setOpeningDialogOpen(false);
      setOpeningStockRows([]);
      toast.success('Cashier opened', {
        description: 'Opening document with manual stock counts created.',
      });
    } catch (error) {
      toast.error('Unable to open cashier', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleCloseCashier = async () => {
    if (!activeSession) return;
    try {
      await closeMutation.mutateAsync();
      setClosingDialogOpen(false);
      toast.success('Cashier closed', {
        description: 'The active store session has been closed.',
      });
    } catch (error) {
      toast.error('Unable to close cashier', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Cashier sessions"
        description="Manage server-side POS sessions. Opening items use current bin balances unless you enter a lower manual count."
      />

      <SectionCard title="Current session">
        {sessionsQuery.isLoading ? (
          <p className="py-5 text-sm text-[var(--muted)]">
            Loading cashier session...
          </p>
        ) : sessionsQuery.isError ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="text-sm text-[var(--status-danger)]">
              Unable to load cashier documents.
            </p>
            <AppButton
              variant="secondary"
              onClick={() => void sessionsQuery.refetch()}
            >
              Retry
            </AppButton>
          </div>
        ) : activeSession ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-4 sm:grid-cols-3">
              <Info
                icon={Clock}
                label="Opened at"
                value={formatDate(activeSession.openedAt)}
              />
              <Info
                icon={LogIn}
                label="Opened by"
                value={activeSession.openedBy.username}
              />
              <Info
                icon={Package}
                label="Starting items"
                value={String(activeSession.openingStock.length)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canCloseSession ? (
                <AppButton
                  variant="inverted"
                  onClick={() => setClosingDialogOpen(true)}
                >
                  <LogOut size={15} />
                  <span className="ml-2 ">Close cashier</span>
                </AppButton>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  POS is open for this store.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">No cashier session is open</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Opening items will be created from current bin balances. Manual
                counts are optional.
              </p>
            </div>
            <AppButton
              onClick={() => setOpeningDialogOpen(true)}
              disabled={
                !storeId ||
                productsQuery.isLoading ||
                productsQuery.isError ||
                openMutation.isPending
              }
            >
              <LogIn size={15} />
              <span className="ml-2">Open cashier</span>
            </AppButton>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Session documents"
        description="Opening and closing records for this store."
      >
        {sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No cashier documents yet.
          </p>
        ) : (
          <>
            <DataTable
              table={sessionsTable}
              onRowClick={openSessionDetails}
              rowClassName="hover:bg-[var(--surface-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
              containerClassName="hidden overflow-hidden rounded-[10px] border border-[var(--border)] md:block"
              tableClassName="min-w-[760px]"
            />
            <DataTable
              table={mobileSessionsTable}
              onRowClick={openSessionDetails}
              rowClassName="hover:bg-[var(--surface-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
              containerClassName="overflow-hidden rounded-[10px] border border-[var(--border)] md:hidden"
              tableClassName="table-auto"
            />
            <TablePagination
              table={sessionsTable}
              hideWhenSinglePage
              className="px-0"
            />
          </>
        )}
      </SectionCard>

      <AppDialog
        open={openingDialogOpen}
        onClose={() => {
          setOpeningDialogOpen(false);
          setOpeningStockRows([]);
        }}
        title="Open cashier"
        description="Select items with a lower physical count than the bin balance."
        size="lg"
      >
        <div className="space-y-2.5 pb-2">
          <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-[var(--surface-muted)]">
                <TableRow>
                  <TableHead className="h-9 w-[58%] px-3">Item / bin</TableHead>
                  <TableHead className="h-9 w-[26%] px-2">
                    <span className="block leading-4">Count</span>
                  </TableHead>
                  <TableHead className="h-9 w-11 px-0">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingStockRows.length ? (
                  openingStockRows.map((row) => {
                    const item = availableItems.find(
                      (candidate) => candidate.id === row.itemId,
                    );

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="px-2 py-1.5">
                          <AppSelect
                            value={row.itemId}
                            onValueChange={(itemId) =>
                              selectOpeningItem(row.id, itemId)
                            }
                            options={openingItemOptions(row.id)}
                            floating
                            compact
                            placeholder={
                              productsQuery.isLoading
                                ? 'Loading items...'
                                : 'Select item'
                            }
                            disabled={productsQuery.isLoading}
                            aria-label={`Select item for row ${row.id}`}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.quantity}
                            onChange={(event) =>
                              setOpeningStockRows((current) =>
                                current.map((currentRow) =>
                                  currentRow.id === row.id
                                    ? {
                                        ...currentRow,
                                        quantity: event.target.value,
                                      }
                                    : currentRow,
                                ),
                              )
                            }
                            disabled={!row.itemId}
                            className="h-11 w-full min-w-0 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-right text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={
                              item
                                ? `Physical count for ${item.name}`
                                : `Physical count for row ${row.id}`
                            }
                          />
                        </TableCell>
                        <TableCell className="px-0 py-1">
                          <button
                            type="button"
                            aria-label={`Remove ${item?.name ?? `row ${row.id}`}`}
                            onClick={() =>
                              setOpeningStockRows((current) =>
                                current.filter(
                                  (currentRow) => currentRow.id !== row.id,
                                ),
                              )
                            }
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-14 text-center text-sm text-[var(--muted)]"
                    >
                      No items yet. Add a row to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">
              {openingStockRows.filter((row) => row.itemId).length} items
            </span>
            <AppButton
              variant="secondary"
              onClick={addOpeningRow}
              disabled={
                productsQuery.isLoading ||
                productsQuery.isError ||
                selectableItems.length === 0
              }
            >
              <Plus size={15} />
              <span className="ml-2">Add row</span>
            </AppButton>
          </div>

          <div className="sticky bottom-0 z-10 -mx-5 -mb-4 space-y-3 border-t border-[var(--border)] bg-[var(--card)] px-5 pb-4 pt-3">
            <p className="text-xs text-[var(--muted)]">
              Cashier: {user?.username ?? '—'}
            </p>
            <div className="flex justify-end gap-2">
              <AppButton
                variant="secondary"
                onClick={() => {
                  setOpeningDialogOpen(false);
                  setOpeningStockRows([]);
                }}
              >
                Cancel
              </AppButton>
              <AppButton
                onClick={() => void handleOpenCashier()}
                disabled={openMutation.isPending}
              >
                <LogIn size={15} />
                <span className="ml-2">
                  {openMutation.isPending ? 'Opening...' : 'Create session'}
                </span>
              </AppButton>
            </div>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={closingDialogOpen}
        onClose={() => setClosingDialogOpen(false)}
        title="Close cashier"
        description="Close the active POS session for this store."
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Opening time:{' '}
            <span className="font-medium text-[var(--foreground)]">
              {formatDate(activeSession?.openedAt)}
            </span>
            <br />
            Opened by:{' '}
            <span className="font-medium text-[var(--foreground)]">
              {activeSession?.openedBy.username ?? '—'}
            </span>
            <br />
            Closing cashier:{' '}
            <span className="font-medium text-[var(--foreground)]">
              {user?.username ?? '—'}
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <AppButton
              variant="secondary"
              onClick={() => setClosingDialogOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              onClick={() => void handleCloseCashier()}
              disabled={closeMutation.isPending}
            >
              <LogOut size={15} />
              <span className="ml-2">
                {closeMutation.isPending ? 'Closing...' : 'Close session'}
              </span>
            </AppButton>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={Boolean(documentSession)}
        onClose={() => setDocumentSession(null)}
        title="POS opening / closing documents"
        description={
          documentSession
            ? `Session ${documentSession.id.slice(0, 8)}`
            : undefined
        }
        size="lg"
      >
        {documentSession && <DocumentDetails session={documentSession} />}
      </AppDialog>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={16} className="mt-0.5 text-[var(--accent)]" />
      <div>
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function DocumentDetails({ session }: { session: CashierSession }) {
  const transactionsQuery = useTransactionsQuery({
    posSessionId: session.id,
  });
  const stockRows = compareStock(session);
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
  const columns: ColumnDef<(typeof stockRows)[number]>[] = [
    {
      accessorKey: 'name',
      header: 'Item',
      cell: ({ row }) => (
        <>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.itemId}</p>
        </>
      ),
    },
    {
      accessorKey: 'openingQty',
      header: () => <span className="block text-right">Opening stock</span>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.openingQty} {row.original.uom}
        </div>
      ),
    },
    {
      accessorKey: 'soldQuantity',
      header: () => <span className="block text-right">Sold</span>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.soldQuantity === undefined
            ? '—'
            : `${row.original.soldQuantity} ${row.original.uom}`}
        </div>
      ),
    },
    {
      accessorKey: 'finalStockQty',
      header: () => <span className="block text-right">Final stock</span>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.finalStockQty === undefined
            ? '—'
            : `${row.original.finalStockQty} ${row.original.uom}`}
        </div>
      ),
    },
  ];
  const table = useReactTable({
    data: stockRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const mobileColumns: ColumnDef<(typeof stockRows)[number]>[] = [
    {
      accessorKey: 'name',
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{row.original.name}</p>
          <p className="truncate text-[10px] text-[var(--muted)]">
            {row.original.itemId}
          </p>
        </div>
      ),
    },
    {
      id: 'stockSummary',
      enableSorting: false,
      header: () => <span className="block text-right">Stock</span>,
      cell: ({ row }) => (
        <div className="text-right text-[10px] leading-4">
          <p>Opening {row.original.openingQty}</p>
          <p className="text-[var(--muted)]">
            Sold {row.original.soldQuantity ?? '—'} · Final{' '}
            {row.original.finalStockQty ?? '—'}
          </p>
        </div>
      ),
    },
  ];
  const mobileTable = useReactTable({
    data: stockRows,
    columns: mobileColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info
          icon={LogIn}
          label="POS Opening · time"
          value={formatDate(session.openedAt)}
        />
        <Info
          icon={FileText}
          label="POS Opening · cashier"
          value={session.openedBy.username}
        />
        <Info
          icon={Package}
          label="Opening items"
          value={String(session.openingStock.length)}
        />
        <Info
          icon={LogOut}
          label="POS Closing · time"
          value={formatDate(session.closedAt)}
        />
        <Info
          icon={FileText}
          label="POS Closing · cashier"
          value={session.closer?.username ?? 'Not closed'}
        />
      </div>
      {transactionsQuery.isError ? (
        <p className="text-sm text-[var(--status-danger)]" role="alert">
          Failed to load session revenue:{' '}
          {transactionsQuery.error instanceof Error
            ? transactionsQuery.error.message
            : 'Please try again.'}
        </p>
      ) : (
        <div
          aria-label="Session revenue summary"
          className="grid overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] sm:grid-cols-3"
        >
          {[
            { label: 'Total revenue', value: salesSummary.total },
            { label: 'Cash', value: salesSummary.cash },
            { label: 'QRIS', value: salesSummary.qris },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`px-4 py-3 ${
                index > 0
                  ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
                  : ''
              }`}
            >
              <p className="text-xs text-[var(--muted)]">{item.label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums">
                {transactionsQuery.isLoading
                  ? 'Loading...'
                  : formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>
      )}
      <DataTable
        table={table}
        emptyContent="No items were present in this stock snapshot."
        containerClassName="hidden overflow-hidden rounded-[10px] border border-[var(--border)] md:block"
        tableClassName="min-w-[600px]"
      />
      <DataTable
        table={mobileTable}
        emptyContent="No items were present in this stock snapshot."
        containerClassName="overflow-hidden rounded-[10px] border border-[var(--border)] md:hidden"
        tableClassName="table-fixed"
      />
    </div>
  );
}
