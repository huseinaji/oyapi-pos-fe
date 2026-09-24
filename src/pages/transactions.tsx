import { useEffect, useMemo, useState } from 'react';
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
import { AppButton } from '../components/ui/app-button';
import { ConfirmDeleteDialog } from '../components/ui/confirm-delete-dialog';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { PageHeader } from '../components/ui/page-header';
import { Pagination } from '../components/ui/pagination';
import { RowActions } from '../components/ui/row-actions';
import { SectionCard } from '../components/ui/section-card';
import { AppSelect } from '../components/ui/app-select';
import { usePagination } from '../hooks/use-pagination';
import {
  countActiveFilters,
  daysAgoIso,
  defaultTransactionFilters,
  filterTransactions,
  formatRp,
  getUniqueValues,
  statusStyles,
  todayIso,
  type TransactionFilters,
} from '../lib/transaction-utils';

import type { Transaction } from '../types/inde';
import { Link } from 'react-router';
import { useTransactionStore } from '#lib/transaction/transaction-store';

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

type SortField =
  'invoice' | 'customer' | 'cashier' | 'payment' | 'status' | 'total' | 'date';
type SortDir = 'asc' | 'desc';

const datePresets: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

export default function TransactionsPage() {
  const transactions = useTransactionStore((state) => state.transactions);
  const fetchTransactions = useTransactionStore(
    (state) => state.fetchTransactions,
  );
  const deleteTransaction = useTransactionStore(
    (state) => state.deleteTransaction,
  );
  const completeTransaction = useTransactionStore(
    (state) => state.completeTransaction,
  );
  const navigate = useNavigate();

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const [filters, setFilters] = useState<TransactionFilters>(
    defaultTransactionFilters,
  );
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
    };
  }, [filteredTransactions]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'invoice':
          cmp = a.invoice.localeCompare(b.invoice);
          break;
        case 'customer':
          cmp = a.customer.localeCompare(b.customer);
          break;
        case 'cashier':
          cmp = a.cashier.localeCompare(b.cashier);
          break;
        case 'payment':
          cmp = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'total':
          cmp = a.total - b.total;
          break;
        case 'date':
        default:
          cmp =
            new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTransactions, sortField, sortDir]);

  const {
    page,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: pageTransactions,
    setPage,
    setPageSize,
    resetPage,
  } = usePagination(sortedTransactions, 10);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    resetPage();
  };

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
  };

  const clearFilters = () => {
    setFilters(defaultTransactionFilters);
    setDatePreset('all');
  };

  const openDelete = (transaction: Transaction) => {
    setDeletingTx(transaction);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTx) return;
    try {
      await deleteTransaction(deletingTx.id);
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
      await completeTransaction(transaction.id);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales history"
        title="Transactions"
        description={`${summary.count} orders · ${formatRp(summary.total)} revenue`}
        action={
          <Link to="/pos">
            <AppButton variant="inverted">
              <ReceiptText size={14} />
              <span className="ml-2">New sale</span>
            </AppButton>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryTile label="Total orders" value={String(summary.count)} />
        <SummaryTile label="Revenue" value={formatRp(summary.total)} accent />
        <SummaryTile
          label="Pending"
          value={String(summary.pending)}
          warning={summary.pending > 0}
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

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--border)] md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
              <tr>
                <SortTh
                  label="Customer"
                  field="customer"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Cashier"
                  field="cashier"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Payment"
                  field="payment"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Status"
                  field="status"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Total"
                  field="total"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <SortTh
                  label="Date"
                  field="date"
                  current={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  onClick={() =>
                    navigate(`/transactions/detail/${transaction.id}`)
                  }
                  className="cursor-pointer border-t border-[var(--border)] transition hover:bg-[var(--surface-muted)]/50"
                >
                  <td className="px-4 py-3">{transaction.customer}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {transaction.cashier}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge method={transaction.paymentMethod} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[transaction.status]}`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatRp(transaction.total)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {transaction.date}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      label={`Actions for ${transaction.invoice}`}
                      actions={[
                        {
                          label: 'View',
                          icon: Eye,
                          href: `/transactions/detail/${transaction.id}`,
                        },
                        ...(transaction.status === 'pending'
                          ? [
                              {
                                label: 'Set complete',
                                icon: CheckCircle2,
                                onClick: () => void handleComplete(transaction),
                              },
                            ]
                          : []),
                        {
                          label: 'Delete',
                          icon: Trash2,
                          danger: true,
                          onClick: () => openDelete(transaction),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[var(--border)] px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        {/* Compact mobile table */}
        <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] md:hidden">
          <div className="grid grid-cols-[minmax(0,1.3fr)_auto_minmax(70px,0.8fr)_auto] gap-2 bg-[var(--surface-muted)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span className="text-right">Actions</span>
          </div>
          {pageTransactions.map((transaction) => (
            <div
              key={transaction.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/transactions/detail/${transaction.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ')
                  navigate(`/transactions/detail/${transaction.id}`);
              }}
              className="grid grid-cols-[minmax(0,1.3fr)_auto_minmax(70px,0.8fr)_auto] items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left transition hover:bg-[var(--surface-muted)]/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {transaction.customer}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                  {transaction.cashier} · {transaction.date}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[transaction.status]}`}
              >
                {transaction.status}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">
                  {formatRp(transaction.total)}
                </p>
                <div className="mt-0.5">
                  <PaymentBadge method={transaction.paymentMethod} />
                </div>
              </div>
              <div onClick={(event) => event.stopPropagation()}>
                <RowActions
                  label={`Actions for ${transaction.invoice}`}
                  actions={[
                    {
                      label: 'View',
                      icon: Eye,
                      href: `/transactions/detail/${transaction.id}`,
                    },
                    ...(transaction.status === 'pending'
                      ? [
                          {
                            label: 'Set complete',
                            icon: CheckCircle2,
                            onClick: () => void handleComplete(transaction),
                          },
                        ]
                      : []),
                    {
                      label: 'Delete',
                      icon: Trash2,
                      danger: true,
                      onClick: () => openDelete(transaction),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-2 md:hidden">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
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

function SortTh({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 transition hover:text-[var(--foreground)]"
      >
        {label}
        <span className="text-[10px]">
          {active ? (
            dir === 'asc' ? (
              '▲'
            ) : (
              '▼'
            )
          ) : (
            <span className="opacity-30">▲▼</span>
          )}
        </span>
      </button>
    </th>
  );
}
