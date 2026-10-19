import { useMemo } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Printer,
  UserRound,
  X,
} from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Transaction } from '@/lib/transaction/transaction-types';
import { formatRp, statusStyles } from '@/lib/transaction-utils';

type TransactionDetailDrawerProps = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetComplete: (transaction: Transaction) => void;
  onPrintReceipt: (transaction: Transaction) => void;
  isCompleting: boolean;
};

function formatDate(transaction: Transaction) {
  const date = new Date(transaction.recordedAt);
  return Number.isNaN(date.getTime())
    ? transaction.date || '—'
    : new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export function TransactionDetailDrawer({
  transaction,
  open,
  onOpenChange,
  onSetComplete,
  onPrintReceipt,
  isCompleting,
}: TransactionDetailDrawerProps) {
  const isMobile = useIsMobile();
  const itemCount = useMemo(
    () => transaction?.items.reduce((count, item) => count + item.qty, 0) ?? 0,
    [transaction],
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="w-full md:w-[30rem]">
        {transaction && (
          <>
            <DrawerHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Transaction preview
                  </p>
                  <DrawerTitle className="mt-1 truncate text-left text-lg font-semibold text-[var(--foreground)]">
                    {transaction.invoice}
                  </DrawerTitle>
                </div>
                <DrawerClose>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label="Close transaction details"
                  >
                    <X size={16} />
                  </button>
                </DrawerClose>
              </div>
              <DrawerDescription className="flex items-center gap-2 text-left">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[transaction.status]}`}
                >
                  {transaction.status}
                </span>
                <span>{itemCount} items</span>
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-3">
              <div className="flex flex-col gap-5">
                <div className="order-2 rounded-xl border border-[var(--border)]/70 bg-[var(--surface-muted)] p-4 md:order-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Total paid
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--accent)] md:text-2xl">
                    {formatRp(transaction.total)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard size={14} />
                      {transaction.paymentMethod.toUpperCase()}
                    </span>
                    <span>{formatDate(transaction)}</span>
                  </div>
                </div>

                <div className="order-1 md:order-2">
                  <h3 className="mb-3 text-base font-semibold text-[var(--foreground)]">
                    Items
                  </h3>
                  {transaction.items.length > 0 ? (
                    <ul className="space-y-2">
                      {transaction.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 py-1"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-base font-medium text-[var(--foreground)]">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {item.qty} {item.uom}
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
                            {formatRp(item.total)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                      No item details are available for this transaction.
                    </p>
                  )}
                </div>

                <dl className="order-3 space-y-3 border-t border-[var(--border)]/70 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-[var(--muted)]">Subtotal</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
                      {formatRp(transaction.subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-[var(--muted)]">Discount</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
                      {formatRp(transaction.discount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-[var(--muted)]">Tax</dt>
                    <dd className="text-right text-sm font-medium tabular-nums text-[var(--foreground)]">
                      {formatRp(transaction.tax)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[var(--border)]/70 pt-3">
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <UserRound size={14} />
                      Cashier
                    </dt>
                    <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                      {transaction.cashier || '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <CalendarClock size={14} />
                      Date
                    </dt>
                    <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                      {formatDate(transaction)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <DrawerFooter className="grid grid-cols-2 gap-2 border-t border-[var(--border)]/70 pt-4 md:grid-cols-3">
              {transaction.status === 'pending' && (
                <div className="w-full [&>button]:w-full [&>button]:justify-center">
                  <AppButton
                    variant="secondary"
                    onClick={() => onSetComplete(transaction)}
                    disabled={isCompleting}
                  >
                    <CheckCircle2 size={14} />
                    <span className="ml-2">
                      {isCompleting ? 'Completing…' : 'Set complete'}
                    </span>
                  </AppButton>
                </div>
              )}
              <div className="w-full [&>button]:w-full [&>button]:justify-center">
                <AppButton
                  variant="primary"
                  onClick={() => onPrintReceipt(transaction)}
                >
                  <Printer size={14} />
                  <span className="ml-2">Print receipt</span>
                </AppButton>
              </div>
              <div className="col-span-full w-full [&>button]:w-full [&>button]:justify-center md:col-span-1">
                <AppButton
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </AppButton>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
