'use client';

import { useEffect, useState } from 'react';

import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from './data-table';
import { TanStackTablePagination } from './tanstack-table-pagination';

type Item = {
  product_name: string;
  price: string;
  availability: 'In Stock' | 'Out of Stock' | 'Limited';
};

const columns: ColumnDef<Item>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: 28,
    enableSorting: false,
  },
  {
    header: 'Product Name',
    accessorKey: 'product_name',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('product_name')}</div>
    ),
  },
  {
    header: 'Price',
    accessorKey: 'price',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('price')}</div>
    ),
  },
  {
    header: 'Availability',
    accessorKey: 'availability',
    cell: ({ row }) => {
      const availability = row.getValue('availability') as string;

      const styles = {
        'In Stock':
          'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
        'Out of Stock':
          'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive',
        Limited:
          'bg-amber-600/10 text-amber-600 focus-visible:ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:focus-visible:ring-amber-400/40 [a&]:hover:bg-amber-600/5 dark:[a&]:hover:bg-amber-400/5',
      }[availability];

      return <Badge className={styles}>{row.getValue('availability')}</Badge>;
    },
  },
];

const PaginatedDataTableDemo = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'product_name',
      desc: false,
    },
  ]);

  const [data, setData] = useState<Item[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch(
        'https://cdn.jsdelivr.net/gh/themeselection/fy-assets/assets/json/mobile-stock.json',
      );

      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }

      const items = await res.json();

      const data = await items.data;

      setData([...data, ...data]);
    }

    fetchPosts();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
  });

  return (
    <div className="w-full space-y-4">
      <DataTable
        table={table}
        emptyContent="No products found."
        containerClassName="overflow-hidden rounded-md border"
      />
      <TanStackTablePagination table={table} pageSizeOptions={[5, 10, 25, 50]} />
    </div>
  );
};

export default PaginatedDataTableDemo;
