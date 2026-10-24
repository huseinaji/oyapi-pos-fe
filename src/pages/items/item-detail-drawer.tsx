import {
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  Eye,
  EyeOff,
  Package,
  Tag,
  X,
} from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ITEM_TYPE_LABELS,
  ITEM_UOM_LABELS,
  type ApiItem,
  type ItemType,
  type ItemUom,
} from '@/lib/product/product-types';
import { formatRp } from '@/lib/transaction-utils';

type ItemDetailDrawerProps = {
  item: ApiItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: ApiItem) => void;
  onToggleStatus: (item: ApiItem) => void;
  isUpdatingStatus: boolean;
  onViewFull: (item: ApiItem) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

export function ItemDetailDrawer({
  item,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
  isUpdatingStatus,
  onViewFull,
}: ItemDetailDrawerProps) {
  const isMobile = useIsMobile();
  const isInactive = item?.status?.toLowerCase() === 'inactive';
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent className="w-full md:w-[28rem]">
        {item && (
          <>
            <DrawerHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                    Item details
                  </p>
                  <DrawerTitle className="mt-1 line-clamp-2 text-left text-lg font-semibold text-[var(--foreground)]">
                    {item.name}
                  </DrawerTitle>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AppButton
                    variant="secondary"
                    onClick={() => item && onToggleStatus(item)}
                    disabled={isUpdatingStatus}
                    aria-label={isInactive ? 'Enable item' : 'Disable item'}
                  >
                    {isInactive ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span className="ml-2">
                      {isUpdatingStatus
                        ? 'Updating…'
                        : isInactive
                          ? 'Enable'
                          : 'Disable'}
                    </span>
                  </AppButton>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label="Close item details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <DrawerDescription className="text-left">
                {item.category?.name || 'Uncategorized'} ·{' '}
                {ITEM_TYPE_LABELS[item.type as ItemType] ?? item.type ?? 'Item'}
              </DrawerDescription>
            </DrawerHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pt-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-40 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]">
                  <Package size={28} aria-hidden="true" />
                </div>
              )}

              <p className="text-sm leading-6 text-[var(--muted)]">
                {item.description?.trim() || 'No description provided.'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--surface-muted)] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <CircleDollarSign size={14} />
                    Selling price
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {formatRp(item.sellingPrice)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--surface-muted)] p-3">
                  <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <Boxes size={14} />
                    Stock on hand
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {item.isMaintainStock
                      ? (item.bin?.actualQty ?? '—')
                      : 'Not tracked'}
                    {item.isMaintainStock && (
                      <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                        {ITEM_UOM_LABELS[item.uom as ItemUom] ?? item.uom}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-[var(--border)]/70 border-y border-[var(--border)]/70">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Tag size={14} />
                    Category
                  </dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {item.category?.name || 'Uncategorized'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Package size={14} />
                    Unit of measure
                  </dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {ITEM_UOM_LABELS[item.uom as ItemUom] ?? item.uom}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-[var(--muted)]">Base price</dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {formatRp(item.basePrice)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <CalendarClock size={14} />
                    Last updated
                  </dt>
                  <dd className="text-right text-sm font-medium text-[var(--foreground)]">
                    {formatDate(item.updatedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-[var(--muted)]">Item ID</dt>
                  <dd className="max-w-[55%] truncate text-right text-xs font-medium text-[var(--foreground)]">
                    {item.id}
                  </dd>
                </div>
              </dl>
            </div>

            <DrawerFooter className="flex-row flex-wrap justify-end border-t border-[var(--border)]/70 pt-4">
              <AppButton
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Close
              </AppButton>
              <AppButton variant="secondary" onClick={() => onViewFull(item)}>
                <ArrowUpRight size={14} />
                <span className="ml-2">Full details</span>
              </AppButton>
              <AppButton variant="primary" onClick={() => onEdit(item)}>
                Edit item
              </AppButton>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
