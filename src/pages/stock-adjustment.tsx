import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { AppSelect } from '@/components/ui/app-select';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { TablePagination } from '@/components/ui/table-pagination';
import { TransactionsTable } from '@/pages/transactions/transactions-table';
import { useProductsQuery } from '@/lib/product/product-store';
import type { ApiItem } from '@/lib/product/product-types';
import {
  useCreateStockAdjustmentMutation,
  useStockAdjustmentsQuery,
} from '@/lib/stock-adjustment/stock-adjustment-store';
import type {
  StockAdjustment,
  StockAdjustmentType,
} from '@/lib/stock-adjustment/stock-adjustment-types';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';

type DraftLine = {
  itemId: string;
  quantity: string;
};

const INITIAL_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };

function getStock(item: ApiItem) {
  return item.bin?.actualQty ?? 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function adjustmentTypeLabel(type: StockAdjustmentType) {
  return type === 'receive' ? 'Stock masuk' : 'Stock keluar';
}

function isValidQuantity(value: string) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0;
}

function isAdjustmentFilter(
  value: string,
): value is 'all' | StockAdjustmentType {
  return value === 'all' || value === 'receive' || value === 'issue';
}

export default function StockAdjustmentPage() {
  const adjustmentsQuery = useStockAdjustmentsQuery();
  const productsQuery = useProductsQuery();
  const createMutation = useCreateStockAdjustmentMutation();
  const adjustments = adjustmentsQuery.data?.rows ?? [];
  const products = productsQuery.data?.rows ?? [];
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] =
    useState<StockAdjustmentType>('issue');
  const [remarks, setRemarks] = useState('');
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [newItemId, setNewItemId] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockAdjustmentType>(
    'all',
  );
  const [pagination, setPagination] =
    useState<PaginationState>(INITIAL_PAGINATION);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [search, typeFilter]);

  const filteredAdjustments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID');

    return [...adjustments]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      )
      .filter((adjustment) => {
        if (typeFilter !== 'all' && adjustment.type !== typeFilter) {
          return false;
        }

        if (!normalizedSearch) return true;

        const searchableText = [
          adjustment.id,
          adjustment.remarks ?? '',
          ...adjustment.items.flatMap((item) => [
            item.itemId,
            item.items?.name ?? '',
          ]),
        ]
          .join(' ')
          .toLocaleLowerCase('id-ID');

        return searchableText.includes(normalizedSearch);
      });
  }, [adjustments, search, typeFilter]);

  const columns = useMemo<ColumnDef<StockAdjustment>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Adjustment',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-40 truncate font-semibold text-[var(--foreground)]">
              {row.original.id}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-2)]">
              {row.original.items.length}{' '}
              {row.original.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipe',
        enableSorting: false,
        cell: ({ row }) => {
          const isReceive = row.original.type === 'receive';

          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isReceive
                  ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                  : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
              }`}
            >
              {isReceive ? (
                <ArrowDownToLine size={13} aria-hidden="true" />
              ) : (
                <ArrowUpFromLine size={13} aria-hidden="true" />
              )}
              {adjustmentTypeLabel(row.original.type)}
            </span>
          );
        },
      },
      {
        accessorKey: 'remarks',
        header: 'Catatan',
        enableSorting: false,
        cell: ({ row }) => (
          <p className="max-w-64 truncate text-sm text-[var(--muted)]">
            {row.original.remarks?.trim() || 'Tanpa catatan'}
          </p>
        ),
      },
      {
        id: 'items',
        header: 'Barang',
        enableSorting: false,
        cell: ({ row }) => {
          const firstItem = row.original.items[0];
          const remainingItems = row.original.items.length - 1;

          return (
            <div className="max-w-48">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {firstItem?.items?.name ?? firstItem?.itemId ?? '—'}
              </p>
              {remainingItems > 0 && (
                <p className="mt-1 text-xs text-[var(--muted-2)]">
                  +{remainingItems} barang lainnya
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: () => <span className="block text-right">Tanggal</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block whitespace-nowrap text-right text-sm tabular-nums text-[var(--muted)]">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const mobileColumns = useMemo<ColumnDef<StockAdjustment>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Adjustment',
        enableSorting: false,
        cell: ({ row }) => {
          const firstItem = row.original.items[0];
          const remainingItems = row.original.items.length - 1;

          return (
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {firstItem?.items?.name ?? firstItem?.itemId ?? 'Adjustment'}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {row.original.id}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {row.original.remarks?.trim() || 'Tanpa catatan'}
                {remainingItems > 0 && ` · +${remainingItems} barang`}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        header: () => <span className="block text-right">Tipe</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const isReceive = row.original.type === 'receive';

          return (
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
                  isReceive
                    ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                    : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                }`}
              >
                {isReceive ? (
                  <ArrowDownToLine size={13} aria-hidden="true" />
                ) : (
                  <ArrowUpFromLine size={13} aria-hidden="true" />
                )}
                {adjustmentTypeLabel(row.original.type)}
              </span>
              <p className="mt-1 whitespace-nowrap text-xs tabular-nums text-[var(--muted)]">
                {formatDate(row.original.createdAt)}
              </p>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredAdjustments,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (adjustment) => adjustment.id,
    rowCount: filteredAdjustments.length,
  });
  const mobileTable = useReactTable({
    data: filteredAdjustments,
    columns: mobileColumns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (adjustment) => adjustment.id,
    rowCount: filteredAdjustments.length,
  });
  const selectedItemIds = new Set(draftLines.map((line) => line.itemId));
  const hasInvalidQuantity = draftLines.some(
    (line) => !isValidQuantity(line.quantity),
  );

  const openCreateDialog = () => {
    setAdjustmentType('issue');
    setRemarks('');
    setDraftLines([]);
    setNewItemId('');
    setDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMutation.isPending) return;
    setDialogOpen(false);
  };

  const addDraftLine = () => {
    if (!newItemId || selectedItemIds.has(newItemId)) return;
    setDraftLines((current) => [
      ...current,
      { itemId: newItemId, quantity: '1' },
    ]);
    setNewItemId('');
  };

  const updateDraftLine = (itemId: string, quantity: string) => {
    setDraftLines((current) =>
      current.map((line) =>
        line.itemId === itemId ? { ...line, quantity } : line,
      ),
    );
  };

  const removeDraftLine = (itemId: string) => {
    setDraftLines((current) =>
      current.filter((line) => line.itemId !== itemId),
    );
  };

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (draftLines.length === 0 || hasInvalidQuantity) {
      toast.error('Periksa detail penyesuaian', {
        description:
          'Tambahkan minimal satu barang dan isi jumlah dengan bilangan bulat lebih dari nol.',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        type: adjustmentType,
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        items: draftLines.map((line) => ({
          itemId: line.itemId,
          qty: Number(line.quantity),
        })),
      });
      setDialogOpen(false);
      toast.success('Penyesuaian stok berhasil dibuat');
    } catch (error) {
      toast.error('Penyesuaian stok gagal dibuat', {
        description:
          error instanceof Error
            ? error.message
            : 'Periksa koneksi, lalu coba lagi.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Stock adjustments"
        description="Catat stok masuk atau keluar dan tinjau riwayat penyesuaian toko."
        action={
          <AppButton variant="inverted" onClick={openCreateDialog}>
            <Plus size={16} aria-hidden="true" />
            <span className="ml-2">Buat adjustment</span>
          </AppButton>
        }
      />

      <SectionCard
        title="Riwayat adjustment"
        description={
          adjustmentsQuery.data
            ? `${adjustmentsQuery.data.count} catatan tersimpan`
            : 'Daftar perubahan stok toko'
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari barang atau catatan"
                aria-label="Cari stock adjustment"
                className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </label>
            <AppSelect
              value={typeFilter}
              onValueChange={(value) => {
                if (isAdjustmentFilter(value)) setTypeFilter(value);
              }}
              options={[
                { value: 'all', label: 'Semua tipe' },
                { value: 'receive', label: 'Stock masuk' },
                { value: 'issue', label: 'Stock keluar' },
              ]}
              className="w-full sm:w-40 "
              compact
              floating
              aria-label="Filter tipe adjustment"
            />
            <button
              type="button"
              onClick={() => void adjustmentsQuery.refetch()}
              disabled={adjustmentsQuery.isFetching}
              aria-label="Muat ulang daftar"
              title="Muat ulang daftar"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-[10px] border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={adjustmentsQuery.isFetching ? 'animate-spin' : ''}
              />
            </button>
          </div>
        </div>

        {adjustmentsQuery.isError ? (
          <div className="px-5 py-12 text-center" role="alert">
            <p className="font-semibold text-[var(--foreground)]">
              Riwayat adjustment tidak dapat dimuat
            </p>
            <p className="mx-auto mt-2 max-w-[60ch] text-sm text-[var(--muted)]">
              {adjustmentsQuery.error instanceof Error
                ? adjustmentsQuery.error.message
                : 'Periksa koneksi ke layanan inventory, lalu coba lagi.'}
            </p>
            <AppButton
              variant="secondary"
              onClick={() => void adjustmentsQuery.refetch()}
            >
              Coba lagi
            </AppButton>
          </div>
        ) : adjustmentsQuery.isLoading ? (
          <div
            className="px-5 py-14 text-center text-sm text-[var(--muted)]"
            role="status"
          >
            Memuat riwayat adjustment…
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ClipboardList
              size={28}
              aria-hidden="true"
              className="mx-auto text-[var(--accent)]"
            />
            <p className="mt-3 font-semibold text-[var(--foreground)]">
              {adjustments.length === 0
                ? 'Belum ada stock adjustment'
                : 'Adjustment tidak ditemukan'}
            </p>
            <p className="mx-auto mt-1 max-w-[52ch] text-sm text-[var(--muted)]">
              {adjustments.length === 0
                ? 'Buat catatan pertama untuk merekam koreksi stok di toko ini.'
                : 'Coba kata kunci lain atau ubah filter tipe.'}
            </p>
            {adjustments.length === 0 && (
              <div className="mt-5">
                <AppButton onClick={openCreateDialog}>
                  <Plus size={15} aria-hidden="true" />
                  <span className="ml-2">Buat adjustment</span>
                </AppButton>
              </div>
            )}
          </div>
        ) : (
          <>
            <TransactionsTable desktopTable={table} mobileTable={mobileTable} />
            <div className="px-3 md:px-4">
              <div className="hidden md:block">
                <TablePagination table={table} />
              </div>
              <div className="md:hidden">
                <TablePagination table={mobileTable} />
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <AppDialog
        open={dialogOpen}
        onClose={closeCreateDialog}
        title="Buat stock adjustment"
        description="Catat pergerakan stok dan barang yang terdampak."
        size="lg"
      >
        <form onSubmit={submitAdjustment} className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--foreground)]">
              Tipe adjustment
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(['receive', 'issue'] as const).map((type) => {
                const isSelected = adjustmentType === type;
                const isReceive = type === 'receive';

                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setAdjustmentType(type)}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-accent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    {isReceive ? (
                      <ArrowDownToLine size={16} aria-hidden="true" />
                    ) : (
                      <ArrowUpFromLine size={16} aria-hidden="true" />
                    )}
                    {adjustmentTypeLabel(type)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--muted-2)]">
              {adjustmentType === 'receive'
                ? 'Jumlah akan ditambahkan ke stok saat ini.'
                : 'Jumlah akan dikurangi dari stok saat ini.'}
            </p>
          </fieldset>

          <div>
            <label
              htmlFor="adjustment-remarks"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Catatan{' '}
              <span className="font-normal text-[var(--muted-2)]">
                (opsional)
              </span>
            </label>
            <textarea
              id="adjustment-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Contoh: hasil stock opname, barang rusak"
              className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--foreground)]">
              Barang yang disesuaikan
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <AppSelect
                value={newItemId}
                onValueChange={setNewItemId}
                options={products
                  .filter((product) => !selectedItemIds.has(product.id))
                  .map((product) => ({
                    value: product.id,
                    label: `${product.name} · Stok ${getStock(product)} ${product.uom}`,
                  }))}
                placeholder={
                  productsQuery.isLoading
                    ? 'Memuat barang…'
                    : productsQuery.isError
                      ? 'Daftar barang tidak tersedia'
                      : products.length === 0
                        ? 'Belum ada barang'
                        : products.every((product) =>
                              selectedItemIds.has(product.id),
                            )
                          ? 'Semua barang sudah ditambahkan'
                          : 'Pilih barang untuk ditambahkan'
                }
                disabled={
                  productsQuery.isLoading ||
                  productsQuery.isError ||
                  products.length === 0 ||
                  products.every((product) => selectedItemIds.has(product.id))
                }
                className="min-w-0 flex-1"
                compact
                floating
                aria-label="Pilih barang untuk adjustment"
              />
              <AppButton
                variant="secondary"
                onClick={addDraftLine}
                disabled={!newItemId}
              >
                <Plus size={15} aria-hidden="true" />
                <span className="ml-2">Tambah barang</span>
              </AppButton>
            </div>
            {productsQuery.isError && (
              <p
                className="mt-2 text-sm text-[var(--status-danger)]"
                role="alert"
              >
                Daftar barang gagal dimuat.{' '}
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : 'Coba muat ulang halaman.'}
              </p>
            )}

            {draftLines.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-dashed border-[var(--border-strong)] px-4 py-5 text-center text-sm text-[var(--muted)]">
                Belum ada barang. Pilih barang di atas untuk memulai.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border)] rounded-[10px] border border-[var(--border)]">
                {draftLines.map((line) => {
                  const product = productsById.get(line.itemId);
                  if (!product) return null;

                  const quantity = Number(line.quantity) || 0;
                  const afterStock =
                    getStock(product) +
                    (adjustmentType === 'receive' ? quantity : -quantity);
                  const hasNegativeBalance =
                    adjustmentType === 'issue' && afterStock < 0;

                  return (
                    <div
                      key={line.itemId}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-2)]">
                          Stok {getStock(product)} {product.uom}
                          <span
                            className={
                              hasNegativeBalance
                                ? 'text-[var(--status-danger)]'
                                : ''
                            }
                          >
                            {' '}
                            → {afterStock} {product.uom}
                          </span>
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <span className="sr-only">Jumlah {product.name}</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={line.quantity}
                          onChange={(event) =>
                            updateDraftLine(line.itemId, event.target.value)
                          }
                          className="w-24 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 text-right text-sm tabular-nums text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                          aria-invalid={!isValidQuantity(line.quantity)}
                        />
                        {product.uom}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDraftLine(line.itemId)}
                        aria-label={`Hapus ${product.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-[var(--muted)]">
              {draftLines.length} barang dipilih
              {hasInvalidQuantity && (
                <span className="mt-1 block text-xs text-[var(--status-danger)]">
                  Jumlah harus berupa bilangan bulat lebih dari nol.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <AppButton
                variant="secondary"
                onClick={closeCreateDialog}
                disabled={createMutation.isPending}
              >
                Batal
              </AppButton>
              <AppButton
                type="submit"
                disabled={
                  createMutation.isPending ||
                  draftLines.length === 0 ||
                  hasInvalidQuantity
                }
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="ml-2">Menyimpan…</span>
                  </>
                ) : (
                  'Simpan adjustment'
                )}
              </AppButton>
            </div>
          </div>
        </form>
      </AppDialog>
    </div>
  );
}
