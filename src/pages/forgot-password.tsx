import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { ApiError } from '@/lib/api/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const forgotSchema = z.object({
  email: z.email({ message: 'Masukkan alamat email yang valid' }),
});

type ForgotData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState('');

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = (data: ForgotData) => {
    setError('');
    try {
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError('Gagal mengirim tautan. Silakan coba lagi.');
        return;
      }
      if (err instanceof TypeError) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
        return;
      }
      setError('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ fontFamily: 'var(--font-jakarta)' }}
    >
      {/* ── Left panel — desktop only ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-14"
        style={{
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
      >
        <div>
          <img
            src="/Asset-2svg.svg"
            alt="OYAPI"
            className="h-10 w-auto"
            draggable={false}
          />
        </div>
        <div>
          <h2
            className="text-[2.25rem] xl:text-[2.75rem] font-extrabold leading-tight tracking-[-0.02em] mb-4"
            style={{ color: 'var(--primary-foreground)' }}
          >
            Technology that makes work easier, not harder.
          </h2>
          <p className="text-base" style={{ color: 'var(--primary-muted)' }}>
            Built by UMKM owners, for UMKM owners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#C8643C' }}
          />
          <span className="text-sm" style={{ color: 'var(--primary-muted)' }}>
            Dari UMKM, untuk UMKM.
          </span>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16"
        style={{ backgroundColor: 'var(--background)' }}
      >
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <img
            src="/Asset-1svg.svg"
            alt="OYAPI"
            className="h-10 w-auto"
            draggable={false}
          />
        </div>

        <div className="w-full max-w-[400px]">
          {/* Back link */}
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Kembali ke halaman masuk
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[2rem] font-bold tracking-[-0.02em] leading-tight mb-2"
              style={{ color: 'var(--primary)' }}
            >
              Reset kata sandi
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Masukkan email Anda dan kami akan mengirimkan tautan untuk
              mengatur kata sandi baru.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm"
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

          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(0,117,74,0.1)' }}
              >
                <CheckCircle2
                  size={32}
                  style={{ color: 'var(--status-success)' }}
                />
              </div>
              <div>
                <p
                  className="font-semibold text-base"
                  style={{ color: 'var(--primary)' }}
                >
                  Periksa kotak masuk Anda
                </p>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  Jika{' '}
                  <span
                    className="font-medium"
                    style={{ color: 'var(--primary)' }}
                  >
                    {submittedEmail}
                  </span>{' '}
                  terdaftar, kami sudah mengirim instruksi reset. Periksa folder
                  spam jika tidak muncul.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSubmittedEmail('');
                }}
                className="mt-2 text-sm font-semibold transition hover:opacity-70"
                style={{ color: 'var(--accent-strong)' }}
              >
                Coba email lain
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="email">Alamat email</FieldLabel>
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                      >
                        <Mail size={16} strokeWidth={1.8} />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        {...field}
                        placeholder="you@example.com"
                        autoFocus
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-4 text-sm font-medium focus-visible:ring-[3px]"
                        style={{
                          borderColor: errors.email
                            ? 'var(--status-danger)'
                            : 'var(--border)',
                        }}
                      />
                    </div>
                    {errors.email && (
                      <FieldError
                        className="text-xs"
                        style={{ color: 'var(--status-danger)' }}
                      >
                        {errors.email.message}
                      </FieldError>
                    )}
                    <FieldDescription
                      className="text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      Gunakan email yang terhubung ke akun Anda.
                    </FieldDescription>
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-full text-sm font-bold tracking-wide transition active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {isSubmitting ? 'Mengirim…' : 'Kirim tautan reset'}
              </Button>

              <p
                className="text-center text-xs"
                style={{ color: 'var(--muted)' }}
              >
                Tidak menerima email? Periksa folder spam, atau coba lagi dalam
                60 detik.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
