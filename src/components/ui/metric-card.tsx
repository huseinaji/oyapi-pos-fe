import type { KeyboardEvent, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from 'cn';

type KpiCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  iconTone?: 'default' | 'blue' | 'cyan';
  trendText?: string;
  trendStatus?: 'success' | 'danger' | 'neutral';
  footer?: ReactNode;
  footerAside?: ReactNode;
  variant?: 'default' | 'danger';
  onClick?: () => void;
};

export function KpiCard({
  label,
  value,
  icon,
  iconTone = 'default',
  trendText,
  trendStatus = 'neutral',
  footer,
  footerAside,
  variant = 'default',
  onClick,
}: KpiCardProps) {
  const isInteractive = typeof onClick === 'function';
  const badgeVariant =
    trendStatus === 'danger'
      ? 'destructive'
      : trendStatus === 'success'
        ? 'secondary'
        : 'outline';
  const iconClassName =
    variant === 'danger'
      ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
      : iconTone === 'blue'
        ? 'bg-[var(--tint-blue-bg)] text-[var(--tint-blue)]'
        : iconTone === 'cyan'
          ? 'bg-[var(--tint-cyan-bg)] text-[var(--tint-cyan)]'
          : 'bg-[var(--surface-accent)] text-[var(--accent)]';

  return (
    <Card
      noPadding
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
      }}
      className={cn(
        'min-h-[148px] justify-between gap-y-0 rounded-xl',
        variant === 'danger' && 'border-l-4 border-l-[var(--status-danger)]',
        isInteractive &&
          'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      )}
    >
      <CardHeader className="gap-x-2 gap-y-1 px-4 pt-4 pb-0 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <CardDescription className="truncate">{label}</CardDescription>
          <div className="mt-1 truncate text-xl font-bold leading-tight text-[var(--primary)] tabular-nums sm:text-2xl">
            {value}
          </div>
        </div>
        {icon && (
          <CardAction
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-lg',
              iconClassName,
            )}
          >
            {icon}
          </CardAction>
        )}
      </CardHeader>

      {(footer || trendText || footerAside || isInteractive) && (
        <CardContent className="mt-auto flex flex-col gap-2 px-4 pt-0 pb-4 sm:px-5 sm:pb-5">
          <Separator />
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {footer ??
                (trendText && (
                  <Badge variant={badgeVariant}>{trendText}</Badge>
                ))}
            </div>
            {(footerAside || isInteractive) && (
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {footerAside ?? 'Detail →'}
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
