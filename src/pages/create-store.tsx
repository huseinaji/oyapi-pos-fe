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
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/layout/form-field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const createStoreSchema = z.object({
  name: z.string().trim().min(1, 'Enter a store name'),
  address: z.string().trim(),
  phone: z.string().trim(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.url().safeParse(value).success,
      'Enter a valid image URL',
    ),
});

type CreateStoreForm = z.infer<typeof createStoreSchema>;

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
      toast.success('Store created', {
        description: `${store.name} is ready to use.`,
      });
      navigate('/', { replace: true });
    } catch (submitError) {
      if (createdStoreId) {
        toast.error('Store created, but it could not be selected', {
          description: 'Choose the new store from your store list to continue.',
        });
        navigate('/select-store', { replace: true });
        return;
      }

      if (submitError instanceof ApiError) {
        setError(
          submitError.message ||
            'Unable to create the store. Please try again.',
        );
        return;
      }

      if (submitError instanceof TypeError) {
        setError(
          'Unable to reach the server. Check your connection and try again.',
        );
        return;
      }

      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      <div className="w-full max-w-xl">
        <Link
          to="/select-store"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={16} />
          Back to stores
        </Link>

        <header className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/15">
            <Store className="text-[var(--accent)]" size={22} />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Create a store
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--muted)]">
            Add the details your team will use to recognize this store.
          </p>
        </header>

        <Card className="border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] sm:p-6">
          <CardContent className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--status-danger)]/25 bg-[var(--status-danger)]/5 p-3.5 text-sm text-[var(--status-danger)]"
              >
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <FormField
                label="Store name"
                htmlFor="store-name"
                required
                description="Use the name your staff and customers know."
                error={errors.name?.message}
              >
                <div className="relative">
                  <ShoppingBag
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-[var(--muted)]"
                  />
                  <Input
                    id="store-name"
                    autoComplete="organization"
                    placeholder="e.g. Main Street Market"
                    aria-invalid={Boolean(errors.name)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('name')}
                  />
                </div>
              </FormField>

              <FormField
                label="Address"
                htmlFor="store-address"
                description="Optional"
                error={errors.address?.message}
              >
                <div className="relative">
                  <MapPin
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-[var(--muted)]"
                  />
                  <Input
                    id="store-address"
                    autoComplete="street-address"
                    placeholder="Street, city, or area"
                    aria-invalid={Boolean(errors.address)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('address')}
                  />
                </div>
              </FormField>

              <FormField
                label="Phone number"
                htmlFor="store-phone"
                description="Optional"
                error={errors.phone?.message}
              >
                <div className="relative">
                  <Phone
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-[var(--muted)]"
                  />
                  <Input
                    id="store-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Store contact number"
                    aria-invalid={Boolean(errors.phone)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('phone')}
                  />
                </div>
              </FormField>

              <FormField
                label="Store image URL"
                htmlFor="store-image-url"
                description="Optional. Provide a publicly accessible image URL."
                error={errors.imageUrl?.message}
              >
                <Input
                  id="store-image-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/store-logo.png"
                  aria-invalid={Boolean(errors.imageUrl)}
                  className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                  {...register('imageUrl')}
                />
              </FormField>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/select-store')}
                  className="h-11 rounded-xl border-[var(--border)] px-5 text-[var(--foreground)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="h-11 rounded-xl bg-[var(--accent-strong)] px-5 font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating store…' : 'Create store'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
