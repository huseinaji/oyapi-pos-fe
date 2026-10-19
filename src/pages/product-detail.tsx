import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Package,
  Save,
  Tag,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/app-button';
import { AppSelect } from '@/components/ui/app-select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  useProductQuery,
  useUpdateProductMutation,
} from '@/lib/product/product-store';
import { useUIStore } from '@/stores/ui-store';
import type {
  ApiItem,
  ItemType,
  ItemUom,
  UpdateItemDto,
} from '@/lib/product/product-types';
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPE_OPTIONS,
  ITEM_UOM_LABELS,
  ITEM_UOM_OPTIONS,
} from '@/lib/product/product-types';
import { formatRp } from '@/lib/transaction-utils';
import { useItemCategoriesQuery } from '@/lib/product/item-categories-store';
import { SectionCard } from '@/components/ui/section-card';

const FIELD_LABEL_CLASS =
  'h-5 text-sm font-medium leading-5 text-[var(--foreground)]';

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

function changedFields(
  initial: ProductForm,
  current: ProductForm,
): UpdateItemDto {
  const changes: UpdateItemDto = {};
  if (initial.name !== current.name) changes.name = current.name;
  if (initial.categoryId !== current.categoryId)
    changes.categoryId = current.categoryId;
  if (initial.uom !== current.uom) changes.uom = current.uom;
  if (initial.description !== current.description)
    changes.description = current.description;
  if (initial.basePrice !== current.basePrice)
    changes.basePrice = current.basePrice;
  if (initial.sellingPrice !== current.sellingPrice)
    changes.sellingPrice = current.sellingPrice;
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

  const updateForm = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (
      !product ||
      !form ||
      !hasChanges ||
      !form.name.trim() ||
      form.sellingPrice <= 0
    )
      return;
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
      toast.success('Item updated', {
        description: `${updated.name} was saved.`,
      });
    } catch (reason) {
      toast.error('Unable to update item', {
        description:
          reason instanceof Error ? reason.message : 'Please try again.',
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
        <SectionCard
          title="Item unavailable"
          description="Unable to load item details."
        >
          <AppButton variant="secondary" onClick={() => navigate('/products')}>
            <ArrowLeft size={14} />
            <span className="ml-2">Back to items</span>
          </AppButton>
        </SectionCard>
      </div>
    );
  }

  const stock = product.bin?.stockValue ?? product.stock ?? 0;
  const stockTone =
    stock > 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory / Item detail"
        title={form?.name ?? product.name}
        description={`${form?.categoryId ? (categories.find((category) => category.id === form.categoryId)?.name ?? product.category ?? 'Uncategorized') : 'Uncategorized'} · ${formatItemType(product.type ?? '')} · ${formatUom(form?.uom ?? product.uom)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <AppButton
              variant={theme === 'dark' ? 'secondary-inverted' : 'inverted'}
              onClick={() => navigate('/products')}
            >
              <ArrowLeft size={14} />
              <span className="ml-2 hidden sm:inline">Items</span>
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
        <Metric
          icon={Package}
          label="Selling price"
          value={formatRp(form?.sellingPrice ?? product.sellingPrice)}
        />
        <Metric
          icon={Boxes}
          label="Available stock"
          value={`${stock} ${formatUom(form?.uom ?? product.uom)}`}
          valueClassName={stockTone}
        />
        <Metric
          icon={Tag}
          label="Stock tracking"
          value={product.isMaintainStock ? 'Enabled' : 'Disabled'}
        />
      </div>

      {form && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General information</CardTitle>
              <CardDescription>
                Item identity and catalog classification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="!grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="item-name" className={FIELD_LABEL_CLASS}>
                    Item name
                  </FieldLabel>
                  <input
                    id="item-name"
                    value={form.name}
                    disabled={isSaving}
                    onChange={(event) => updateForm('name', event.target.value)}
                    className={inputClass()}
                  />
                </Field>
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Item type
                  </FieldLabel>
                  <div className={fieldValueClass()}>
                    {formatItemType(form.type)}
                  </div>
                </Field>
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Category
                  </FieldLabel>
                  <AppSelect
                    value={form.categoryId}
                    onValueChange={(value) => updateForm('categoryId', value)}
                    options={[
                      { value: '', label: 'Uncategorized' },
                      ...categories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      })),
                    ]}
                    disabled={categoriesQuery.isLoading || isSaving}
                    className={selectClass()}
                  />
                </Field>
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Unit of measure
                  </FieldLabel>
                  <AppSelect
                    value={form.uom}
                    onValueChange={(value) => updateForm('uom', value)}
                    options={ITEM_UOM_OPTIONS.map((value) => ({
                      value,
                      label: formatUom(value),
                    }))}
                    disabled={isSaving}
                    className={selectClass()}
                  />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel
                    htmlFor="item-description"
                    className={FIELD_LABEL_CLASS}
                  >
                    Description
                  </FieldLabel>
                  <textarea
                    id="item-description"
                    value={form.description}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateForm('description', event.target.value)
                    }
                    rows={3}
                    placeholder="No description added."
                    className={`${inputClass()} min-h-24 resize-y py-3`}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Item cost and customer-facing price.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="!grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="base-price"
                    className={FIELD_LABEL_CLASS}
                  >
                    Base price
                  </FieldLabel>
                  <input
                    id="base-price"
                    type="number"
                    min={0}
                    value={form.basePrice}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateForm('basePrice', Number(event.target.value))
                    }
                    className={inputClass()}
                  />
                  {form.basePrice < 0 && (
                    <FieldDescription className="text-[var(--status-danger)]">
                      Base price cannot be negative.
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="selling-price"
                    className={FIELD_LABEL_CLASS}
                  >
                    Selling price
                  </FieldLabel>
                  <input
                    id="selling-price"
                    type="number"
                    min={0}
                    value={form.sellingPrice}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateForm('sellingPrice', Number(event.target.value))
                    }
                    className={inputClass()}
                  />
                  {form.sellingPrice <= 0 && (
                    <FieldDescription className="text-[var(--status-danger)]">
                      Selling price must be greater than zero.
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Current stock and stock tracking policy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="!grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Available stock
                  </FieldLabel>
                  <div className={`${fieldValueClass()} ${stockTone}`}>
                    {stock} {formatUom(form.uom)}
                  </div>
                </Field>
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Stock tracking
                  </FieldLabel>
                  <div className={`${fieldValueClass()} gap-3`}>
                    <Checkbox checked={product.isMaintainStock} disabled />
                    <span className="text-sm font-medium">
                      {product.isMaintainStock ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record history</CardTitle>
              <CardDescription>
                Catalog timestamps for this item.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="!grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>Created</FieldLabel>
                  <div className={fieldValueClass()}>
                    <CalendarDays
                      size={16}
                      className="shrink-0 text-[var(--muted)]"
                    />
                    <span>{formatDate(product.createdAt)}</span>
                  </div>
                </Field>
                <Field>
                  <FieldLabel className={FIELD_LABEL_CLASS}>
                    Last updated
                  </FieldLabel>
                  <div className={fieldValueClass()}>
                    <CalendarDays
                      size={16}
                      className="shrink-0 text-[var(--muted)]"
                    />
                    <span>{formatDate(product.updatedAt)}</span>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {hasChanges && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span
                className="text-sm font-medium text-[var(--status-pending)]"
                aria-live="polite"
              >
                Unsaved changes
              </span>
              <AppButton
                onClick={() => void handleSave()}
                disabled={
                  isSaving ||
                  !form.name.trim() ||
                  form.sellingPrice <= 0 ||
                  form.basePrice < 0
                }
              >
                <Save size={14} />
                <span className="ml-2">
                  {isSaving ? 'Saving...' : 'Save changes'}
                </span>
              </AppButton>
            </div>
          )}
        </div>
      )}
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

function inputClass() {
  return 'h-11 w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 disabled:cursor-wait disabled:opacity-60';
}

function fieldValueClass() {
  return 'flex h-11 w-full items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--canvas-soft)] px-3.5 text-sm text-[var(--muted)]';
}

function selectClass() {
  return '[&>button]:h-11 [&>button]:rounded-[12px] [&>button]:border [&>button]:border-[var(--border)] [&>button]:bg-[var(--card)] [&>button]:px-3.5 [&>button]:py-0 disabled:[&>button]:cursor-not-allowed disabled:[&>button]:border-[var(--border)] disabled:[&>button]:bg-[var(--canvas-soft)] disabled:[&>button]:text-[var(--muted)]';
}
