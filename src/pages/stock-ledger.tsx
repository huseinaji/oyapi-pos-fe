import { useState } from 'react';
import { Boxes, RefreshCw } from 'lucide-react';
import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { useStockLedgerQuery } from '#lib/stock/stock-store';
import { DataTable } from '#components/ui/data-table';
import { TanStackTablePagination } from '#components/ui/tanstack-table-pagination';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import type { StockLedgerEntry } from '#lib/stock/stock-types';

const PAGE_SIZE = 20;

export default function StockLedgerPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const query = useStockLedgerQuery(pagination.pageIndex + 1, pagination.pageSize);
  const ledger = query.data?.rows ?? [];
  const totalItems = query.data?.count ?? 0;

  const columns: ColumnDef<StockLedgerEntry>[] = [
    {
      header: 'Item',
      accessorKey: 'itemName',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--foreground)]">{row.original.itemName}</p>
          <p className="truncate text-xs text-[var(--muted-2)]">{row.original.id}</p>
        </div>
      ),
    },
    {
      header: 'Movement',
      accessorKey: 'type',
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-[var(--muted)]">{row.original.type}</span>,
    },
    {
      header: 'Quantity',
      accessorKey: 'quantity',
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className={`text-right text-sm font-semibold tabular-nums ${row.original.quantity < 0 ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}
        >
          {row.original.quantity > 0 ? '+' : ''}
          {row.original.quantity}
        </div>
      ),
    },
    {
      header: 'Reference',
      accessorKey: 'reference',
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-[var(--muted)]">{row.original.reference}</span>,
    },
    {
      header: 'Date',
      accessorKey: 'recordedAt',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-right text-sm text-[var(--muted)]">
          {row.original.recordedAt
            ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.original.recordedAt))
            : '—'}
        </div>
      )
    },
  ];
  const mobileColumns: ColumnDef<StockLedgerEntry>[] = [
    {
      accessorKey: 'itemName',
      header: 'Item',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{row.original.itemName}</p>
          <p className="truncate text-xs text-[var(--muted-2)]">{row.original.type} · {row.original.reference}</p>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: () => <span className="block text-right">Qty</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className={`text-right text-sm font-semibold tabular-nums ${row.original.quantity < 0 ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
          {row.original.quantity > 0 ? '+' : ''}{row.original.quantity}
        </div>
      ),
    },
    {
      accessorKey: 'recordedAt',
      header: () => <span className="block text-right">Date</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right text-xs leading-4 text-[var(--muted)]">
          {row.original.recordedAt ? new Date(row.original.recordedAt).toLocaleDateString('id-ID') : '—'}
          <br />
          {row.original.recordedAt ? new Date(row.original.recordedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: ledger,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: totalItems,
    getRowId: (entry) => entry.id,
    state: {
      pagination,
    },
  });
  const mobileTable = useReactTable({
    data: ledger,
    columns: mobileColumns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    rowCount: totalItems,
    getRowId: (entry) => entry.id,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Stock ledger"
        description="Chronological inventory movements and balance changes."
        action={
          <AppButton
            variant="inverted"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh</span>
          </AppButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
        <span><strong className="mr-1 text-[var(--accent)]">{totalItems}</strong> movements</span>
        <span className="text-[var(--muted)]">Inventory service</span>
        {query.dataUpdatedAt > 0 && (
          <span className="text-[var(--muted-2)]">Updated {new Date(query.dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>

      {query.isError ? (
        <section className="rounded-[14px] border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5 px-5 py-8 text-center text-[var(--foreground)]">
          <p className="font-medium">Unable to load stock movements</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Check the inventory service, then retry.</p>
          <AppButton variant="secondary" onClick={() => void query.refetch()}>
            <RefreshCw size={14} className="mr-1.5" />
            Retry
          </AppButton>
        </section>
      ) : query.isLoading ? (
        <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] px-5 py-10 text-center text-sm text-[var(--muted)]">
          Loading movement stream…
        </section>
      ) : ledger.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-5 py-12 text-center text-[var(--muted)]">
          <Boxes size={24} className="text-[var(--accent)]" />
          <p className="font-medium text-[var(--foreground)]">No stock movements found</p>
          <p className="text-sm text-[var(--muted)]">New inventory entries will appear here.</p>
        </section>
      ) : (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Movement entries</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Inventory service ledger records.</p>
          </div>

          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <p className="text-xs font-medium text-[var(--accent)]">Movement stream</p>
            </div>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">{ledger.length} loaded</span>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)]">
            <DataTable
              table={table}
              containerClassName="hidden md:block"
            />
            <DataTable
              table={mobileTable}
              containerClassName="md:hidden"
            />
          </div>

          <div className="mt-3 border-t border-[var(--border)] px-3 sm:px-5">
            <div className="hidden md:block">
              <TanStackTablePagination table={table} pageSizeOptions={[10, 20, 50]} />
            </div>
            <div className="md:hidden">
              <TanStackTablePagination table={mobileTable} pageSizeOptions={[10, 20, 50]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
