import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  Banknote,
  QrCode,
  Calendar,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { StatusPage } from '../components/ui/status-page';
import { DataTable } from '#components/ui/data-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { formatRp, statusStyles } from '../lib/transaction-utils';
import type { TransactionItem } from '#lib/transaction/transaction-types';
import {
  useCompleteTransactionMutation,
  useTransactionQuery,
} from '#lib/transaction/transaction-store';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function unitPrice(total: number, qty: number): number {
  return qty > 0 ? Math.round(total / qty) : 0;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TransactionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const transactionQuery = useTransactionQuery(id);
  const completeTransMutation = useCompleteTransactionMutation();
  const transaction = transactionQuery.data;

  if (transactionQuery.isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading transaction...</p>;
  }

  if (!transaction) {
    return (
      <StatusPage
        code="404"
        title="Transaction not found"
        description="This transaction may have been deleted or the link is incorrect."
        actionLabel="Back to transactions"
        actionHref="/transactions"
        secondaryLabel="Open POS"
        secondaryHref="/pos"
      />
    );
  }

  const handleComplete = async () => {
    try {
      await completeTransMutation.mutateAsync(transaction.id);
      toast.success('Transaction completed', {
        description: `${transaction.customer} is now marked complete.`,
      });
    } catch (error) {
      toast.error('Failed to complete transaction', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const isCompleting = completeTransMutation.isPending;
  const isCash = transaction.paymentMethod === 'cash';

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Transaction detail"
        title={transaction.customer}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/transactions">
              <AppButton variant="secondary-inverted">
                <ArrowLeft size={14} />
                <span className="ml-2">Back</span>
              </AppButton>
            </Link>
            {transaction.status === 'pending' && (
              <AppButton
                variant="inverted"
                onClick={() => void handleComplete()}
                disabled={isCompleting}
              >
                <CheckCircle2 size={14} />
                <span className="ml-2">{isCompleting ? 'Completing…' : 'Set complete'}</span>
              </AppButton>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[transaction.status]}`}
          >
            {transaction.status === 'complete' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
            {transaction.status}
          </span>
          <span className="text-sm text-[var(--band-text-muted)]">{transaction.date}</span>
        </div>
      </PageHeader>

      {/* ── Meta tiles ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {/* Payment — icon + label */}
        <MetaTile label="Payment" icon={isCash ? Banknote : QrCode}>
          <div
            className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
              isCash
                ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                : 'bg-[var(--surface-accent)] text-[var(--accent)]'
            }`}
          >
            {isCash ? <Banknote size={15} /> : <QrCode size={15} />}
            {isCash ? 'Cash' : 'QRIS'}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {isCash ? 'Paid at counter' : 'QR code scan'}
          </p>
        </MetaTile>

        <MetaTile label="Cashier" icon={ShieldCheck}>
          <p className="mt-1 font-semibold">{transaction.cashier}</p>
        </MetaTile>

        <MetaTile label="Date & time" icon={Calendar}>
          <p className="mt-1 font-semibold">{transaction.date}</p>
        </MetaTile>
      </div>

      {/* ── Main content ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">

        {/* Items table */}
        <Card noPadding>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold">Order items</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {transaction.items.length} line{transaction.items.length !== 1 ? 's' : ''} ·{' '}
              {transaction.items.reduce((s, i) => s + i.qty, 0)} units total
            </p>
          </div>

          {/* Desktop — DataTable */}
          <TransactionItemsTable items={transaction.items} />

          {/* Mobile — stacked rows */}
          <div className="divide-y divide-[var(--border)] md:hidden">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {formatRp(unitPrice(item.total, item.qty))} × {item.qty}
                  </p>
                </div>
                <p className="ml-4 shrink-0 font-semibold">{formatRp(item.total)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Order summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label="Subtotal" value={formatRp(transaction.subtotal)} />
              {transaction.discount > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`− ${formatRp(transaction.discount)}`}
                  valueClassName="text-[var(--status-success)]"
                />
              )}
              {transaction.tax > 0 && (
                <SummaryRow label="Tax" value={formatRp(transaction.tax)} />
              )}
              <div className="border-t border-[var(--border)] pt-3">
                <SummaryRow
                  label="Total"
                  value={formatRp(transaction.total)}
                  bold
                  valueClassName="text-[var(--heading)]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {transaction.status === 'pending' && (
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={isCompleting}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                {isCompleting ? 'Completing…' : 'Set complete'}
              </button>
            )}
            <Link
              to={`/transactions/print/${transaction.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] active:scale-[0.98]"
            >
              <Printer size={16} />
              Print receipt
            </Link>
            <Link
              to="/transactions"
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] active:scale-[0.98]"
            >
              <Receipt size={16} />
              All transactions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable for order items
// ---------------------------------------------------------------------------

function TransactionItemsTable({ items }: { items: TransactionItem[] }) {
  const columns = useMemo<ColumnDef<TransactionItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        id: 'unitPrice',
        header: 'Unit price',
        accessorFn: (item) => unitPrice(item.total, item.qty),
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">
            {formatRp(unitPrice(row.original.total, row.original.qty))}
          </span>
        ),
      },
      {
        accessorKey: 'qty',
        header: () => <span className="block text-center">Qty</span>,
        cell: ({ row }) => (
          <div className="text-center">
            <span className="inline-flex h-6 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold">
              {row.original.qty}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'total',
        header: () => <span className="block text-right">Subtotal</span>,
        cell: ({ row }) => (
          <div className="text-right font-semibold">{formatRp(row.original.total)}</div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (item) => item.id,
  });

  return (
    <DataTable
      table={table}
      emptyContent="No items on this transaction."
      containerClassName="hidden md:block"
      rowClassName="transition hover:bg-[var(--surface-muted)]/40"
    />
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Single meta tile — label + icon in header, children as body */
export function MetaTile({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {Icon && <Icon size={12} />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A label/value row used inside Order summary */
function SummaryRow({
  label,
  value,
  bold = false,
  valueClassName = '',
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-semibold' : 'text-[var(--muted)]'}`}>
      <span>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
