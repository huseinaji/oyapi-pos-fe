import { Link } from 'react-router';
import { AppButton } from './app-button';

type StatusPageProps = {
  code: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function StatusPage({
  code,
  title,
  description,
  actionLabel = 'Back to dashboard',
  actionHref = '/',
  secondaryLabel,
  secondaryHref,
}: StatusPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-[12px] bg-[var(--band-bg)] px-8 py-6 text-[var(--band-text)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_8px_24px_rgba(0,0,0,0.12)]">
        <p className="text-5xl font-semibold tracking-[-0.02em]">{code}</p>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.01em] text-[var(--heading)]">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={actionHref}>
          <AppButton variant="primary">{actionLabel}</AppButton>
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link to={secondaryHref}>
            <AppButton variant="secondary">{secondaryLabel}</AppButton>
          </Link>
        )}
      </div>
    </div>
  );
}
