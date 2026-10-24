import { useState } from 'react';
import { Boxes, RefreshCw } from 'lucide-react';
import { AppButton } from '../../components/ui/app-button';
import { PageHeader } from '../../components/ui/page-header';
import { useStockLedgerQuery } from '@/lib/stock/stock-store';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import type { StockLedgerEntry } from '@/lib/stock/stock-types';
import { SectionCard } from '@/components/ui/section-card';
import { StockLedgerPagination } from './stock-ledger-pagination';
import { StockLedgerEntryDrawer } from './stock-ledger-detail';
import { TransactionsTable } from '../transactions/transactions-table';

const PAGE_SIZE = 10;

export default function StockLedgerPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(
    null,
  );
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false);
  const query = useStockLedgerQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
  );
  const ledger = query.data?.rows ?? [];
  const totalItems = query.data?.count ?? 0;

  const columns: ColumnDef<StockLedgerEntry>[] = [
    {
      header: 'Item',
      accessorKey: 'itemName',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--foreground)]">
            {row.original.item.name}
          </p>
          <p className="truncate text-xs text-[var(--muted-2)]">
            {row.original.id}
          </p>
        </div>
      ),
    },
    {
      header: 'Movement',
      accessorKey: 'ledgerDirection',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--muted)]">
          {row.original.ledgerDirection}
        </span>
      ),
    },
    {
      header: 'Qty',
      accessorKey: 'qty',
      enableSorting: false,
      cell: ({ row }) => {
        const isOut = row.original.ledgerDirection === 'out';
        return (
          <div
            className={`text-right text-sm font-semibold tabular-nums ${isOut ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}
          >
            {isOut ? '-' : '+'}
            {row.original.qty}
          </div>
        );
      },
    },
    {
      header: 'Reference',
      accessorKey: 'reference',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--muted)]">
          {row.original.reference}
        </span>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-right text-sm text-[var(--muted)]">
          {row.original.createdAt
            ? new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(row.original.createdAt))
            : '—'}
        </div>
      ),
    },
  ];
  const mobileColumns: ColumnDef<StockLedgerEntry>[] = [
    {
      accessorKey: 'itemName',
      header: 'Item',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {row.original.item.name}
          </p>
          <p className="truncate text-xs text-[var(--muted-2)]">
            {row.original.ledgerDirection} · {row.original.reference}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'qty',
      header: () => <span className="block text-right">Qty</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const isOutDirection = row.original.ledgerDirection === 'out';
        return (
          <div
            className={`text-right text-sm font-semibold tabular-nums ${isOutDirection ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}
          >
            {isOutDirection ? '-' : '+'}
            {row.original.qty}
          </div>
        );
      },
    },
    {
      accessorKey: 'recordedAt',
      header: () => <span className="block text-right">Date</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right text-xs leading-4 text-[var(--muted)]">
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString('id-ID')
            : '—'}
          <br />
          {row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
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

  const handleRowClick = (entry: StockLedgerEntry) => {
    setSelectedEntry(entry);
    setEntryDrawerOpen(true);
  };

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
            <RefreshCw
              size={14}
              className={query.isFetching ? 'animate-spin' : ''}
            />
            <span className="ml-2">Refresh</span>
          </AppButton>
        }
      />
      <SectionCard
        title="Stock Ledger"
        description="Manage the categories assigned to store items."
      >
        {query.isError ? (
          <section className="rounded-[14px] border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/5 px-5 py-8 text-center text-[var(--foreground)]">
            <p className="font-medium">Unable to load stock movements</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Check the inventory service, then retry.
            </p>
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
            <p className="font-medium text-[var(--foreground)]">
              No stock movements found
            </p>
            <p className="text-sm text-[var(--muted)]">
              New inventory entries will appear here.
            </p>
          </section>
        ) : (
          <>
            <TransactionsTable
              desktopTable={table}
              mobileTable={mobileTable}
              onRowClick={handleRowClick}
            />
            <StockLedgerPagination table={table} />
          </>
        )}
      </SectionCard>
      <StockLedgerEntryDrawer
        entry={selectedEntry}
        open={entryDrawerOpen}
        onOpenChange={setEntryDrawerOpen}
      />
    </div>
  );
}
