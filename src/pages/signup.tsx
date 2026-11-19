import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, User, Lock, CheckCircle2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useSignupMutation } from '@/lib/auth/auth-store';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/layout/form-field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const signupSchema = z.object({
  username: z.string().trim().min(3, 'Username minimal 3 karakter'),
  email: z.string().trim().pipe(z.email('Masukkan alamat email yang valid')),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

type SignupData = z.infer<typeof signupSchema>;

/** Password strength: 0 = empty, 1 = weak, 2 = medium, 3 = strong */
function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 10) score++;
  return score;
}

const strengthColor = ['', '#c82014', '#cba258', 'var(--status-success)'];
const strengthLabel = ['', 'Lemah', 'Sedang', 'Kuat'];

export default function SignupPage() {
  const navigate = useNavigate();
  const signupMutation = useSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const passwordValue = useWatch({ control, name: 'password' });
  const strength = getPasswordStrength(passwordValue ?? '');

  const onSubmit = async (data: SignupData) => {
    setError('');
    try {
      await signupMutation.mutateAsync(data);
      toast.success('Akun berhasil dibuat', {
        description: 'Masuk dengan akun baru Anda untuk melanjutkan.',
      });
      navigate('/login', { replace: true });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(
          submitError.statusCode === 409
            ? 'Username atau email sudah digunakan. Coba masuk atau pilih yang lain.'
            : submitError.message || 'Tidak dapat membuat akun. Coba lagi.',
        );
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
          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[2rem] font-bold tracking-[-0.02em] leading-tight mb-2"
              style={{ color: 'var(--primary)' }}
            >
              Buat akun Anda
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Mulai kelola toko Anda dalam satu tempat.
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

          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Username */}
            <FormField
              label="Username"
              htmlFor="username"
              required
              error={errors.username?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <User size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="Pilih username"
                  aria-invalid={Boolean(errors.username)}
                  className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-4 text-sm font-medium focus-visible:ring-[3px]"
                  style={{
                    borderColor: errors.username
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('username')}
                />
              </div>
              {/* Available indicator — shown when no error and value exists */}
            </FormField>

            {/* Email */}
            <FormField
              label="Alamat email"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <Mail size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(errors.email)}
                  className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-4 text-sm font-medium focus-visible:ring-[3px]"
                  style={{
                    borderColor: errors.email
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('email')}
                />
              </div>
            </FormField>

            {/* Password */}
            <FormField
              label="Kata sandi"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <div className="relative">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                >
                  <Lock size={16} strokeWidth={1.8} />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(errors.password)}
                  className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-12 text-sm font-medium focus-visible:ring-[3px]"
                  style={{
                    borderColor: errors.password
                      ? 'var(--status-danger)'
                      : 'var(--border)',
                  }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 transition hover:opacity-70"
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Tampilkan kata sandi'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {passwordValue && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            strength >= i
                              ? strengthColor[strength]
                              : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{
                        color:
                          strength >= 1
                            ? 'var(--status-success)'
                            : 'var(--muted)',
                      }}
                    >
                      <CheckCircle2 size={11} strokeWidth={2} />
                      Minimal 6 karakter
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{
                        color:
                          strength >= 2
                            ? 'var(--status-success)'
                            : 'var(--muted)',
                      }}
                    >
                      <span
                        className="text-[11px] font-bold leading-none"
                        style={{ color: 'inherit' }}
                      >
                        +
                      </span>
                      Tambahkan angka atau simbol agar lebih kuat
                    </span>
                  </div>
                </div>
              )}
            </FormField>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-full text-sm font-bold tracking-wide transition active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {isSubmitting ? 'Membuat akun…' : 'Buat akun'}
            </Button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Sudah punya akun?{' '}
            <Link
              to="/login"
              className="font-semibold underline-offset-2 hover:underline transition"
              style={{ color: 'var(--primary)' }}
            >
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
