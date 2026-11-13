import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Eye, EyeOff, Mail, ShoppingCart, User } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useSignupMutation } from '@/lib/auth/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/layout/form-field';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const signupSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const navigate = useNavigate();
  const signupMutation = useSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const onSubmit = async (data: SignupData) => {
    setError('');

    try {
      await signupMutation.mutateAsync(data);
      toast.success('Account created', {
        description: 'Sign in with your new account to continue.',
      });
      navigate('/login', { replace: true });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(
          submitError.statusCode === 409
            ? 'That username or email is already in use. Try signing in or choose another.'
            : submitError.message ||
                'Unable to create your account. Try again.',
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
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15">
            <ShoppingCart className="text-[var(--accent)]" size={24} />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Start managing your store operations in one place.
          </p>
        </header>

        <Card className="border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <CardContent className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--status-danger)]/25 bg-[var(--status-danger)]/5 p-3.5 text-sm text-[var(--status-danger)]"
              >
                {error}
              </div>
            )}

            <form
              noValidate
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormField
                label="Username"
                htmlFor="username"
                required
                description="Use at least 3 characters."
                error={errors.username?.message}
              >
                <div className="relative">
                  <User
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-[var(--muted)]"
                  />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="Choose a username"
                    aria-invalid={Boolean(errors.username)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('username')}
                  />
                </div>
              </FormField>

              <FormField
                label="Email address"
                htmlFor="email"
                required
                error={errors.email?.message}
              >
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    size={16}
                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-[var(--muted)]"
                  />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('email')}
                  />
                </div>
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                required
                description="Use at least 6 characters."
                error={errors.password?.message}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    aria-invalid={Boolean(errors.password)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface-muted)] pr-11 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="absolute inset-y-1.5 right-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormField>

              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[var(--accent)] underline-offset-4 transition hover:underline"
          >
            Sign in
          </Link>
        </p>
        <Link
          to="/login"
          className="mx-auto mt-5 flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
