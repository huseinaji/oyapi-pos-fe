import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  getAuthenticatedHomePath,
  useLoginMutation,
} from '@/lib/auth/auth-store';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(3, {
    message: 'Masukkan email atau nama pengguna Anda',
  }),
  password: z.string().min(6, {
    message: 'Kata sandi minimal 6 karakter',
  }),
  rememberMe: z.boolean().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginData) => {
    setError('');
    try {
      const user = await loginMutation.mutateAsync({
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
        rememberMe: data.rememberMe ?? false,
      });
      navigate(getAuthenticatedHomePath(user), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setError('Email atau kata sandi salah.');
        return;
      }
      if (err instanceof TypeError) {
        setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
        return;
      }
      if (err instanceof ApiError) {
        setError('Login gagal. Silakan coba lagi.');
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
        {/* Logo horizontal cream (teks + ikon) untuk panel gelap */}
        <div>
          <img
            src="/Asset-2svg.svg"
            alt="OYAPI"
            className="h-10 w-auto"
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <div>
          <h2
            className="text-[2.25rem] xl:text-[2.75rem] font-extrabold leading-tight tracking-[-0.02em] mb-4"
            style={{ color: 'var(--primary-foreground)' }}
          >
            Teknologi untuk membuat usaha lebih mudah dijalankan.
          </h2>
          <p className="text-base" style={{ color: 'var(--primary-muted)' }}>
            Dibuat oleh pelaku UMKM, untuk pelaku UMKM.
          </p>
        </div>

        {/* Bottom dot indicator */}
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

      {/* ── Right panel: form ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16"
        style={{ backgroundColor: 'var(--background)' }}
      >
        {/* Mobile logo — logo horizontal gelap untuk background terang */}
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
              Selamat datang kembali
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Masuk untuk melanjutkan ke toko.
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

          {/* Form */}
          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Email / username */}
            <Controller
              name="usernameOrEmail"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="usernameOrEmail">
                    Email atau nama pengguna
                  </FieldLabel>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                    >
                      <Mail size={16} strokeWidth={1.8} />
                    </span>
                    <Input
                      id="usernameOrEmail"
                      type="text"
                      {...field}
                      placeholder="you@example.com or username"
                      autoComplete="username"
                      aria-invalid={!!errors.usernameOrEmail}
                      className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-4 text-sm font-medium focus-visible:ring-[3px]"
                      style={{
                        borderColor: errors.usernameOrEmail
                          ? 'var(--status-danger)'
                          : 'var(--border)',
                      }}
                    />
                  </div>
                  {errors.usernameOrEmail && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--status-danger)' }}
                    >
                      {errors.usernameOrEmail.message}
                    </p>
                  )}
                </Field>
              )}
            />

            {/* Password */}
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold transition hover:opacity-80"
                      style={{ color: 'var(--accent-strong)' }}
                    >
                      Lupa kata sandi?
                    </Link>
                  </div>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
                    >
                      <Lock size={16} strokeWidth={1.8} />
                    </span>
                    <Input
                      {...field}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      className="h-12 rounded-xl border-[1.5px] bg-card pl-11 pr-12 text-sm font-medium focus-visible:ring-[3px]"
                      style={{
                        borderColor: errors.password
                          ? 'var(--status-danger)'
                          : 'var(--border)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
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
                  {errors.password && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--status-danger)' }}
                    >
                      {errors.password.message}
                    </p>
                  )}
                </Field>
              )}
            />

            {/* Remember me */}
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id="rememberMe"
                    name={field.name}
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                    onBlur={field.onBlur}
                  />
                  <FieldContent>
                    <FieldLabel
                      htmlFor="rememberMe"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Ingat perangkat ini
                    </FieldLabel>
                  </FieldContent>
                </Field>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-12 w-full rounded-full text-sm font-bold tracking-wide transition active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {isSubmitting ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>

          {/* Footer */}
          <p
            className="mt-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Belum punya akun?{' '}
            <Link
              to="/auth/signup"
              className="font-semibold underline-offset-2 hover:underline transition"
              style={{ color: 'var(--primary)' }}
            >
              Buat akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
