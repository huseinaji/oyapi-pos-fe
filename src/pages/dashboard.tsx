import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, TrendingUp, CalendarRange } from 'lucide-react';
import { Link } from 'react-router';

import { AppButton } from '../components/ui/app-button';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { MetricCard } from '../components/ui/metric-card';
import { PageHeader } from '../components/ui/page-header';
import { SectionCard } from '../components/ui/section-card';

import {
  filterTransactions,
  formatRp,
  getBestSeller,
  getPeakHour,
  getPeriodLabel,
  getPeriodRange,
  type PeriodFilter,
} from '../lib/dashboard-utils';
import { daysAgoIso, todayIso } from '../lib/transaction-utils';
import { useTransactionStore } from '#lib/transaction/transaction-store';
import { useProductStore } from '#lib/product/product-store';

const periodOptions: { id: PeriodFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
];

export default function Home() {
  // ---------------------------------------------------------------------------
  // Zustand state
  // ---------------------------------------------------------------------------

  const transactions = useTransactionStore((state) => state.transactions);

  const fetchTransactions = useTransactionStore(
    (state) => state.fetchTransactions,
  );

  const products = useProductStore((state) => state.products);

  const fetchItems = useProductStore((state) => state.fetchItems);

  // ---------------------------------------------------------------------------
  // Initial data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void fetchItems();
    void fetchTransactions();
  }, [fetchItems, fetchTransactions]);

  // ---------------------------------------------------------------------------
  // Period filter
  // ---------------------------------------------------------------------------

  const [period, setPeriod] = useState<PeriodFilter>('week');

  const [customFrom, setCustomFrom] = useState(daysAgoIso(29));

  const [customTo, setCustomTo] = useState(todayIso());

  // ---------------------------------------------------------------------------
  // Filtered transactions
  // ---------------------------------------------------------------------------

  const filteredAll = useMemo(
    () => filterTransactions(transactions, period, customFrom, customTo),
    [transactions, period, customFrom, customTo],
  );

  const filteredComplete = useMemo(
    () => filterTransactions(transactions, period, customFrom, customTo, true),
    [transactions, period, customFrom, customTo],
  );

  // ---------------------------------------------------------------------------
  // Dashboard metrics
  // ---------------------------------------------------------------------------

  const metrics = useMemo(() => {
    const revenue = filteredComplete.reduce((sum, tx) => sum + tx.total, 0);

    const orderCount = filteredComplete.length;

    const pendingCount = filteredAll.filter(
      (tx) => tx.status === 'pending',
    ).length;

    const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

    const lowStock = products.filter(
      (product) => product.stock > 0 && product.stock <= 5,
    ).length;

    const outOfStock = products.filter((product) => product.stock === 0).length;

    const { from, to } = getPeriodRange(period, customFrom, customTo);

    const rangeMs = to.getTime() - from.getTime();

    const prevFrom = new Date(from.getTime() - rangeMs - 1);

    const prevTo = new Date(from.getTime() - 1);

    const prevRevenue = transactions
      .filter((tx) => {
        if (tx.status !== 'complete') {
          return false;
        }

        const recordedAt = new Date(tx.recordedAt);

        return recordedAt >= prevFrom && recordedAt <= prevTo;
      })
      .reduce((sum, tx) => sum + tx.total, 0);

    const revenueDelta =
      prevRevenue > 0
        ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100)
        : revenue > 0
          ? 100
          : 0;

    return {
      revenue,
      orderCount,
      pendingCount,
      avgOrder,
      lowStock,
      outOfStock,
      revenueDelta,
      bestSeller: getBestSeller(filteredComplete),
      peakHour: getPeakHour(filteredComplete),
    };
  }, [
    filteredAll,
    filteredComplete,
    products,
    transactions,
    period,
    customFrom,
    customTo,
  ]);

  // ---------------------------------------------------------------------------
  // Recent transactions
  // ---------------------------------------------------------------------------

  const recentTransactions = useMemo(
    () =>
      [...filteredAll]
        .sort(
          (a, b) =>
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
        )
        .slice(0, 5),
    [filteredAll],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`${getPeriodLabel(period)} · ${filteredComplete.length} completed sales`}
        action={
          <Link to="/pos">
            <AppButton variant="inverted">
              <ShoppingCart size={14} />
              <span className="ml-2">New sale</span>
            </AppButton>
          </Link>
        }
      />

      {/* Period filter */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
            <CalendarRange size={16} />
            Date range
          </div>

          <div className="flex flex-wrap gap-2">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  period === opt.id
                    ? 'bg-[var(--accent-strong)] text-[var(--accent-foreground)]'
                    : 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:border-[var(--accent)]/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="border-t border-[var(--border)] pt-3">
            <DateRangePicker
              value={{
                from: customFrom,
                to: customTo,
              }}
              onChange={({ from, to }) => {
                if (from) {
                  setCustomFrom(from);
                }

                if (to) {
                  setCustomTo(to);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatRp(metrics.revenue, true)}
          hint={
            metrics.revenueDelta >= 0
              ? `+${metrics.revenueDelta}% vs previous period`
              : `${metrics.revenueDelta}% vs previous period`
          }
          trend={metrics.revenueDelta >= 0 ? 'up' : 'down'}
        />

        <MetricCard
          title="Transactions"
          value={String(metrics.orderCount)}
          hint={
            metrics.pendingCount > 0
              ? `${metrics.pendingCount} pending payment`
              : 'Completed sales only'
          }
          trend="neutral"
        />

        <MetricCard
          title="Avg. order value"
          value={formatRp(metrics.avgOrder, true)}
          hint={`Peak hour ${metrics.peakHour}`}
          trend="neutral"
        />

        <MetricCard
          title="Products"
          value={String(products.length)}
          hint={
            metrics.lowStock + metrics.outOfStock > 0
              ? `${metrics.lowStock} low stock · ${metrics.outOfStock} out of stock`
              : 'All stock healthy'
          }
          trend={metrics.lowStock + metrics.outOfStock > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Recent transactions */}
      <SectionCard
        title="Recent transactions"
        description="Latest activity within the selected date range."
      >
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
              No transactions in this period.
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <Link
                key={tx.id}
                to={`/transactions/detail/${tx.id}`}
                className="flex items-center justify-between rounded-[12px] border border-[var(--border)] p-3 transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-muted)]/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{tx.invoice}</p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        tx.status === 'complete'
                          ? 'bg-[var(--surface-accent)] text-[var(--status-success)]'
                          : 'bg-[var(--status-pending)]/15 text-[var(--status-pending)]'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--muted)]">{tx.customer}</p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">{formatRp(tx.total)}</p>

                  <p className="text-sm text-[var(--muted)]">{tx.date}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="mt-4">
          <Link to="/transactions">
            <AppButton variant="secondary">View all transactions</AppButton>
          </Link>
        </div>
      </SectionCard>

      {/* Performance insights */}
      <SectionCard
        title="Performance insights"
        description="Highlights from filtered sales data."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[12px] bg-[var(--canvas-soft)] p-4">
            <p className="text-sm text-[var(--muted)]">Peak hour</p>

            <p className="mt-2 text-xl font-semibold">{metrics.peakHour}</p>
          </div>

          <div className="rounded-[12px] border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--muted)]">Best seller</p>

            <p className="mt-2 text-xl font-semibold">{metrics.bestSeller}</p>
          </div>

          <div className="rounded-[12px] border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--muted)]">Period</p>

            <div className="mt-2 flex items-center gap-1.5 text-xl font-semibold">
              <TrendingUp size={18} className="text-[var(--accent)]" />

              {getPeriodLabel(period)}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
