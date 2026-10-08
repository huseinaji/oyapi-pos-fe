import { useMemo, useState, type FormEvent } from 'react';
import { Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '../components/ui/app-button';
import { AppDialog } from '../components/ui/app-dialog';
import { ConfirmDeleteDialog } from '../components/ui/confirm-delete-dialog';
import { PageHeader } from '../components/ui/page-header';
import { SectionCard } from '../components/ui/section-card';
import {
  useCreateItemCategoryMutation,
  useDeleteItemCategoryMutation,
  useItemCategoriesQuery,
} from '#lib/product/item-categories-store';
import type { StoreItemCategory } from '#lib/product/product-types';
import { DataTable } from '#components/ui/data-table';
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';

export default function ItemCategoriesPage() {
  const categoriesQuery = useItemCategoriesQuery();
  const createMutation = useCreateItemCategoryMutation();
  const deleteMutation = useDeleteItemCategoryMutation();
  const categories = categoriesQuery.data?.rows ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StoreItemCategory | null>(null);
  const columns = useMemo<ColumnDef<StoreItemCategory>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Category',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            type="button"
            title={`Delete ${row.original.name}`}
            aria-label={`Delete ${row.original.name}`}
            disabled={deleteMutation.isPending}
            onClick={() => setDeleteTarget(row.original)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)] disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [deleteMutation.isPending]);
  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;

    try {
      await createMutation.mutateAsync({ name });
      setCategoryName('');
      setCreateOpen(false);
      toast.success('Item category created', { description: name });
    } catch (error) {
      toast.error('Unable to create item category', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Item category deleted', { description: deleteTarget.name });
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Unable to delete item category', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Item categories"
        description={`${categories.length} categories`}
        action={
          <AppButton variant="inverted" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            <span className="ml-2">Add category</span>
          </AppButton>
        }
      />

      <SectionCard title="Categories" description="Manage the categories assigned to store items.">
        {categoriesQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading categories...</p>
        ) : categoriesQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[var(--status-danger)]">Unable to load item categories.</p>
            <AppButton variant="secondary" onClick={() => void categoriesQuery.refetch()}>
              <RefreshCw size={14} />
              <span className="ml-2">Retry</span>
            </AppButton>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Tag size={26} className="text-[var(--muted)]" />
            <p className="font-medium">No item categories yet</p>
            <AppButton onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              <span className="ml-2">Add category</span>
            </AppButton>
          </div>
        ) : (
          <DataTable
            table={table}
            emptyContent="No categories found."
            containerClassName="overflow-hidden rounded-[10px] border border-[var(--border)]"
            tableClassName="min-w-[420px]"
          />
        )}
      </SectionCard>

      <AppDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New item category"
        description="Add a category for items in this store."
        size="sm"
      >
        <form className="space-y-4" onSubmit={(event) => void handleCreate(event)}>
          <label className="block text-sm font-medium" htmlFor="item-category-name">
            Category name
          </label>
          <input
            id="item-category-name"
            autoFocus
            required
            maxLength={100}
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="e.g. Beverages"
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={!categoryName.trim() || createMutation.isPending}>
              <Plus size={14} />
              <span className="ml-2">Create</span>
            </AppButton>
          </div>
        </form>
      </AppDialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete item category?"
        description="Items assigned to this category may become uncategorized."
        itemName={deleteTarget?.name}
      />
    </div>
  );
}