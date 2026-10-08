import type { ReactNode } from 'react';
import {
  flexRender,
  type Table as TanStackTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

type DataTableProps<TData> = {
  table: TanStackTable<TData>;
  emptyContent?: ReactNode;
  containerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: TData) => string | undefined);
  onRowClick?: (row: TData) => void;
  footer?: ReactNode;
  showHeader?: boolean;
};

export function DataTable<TData>({
  table,
  emptyContent = 'No results.',
  containerClassName,
  tableClassName,
  headerClassName,
  rowClassName,
  onRowClick,
  footer,
  showHeader = true,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('w-full', containerClassName)}>
      <Table className={cn('text-sm', tableClassName)}>
        {showHeader && (
          <TableHeader className={cn('bg-[var(--surface-muted)]', headerClassName)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const content = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );

                  return (
                    <TableHead
                      key={header.id}
                      className="h-11"
                    >
                      {content}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
        )}
        <TableBody>
          {rows.length ? (
            rows.map((row) => {
              const customRowClassName =
                typeof rowClassName === 'function'
                  ? rowClassName(row.original)
                  : rowClassName;

              return (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    customRowClassName,
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-24 text-center text-[var(--muted)]"
              >
                {emptyContent}
              </TableCell>
            </TableRow>
          )}
          {footer}
        </TableBody>
      </Table>
    </div>
  );
}