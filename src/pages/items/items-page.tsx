import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import {
  Search,
  Plus,
  Trash2,
  PencilLine,
  PackageOpen,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import { AppDialog } from '@/components/ui/app-dialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { RowActions } from '@/components/ui/row-actions';
import { SectionCard } from '@/components/ui/section-card';
import { AppSelect } from '@/components/ui/app-select';
import { TableSkeleton, CardGridSkeleton } from '@/components/ui/skeleton';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';

import { ApiError } from '@/lib/api';
import type {
  ApiItem,
  CreateItemDto,
  ItemType,
  ItemUom,
  ItemBundleComponentDto,
  UpdateItemDto,
} from '@/lib/product/product-types';
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPE_OPTIONS,
  ITEM_UOM_LABELS,
  ITEM_UOM_OPTIONS,
} from '@/lib/product/product-types';
import { formatRp } from '@/lib/transaction-utils';
import {
  Field,
  FieldContent,
  FieldTitle,
  FieldDescription,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useProductsQuery,
  useUpdateProductMutation,
} from '@/lib/product/product-store';
import { FormField } from '@/components/layout/form-field';
import { useItemCategoriesQuery } from '@/lib/product/item-categories-store';
import { ItemsPagination } from './items-pagination';
import { ItemDetailDrawer } from './item-detail-drawer';
import { TransactionsTable } from '../transactions/transactions-table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const itemSchema = z
  .object({
    name: z.string().trim().min(1, 'Item name is required.'),
    imageUrl: z.string().optional(),
    type: z.string().min(1, 'Item type is required.'),
    categoryId: z.string().optional(),
    uom: z.string().min(1, 'Unit of measure is required.'),
    basePrice: z.number().min(0, 'Base price cannot be negative.'),
    sellingPrice: z.number().positive('Selling price must be greater than 0.'),
    isMaintainStock: z.boolean(),
    initialStock: z.number().int().min(0, 'Initial stock cannot be negative.'),
    itemComponents: z.array(
      z.object({
        componentItemId: z.string().min(1, 'Select a component item.'),
        qty: z.number().min(1, 'Quantity must be at least 1.'),
      }),
    ),
  })
  .superRefine((form, context) => {
    if (form.type !== 'item_bundle') return;

    const selectedComponentIds = new Set<string>();
    form.itemComponents.forEach((component, index) => {
      if (!component.componentItemId) {
        context.addIssue({
          code: 'custom',
          path: ['itemComponents', index, 'componentItemId'],
          message: 'Select a component item.',
        });
      } else if (selectedComponentIds.has(component.componentItemId)) {
        context.addIssue({
          code: 'custom',
          path: ['itemComponents', index, 'componentItemId'],
          message: 'Each component item can only be added once.',
        });
      }
      selectedComponentIds.add(component.componentItemId);
    });
  });

type ItemForm = z.infer<typeof itemSchema>;

