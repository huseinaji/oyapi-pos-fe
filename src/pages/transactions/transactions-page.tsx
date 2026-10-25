import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Eye,
  Trash2,
  CreditCard,
  QrCode,
  ReceiptText,
  Filter,
  CalendarRange,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { PageHeader } from '@/components/ui/page-header';
import { RowActions } from '@/components/ui/row-actions';
import { SectionCard } from '@/components/ui/section-card';
import { AppSelect } from '@/components/ui/app-select';
import { TransactionsTable } from './transactions-table';
import { TransactionsPagination } from './transactions-pagination';
import { TransactionDetailDrawer } from './transaction-detail-drawer';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import {
  countActiveFilters,
  daysAgoIso,
  createDefaultTransactionFilters,
  filterTransactions,
  formatRp,
  getUniqueValues,
  statusStyles,
  todayIso,
  type TransactionFilters,
} from '@/lib/transaction-utils';

import type { Transaction } from '@/lib/transaction/transaction-types';
import { Link } from 'react-router';
import { useMeQuery } from '@/lib/auth/auth-store';
import { useCashierSessionsQuery } from '@/lib/cashier-sessions/cashier-sessions-store';
import {
  useCompleteTransactionMutation,
  useDeleteTransactionMutation,
  useTransactionsQuery,
} from '@/lib/transaction/transaction-store';

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const datePresets: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function TransactionsPage() {
  const { data: currentUser } = useMeQuery();
  const cashierSessionsQuery = useCashierSessionsQuery(
    currentUser?.store?.storeId,
  );
  const hasActivePosSession = Boolean(
    cashierSessionsQuery.data?.some((session) => session.status === 'OPEN'),
  );
  const transactionsQuery = useTransactionsQuery();
  const deleteTransactionMutation = useDeleteTransactionMutation();
  const completeTransactionMutation = useCompleteTransactionMutation();
  const transactions = transactionsQuery.data ?? [];
  const navigate = useNavigate();

  const [filters, setFilters] = useState<TransactionFilters>(
    createDefaultTransactionFilters,
  );
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { customers, cashiers } = useMemo(
    () => getUniqueValues(transactions),
    [transactions],
  );

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  );

  const activeFilterCount = countActiveFilters(filters);

  const summary = useMemo(() => {
    const complete = filteredTransactions.filter(
      (tx) => tx.status === 'complete',
    );
    return {
      total: complete.reduce((sum, tx) => sum + tx.total, 0),
      count: filteredTransactions.length,
      pending: filteredTransactions.filter((tx) => tx.status === 'pending')
        .length,
      qris: filteredTransactions.filter((tx) => tx.paymentMethod == 'qris')
        .length,
      cash: filteredTransactions.filter((tx) => tx.paymentMethod == 'cash')
        .length,
    };
  }, [filteredTransactions]);

  const resetPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }));

  const updateFilter = <K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    resetPage();
  };

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
    } else if (preset === 'today') {
      setFilters((prev) => ({
        ...prev,
        dateFrom: todayIso(),
        dateTo: todayIso(),
      }));
    } else if (preset === 'week') {
      setFilters((prev) => ({
        ...prev,
        dateFrom: daysAgoIso(6),
        dateTo: todayIso(),
      }));
    } else if (preset === 'month') {
      setFilters((prev) => ({
        ...prev,
        dateFrom: daysAgoIso(29),
        dateTo: todayIso(),
      }));
    }
    resetPage();
  };

  const clearFilters = () => {
    setFilters(createDefaultTransactionFilters());
    setDatePreset('today');
    resetPage();
  };

  const openDelete = (transaction: Transaction) => {
    setDeletingTx(transaction);
    setDeleteOpen(true);
  };

  const openDetail = (transaction: Transaction) => {
    setDetailTransaction(transaction);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTx) return;
    try {
      await deleteTransactionMutation.mutateAsync(deletingTx.id);
      toast.success('Transaction deleted', {
        description: `${deletingTx.invoice} removed from records.`,
      });
    } catch (error) {
      toast.error('Failed to delete transaction', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDeleteOpen(false);
      setDeletingTx(null);
    }
  };

  const handleComplete = async (transaction: Transaction) => {
    try {
      await completeTransactionMutation.mutateAsync(transaction.id);
      setDetailTransaction((current) =>
        current?.id === transaction.id
          ? { ...current, status: 'complete' }
          : current,
      );
      toast.success('Transaction completed', {
        description: `${transaction.customer} is now complete.`,
      });
    } catch (error) {
      toast.error('Failed to complete transaction', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const desktopColumns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      { accessorKey: 'customer', header: 'Customer' },
      { accessorKey: 'cashier', header: 'Cashier' },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ row }) => <PaymentBadge method={row.original.paymentMethod} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[row.original.status]}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: () => <span className="block text-right">Total</span>,
        cell: ({ row }) => (
          <div className="text-right font-semibold text-[var(--accent)]">
            {formatRp(row.original.total)}
          </div>
        ),
      },
      {
        accessorKey: 'recordedAt',
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">{row.original.date}</span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        header: 'Actions',
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <RowActions
              label={`Actions for ${row.original.invoice}`}
              actions={[
                {
                  label: 'View',
                  icon: Eye,
                  href: `/transactions/${row.original.id}`,
                },
                ...(row.original.status === 'pending'
                  ? [
                      {
                        label: 'Set complete',
                        icon: CheckCircle2,
                        onClick: () => void handleComplete(row.original),
                      },
                    ]
                  : []),
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: () => openDelete(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [handleComplete, openDelete],
  );
  const mobileColumns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold">
              {row.original.customer}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
              {row.original.cashier} · {row.original.date}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[row.original.status]}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <div className="overflow-hidden">
            <p className="whitespace-nowrap text-sm font-semibold text-[var(--accent)]">
              {formatRp(row.original.total)}
            </p>
            <div className="mt-0.5">
              <PaymentBadge method={row.original.paymentMethod} />
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'recordedAt',
        id: 'date',
        header: 'Date',
        enableHiding: true,
        cell: ({ row }) => row.original.recordedAt,
      },
      {
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => (
          <div
            className="text-right"
            onClick={(event) => event.stopPropagation()}
          >
            <RowActions
              label={`Actions for ${row.original.invoice}`}
              actions={[
                {
                  label: 'View',
                  icon: Eye,
                  href: `/transactions/${row.original.id}`,
                },
                ...(row.original.status === 'pending'
                  ? [
                      {
                        label: 'Set complete',
                        icon: CheckCircle2,
                        onClick: () => void handleComplete(row.original),
                      },
                    ]
                  : []),
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: () => openDelete(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [handleComplete, openDelete],
  );
  const desktopTable = useReactTable({
    data: filteredTransactions,
    columns: desktopColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: (updater) =>
      setPagination((current) =>
        typeof updater === 'function' ? updater(current) : updater,
      ),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (transaction) => transaction.id,
  });
  const mobileTable = useReactTable({
    data: filteredTransactions,
    columns: mobileColumns,
    state: { sorting, pagination, columnVisibility: { date: false } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) =>
      setPagination((current) =>
        typeof updater === 'function' ? updater(current) : updater,
      ),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (transaction) => transaction.id,
  });

  if (transactionsQuery.isLoading) {
    return (
      <p className="text-sm text-[var(--muted)]">Loading transactions...</p>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <p className="text-sm text-[var(--status-danger)]">
        {transactionsQuery.error instanceof Error
          ? transactionsQuery.error.message
          : 'Failed to load transactions.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales history"
        title="Transactions"
        description={`${summary.count} orders · ${formatRp(summary.total)} revenue`}
        action={
          hasActivePosSession && !cashierSessionsQuery.isError ? (
            <Link to="/pos">
              <AppButton variant="inverted">
                <ReceiptText size={14} />
                <span className="ml-2">New sale</span>
              </AppButton>
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <SummaryTile label="Total orders" value={String(summary.count)} />
        <SummaryTile label="Revenue" value={formatRp(summary.total)} accent />
        <SummaryTile
          label="Pending"
          value={String(summary.pending)}
          warning={summary.pending > 0}
        />
        {}
        <SummaryTile
          label="Qris"
          value={String(summary.qris)}
          warning={summary.qris > 0}
          accent
        />
        <SummaryTile
          label="Cash"
          value={String(summary.cash)}
          warning={summary.cash > 0}
          accent
        />
      </div>

      <SectionCard
        title="Transaction log"
        description="Filter by date, customer, status, payment method, and more."
      >
        <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            placeholder="Search invoice, customer, or cashier…"
            className="w-full bg-transparent outline-none"
          />
        </label>

        <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/40">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <Filter size={16} className="text-[var(--accent)]" />
              Advanced filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[var(--accent-strong)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {filtersOpen && (
            <div className="space-y-4 border-t border-[var(--border)] px-4 py-4">
              {/* Date */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <CalendarRange size={12} /> Date range
                </p>
                <div className="flex flex-wrap gap-2">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={datePreset === preset.id}
                      onClick={() => applyDatePreset(preset.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                        datePreset === preset.id
                          ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                          : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {datePreset === 'custom' && (
                  <div className="mt-3">
                    <DateRangePicker
                      value={{ from: filters.dateFrom, to: filters.dateTo }}
                      onChange={({ from, to }) => {
                        updateFilter('dateFrom', from);
                        updateFilter('dateTo', to);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Customer & Cashier */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-[var(--muted)]">
                    Customer
                  </span>
                  <AppSelect
                    value={filters.customer}
                    onValueChange={(value) => updateFilter('customer', value)}
                    options={[
                      { value: 'all', label: 'All customers' },
                      ...customers.map((customer) => ({
                        value: customer,
                        label: customer,
                      })),
                    ]}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-[var(--muted)]">
                    Cashier
                  </span>
                  <AppSelect
                    value={filters.cashier}
                    onValueChange={(value) => updateFilter('cashier', value)}
                    options={[
                      { value: 'all', label: 'All cashiers' },
                      ...cashiers.map((cashier) => ({
                        value: cashier,
                        label: cashier,
                      })),
                    ]}
                  />
                </label>
              </div>

              {/* Status & Payment */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'complete', 'pending'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateFilter('status', status)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition active:scale-95 ${
                          filters.status === status
                            ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                            : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Payment method
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'cash', 'qris'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => updateFilter('payment', method)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase transition active:scale-95 ${
                          filters.payment === method
                            ? 'bg-[var(--surface-accent)] text-[var(--accent)]'
                            : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--status-danger)] transition hover:opacity-80"
                >
                  <X size={14} />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {filteredTransactions.length > 0 && (
          <>
            <TransactionsTable
              desktopTable={desktopTable}
              mobileTable={mobileTable}
              onRowClick={openDetail}
            />
            <TransactionsPagination
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              totalItems={filteredTransactions.length}
              onPageIndexChange={(pageIndex) =>
                setPagination((current) => ({ ...current, pageIndex }))
              }
              onPageSizeChange={(pageSize) =>
                setPagination({ pageIndex: 0, pageSize })
              }
            />
          </>
        )}

        {filteredTransactions.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center">
            <ReceiptText className="mb-3 text-[var(--accent)]" size={28} />
            <p className="font-medium">No transactions found</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Try adjusting your search or filters.
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-4">
                <AppButton variant="secondary">Clear filters</AppButton>
              </button>
            )}
          </div>
        )}
      </SectionCard>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeletingTx(null);
        }}
        onConfirm={handleDelete}
        title="Delete transaction"
        description="Are you sure you want to permanently delete this transaction record?"
        itemName={deletingTx?.invoice}
      />
      <TransactionDetailDrawer
        transaction={detailTransaction}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSetComplete={(transaction) => void handleComplete(transaction)}
        isCompleting={completeTransactionMutation.isPending}
        onPrintReceipt={(transaction) => {
          setDetailOpen(false);
          navigate(`/transactions/print/${transaction.id}`);
        }}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  warning,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          accent
            ? 'text-[var(--heading)]'
            : warning
              ? 'text-[var(--status-pending)]'
              : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentBadge({ method }: { method: Transaction['paymentMethod'] }) {
  const Icon = method === 'cash' ? CreditCard : QrCode;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium uppercase">
      <Icon size={12} />
      {method}
    </span>
  );
}
