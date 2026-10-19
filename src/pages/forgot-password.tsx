import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingCart, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { ApiError } from '@/lib/api/index';
import { Button } from '@/components/ui/button';

const forgotSchema = z.object({
  email: z.email({ message: 'Enter a valid email' }),
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
    // Mock submit — in production, call your reset API
    try {
      setSubmittedEmail(data.email);
      setSubmitted(true);
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/15">
            <ShoppingCart className="text-[var(--accent)]" size={24} />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
            Reset password
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            We'll send a reset link to your inbox
          </p>
        </div>

        {/* Card */}
        <Card className="p-5 bg-[var(--card)] border-[var(--border)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)]">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-3.5 text-sm text-[var(--status-danger)]">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--status-danger)] text-[10px] font-bold leading-none">
                !
              </div>

              <p>{error}</p>
            </div>
          )}
          <CardContent>
            {submitted ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success)]/10">
                <CheckCircle2
                  className="text-[var(--status-success)]"
                  size={32}
                />
              </div>
              <div>
                <p className="font-semibold">Check your inbox</p>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  If{' '}
                  <span className="font-medium text-[var(--foreground)]">
                    {submittedEmail}
                  </span>{' '}
                  is registered, we've sent reset instructions. Check your spam
                  folder if it doesn't arrive.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSubmittedEmail('');
                }}
                className="mt-2 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <div>
                    <Field>
                      <FieldLabel>Email address</FieldLabel>
                      
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--muted)]">
                          <Mail size={16} />
                        </div>
                        <input
                          id="email"
                          type="email"
                          {...field}
                          placeholder="you@example.com"
                          autoFocus
                          className={`w-full rounded-[12px] border bg-[var(--surface-muted)] py-3 pl-10 pr-4 text-sm outline-none transition focus:ring-2 ${
                            errors.email
                              ? 'border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-[var(--status-danger)]/15'
                              : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]/15'
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <FieldError className='text-xs text-[var(--status-danger)]'>{errors.email.message}</FieldError>
                      )}
                      
                      <FieldDescription className='text-xs text-[var(--muted)]'>Enter the email address linked to your account.</FieldDescription>
                    </Field>
                  </div>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                size={'lg'}
                className="inline-flex w-full items-center justify-center rounded-[12px] bg-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
