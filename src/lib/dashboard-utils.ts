import type { Transaction } from '../types/inde';

export type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

export type ChartMetric = 'revenue' | 'transactions';

export type ChartPoint = {
  label: string;
  revenue: number;
  transactions: number;
  tooltip: string;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getPeriodRange(
  period: PeriodFilter,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);

  if (period === 'today') {
    return { from: startOfDay(now), to };
  }

  if (period === 'week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to };
  }

  if (period === 'month') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to };
  }

  const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
  const customEnd = customTo ? endOfDay(new Date(customTo)) : to;
  return { from, to: customEnd > to ? to : customEnd };
}

export function filterTransactions(
  transactions: Transaction[],
  period: PeriodFilter,
  customFrom?: string,
  customTo?: string,
  completedOnly = false,
) {
  const { from, to } = getPeriodRange(period, customFrom, customTo);

  return transactions.filter((transaction) => {
    const recorded = new Date(transaction.recordedAt);
    const inRange = recorded >= from && recorded <= to;
    const statusOk = completedOnly ? transaction.status === 'complete' : true;
    return inRange && statusOk;
  });
}

export function formatRp(value: number, compact = false) {
  if (compact && value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}K`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function buildChartSeries(
  transactions: Transaction[],
  period: PeriodFilter,
  customFrom?: string,
  customTo?: string,
): ChartPoint[] {
  const completed = filterTransactions(
    transactions,
    period,
    customFrom,
    customTo,
    true,
  );
  const { from, to } = getPeriodRange(period, customFrom, customTo);
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeDays = Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / dayMs),
  );

  if (period === 'today') {
    const hours = Array.from({ length: 24 }, (_, hour) => {
      const revenue = completed
        .filter((tx) => new Date(tx.recordedAt).getHours() === hour)
        .reduce((sum, tx) => sum + tx.total, 0);
      const count = completed.filter(
        (tx) => new Date(tx.recordedAt).getHours() === hour,
      ).length;
      return {
        label: `${hour.toString().padStart(2, '0')}`,
        revenue,
        transactions: count,
        tooltip: `${hour.toString().padStart(2, '0')}:00 – ${formatRp(revenue)} · ${count} orders`,
      };
    });
    return hours.filter((_, index) => index >= 8 && index <= 20);
  }

  if (rangeDays <= 14) {
    return Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(from);
      day.setDate(from.getDate() + index);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayTx = completed.filter((tx) => {
        const recorded = new Date(tx.recordedAt);
        return recorded >= dayStart && recorded <= dayEnd;
      });
      const revenue = dayTx.reduce((sum, tx) => sum + tx.total, 0);
      return {
        label: day.toLocaleDateString('id-ID', { weekday: 'short' }),
        revenue,
        transactions: dayTx.length,
        tooltip: `${day.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · ${formatRp(revenue)} · ${dayTx.length} orders`,
      };
    });
  }

  const bucketCount = Math.min(8, Math.ceil(rangeDays / 7));
  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(from);
    bucketStart.setDate(from.getDate() + index * 7);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + 6);
    if (bucketEnd > to) bucketEnd.setTime(to.getTime());

    const bucketTx = completed.filter((tx) => {
      const recorded = new Date(tx.recordedAt);
      return recorded >= bucketStart && recorded <= bucketEnd;
    });
    const revenue = bucketTx.reduce((sum, tx) => sum + tx.total, 0);
    return {
      label: `W${index + 1}`,
      revenue,
      transactions: bucketTx.length,
      tooltip: `${bucketStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${bucketEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · ${formatRp(revenue)} · ${bucketTx.length} orders`,
    };
  });
}

export function getBestSeller(transactions: Transaction[]) {
  const counts: Record<string, number> = {};
  for (const tx of transactions) {
    for (const item of tx.items) {
      counts[item.name] = (counts[item.name] ?? 0) + item.qty;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? '—';
}

export function getPeakHour(transactions: Transaction[]) {
  const hours: Record<number, number> = {};
  for (const tx of transactions) {
    const hour = new Date(tx.recordedAt).getHours();
    hours[hour] = (hours[hour] ?? 0) + tx.total;
  }
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  if (!peak) return '—';
  const hour = Number(peak[0]);
  return `${hour.toString().padStart(2, '0')}:00 – ${(hour + 1).toString().padStart(2, '0')}:00`;
}

export function getPeriodLabel(period: PeriodFilter) {
  switch (period) {
    case 'today':
      return 'Today';
    case 'week':
      return 'Last 7 days';
    case 'month':
      return 'Last 30 days';
    case 'custom':
      return 'Custom range';
  }
}
