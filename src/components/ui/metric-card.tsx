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
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
      <div className="mb-3 h-1 w-10 rounded-full bg-[var(--accent-strong)]" />
      <p className="text-sm text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.01em] text-[var(--heading)]">
        {value}
      </p>
      <p className={`mt-2 text-sm ${trendColor}`}>{hint}</p>
    </div>
  );
}
