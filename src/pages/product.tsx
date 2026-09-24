import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  PencilLine,
  PackageOpen,
  Save,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '../components/ui/app-button';
import { AppDialog } from '../components/ui/app-dialog';
import { ConfirmDeleteDialog } from '../components/ui/confirm-delete-dialog';
import { PageHeader } from '../components/ui/page-header';
import { Pagination } from '../components/ui/pagination';
import { RowActions } from '../components/ui/row-actions';
import { SectionCard } from '../components/ui/section-card';
import { AppSelect } from '../components/ui/app-select';
import { TableSkeleton, CardGridSkeleton } from '../components/ui/skeleton';
import { usePagination } from '../hooks/use-pagination';

import { ApiError } from '../lib/api-client';
import type {
  ApiItem,
  CreateItemDto,
  ItemCategory,
  ItemUom,
} from '../types/api';
import {
  ITEM_CATEGORY_LABELS,
  ITEM_CATEGORY_OPTIONS,
  ITEM_UOM_LABELS,
  ITEM_UOM_OPTIONS,
} from '../types/api';
import { formatRp } from '../lib/transaction-utils';
import { Field, FieldContent, FieldTitle, FieldDescription } from '#components/ui/field';
import { Checkbox } from '#components/ui/checkbox';
import { useProductStore } from '#lib/product/product-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemForm = {
  name: string;
  category: string;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
};

type FormErrors = Partial<Record<keyof ItemForm, string>>;
type SortField = 'name' | 'category' | 'uom' | 'sellingPrice' | 'basePrice';
type SortDir = 'asc' | 'desc';

