type MetricCardProps = {
  title: string;
  value: string;
  hint: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function MetricCard({
  title,
  value,
  hint,
  trend = 'neutral',
}: MetricCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-[var(--status-success)]'
      : trend === 'down'
        ? 'text-[var(--status-danger)]'
        : 'text-[var(--muted)]';

  return (
    <div className="min-w-0 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="mb-3 h-1 w-10 rounded-full bg-[var(--accent-strong)]" />
      <p className="text-xs leading-5 text-[var(--muted)] sm:text-sm">
        {title}
      </p>
      <p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums tracking-[-0.01em] text-[var(--heading)] sm:text-2xl">
        {value}
      </p>
      <p className={`mt-2 text-xs leading-5 sm:text-sm ${trendColor}`}>
        {hint}
      </p>
    </div>
  );
}
