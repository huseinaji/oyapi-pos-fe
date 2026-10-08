import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, CalendarDays, Package, PencilLine, Save, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AppButton } from '../components/ui/app-button';
import { AppSelect } from '../components/ui/app-select';
import { Checkbox } from '../components/ui/checkbox';
import { FormField } from '../components/layout/form-field';
import { PageHeader } from '../components/ui/page-header';
import { SectionCard } from '../components/ui/section-card';
import { useProductQuery, useUpdateProductMutation } from '#lib/product/product-store';
import { useUIStore } from '../stores/ui-store';
import type { ApiItem, ItemType, ItemUom, UpdateItemDto } from '#lib/product/product-types';
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPE_OPTIONS,
  ITEM_UOM_LABELS,
  ITEM_UOM_OPTIONS,
} from '#lib/product/product-types';
import { formatRp } from '../lib/transaction-utils';
import { useItemCategoriesQuery } from '#lib/product/item-categories-store';

function formatItemType(type: string) {
  return ITEM_TYPE_LABELS[type as ItemType] ?? type;
}

function formatUom(uom: string) {
  return ITEM_UOM_LABELS[uom as ItemUom] ?? uom.toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

type ProductForm = {
  name: string;
  type: string;
  categoryId: string;
  uom: string;
  description: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
};

function toForm(item: ApiItem): ProductForm {
  return {
    name: item.name,
    type: item.type ?? ITEM_TYPE_OPTIONS[0],
    categoryId: item.categoryId ?? '',
    uom: item.uom,
    description: item.description ?? '',
    basePrice: item.basePrice,
    sellingPrice: item.sellingPrice,
    isMaintainStock: item.isMaintainStock,
  };
}

function changedFields(initial: ProductForm, current: ProductForm): UpdateItemDto {
  const changes: UpdateItemDto = {};
  (Object.keys(current) as Array<keyof ProductForm>).forEach((key) => {
    if (initial[key] !== current[key]) changes[key] = current[key] as never;
  });
  return changes;
}

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProductQuery(id);
  const updateProductMutation = useUpdateProductMutation();
  const categoriesQuery = useItemCategoriesQuery();
  const categories = categoriesQuery.data?.rows ?? [];
  const theme = useUIStore((state) => state.theme);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialForm, setInitialForm] = useState<ProductForm | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);

  useEffect(() => {
    if (!product) return;
    const nextForm = toForm(product);
    setInitialForm(nextForm);
    setForm(nextForm);
  }, [product]);

  const changes = useMemo(
    () => (initialForm && form ? changedFields(initialForm, form) : {}),
    [form, initialForm],
  );
  const hasChanges = Object.keys(changes).length > 0;

  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!product || !form || !hasChanges || !form.name.trim() || form.sellingPrice <= 0) return;
    setIsSaving(true);
    try {
      const updated = await updateProductMutation.mutateAsync({
        id: product.id,
        body: {
          ...changes,
          ...(changes.name !== undefined ? { name: form.name.trim() } : {}),
        },
      });
      setForm(toForm(updated));
      setInitialForm(toForm(updated));
      setIsEditing(false);
      toast.success('Item updated', { description: `${updated.name} was saved.` });
    } catch (reason) {
      toast.error('Unable to update item', {
        description: reason instanceof Error ? reason.message : 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Inventory" title="Item detail" />
        <div className="h-72 animate-pulse rounded-[14px] bg-[var(--surface-muted)]" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Inventory" title="Item detail" />
        <SectionCard title="Item unavailable" description="Unable to load item details.">
          <AppButton variant="secondary" onClick={() => navigate('/products')}>
            <ArrowLeft size={14} />
            <span className="ml-2">Back to items</span>
          </AppButton>
        </SectionCard>
      </div>
    );
  }

  const stock = product.bin?.stockValue ?? product.stock ?? 0;
  const stockTone = stock > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory / Item detail"
        title={product.name}
        description={`${categories.find((category) => category.id === product.categoryId)?.name ?? product.category ?? 'Uncategorized'} · ${formatItemType(product.type ?? '')} · ${formatUom(product.uom)}`}
        action={
          <div className="flex gap-2">
            <AppButton 
              variant={theme === 'dark' ? 'secondary-inverted' : 'inverted'}
              onClick={() => navigate('/products')}
            >
              <ArrowLeft size={14} />
              <span className="ml-2 hidden sm:inline">Items</span>
            </AppButton>
            <AppButton
              variant={theme === 'dark' ? 'secondary-inverted' : 'inverted'}
              onClick={() => setIsEditing((current) => !current)}
            >
              <PencilLine size={14} />
              <span className="ml-2 hidden sm:inline">{isEditing ? 'Cancel' : 'Edit'}</span>
            </AppButton>
            <AppButton
              variant={theme === 'dark' ? 'secondary-inverted' : 'inverted'}
              onClick={() => navigate(`/stock-ledger?itemId=${product.id}`)}
            >
              <Boxes size={14} />
              <span className="ml-2 hidden sm:inline">Stock ledger</span>
            </AppButton>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Metric icon={Package} label="Selling price" value={formatRp(product.sellingPrice)} />
        <Metric icon={Boxes} label="Available stock" value={`${stock} ${formatUom(product.uom)}`} valueClassName={stockTone} />
        <Metric icon={Tag} label="Stock tracking" value={product.isMaintainStock ? 'Enabled' : 'Disabled'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <SectionCard title="Item overview" description="The information currently used in your catalog and POS.">
          {isEditing && form ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Item name" required>
                  <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={inputClass()} />
                </FormField>
                <FormField label="Item type" required>
                  <AppSelect value={form.type} onValueChange={(value) => updateForm('type', value)} options={ITEM_TYPE_OPTIONS.map((value) => ({ value, label: formatItemType(value) }))} />
                </FormField>
                <FormField label="Item category">
                  <AppSelect value={form.categoryId} onValueChange={(value) => updateForm('categoryId', value)} options={[{ value: '', label: 'Uncategorized' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} disabled={categoriesQuery.isLoading} />
                </FormField>
                <FormField label="Unit of measure" required>
                  <AppSelect value={form.uom} onValueChange={(value) => updateForm('uom', value)} options={ITEM_UOM_OPTIONS.map((value) => ({ value, label: formatUom(value) }))} />
                </FormField>
                <FormField label="Base price">
                  <input type="number" min={0} value={form.basePrice} onChange={(event) => updateForm('basePrice', Number(event.target.value))} className={inputClass()} />
                </FormField>
                <FormField label="Selling price" required>
                  <input type="number" min={0} value={form.sellingPrice} onChange={(event) => updateForm('sellingPrice', Number(event.target.value))} className={inputClass()} />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={3} className={inputClass()} />
              </FormField>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={form.isMaintainStock} onCheckedChange={(checked) => updateForm('isMaintainStock', checked === true)} />
                <span>Maintain stock</span>
              </label>
              {hasChanges && (
                <div className="flex justify-end border-t border-[var(--border)] pt-4">
                  <AppButton onClick={() => void handleSave()} disabled={isSaving || !form.name.trim() || form.sellingPrice <= 0}>
                    <Save size={14} />
                    <span className="ml-2">{isSaving ? 'Saving...' : 'Save changes'}</span>
                  </AppButton>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Detail label="Item name" value={product.name} />
                <Detail label="Item type" value={formatItemType(product.type ?? '')} />
                <Detail label="Item category" value={categories.find((category) => category.id === product.categoryId)?.name ?? product.category ?? 'Uncategorized'} />
                <Detail label="Unit of measure" value={formatUom(product.uom)} />
                <Detail label="Base price" value={formatRp(product.basePrice)} />
                <Detail label="Selling price" value={formatRp(product.sellingPrice)} />
                <Detail label="Stock policy" value={product.isMaintainStock ? 'Maintain stock' : 'No stock tracking'} />
              </div>
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <Detail label="Description" value={product.description || 'No description added.'} />
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Record history" description="Catalog timestamps for this product.">
          <div className="space-y-5">
            <Detail icon={CalendarDays} label="Created" value={formatDate(product.createdAt)} />
            <Detail icon={CalendarDays} label="Last updated" value={formatDate(product.updatedAt)} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: typeof Package;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4">
      <Icon size={18} className="text-[var(--accent)]" />
      <p className="mt-4 text-xs text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" />}
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function inputClass() {
  return 'w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15';
}
