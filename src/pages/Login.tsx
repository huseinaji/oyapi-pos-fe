import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingCart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  getAuthenticatedHomePath,
  useLoginMutation,
} from '@/lib/auth/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  usernameOrEmail: z.string().min(3, {
    message: 'Enter your email or username',
  }),

  password: z.string().min(6, {
    message: 'Password must be at least 6 characters',
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
        setError('Invalid email or password.');
        return;
      }

      if (err instanceof TypeError) {
        setError(
          'Unable to reach the server. Check your connection and try again.',
        );
        return;
      }

      if (err instanceof ApiError) {
        setError('Login failed. Please try again.');
        return;
      }

      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8"
      suppressHydrationWarning
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15">
            <ShoppingCart className="text-[var(--accent)]" size={24} />
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Welcome back
          </h1>

          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Sign in to access your POS dashboard
          </p>
        </div>

        {/* Card */}
        <Card className="space-y-2.5 bg-[var(--card)]">
          <CardContent>
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3.5 text-sm text-[var(--status-danger)]">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--status-danger)] text-[10px] font-bold leading-none">
                  !
                </div>

                <p>{error}</p>
              </div>
            )}
            {/* Login form */}
            <form
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
              suppressHydrationWarning
            >
              {/* Username / Email */}
              <Controller
                name="usernameOrEmail"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="usernameOrEmail">
                      Email or username
                    </FieldLabel>

                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--muted)]">
                        <Mail size={16} />
                      </div>

                      <input
                        id="usernameOrEmail"
                        type="text"
                        {...field}
                        placeholder="you@example.com or admin"
                        autoComplete="username"
                        suppressHydrationWarning
                        className={`w-full rounded-[12px] border bg-[var(--surface-muted)] py-3 pl-10 pr-4 text-sm outline-none transition focus:ring-2 ${
                          errors.usernameOrEmail
                            ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/15'
                            : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15'
                        }`}
                      />
                    </div>

                    {errors.usernameOrEmail && (
                      <p className="mt-1.5 text-xs text-[var(--status-danger)]">
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
                      <FieldLabel htmlFor="password">Password</FieldLabel>

                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--muted)]">
                        <Lock size={16} />
                      </div>

                      <input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        suppressHydrationWarning
                        className={`w-full rounded-[12px] border bg-[var(--surface-muted)] py-3 pl-10 pr-10 text-sm outline-none transition focus:ring-2 ${
                          errors.password
                            ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/15'
                            : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15'
                        }`}
                      />

                      <Button
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-2 right-0 flex items-center pr-3.5 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                    </div>

                    {errors.password && (
                      <p className="mt-1.5 text-xs text-[var(--status-danger)]">
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
                      <FieldLabel htmlFor="rememberMe">Remember me</FieldLabel>
                    </FieldContent>
                  </Field>
                )}
              />

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                size={'lg'}
                className="inline-flex w-full items-center justify-center rounded-[12px] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{' '}
          <Link
            to="/auth/signup"
            className="font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