const emptyForm: ItemForm = {
  name: '',
  imageUrl: '',
  type: ITEM_TYPE_OPTIONS[0],
  categoryId: '',
  uom: ITEM_UOM_OPTIONS[0],
  basePrice: 0,
  sellingPrice: 0,
  isMaintainStock: false,
  initialStock: 0,
  itemComponents: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatItemType(type: string): string {
  return ITEM_TYPE_LABELS[type as ItemType] ?? type;
}

function formatUom(uom: string): string {
  return ITEM_UOM_LABELS[uom as ItemUom] ?? uom.toUpperCase();
}

function itemToForm(item: ApiItem): ItemForm {
  return {
    name: item.name,
    imageUrl: item.imageUrl ?? '',
    type: item.type ?? ITEM_TYPE_OPTIONS[0],
    categoryId: item.categoryId ?? '',
    uom: item.uom,
    basePrice: item.basePrice,
    sellingPrice: item.sellingPrice,
    isMaintainStock: item.isMaintainStock,
    initialStock: 0,
    itemComponents: (item.itemComponents ?? []).map(
      ({ componentItemId, qty }) => ({ componentItemId, qty }),
    ),
  };
}

function formToDto(form: ItemForm): CreateItemDto {
  return {
    name: form.name.trim(),
    ...(form.imageUrl?.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
    type: form.type.trim(),
    ...(form.categoryId ? { categoryId: form.categoryId } : {}),
    uom: form.uom.trim(),
    basePrice: form.basePrice,
    sellingPrice: form.sellingPrice,
    isMaintainStock: form.type === 'item_bundle' ? false : form.isMaintainStock,
    ...(form.type === 'item_bundle'
      ? {
          itemComponents: form.itemComponents.map(
            ({ componentItemId, qty }): ItemBundleComponentDto => ({
              componentItemId,
              qty,
            }),
          ),
        }
      : { initialStock: form.initialStock }),
  };
}

function formToUpdateDto(form: ItemForm): UpdateItemDto {
  const { initialStock: _initialStock, ...updateDto } = formToDto(form);
  return {
    ...updateDto,
    imageUrl: form.imageUrl?.trim() ?? '',
  };
}

function extractApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const navigate = useNavigate();
  const productsQuery = useProductsQuery();
  const categoriesQuery = useItemCategoriesQuery();
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();
  const items = productsQuery.data?.rows ?? [];
  const categories = categoriesQuery.data?.rows ?? [];
  const rawMaterialItems = useMemo(
    () => items.filter((item) => item.type === 'raw_material'),
    [items],
  );
  const isLoading = productsQuery.isLoading;
  const storeError = productsQuery.isError ? 'Failed to load items' : null;

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<ApiItem | null>(null);
  const [detailItem, setDetailItem] = useState<ApiItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: {
      errors: formErrors,
      isDirty: isFormDirty,
      isSubmitting: isSaving,
    },
  } = useForm<ItemForm, unknown, ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: emptyForm,
  });
  const {
    fields: componentFields,
    append: appendComponent,
    remove: removeComponent,
  } = useFieldArray({ control, name: 'itemComponents' });
  const imageUrl = watch('imageUrl');
  const selectedItemType = watch('type');
  const isBundle = selectedItemType === 'item_bundle';
  const selectedComponents = watch('itemComponents');

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      toast.error('Image must be smaller than 1.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setValue('imageUrl', reader.result, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    };
    reader.onerror = () => toast.error('Unable to read the image file.');
    reader.readAsDataURL(file);
  };

  // Unique categories derived from loaded items
  const filterOptions = useMemo(
    () => ['All', ...categories.map((category) => category.id)],
    [categories],
  );

  const getCategoryName = (item: ApiItem) =>
    item.category?.name ??
    categories.find((category) => category.id === item.categoryId)?.name ??
    'Uncategorized';

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery = item.name
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || item.categoryId === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [items, query, selectedCategory]);

  const pageSize = pagination.pageSize;
  const resetPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  const paginatedItems = useMemo(
    () =>
      filteredItems.slice(
        pagination.pageIndex * pageSize,
        (pagination.pageIndex + 1) * pageSize,
      ),
    [filteredItems, pageSize, pagination.pageIndex],
  );
  useEffect(() => {
    const lastPageIndex = Math.max(
      0,
      Math.ceil(filteredItems.length / pageSize) - 1,
    );

    if (pagination.pageIndex > lastPageIndex) {
      setPagination((current) => ({ ...current, pageIndex: lastPageIndex }));
    }
  }, [filteredItems.length, pageSize, pagination.pageIndex]);

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  const openNew = () => {
    setEditingId(null);
    reset(emptyForm);
    setFormApiError(null);
    setFormOpen(true);
  };

  const openEdit = (item: ApiItem) => {
    setDetailOpen(false);
    setEditingId(item.id);
    reset(itemToForm(item));
    setFormApiError(null);
    setFormOpen(true);
  };

  const openDetail = (item: ApiItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormApiError(null);
  };

  const openDeleteConfirm = (item: ApiItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteOpen(false);
    setDeletingItem(null);
  };

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const handleSave = async (formState: ItemForm) => {
    setFormApiError(null);
    if (
      formState.type === 'item_bundle' &&
      formState.itemComponents.length === 0
    ) {
      setError('itemComponents', {
        type: 'manual',
        message: 'Add at least one component item to this bundle.',
      });
      return;
    }

    try {
      const dto = formToDto(formState);
      if (editingId) {
        await updateProductMutation.mutateAsync({
          id: editingId,
          body: formToUpdateDto(formState),
        });
        toast.success('Product updated', {
          description: `"${formState.name}" saved.`,
        });
      } else {
        await createProductMutation.mutateAsync(dto);
        toast.success('Product created', {
          description: `"${formState.name}" added to catalog.`,
        });
      }
      closeForm();
    } catch (err) {
      setFormApiError(extractApiError(err));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteProductMutation.mutateAsync(deletingItem.id);
      toast.success('Product deleted', {
        description: `"${deletingItem.name}" removed from catalog.`,
      });
      closeDeleteConfirm();
    } catch (err) {
      toast.error('Failed to delete product', {
        description: extractApiError(err),
      });
    }
  };

  const handleToggleItemStatus = async (item: ApiItem) => {
    const nextStatus =
      item.status?.toLowerCase() === 'inactive' ? 'active' : 'inactive';

    try {
      await updateProductMutation.mutateAsync({
        id: item.id,
        body: { status: nextStatus },
      });
      console.log(item);
      setDetailItem((current) =>
        current?.id === item.id ? { ...current, status: nextStatus } : current,
      );
      toast.success(
        nextStatus === 'active' ? 'Item enabled' : 'Item disabled',
        {
          description: `"${item.name}" is now ${nextStatus}.`,
        },
      );
    } catch (err) {
      toast.error(
        nextStatus === 'active'
          ? 'Failed to enable item'
          : 'Failed to disable item',
        { description: extractApiError(err) },
      );
    }
  };

  const desktopColumns = useMemo<ColumnDef<ApiItem>[]>(
    () => [
      {
        id: 'number',
        enableSorting: false,
        header: () => <span className="block text-center">No.</span>,
        cell: ({ row }) => (
          <div className="text-center text-[var(--muted)]">
            {pagination.pageIndex * pageSize + row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="max-w-0 truncate font-medium text-[var(--foreground)]">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorFn: (item) => formatItemType(item.type ?? ''),
        id: 'type',
        header: 'Item type',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">
            {formatItemType(row.original.type ?? '')}
          </span>
        ),
      },
      {
        accessorFn: (item) => getCategoryName(item),
        id: 'category',
        header: 'Category',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[12rem] truncate text-[var(--muted)]">
            {getCategoryName(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'uom',
        header: 'UOM',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-[var(--muted)]">
            {formatUom(row.original.uom)}
          </span>
        ),
      },
      {
        accessorKey: 'sellingPrice',
        header: 'Selling price',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-[var(--foreground)]">
            {formatRp(row.original.sellingPrice)}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <RowActions
              label={`Actions for ${row.original.name}`}
              actions={[
                {
                  label: 'Edit',
                  icon: PencilLine,
                  onClick: () => void openEdit(row.original),
                },
                {
                  label:
                    row.original.status?.toLowerCase() === 'inactive'
                      ? 'Enable'
                      : 'Disable',
                  icon:
                    row.original.status?.toLowerCase() === 'inactive'
                      ? Eye
                      : EyeOff,
                  disabled: updateProductMutation.isPending,
                  onClick: () => void handleToggleItemStatus(row.original),
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: () => openDeleteConfirm(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [
      getCategoryName,
      handleToggleItemStatus,
      openDeleteConfirm,
      openEdit,
      pageSize,
      pagination.pageIndex,
      updateProductMutation.isPending,
    ],
  );
  const mobileColumns = useMemo<ColumnDef<ApiItem>[]>(
    () => [
      {
        id: 'number',
        enableSorting: false,
        header: () => <span className="block text-center">No.</span>,
        cell: ({ row }) => (
          <div className="text-center text-xs text-[var(--muted)]">
            {pagination.pageIndex * pageSize + row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Product',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {row.original.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {formatItemType(row.original.type ?? '')} ·{' '}
              {getCategoryName(row.original)} · {formatUom(row.original.uom)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'sellingPrice',
        header: 'Price',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="overflow-hidden">
            <p className="whitespace-nowrap text-sm font-semibold text-[var(--accent)]">
              {formatRp(row.original.sellingPrice)}
            </p>
          </div>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        header: '',
        cell: ({ row }) => (
          <div
            className="text-right"
            onClick={(event) => event.stopPropagation()}
          >
            <RowActions
              label={`Actions for ${row.original.name}`}
              actions={[
                {
                  label: 'Edit',
                  icon: PencilLine,
                  onClick: () => void openEdit(row.original),
                },
                {
                  label:
                    row.original.status?.toLowerCase() === 'inactive'
                      ? 'Enable'
                      : 'Disable',
                  icon:
                    row.original.status?.toLowerCase() === 'inactive'
                      ? Eye
                      : EyeOff,
                  disabled: updateProductMutation.isPending,
                  onClick: () => void handleToggleItemStatus(row.original),
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: () => openDeleteConfirm(row.original),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [
      getCategoryName,
      handleToggleItemStatus,
      openDeleteConfirm,
      openEdit,
      pageSize,
      pagination.pageIndex,
      updateProductMutation.isPending,
    ],
  );
  const desktopTable = useReactTable({
    data: paginatedItems,
    columns: desktopColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (item) => item.id,
  });
  const mobileTable = useReactTable({
    data: paginatedItems,
    columns: mobileColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (item) => item.id,
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Items"
        description={`${items.length} items in catalog`}
        action={
          <div className="hidden md:block">
            <AppButton
              variant="inverted"
              onClick={openNew}
              disabled={isLoading}
            >
              <Plus size={14} />
              <span className="ml-2">Add item</span>
            </AppButton>
          </div>
        }
      />

      <SectionCard
        title="Catalog"
        description="Search, filter, and manage your product inventory."
      >
        {/* Search + filter */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder="Search by name…"
              className="w-full bg-transparent outline-none"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  resetPage();
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40'
                }`}
              >
                {cat === 'All'
                  ? cat
                  : (categories.find((category) => category.id === cat)?.name ??
                    cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-6">
            <div className="hidden md:block">
              <TableSkeleton rows={6} cols={6} />
            </div>
            <div className="md:hidden">
              <CardGridSkeleton count={4} />
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && storeError && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-6 text-center">
            <p className="text-sm font-medium text-[var(--status-danger)]">
              Failed to load items. Please try again.
            </p>
            <AppButton
              variant="secondary"
              onClick={() => void productsQuery.refetch()}
            >
              <RefreshCw size={14} />
              <span className="ml-2">Retry</span>
            </AppButton>
          </div>
        )}

        {!isLoading && !storeError && (
          <>
            {filteredItems.length > 0 && (
              <div>
                <TransactionsTable
                  desktopTable={desktopTable}
                  mobileTable={mobileTable}
                  onRowClick={openDetail}
                />

                <ItemsPagination
                  desktopTable={desktopTable}
                  mobileTable={mobileTable}
                  pagination={pagination}
                  totalItems={filteredItems.length}
                  onPageChange={(pageIndex) =>
                    setPagination((current) => ({ ...current, pageIndex }))
                  }
                />
              </div>
            )}

            {filteredItems.length === 0 && !isLoading && (
              <div className="mt-6 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center">
                <PackageOpen className="mb-3 text-[var(--accent)]" size={28} />
                <p className="font-medium">No items matched your search.</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Try another keyword or add a new item.
                </p>
                <div className="mt-4 hidden md:block">
                  <AppButton variant="primary" onClick={openNew}>
                    <Plus size={14} />
                    <span className="ml-2">Add item</span>
                  </AppButton>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* Create / Edit dialog */}
      <AppDialog
        open={formOpen}
        onClose={closeForm}
        title={editingId ? 'Edit item' : 'New item'}
        description="Fill in item details. Required fields are marked."
        size="lg"
      >
        {formApiError && (
          <div className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">
            {formApiError}
          </div>
        )}

        <form
          id="product-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            void handleSubmit(handleSave)(event);
          }}
        >
          <FormField
            label="Item name"
            required
            error={formErrors.name?.message}
          >
            <input
              {...register('name')}
              placeholder="e.g. Caffè Latte"
              className={inputClass(!!formErrors.name)}
            />
          </FormField>

          <FormField label="Item image">
            <div className="space-y-2">
              <input
                {...register('imageUrl')}
                type="text"
                inputMode="url"
                placeholder="Paste an image URL"
                className={inputClass(false)}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--accent)]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="sr-only"
                />
                <span className="rounded-full border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-muted)]">
                  Upload image
                </span>
                <span className="text-xs text-[var(--muted)]">Max 1.5 MB</span>
              </label>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Item preview"
                  className="h-24 w-32 rounded-[8px] border border-[var(--border)] object-cover"
                />
              )}
            </div>
          </FormField>

          <FormField
            label="Item type"
            required
            error={formErrors.type?.message}
          >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: '', label: 'Select category…', disabled: true },
                    ...ITEM_TYPE_OPTIONS.map((type) => ({
                      value: type,
                      label: formatItemType(type),
                    })),
                  ]}
                  className={selectClass()}
                />
              )}
            />
          </FormField>

          <FormField label="Item category">
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={[
                    { value: '', label: 'Uncategorized' },
                    ...categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                  className={selectClass()}
                  disabled={categoriesQuery.isLoading}
                />
              )}
            />
          </FormField>

          <FormField
            label="Unit of Measure (UOM)"
            required
            error={formErrors.uom?.message}
          >
            <Controller
              name="uom"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: '', label: 'Select UOM…', disabled: true },
                    ...ITEM_UOM_OPTIONS.map((uom) => ({
                      value: uom,
                      label: formatUom(uom),
                    })),
                  ]}
                  className={selectClass()}
                />
              )}
            />
          </FormField>

          {isBundle && (
            <div className="space-y-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Bundle components</p>
                  <p className="text-xs text-[var(--muted)]">
                    Choose existing items and the quantity included in one
                    bundle.
                  </p>
                </div>
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    appendComponent({ componentItemId: '', qty: 1 });
                    clearErrors('itemComponents');
                  }}
                  disabled={
                    rawMaterialItems.length === 0 || productsQuery.isLoading
                  }
                >
                  <Plus size={14} />
                  <span className="ml-2">Add component</span>
                </AppButton>
              </div>

              {formErrors.itemComponents?.message && (
                <p className="text-xs text-[var(--status-danger)]">
                  {formErrors.itemComponents.message}
                </p>
              )}
              {productsQuery.isError && (
                <p className="text-xs text-[var(--status-danger)]">
                  Unable to load items for the bundle. Try again after reloading
                  the catalog.
                </p>
              )}

              {componentFields.map((component, index) => {
                const selectedId = selectedComponents[index]?.componentItemId;
                const existingComponent = items
                  .find((item) => item.id === editingId)
                  ?.itemComponents?.find(
                    (itemComponent) =>
                      itemComponent.componentItemId === selectedId,
                  );
                const componentError =
                  formErrors.itemComponents?.[index]?.componentItemId?.message;
                const quantityError =
                  formErrors.itemComponents?.[index]?.qty?.message;
                const componentOptions = rawMaterialItems
                  .filter(
                    (item) =>
                      item.id === selectedId ||
                      !selectedComponents.some(
                        (selected, selectedIndex) =>
                          selectedIndex !== index &&
                          selected.componentItemId === item.id,
                      ),
                  )
                  .map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${formatItemType(item.type ?? '')}`,
                  }));

                return (
                  <div
                    key={component.id}
                    className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-start"
                  >
                    <FormField
                      label={`Component item ${index + 1}`}
                      required
                      error={componentError}
                    >
                      <Controller
                        name={`itemComponents.${index}.componentItemId`}
                        control={control}
                        render={({ field }) => (
                          <AppSelect
                            value={field.value}
                            valueLabel={
                              existingComponent?.componentItem?.name
                                ? `${existingComponent.componentItem.name} · existing component`
                                : undefined
                            }
                            onValueChange={field.onChange}
                            placeholder={
                              productsQuery.isLoading
                                ? 'Loading items…'
                                : componentOptions.length
                                  ? 'Select an item'
                                  : 'No component items available'
                            }
                            options={componentOptions}
                            disabled={
                              productsQuery.isLoading ||
                              rawMaterialItems.length === 0
                            }
                            className={selectClass()}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="Quantity" required error={quantityError}>
                      <Controller
                        name={`itemComponents.${index}.qty`}
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            min={1}
                            step="any"
                            value={field.value}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                            className={inputClass(!!quantityError)}
                          />
                        )}
                      />
                    </FormField>

                    <button
                      type="button"
                      onClick={() => {
                        removeComponent(index);
                        clearErrors('itemComponents');
                      }}
                      aria-label={`Remove component ${index + 1}`}
                      className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--status-danger)] transition hover:bg-[var(--status-danger)]/5 sm:mt-6"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <FormField
            label="Base Price (Rp)"
            error={formErrors.basePrice?.message}
          >
            <Controller
              name="basePrice"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  value={field.value || ''}
                  onChange={(event) =>
                    field.onChange(Number(event.target.value))
                  }
                  placeholder="0"
                  className={inputClass(!!formErrors.basePrice)}
                />
              )}
            />
          </FormField>

          <FormField
            label="Selling Price (Rp)"
            required
            error={formErrors.sellingPrice?.message}
          >
            <Controller
              name="sellingPrice"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  min={0}
                  value={field.value || ''}
                  onChange={(event) =>
                    field.onChange(Number(event.target.value))
                  }
                  placeholder="0"
                  className={inputClass(!!formErrors.sellingPrice)}
                />
              )}
            />
          </FormField>

          {!isBundle && (
            <Controller
              name="isMaintainStock"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id="maintain-stock"
                    name={field.name}
                    checked={field.value}
                    onBlur={field.onBlur}
                    onCheckedChange={field.onChange}
                  />
                  <FieldContent>
                    <FieldTitle>Maintain Stock</FieldTitle>
                    <FieldDescription className="text-[var(--muted-2)]">
                      If checked, stock will be injected and available for POS
                      transactions.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          )}
          {!editingId && !isBundle && (
            <FormField
              label="Initial Stock"
              required
              error={formErrors.initialStock?.message}
            >
              <Controller
                name="initialStock"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={field.value || ''}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                    placeholder="0"
                    className={inputClass(!!formErrors.initialStock)}
                  />
                )}
              />
            </FormField>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AppButton
              variant="secondary"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              type="submit"
              disabled={isSaving || (Boolean(editingId) && !isFormDirty)}
            >
              <Save size={14} />
              <span className="ml-2">
                {isSaving
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Create product'}
              </span>
            </AppButton>
          </div>
        </form>
      </AppDialog>

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={() => void handleConfirmDelete()}
        title="Delete product"
        description="Are you sure you want to delete this product from the catalog?"
        itemName={deletingItem?.name}
      />
      <ItemDetailDrawer
        item={detailItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(item) => void openEdit(item)}
        onToggleStatus={(item) => void handleToggleItemStatus(item)}
        isUpdatingStatus={updateProductMutation.isPending}
        onViewFull={(item) => {
          setDetailOpen(false);
          navigate(`/products/${item.id}`);
        }}
      />

      {/* Mobile FAB */}
      <button
        onClick={openNew}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--accent-foreground)] shadow-[0_0_6px_rgba(0,0,0,0.24),0_8px_12px_rgba(0,0,0,0.14)] transition active:scale-95 md:hidden"
        aria-label="Add item"
      >
        <Plus size={22} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function inputClass(hasError: boolean) {
  return `w-full rounded-[12px] border bg-[var(--surface-muted)] px-4 py-3 text-sm outline-none transition focus:ring-2 ${
    hasError
      ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/15'
      : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15'
  }`;
}

function selectClass() {
  return 'w-full rounded-[12px] bg-[var(--surface-muted)]';
}
