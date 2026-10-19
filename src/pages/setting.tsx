import { useEffect, useRef, useState } from 'react';
import {
  Store,
  User,
  MapPin,
  Phone,
  Mail,
  Hash,
  Percent,
  MessageSquare,
  Save,
  RotateCcw,
  Upload,
  X,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { AppSelect } from '../components/ui/app-select';
import type { StoreSettings } from '../types/inde';
import { defaultSettings } from '../stores/settings-store';
import { useGetCurrentStoreQuery } from '@/lib/stores/store-store';

const settingsSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  ownerName: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z
    .string()
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Enter a valid email or leave blank',
    }),
  invoicePrefix: z
    .string()
    .min(1, 'Required')
    .max(6, 'Max 6 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Letters, numbers, and hyphens only'),
  taxRate: z.number().min(0, 'Min 0').max(100, 'Max 100'),
  currency: z.string().min(1, 'Required'),
  thankYouMessage: z.string(),
  logoUrl: z.string(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { data: storeData, isSuccess: isStoreLoaded } = useGetCurrentStoreQuery();
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsForm, unknown, SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (!isStoreLoaded || !storeData || isDirty) return;

    const nextSettings: StoreSettings = {
      ...getValues(),
      name: storeData.name ?? '',
      ownerName: storeData.creator?.username ?? '',
      address: storeData.address ?? '',
      phone: storeData.phone ?? '',
      logoUrl: storeData.imageUrl ?? '',
    };

    setSettings(nextSettings);
    setLogoPreview(nextSettings.logoUrl);
    reset(nextSettings);
  }, [getValues, isDirty, isStoreLoaded, reset, storeData]);

  // Live-preview values from the form
  const watched = watch();

  const onSubmit = (data: SettingsForm) => {
    const payload: StoreSettings = { ...data, logoUrl: logoPreview };
    setSettings(payload);
    reset(payload);
    toast.success('Settings saved', {
      description: `${data.name} updated successfully.`,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error('Logo too large', {
        description: 'Maximum file size is 512 KB.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setLogoPreview(url);
      setValue('logoUrl', url, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setValue('logoUrl', '', { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setLogoPreview(defaultSettings.logoUrl);
    reset(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Store profile, tax configuration, and receipt customisation"
        action={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary-inverted" onClick={handleReset}>
              <RotateCcw size={14} />
              <span className="ml-2">Reset</span>
            </AppButton>
            <AppButton variant="inverted" onClick={handleSubmit(onSubmit)}>
              <Save size={14} />
              <span className="ml-2">Save changes</span>
            </AppButton>
          </div>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Store identity ── */}
        <SettingsSection
          title="Store identity"
          description="Name and owner shown on receipts and in the sidebar."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Store name"
              required
              error={errors.name?.message}
              icon={Store}
            >
              <input
                {...register('name')}
                placeholder="e.g. Kopi Senja"
                className={inputClass(!!errors.name)}
              />
            </Field>

            <Field label="Owner name" icon={User}>
              <input
                {...register('ownerName')}
                placeholder="e.g. Husein Aji"
                className={inputClass(false)}
              />
            </Field>
          </div>

          {/* Logo upload */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--muted)]">
              Store logo
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Store logo preview"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <ShoppingCart size={24} className="text-[var(--muted)]" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium transition hover:border-[var(--accent)]/40 active:scale-95"
                >
                  <Upload size={14} />
                  Upload logo
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--status-danger)] transition hover:opacity-70"
                  >
                    <X size={12} /> Remove logo
                  </button>
                )}
                <p className="text-xs text-[var(--muted)]">
                  PNG, JPG or SVG · max 512 KB
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ── Contact & location ── */}
        <SettingsSection
          title="Contact & location"
          description="Printed on receipts below the store name."
        >
          <Field label="Address" icon={MapPin}>
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Jl. Contoh No. 1, Jakarta Selatan"
              className={`${inputClass(false)} resize-none`}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" icon={Phone}>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+62 812 3456 7890"
                className={inputClass(false)}
              />
            </Field>

            <Field label="Email" error={errors.email?.message} icon={Mail}>
              <input
                {...register('email')}
                type="email"
                placeholder="store@example.com"
                className={inputClass(!!errors.email)}
              />
            </Field>
          </div>
        </SettingsSection>

        {/* ── Tax & billing ── */}
        <SettingsSection
          title="Tax & billing"
          description="Tax rate is applied to every transaction. Invoice prefix is prepended to auto-generated invoice numbers."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Invoice prefix"
              required
              error={errors.invoicePrefix?.message}
              icon={Hash}
              hint={`Preview: ${(watched.invoicePrefix || 'INV').toUpperCase()}-1023`}
            >
              <input
                {...register('invoicePrefix')}
                placeholder="INV"
                maxLength={6}
                className={`${inputClass(!!errors.invoicePrefix)} uppercase`}
              />
            </Field>

            <Field
              label="Tax rate (%)"
              error={errors.taxRate?.message}
              icon={Percent}
              hint="Applied to subtotal after discount"
            >
              <input
                {...register('taxRate', { valueAsNumber: true })}
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="11"
                className={inputClass(!!errors.taxRate)}
              />
            </Field>

            <Field label="Currency" required icon={Store}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'IDR', label: 'IDR — Rupiah' },
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'SGD', label: 'SGD — Singapore Dollar' },
                      { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
                    ]}
                    className={selectClass()}
                    aria-label="Currency"
                  />
                )}
              />
            </Field>
          </div>
        </SettingsSection>

        {/* ── Receipt customisation ── */}
        <SettingsSection
          title="Receipt"
          description="Footer message printed at the bottom of every receipt."
        >
          <Field label="Thank-you message" icon={MessageSquare}>
            <input
              {...register('thankYouMessage')}
              placeholder="Thank you for your purchase!"
              className={inputClass(false)}
            />
          </Field>

          {/* Live receipt preview */}
          <div>
            <p className="mb-3 text-sm font-medium text-[var(--muted)]">
              Live preview
            </p>
            <div className="mx-auto max-w-[280px] rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 p-5 font-mono text-[12px]">
              {/* Header */}
              <div className="mb-3 text-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="logo"
                    className="mx-auto mb-2 h-10 object-contain"
                  />
                ) : (
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--accent)]">
                    <ShoppingCart size={16} />
                  </div>
                )}
                <p className="font-semibold">
                  {watched.name || 'Store name'}
                </p>
                {watched.address && (
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {watched.address}
                  </p>
                )}
                {watched.phone && (
                  <p className="text-[11px] text-[var(--muted)]">
                    {watched.phone}
                  </p>
                )}
              </div>

              <div className="my-2 border-t border-dashed border-[var(--border)]" />

              {/* Sample rows */}
              <div className="space-y-1 text-[var(--muted)]">
                <div className="flex justify-between">
                  <span>Caffè Latte</span>
                  <span>Rp 32.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Croissant × 2</span>
                  <span>Rp 36.000</span>
                </div>
              </div>

              <div className="my-2 border-t border-dashed border-[var(--border)]" />

              <div className="space-y-1 text-[var(--muted)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rp 68.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({watched.taxRate ?? 11}%)</span>
                  <span>
                    Rp{' '}
                    {Math.round(
                      68000 * (Number(watched.taxRate ?? 11) / 100),
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--foreground)]">
                  <span>Total</span>
                  <span>
                    Rp{' '}
                    {Math.round(
                      68000 * (1 + Number(watched.taxRate ?? 11) / 100),
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="my-2 border-t border-dashed border-[var(--border)]" />

              <p className="text-center italic text-[var(--muted)]">
                {watched.thankYouMessage || 'Thank you for your purchase!'}
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* ── Sticky unsaved-changes bar ── */}
        {isDirty && (
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.14)]">
            <p className="text-sm text-[var(--muted)]">
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <AppButton
                variant="secondary"
                onClick={() => {
                  reset(settings);
                  setLogoPreview(settings.logoUrl);
                }}
              >
                Discard
              </AppButton>
              <AppButton variant="primary" type="submit">
                <Save size={14} />
                <span className="ml-2">Save</span>
              </AppButton>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
        {Icon && <Icon size={13} />}
        {label}
        {required && <span className="text-[var(--status-danger)]"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-[var(--muted-2)]">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-[var(--status-danger)]">{error}</p>
      )}
    </div>
  );
}

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
