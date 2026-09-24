import { useState, useEffect } from 'react';
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

import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { StatusPage } from '../components/ui/status-page';
import { formatRp, statusStyles } from '../lib/transaction-utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useTransactionStore } from '#lib/transaction/transaction-store';

export default function TransactionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();

  const fetchTransactionById = useTransactionStore((s) => s.fetchTransactionById);
  const completeTransaction = useTransactionStore((s) => s.completeTransaction);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const transaction = useTransactionStore((s) =>
    s.transactions.find((tx) => tx.id === id),
  );

  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchTransactionById(id);
  }, [id, fetchTransactionById]);

  if (isLoading && !transaction) {
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

  const unitPrice = (total: number, qty: number) =>
    qty > 0 ? Math.round(total / qty) : 0;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await completeTransaction(transaction.id);
      toast.success('Transaction completed', {
        description: `${transaction.customer} is now complete.`,
      });
    } catch (error) {
      toast.error('Failed to complete transaction', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* PageHeader — status+date sit tight under the title via children (left col),
          buttons go in action (right col) */}
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
                <span className="ml-2">
                  {isCompleting ? 'Completing…' : 'Set complete'}
                </span>
              </AppButton>
            )}
          </div>
        }
      >
        {/* Rendered in left column, directly below title — no extra gap */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[transaction.status]}`}
          >
            {transaction.status === 'complete' ? (
              <CheckCircle2 size={11} />
            ) : (
              <Clock size={11} />
            )}
            {transaction.status}
          </span>
          <span className="text-sm text-[var(--band-text-muted)]">
            {transaction.date}
          </span>
        </div>
      </PageHeader>

      {/* Meta tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetaTile
          label="Payment"
          value={
            <div className={`flex items-center gap-2 h-11 shrink-0 rounded-full px-2 ${transaction.paymentMethod === 'cash'
                  ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                  : 'bg-[var(--surface-accent)] text-[var(--accent)]'
                  }`}>
              {transaction.paymentMethod === "cash" ? (
                <Banknote size={16} />
              ) : (
                <QrCode size={16} />
              )}
              <span>
                {transaction.paymentMethod === "cash" ? "Cash" : "QRIS"}
              </span>
            </div>
          }
        />
        <MetaTile icon={ShieldCheck} label="Cashier" value={transaction.cashier} />
        <MetaTile icon={Calendar} label="Date & time" value={transaction.date} />
      </div>

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Items table */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold">Order items</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {transaction.items.length} line{transaction.items.length !== 1 ? 's' : ''} ·{' '}
              {transaction.items.reduce((s, i) => s + i.qty, 0)} units total
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Unit price</th>
                  <th className="px-5 py-3 text-center font-medium">Qty</th>
                  <th className="px-5 py-3 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--border)] transition hover:bg-[var(--surface-muted)]/40"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--muted)]">
                      {formatRp(unitPrice(item.total, item.qty))}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex h-6 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold">
                        {item.qty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {formatRp(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-[var(--border)] md:hidden">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {formatRp(unitPrice(item.total, item.qty))} × {item.qty}
                  </p>
                </div>
                <p className="font-semibold">{formatRp(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Totals */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-semibold">Order summary</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span>{formatRp(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-[var(--status-success)]">
                  <span>Discount</span>
                  <span>− {formatRp(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--muted)]">
                <span>Tax</span>
                <span>{formatRp(transaction.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="text-[var(--heading)]">{formatRp(transaction.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-semibold">Payment</h2>
            </div>
            <div className="flex items-center gap-4 px-5 py-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${transaction.paymentMethod === 'cash'
                  ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                  : 'bg-[var(--surface-accent)] text-[var(--accent)]'
                  }`}
              >
                {transaction.paymentMethod === 'cash' ? (
                  <Banknote size={20} />
                ) : (
                  <QrCode size={20} />
                )}
              </div>
              <div>
                <p className="font-semibold capitalize">{transaction.paymentMethod}</p>
                <p className="text-sm text-[var(--muted)]">
                  {transaction.paymentMethod === 'cash' ? 'Paid at counter' : 'QR code scan'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom actions */}
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
            <Link to={`/transactions/print/${transaction.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] active:scale-[0.98]"
              >
                <Printer size={16} />
                Print receipt
              </button>
            </Link>
            <Link to="/transactions">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] active:scale-[0.98]"
              >
                <Receipt size={16} />
                All transactions
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 font-medium uppercase text-[var(--muted)]'>
          {Icon && <Icon size={13} />} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-2 font-semibold leading-snug">{value}</div>
      </CardContent>
    </Card>
  );
}
