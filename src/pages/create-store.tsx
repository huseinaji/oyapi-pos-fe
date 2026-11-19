import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MapPin, Phone, ShoppingBag, Store } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  useCreateStoreMutation,
  useSelectStoreMutation,
} from '@/lib/stores/store-store';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/layout/form-field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const createStoreSchema = z.object({
  name: z.string().trim().min(1, 'Masukkan nama toko'),
  address: z.string().trim(),
  phone: z.string().trim(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.url().safeParse(value).success,
      'Masukkan URL gambar yang valid',
    ),
});

type CreateStoreForm = z.infer<typeof createStoreSchema>;

const inputClass =
  'h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-4 text-sm font-medium focus-visible:ring-[3px]';

export default function CreateStorePage() {
  const navigate = useNavigate();
  const createStoreMutation = useCreateStoreMutation();
  const selectStoreMutation = useSelectStoreMutation();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStoreForm>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: { name: '', address: '', phone: '', imageUrl: '' },
  });

  const onSubmit = async (data: CreateStoreForm) => {
    setError('');
    let createdStoreId: string | undefined;

    try {
      const store = await createStoreMutation.mutateAsync({
        name: data.name,
        ...(data.imageUrl && { imageUrl: data.imageUrl }),
        ...(data.address && { address: data.address }),
        ...(data.phone && { phone: data.phone }),
      });
      createdStoreId = store.id;
      await selectStoreMutation.mutateAsync(store.id);
      toast.success('Toko berhasil dibuat', {
        description: `${store.name} siap digunakan.`,
      });
      navigate('/', { replace: true });
    } catch (submitError) {
      if (createdStoreId) {
        toast.error('Toko dibuat, tapi tidak dapat dipilih', {
          description: 'Pilih toko baru dari daftar toko Anda.',
        });
        navigate('/select-store', { replace: true });
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.message || 'Tidak dapat membuat toko. Coba lagi.');
        return;
      }

      if (submitError instanceof TypeError) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
        return;
      }

      setError('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: 'var(--background)',
        fontFamily: 'var(--font-jakarta)',
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* Back link */}
        <Link
          to="/select-store"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Kembali ke daftar toko
        </Link>

        {/* Header */}
        <div className="mb-7">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(31,77,58,0.1)' }}
          >
            <Store
              size={22}
              strokeWidth={1.8}
              style={{ color: 'var(--primary)' }}
            />
          </div>
          <h1
            className="text-[1.75rem] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--primary)' }}
          >
            Buat toko
          </h1>
          <p
            className="mt-1.5 text-sm leading-relaxed"
            style={{ color: 'var(--muted)' }}
          >
            Tambahkan detail yang digunakan tim Anda untuk mengenali toko ini.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm"
            role="alert"
            style={{
              borderColor: 'rgba(200,32,20,0.2)',
              backgroundColor: 'rgba(200,32,20,0.06)',
              color: 'var(--status-danger)',
            }}
          >
            <div
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold leading-none"
              style={{ borderColor: 'var(--status-danger)' }}
            >
              !
            </div>
            <p>{error}</p>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-2xl border p-6"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Store name */}
            <FormField
              label="Nama toko"
              htmlFor="store-name"
              required
              error={errors.name?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <ShoppingBag size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="store-name"
                  autoComplete="organization"
                  placeholder="cth. Warung Kopi Pak Budi"
                  aria-invalid={Boolean(errors.name)}
                  className={inputClass}
                  style={{
                    borderColor: errors.name
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('name')}
                />
              </div>
            </FormField>

            {/* Address */}
            <FormField
              label="Alamat"
              htmlFor="store-address"
              error={errors.address?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <MapPin size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="store-address"
                  autoComplete="street-address"
                  placeholder="Jalan, kota, atau area (opsional)"
                  aria-invalid={Boolean(errors.address)}
                  className={inputClass}
                  style={{
                    borderColor: errors.address
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('address')}
                />
              </div>
            </FormField>

            {/* Phone */}
            <FormField
              label="Nomor telepon"
              htmlFor="store-phone"
              error={errors.phone?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <Phone size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="store-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Nomor kontak toko (opsional)"
                  aria-invalid={Boolean(errors.phone)}
                  className={inputClass}
                  style={{
                    borderColor: errors.phone
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('phone')}
                />
              </div>
            </FormField>

            {/* Image URL — no icon, full width */}
            <FormField
              label="URL gambar toko"
              htmlFor="store-image-url"
              error={errors.imageUrl?.message}
            >
              <Input
                id="store-image-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com/logo.png (opsional)"
                aria-invalid={Boolean(errors.imageUrl)}
                className="h-12 rounded-xl border-[1.5px] bg-card px-4 text-sm font-medium focus-visible:ring-[3px]"
                style={{
                  borderColor: errors.imageUrl
                    ? 'var(--status-danger)'
                    : 'var(--border)',
                }}
                {...register('imageUrl')}
              />
            </FormField>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/select-store')}
                className="h-12 flex-1 rounded-full border-[1.5px] text-sm font-bold"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 flex-1 rounded-full text-sm font-bold tracking-wide transition active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {isSubmitting ? 'Membuat toko…' : 'Buat toko'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
