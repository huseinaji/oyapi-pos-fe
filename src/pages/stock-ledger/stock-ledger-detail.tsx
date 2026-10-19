import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  FileText,
  Hash,
  Landmark,
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
import type { StockLedgerEntry } from '@/lib/stock/stock-types';

type StockLedgerEntryDrawerProps = {
  entry: StockLedgerEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatLedgerDate(value?: string) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StockLedgerEntryDrawer({
  entry,
  open,
  onOpenChange,
}: StockLedgerEntryDrawerProps) {
  const isMobile = useIsMobile();
  const isIncrease = entry ? entry.qty >= 0 : false;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="w-full md:w-[30rem]">
        {entry && (
          <>
            <DrawerHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Stock Ledger Detail
                  </p>
                  <DrawerTitle className="mt-1 line-clamp-2 text-left text-lg font-semibold text-[var(--foreground)]">
                    {entry.item.name}
                  </DrawerTitle>
                </div>
                <DrawerClose>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                    aria-label="Close movement details"
                  >
                    <X size={16} />
                  </button>
                </DrawerClose>
              </div>
              <DrawerDescription className="text-left text-sm text-[var(--muted)]">
                {entry.reference || 'Inventory update'} ·{' '}
                {entry.ledgerDirection || 'Stock'}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 p-4 pt-3">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      Quantity
                    </p>
                    <div
                      className={`mt-1 text-2xl font-semibold tabular-nums ${isIncrease ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'}`}
                    >
                      {isIncrease ? '+' : ''}
                      {entry.qty}
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${isIncrease ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]' : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'}`}
                  >
                    {isIncrease ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowDownLeft size={18} />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Boxes size={14} />
                    <span className="text-sm">Movement type</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {entry.ledgerDirection || 'Stock'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Landmark size={14} />
                    <span className="text-sm">Balance after</span>
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {entry.balanceAfter ?? '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <FileText size={14} />
                    <span className="text-sm">Reference</span>
                  </div>
                  <span className="max-w-[45%] truncate text-right text-sm font-medium text-[var(--foreground)]">
                    {entry.reference || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <CalendarClock size={14} />
                    <span className="text-sm">Recorded</span>
                  </div>
                  <span className="text-right text-sm font-medium text-[var(--foreground)]">
                    {formatLedgerDate(entry.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Hash size={14} />
                    <span className="text-sm">Entry ID</span>
                  </div>
                  <span className="max-w-[50%] truncate text-right text-xs font-medium text-[var(--foreground)]">
                    {entry.id}
                  </span>
                </div>
              </div>
            </div>

            <DrawerFooter className="flex-row justify-end">
              <DrawerClose>
                <AppButton variant="secondary">Close</AppButton>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
