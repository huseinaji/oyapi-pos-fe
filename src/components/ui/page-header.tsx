type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="rounded-[12px] bg-[var(--band-bg)] px-5 py-4 text-[var(--band-text)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--band-text-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--band-text-muted)]">
              {description}
            </p>
          ): <div className="h-6"/>}
        </div>

        {(action || children) && (
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            {action}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