const emptyForm: ItemForm = {
  name: '',
  category: ITEM_CATEGORY_OPTIONS[0],
  uom: ITEM_UOM_OPTIONS[0],
  basePrice: 0,
  sellingPrice: 0,
  isMaintainStock: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCategory(category: string): string {
  return ITEM_CATEGORY_LABELS[category as ItemCategory] ?? category;
}

function formatUom(uom: string): string {
  return ITEM_UOM_LABELS[uom as ItemUom] ?? uom.toUpperCase();
}

function validateForm(form: ItemForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Product name is required.';
  if (form.sellingPrice <= 0)
    errors.sellingPrice = 'Selling price must be greater than 0.';
  if (form.basePrice < 0) errors.basePrice = 'Base price cannot be negative.';
  return errors;
}

function itemToForm(item: ApiItem): ItemForm {
  return {
    name: item.name,
    category: item.category,
    uom: item.uom,
    basePrice: item.basePrice,
    sellingPrice: item.sellingPrice,
    isMaintainStock: item.isMaintainStock,
  };
}

function formToDto(form: ItemForm): CreateItemDto {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    uom: form.uom.trim(),
    basePrice: form.basePrice,
    sellingPrice: form.sellingPrice,
    isMaintainStock: form.isMaintainStock,
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
  const items = useProductStore((state) => state.items);
  const isLoading = useProductStore((state) => state.isLoading);
  const storeError = useProductStore((state) => state.error);
  const fetchItems = useProductStore((state) => state.fetchItems);
  const addItem = useProductStore((state) => state.addItem);
  const updateItem = useProductStore((state) => state.updateItem);
  const deleteItem = useProductStore((state) => state.deleteItem);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<ApiItem | null>(null);
  const [formState, setFormState] = useState<ItemForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Fetch products on mount
  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Unique categories derived from loaded items
  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(items.map((item) => item.category))).sort();
    return cats;
  }, [items]);

  const filterOptions = useMemo(
    () => ['All', ...categoryOptions],
    [categoryOptions],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery = item.name
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [items, query, selectedCategory]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'uom':
          cmp = a.uom.localeCompare(b.uom);
          break;
        case 'sellingPrice':
          cmp = a.sellingPrice - b.sellingPrice;
          break;
        case 'basePrice':
          cmp = a.basePrice - b.basePrice;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, sortField, sortDir]);

  const {
    page,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: pageItems,
    setPage,
    setPageSize,
    resetPage,
  } = usePagination(sortedItems, 10);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    resetPage();
  };

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  const openNew = () => {
    setEditingId(null);
    setFormState({ ...emptyForm });
    setFormErrors({});
    setFormApiError(null);
    setFormOpen(true);
  };

  const openEdit = (item: ApiItem) => {
    setEditingId(item.id);
    setFormState(itemToForm(item));
    setFormErrors({});
    setFormApiError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormErrors({});
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

  const handleSave = async () => {
    const nextErrors = validateForm(formState);
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    setFormApiError(null);
    try {
      const dto = formToDto(formState);
      if (editingId) {
        await updateItem(editingId, dto);
        toast.success('Product updated', {
          description: `"${formState.name}" saved.`,
        });
      } else {
        await addItem(dto);
        toast.success('Product created', {
          description: `"${formState.name}" added to catalog.`,
        });
      }
      closeForm();
    } catch (err) {
      setFormApiError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteItem(deletingItem.id);
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

  const updateField = <K extends keyof ItemForm>(
    key: K,
    value: ItemForm[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key])
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description={`${items.length} items in catalog`}
        action={
          <div className='hidden md:block'>
            <AppButton
              variant="inverted"
              onClick={openNew}
              disabled={isLoading}
            >
              <Plus size={14} />
              <span className="ml-2">Add product</span>
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
              onChange={(e) => setQuery(e.target.value)}
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
                {cat === 'All' ? cat : formatCategory(cat)}
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
              Failed to load products. Please try again.
            </p>
            <AppButton variant="secondary" onClick={() => void fetchItems()}>
              <RefreshCw size={14} />
              <span className="ml-2">Retry</span>
            </AppButton>
          </div>
        )}

        {/* Desktop table */}
        {!isLoading && !storeError && (
          <>
            <div className="mt-4 hidden overflow-hidden rounded-[12px] border border-[var(--border)] md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
                  <tr>
                    <SortTh
                      label="Name"
                      field="name"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="Category"
                      field="category"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="UOM"
                      field="uom"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="Base Price"
                      field="basePrice"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="Selling Price"
                      field="sellingPrice"
                      current={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="cursor-pointer border-t border-[var(--border)] transition hover:bg-[var(--surface-muted)]/60"
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        {formatCategory(item.category)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {formatUom(item.uom)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {formatRp(item.basePrice)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatRp(item.sellingPrice)}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActions
                          label={`Actions for ${item.name}`}
                          actions={[
                            {
                              label: 'Edit',
                              icon: PencilLine,
                              onClick: () => openEdit(item),
                            },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              danger: true,
                              onClick: () => openDeleteConfirm(item),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[var(--border)] px-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>

            {/* Compact mobile table */}
            <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] md:hidden">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(70px,0.8fr)_auto] gap-2 bg-[var(--surface-muted)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <span>Product</span>
                <span>Price</span>
                <span className="text-right">Actions</span>
              </div>
              {pageItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ')
                      openEdit(item);
                  }}
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(70px,0.8fr)_auto] items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left transition hover:bg-[var(--surface-muted)]/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      {formatCategory(item.category)} · {formatUom(item.uom)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--accent)]">
                      {formatRp(item.sellingPrice)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Base {formatRp(item.basePrice)}
                    </p>
                  </div>
                  <div onClick={(event) => event.stopPropagation()}>
                    <RowActions
                      label={`Actions for ${item.name}`}
                      actions={[
                        {
                          label: 'Edit',
                          icon: PencilLine,
                          onClick: () => openEdit(item),
                        },
                        {
                          label: 'Delete',
                          icon: Trash2,
                          danger: true,
                          onClick: () => openDeleteConfirm(item),
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-2 md:hidden">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setPage}
                />
              </div>
            )}

            {filteredItems.length === 0 && !isLoading && (
              <div className="mt-6 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] p-8 text-center">
                <PackageOpen className="mb-3 text-[var(--accent)]" size={28} />
                <p className="font-medium">No products matched your search.</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Try another keyword or add a new product.
                </p>
                <div className="mt-4 hidden md:block">
                  <AppButton variant="primary" onClick={openNew}>
                    <Plus size={14} />
                    <span className="ml-2">Add product</span>
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
        title={editingId ? 'Edit product' : 'New product'}
        description="Fill in product details. Required fields are marked."
        size="lg"
      >
        {formApiError && (
          <div className="mb-4 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3 text-sm text-[var(--status-danger)]">
            {formApiError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product name" required error={formErrors.name}>
            <input
              value={formState.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Caffè Latte"
              className={inputClass(!!formErrors.name)}
            />
          </FormField>

          <FormField label="Category" required error={formErrors.category}>
            <AppSelect
              value={formState.category}
              onValueChange={(value) => updateField('category', value)}
              options={[
                { value: '', label: 'Select category…', disabled: true },
                ...ITEM_CATEGORY_OPTIONS.map((category) => ({
                  value: category,
                  label: formatCategory(category),
                })),
              ]}
              className={selectClass()}
            />
          </FormField>

          <FormField
            label="Unit of Measure (UOM)"
            required
            error={formErrors.uom}
          >
            <AppSelect
              value={formState.uom}
              onValueChange={(value) => updateField('uom', value)}
              options={[
                { value: '', label: 'Select UOM…', disabled: true },
                ...ITEM_UOM_OPTIONS.map((uom) => ({
                  value: uom,
                  label: formatUom(uom),
                })),
              ]}
              className={selectClass()}
            />
          </FormField>

          <FormField label="Base Price (Rp)" error={formErrors.basePrice}>
            <input
              type="number"
              min={0}
              value={formState.basePrice || ''}
              onChange={(e) => updateField('basePrice', Number(e.target.value))}
              placeholder="0"
              className={inputClass(!!formErrors.basePrice)}
            />
          </FormField>

          <FormField
            label="Selling Price (Rp)"
            required
            error={formErrors.sellingPrice}
          >
            <input
              type="number"
              min={0}
              value={formState.sellingPrice || ''}
              onChange={(e) =>
                updateField('sellingPrice', Number(e.target.value))
              }
              placeholder="0"
              className={inputClass(!!formErrors.sellingPrice)}
            />
          </FormField>
          <Field orientation="horizontal">
            <Checkbox
              id="terms-checkbox"
              name="terms-checkbox"
              checked={formState.isMaintainStock}
              onCheckedChange={(e) =>
                updateField('isMaintainStock', e === true)
              }
            />
            <FieldContent>
              <FieldTitle>Maintain Stock</FieldTitle>
              <FieldDescription>
                If checked, stock will be inject and will be able use for POS transaction
              </FieldDescription>
            </FieldContent>
          </Field>
        </div>

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
            onClick={() => void handleSave()}
            disabled={isSaving}
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

      {/* Mobile FAB */}
      <button
        onClick={openNew}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--accent-foreground)] shadow-[0_0_6px_rgba(0,0,0,0.24),0_8px_12px_rgba(0,0,0,0.14)] transition active:scale-95 md:hidden"
        aria-label="Add product"
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

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--status-danger)]"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-[var(--status-danger)]">{error}</p>
      )}
    </div>
  );
}

function SortTh({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 transition hover:text-[var(--foreground)]"
      >
        {label}
        <span className="text-[10px]">
          {active ? (
            dir === 'asc' ? (
              '▲'
            ) : (
              '▼'
            )
          ) : (
            <span className="opacity-30">▲▼</span>
          )}
        </span>
      </button>
    </th>
  );
}
