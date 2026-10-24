import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { AppButton } from '@/components/ui/app-button';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { AppDialog } from '@/components/ui/app-dialog';
import { useProductsQuery } from '@/lib/product/product-store';
import type { ApiItem } from '@/lib/product/product-types';
import { DataTable } from '@/components/ui/data-table';
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { TableCell, TableRow } from '@/components/ui/table';

type AdjustmentLine = {
  id: string;
  item: ApiItem;
  quantity: number;
};

type CompletedAdjustment = {
  completedAt: string;
  lines: AdjustmentLine[];
};

function getStock(item: ApiItem) {
  return item.bin?.actualQty ?? 0;
}

export default function StockAdjustmentPage() {
  const { data, isLoading } = useProductsQuery();
  const products = data?.rows ?? [];
  const [adjustmentDate, setAdjustmentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState('Cycle count');
  const [notes, setNotes] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [lines, setLines] = useState<AdjustmentLine[]>([]);
  const [completedAdjustment, setCompletedAdjustment] =
    useState<CompletedAdjustment | null>(null);
  const [hasDocument, setHasDocument] = useState(false);
  const [detailLine, setDetailLine] = useState<AdjustmentLine | null>(null);

  const selectedIds = new Set(lines.map((line) => line.item.id));

  const addLine = () => {
    const item = products.find((product) => product.id === newProductId);
    if (!item || selectedIds.has(item.id)) return;
    setLines((current) => [
      ...current,
      { id: `${item.id}-${Date.now()}`, item, quantity: 0 },
    ]);
    setNewProductId('');
  };

  const updateQuantity = (lineId: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, quantity } : line,
      ),
    );
  };

  const removeLine = (lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
  };

  const completeAdjustment = () => {
    if (
      !reason.trim() ||
      lines.length === 0 ||
      lines.some((line) => line.quantity === 0)
    )
      return;
    setCompletedAdjustment({
      completedAt: new Date().toISOString(),
      lines,
    });
  };

  const resetDocument = () => {
    setHasDocument(true);
    setAdjustmentDate(new Date().toISOString().slice(0, 10));
    setReason('Cycle count');
    setNotes('');
    setNewProductId('');
    setLines([]);
    setCompletedAdjustment(null);
  };

  const cancelDocument = () => {
    setHasDocument(false);
    setNewProductId('');
    setLines([]);
    setCompletedAdjustment(null);
    setDetailLine(null);
  };

  const adjustmentColumns = useMemo<ColumnDef<AdjustmentLine>[]>(() => [
    {
      id: 'number',
      enableSorting: false,
      header: () => <span className="block text-center">No.</span>,
      cell: ({ row }) => <div className="text-center text-[var(--muted)]">{row.index + 1}</div>,
    },
    {
      accessorFn: (line) => line.item.name,
      id: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.item.name}</p>
          <p className="text-xs text-[var(--muted)]">{row.original.item.category?.name ?? 'Uncategorized'} · {row.original.item.uom} · Click to inspect</p>
        </div>
      ),
    },
    {
      accessorFn: (line) => getStock(line.item),
      id: 'current',
      header: () => <span className="block text-right">Current</span>,
      cell: ({ row }) => <div className="text-right text-[var(--muted)]">{getStock(row.original.item)}</div>,
    },
    {
      accessorKey: 'quantity',
      header: () => <span className="block text-right">Adjustment qty</span>,
      cell: ({ row }) => (
        <div className="text-right" onClick={(event) => event.stopPropagation()}>
          <input
            type="number"
            value={row.original.quantity}
            onChange={(event) => updateQuantity(row.original.id, Number(event.target.value))}
            className="w-24 rounded-[8px] border border-[var(--accent)]/40 bg-[var(--surface-muted)] px-2 py-1.5 text-right outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            aria-label={`Adjustment quantity for ${row.original.item.name}`}
          />
        </div>
      ),
    },
    {
      accessorFn: (line) => getStock(line.item) + line.quantity,
      id: 'after',
      header: () => <span className="block text-right">After adjustment</span>,
      cell: ({ row }) => {
        const after = getStock(row.original.item) + row.original.quantity;
        return <div className={`text-right font-semibold ${after < 0 ? 'text-[var(--status-danger)]' : 'text-[var(--foreground)]'}`}>{after}</div>;
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      header: '',
      cell: ({ row }) => (
        <div className="text-right" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => removeLine(row.original.id)}
            className="rounded-full p-2 text-[var(--muted)] hover:text-[var(--status-danger)]"
            aria-label={`Remove ${row.original.item.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [removeLine, updateQuantity]);
  const adjustmentTable = useReactTable({
    data: lines,
    columns: adjustmentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const mobileAdjustmentColumns = useMemo<ColumnDef<AdjustmentLine>[]>(() => [
    {
      accessorFn: (line) => line.item.name,
      id: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{row.original.item.name}</p>
          <p className="text-[10px] text-[var(--muted)]">Current {getStock(row.original.item)}</p>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: () => <span className="block text-right text-xs">Adjust</span>,
      cell: ({ row }) => (
        <input
          type="number"
          value={row.original.quantity}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => updateQuantity(row.original.id, Number(event.target.value))}
          className="w-14 rounded-[6px] border border-[var(--accent)]/40 bg-[var(--surface-muted)] px-1 py-1.5 text-right text-xs outline-none focus:border-[var(--accent)]"
          aria-label={`Adjustment quantity for ${row.original.item.name}`}
        />
      ),
    },
    {
      accessorFn: (line) => getStock(line.item) + line.quantity,
      id: 'after',
      header: () => <span className="block text-right text-xs">After</span>,
      cell: ({ row }) => <div className="text-right text-xs font-semibold">{getStock(row.original.item) + row.original.quantity}</div>,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: '',
      cell: ({ row }) => (
        <div className="text-right" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => removeLine(row.original.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--status-danger)]" aria-label={`Remove ${row.original.item.name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ], [removeLine, updateQuantity]);
  const mobileAdjustmentTable = useReactTable({
    data: lines,
    columns: mobileAdjustmentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const previewColumns = useMemo<ColumnDef<AdjustmentLine>[]>(() => [
    {
      accessorFn: (line) => line.item.name,
      id: 'item',
      header: 'Item',
      cell: ({ row }) => <span className="font-medium">{row.original.item.name}</span>,
    },
    {
      accessorKey: 'quantity',
      header: () => <span className="block text-right">Qty</span>,
      cell: ({ row }) => <div className={`text-right font-semibold ${row.original.quantity < 0 ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>{row.original.quantity > 0 ? '+' : ''}{row.original.quantity}</div>,
    },
    {
      accessorFn: (line) => getStock(line.item) + line.quantity,
      id: 'balance',
      header: () => <span className="block text-right">Balance after</span>,
      cell: ({ row }) => <div className="text-right">{getStock(row.original.item) + row.original.quantity}</div>,
    },
  ], []);
  const previewTable = useReactTable({
    data: completedAdjustment?.lines ?? [],
    columns: previewColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Stock adjustment"
        description="Create one adjustment document with multiple item movements."
        action={
          hasDocument ? (
            <AppButton variant="inverted" onClick={resetDocument}>
              <FilePlus2 size={14} />
              <span className="ml-2">New document</span>
            </AppButton>
          ) : undefined
        }
      />
      {!hasDocument ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-6 py-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-accent)] text-[var(--accent)]">
            <ClipboardList size={30} />
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            No stock adjustment yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Create an adjustment document to reconcile inventory. Add multiple
            items in one document and review the ledger entries before
            completing it.
          </p>
          <div className="mt-6">
            <AppButton onClick={resetDocument}>
              <FilePlus2 size={14} />
              <span className="ml-2">Create stock adjustment</span>
            </AppButton>
          </div>
          <p className="mt-4 text-xs text-[var(--muted-2)]">
            No stock movement is created until the adjustment is completed.
          </p>
        </div>
      ) : (
        <>
          <SectionCard
            title="Adjustment document"
            description="One document can contain several item adjustments. This UI does not submit changes to the API yet."
          >
            <div className="grid gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  Adjustment date
                </span>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(event) => setAdjustmentDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm sm:col-span-2 lg:col-span-3">
                <span className="mb-1 block text-[var(--muted)]">Reason</span>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Cycle count, damaged, correction..."
                  className={inputClass}
                />
              </label>
              <label className="text-sm sm:col-span-2 lg:col-span-4">
                <span className="mb-1 block text-[var(--muted)]">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Optional note for this adjustment document"
                  className={inputClass}
                />
              </label>
            </div>

            <DataTable
              table={adjustmentTable}
              emptyContent="Add an item to begin the adjustment."
              containerClassName="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--accent)]/25 bg-[var(--card)] shadow-[0_0_24px_rgba(0,98,65,0.06)] md:block"
              tableClassName="min-w-[760px]"
              onRowClick={setDetailLine}
              rowClassName="transition hover:bg-[var(--surface-accent)]/25 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/40"
              footer={(
                <TableRow className="bg-[var(--surface-muted)]/30">
                  <TableCell className="text-center text-[var(--muted)]">+</TableCell>
                  <TableCell>
                    <select
                      value={newProductId}
                      onChange={(event) => setNewProductId(event.target.value)}
                      disabled={isLoading}
                      className={inputClass}
                    >
                      <option value="">Select item to add...</option>
                      {products.filter((item) => !selectedIds.has(item.id)).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell colSpan={3} className="text-sm text-[var(--muted)]">
                    Add another child item to this adjustment.
                  </TableCell>
                  <TableCell className="text-right">
                    <AppButton variant="secondary" onClick={addLine} disabled={!newProductId}>
                      <Plus size={14} />
                      <span className="ml-2">Add</span>
                    </AppButton>
                  </TableCell>
                </TableRow>
              )}
            />
            <DataTable
              table={mobileAdjustmentTable}
              emptyContent="Add an item to begin the adjustment."
              containerClassName="mt-4 overflow-hidden rounded-[12px] border border-[var(--accent)]/25 bg-[var(--card)] md:hidden"
              tableClassName="table-fixed"
              onRowClick={setDetailLine}
              rowClassName="transition hover:bg-[var(--surface-accent)]/25"
              footer={(
                <TableRow className="bg-[var(--surface-muted)]/30">
                  <TableCell>
                    <select
                      aria-label="Select item to add"
                      value={newProductId}
                      onChange={(event) => setNewProductId(event.target.value)}
                      disabled={isLoading}
                      className="w-full min-w-0 rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-1 py-2 text-[10px]"
                    >
                      <option value="">Add item</option>
                      {products.filter((item) => !selectedIds.has(item.id)).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell colSpan={2} className="text-[10px] text-[var(--muted)]">
                    Add adjustment line
                  </TableCell>
                  <TableCell className="text-right">
                    <button type="button" onClick={addLine} disabled={!newProductId} aria-label="Add item" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent)] disabled:opacity-40">
                      <Plus size={16} />
                    </button>
                  </TableCell>
                </TableRow>
              )}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <p className="text-sm text-[var(--muted)]">
                {lines.length} item{lines.length === 1 ? '' : 's'} in adjustment
              </p>
              <div className="flex gap-2">
                <AppButton variant="secondary" onClick={cancelDocument}>
                  Cancel
                </AppButton>
                <AppButton
                  onClick={completeAdjustment}
                  disabled={
                    !reason.trim() ||
                    lines.length === 0 ||
                    lines.some((line) => line.quantity === 0)
                  }
                >
                  <Save size={14} />
                  <span className="ml-2">Complete adjustment</span>
                </AppButton>
              </div>
            </div>
          </SectionCard>

          {completedAdjustment && (
            <SectionCard
              title="Ledger entries preview"
              description="Completing this adjustment would create one ledger entry for each adjusted item. No API request was made."
            >
              <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-[var(--surface-accent)] px-3 py-2 text-sm text-[var(--accent)]">
                <CheckCircle2 size={16} />
                <span>
                  Adjustment completed locally on{' '}
                  {new Date(completedAdjustment.completedAt).toLocaleString(
                    'id-ID',
                  )}
                  .
                </span>
              </div>
              <DataTable
                table={previewTable}
                containerClassName="overflow-hidden rounded-[12px] border border-[var(--border)]"
                tableClassName="min-w-[620px]"
              />
            </SectionCard>
          )}
          <AppDialog
            open={Boolean(detailLine)}
            onClose={() => setDetailLine(null)}
            title={detailLine?.item.name ?? 'Adjustment item'}
            description="Fetched item data and the adjustment impact for this child row."
            size="md"
          >
            {detailLine && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailStat
                    label="Category"
                    value={detailLine.item.category?.name ?? 'Uncategorized'}
                  />
                  <DetailStat label="UOM" value={detailLine.item.uom} />
                  <DetailStat
                    label="Current"
                    value={String(getStock(detailLine.item))}
                  />
                  <DetailStat
                    label="After"
                    value={String(
                      getStock(detailLine.item) + detailLine.quantity,
                    )}
                    accent
                  />
                </div>
                <div className="overflow-hidden rounded-[12px] border border-[var(--accent)]/35 bg-[var(--surface-muted)]/35 shadow-[0_0_20px_rgba(0,98,65,0.08)]">
                  <ItemDetailTable rows={[
                    { label: 'Item ID', value: detailLine.item.id },
                    { label: 'Description', value: detailLine.item.description || 'No description' },
                    { label: 'Base price', value: String(detailLine.item.basePrice) },
                    { label: 'Selling price', value: String(detailLine.item.sellingPrice) },
                    {
                      label: 'Adjustment quantity',
                      value: `${detailLine.quantity > 0 ? '+' : ''}${detailLine.quantity}`,
                      accent: detailLine.quantity !== 0,
                    },
                  ]} />
                </div>
                <div className="flex justify-end">
                  <AppButton
                    variant="secondary"
                    onClick={() => setDetailLine(null)}
                  >
                    Close
                  </AppButton>
                </div>
              </div>
            )}
          </AppDialog>
        </>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15';

function DetailStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold ${accent ? 'text-[var(--accent)]' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

type ItemDetailRow = {
  label: string;
  value: string;
  accent?: boolean;
};

function ItemDetailTable({ rows }: { rows: ItemDetailRow[] }) {
  const columns = useMemo<ColumnDef<ItemDetailRow>[]>(() => [
    {
      accessorKey: 'label',
      header: 'Detail',
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-medium text-[var(--muted)]">{row.original.label}</span>,
    },
    {
      accessorKey: 'value',
      header: 'Value',
      enableSorting: false,
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.accent ? 'text-[var(--accent)]' : ''}`}>
          {row.original.value}
        </span>
      ),
    },
  ], []);
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} showHeader={false} tableClassName="text-sm" />;
}
