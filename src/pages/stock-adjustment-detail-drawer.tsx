import {
  CalendarClock,
  FileText,
  Landmark,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { AppButton } from '@/components/ui/app-button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { StockAdjustment } from '@/lib/stock-adjustment/stock-adjustment-types';

type StockAdjustmentDetailDrawerProps = {
  adjustment: StockAdjustment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
        {Icon && <Icon size={14} aria-hidden="true" />}
        {label}
      </dt>
      <dd className="max-w-[60%] break-words text-right text-sm font-medium text-[var(--primary)]">
        {value || '—'}
      </dd>
    </div>
  );
}

export function StockAdjustmentDetailDrawer({
  adjustment,
  open,
  onOpenChange,
}: StockAdjustmentDetailDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="w-full md:w-[30rem]">
        {adjustment && (
          <>
            <DrawerHeader className="gap-3 px-5 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    Stock adjustment detail
                  </p>
                  <DrawerTitle className="mt-1 break-all text-left text-lg font-semibold text-[var(--primary)]">
                    {adjustment.id}
                  </DrawerTitle>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Tutup detail stock adjustment"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <DrawerDescription className="text-left">
                {adjustment.type === 'receive' ? 'Stock masuk' : 'Stock keluar'}{' '}
                · {formatDate(adjustment.createdAt)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <section aria-label="Barang adjustment">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--primary)]">
                    Barang
                  </h3>
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    {adjustment.items.length} barang
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full table-fixed text-left">
                    <thead className="bg-[var(--surface-muted)]">
                      <tr>
                        <th className="px-3 py-2.5 text-xs font-medium text-[var(--muted)]">
                          Nama barang
                        </th>
                        <th className="w-28 px-3 py-2.5 text-right text-xs font-medium text-[var(--muted)]">
                          Perubahan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {adjustment.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-6 text-center text-sm text-[var(--muted)]"
                          >
                            Tidak ada detail barang pada adjustment ini.
                          </td>
                        </tr>
                      ) : (
                        adjustment.items.map((item, index) => (
                          <tr key={item.id ?? `${item.itemId}-${index}`}>
                            <td className="min-w-0 px-3 py-3">
                              <p className="break-words text-sm font-medium text-[var(--primary)]">
                                {item.items?.name ?? item.itemId}
                              </p>
                              {item.items?.description && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                                  {item.items.description}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span
                                className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
                                  adjustment.type === 'receive'
                                    ? 'text-[var(--status-success)]'
                                    : 'text-[var(--status-danger)]'
                                }`}
                              >
                                {adjustment.type === 'receive' ? '+' : '−'}
                                {new Intl.NumberFormat('id-ID').format(
                                  item.qty,
                                )}{' '}
                                {item.items?.uom ?? ''}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                <DetailRow
                  icon={Landmark}
                  label="Store ID"
                  value={adjustment.storeId}
                />
                {adjustment.remarks?.trim() && (
                  <DetailRow
                    icon={FileText}
                    label="Catatan"
                    value={adjustment.remarks.trim()}
                  />
                )}
                <DetailRow
                  icon={CalendarClock}
                  label="Diperbarui"
                  value={formatDate(adjustment.updatedAt)}
                />
              </dl>
            </div>

            <DrawerFooter className="border-t border-[var(--border)]/70 px-5 py-4">
              <div className="w-full [&>button]:w-full [&>button]:justify-center">
                <AppButton
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Tutup
                </AppButton>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
