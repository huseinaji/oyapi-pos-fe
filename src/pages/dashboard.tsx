import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  Radio,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AppButton } from '@/components/ui/app-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { AppSelect } from '@/components/ui/app-select';
import { useMeQuery } from '@/lib/auth/auth-store';
import { useCashierSessionsQuery } from '@/lib/cashier-sessions/cashier-sessions-store';
import type { CashierSession } from '@/lib/cashier-sessions/cashier-sessions-types';

import {
  filterTransactions,
  buildChartSeries,
  formatRp,
  getBestSeller,
  getPeakHour,
  getPeriodLabel,
  getPeriodRange,
  type PeriodFilter,
  type ChartMetric,
} from '@/lib/dashboard-utils';
import { daysAgoIso, todayIso } from '@/lib/transaction-utils';
import {
  useRealtimeTransactionsQuery,
  useTransactionsQuery,
} from '@/lib/transaction/transaction-store';
import { mapProduct, useProductsQuery } from '@/lib/product/product-store';
import { ITEM_TYPE_LABELS } from '@/lib/product/product-types';

const periodOptions: { id: PeriodFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
];

type ItemSalesMetric = 'revenue' | 'units' | 'orders';
type ItemSalesChart = 'bar' | 'donut';

const itemSalesColors = [
  'var(--accent)',
  'var(--status-success)',
  'var(--status-pending)',
  '#4c83e6',
  '#df7760',
  '#91a83c',
  '#47a7b9',
  '#b78636',
];

type StockTypeFilter = 'all' | 'raw_material' | 'finished_good';
type TrackedStockType = Exclude<StockTypeFilter, 'all'>;

function isTrackedStockType(
  type: string | undefined,
): type is TrackedStockType {
  return type === 'raw_material' || type === 'finished_good';
}

function toLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sessionDateValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : toLocalDateValue(date);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(value);
}

function getSessionForDate(
  sessions: CashierSession[],
  date: string,
  today: string,
): { session: CashierSession | null; isFallback: boolean } {
  const ordered = [...sessions].sort(
    (a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt),
  );
  const onDate = ordered.filter(
    (session) => sessionDateValue(session.openedAt) === date,
  );
  const activeSession = onDate.find((session) => session.status === 'OPEN');

  if (activeSession) return { session: activeSession, isFallback: false };
  if (onDate[0]) return { session: onDate[0], isFallback: false };
  if (date === today && ordered[0]) {
    return { session: ordered[0], isFallback: true };
  }

  return { session: null, isFallback: false };
}

export default function Home() {
  // ---------------------------------------------------------------------------
  // Zustand state
  // ---------------------------------------------------------------------------

  const transactionsQuery = useTransactionsQuery();
  const transactions = transactionsQuery.data ?? [];
  const realtimeTransactionsQuery = useRealtimeTransactionsQuery();
  const realtimeTransactions = realtimeTransactionsQuery.data ?? [];

  const { data: currentUser } = useMeQuery();
  const cashierSessionsQuery = useCashierSessionsQuery(
    currentUser?.store?.storeId,
  );
  const productsQuery = useProductsQuery();
  const rawProducts = productsQuery.data?.rows ?? [];
  const products = useMemo(() => rawProducts.map(mapProduct), [rawProducts]);
  const stockWatchItems = useMemo(
    () =>
      products
        .filter((product) => product.stock <= 5)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
        .slice(0, 3),
    [products],
  );

  // ---------------------------------------------------------------------------
  // Period filter
  // ---------------------------------------------------------------------------

  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemCashierFilter, setItemCashierFilter] = useState('all');
  const [itemPaymentFilter, setItemPaymentFilter] = useState('all');
  const [itemSalesMetric, setItemSalesMetric] =
    useState<ItemSalesMetric>('revenue');
  const [itemSalesChart, setItemSalesChart] = useState<ItemSalesChart>('bar');
  const [sessionReportDate, setSessionReportDate] = useState(() =>
    toLocalDateValue(new Date()),
  );
  const [sessionStockType, setSessionStockType] =
    useState<StockTypeFilter>('all');
  const [sessionItemId, setSessionItemId] = useState('');

  const [customFrom, setCustomFrom] = useState(daysAgoIso(29));

  const [customTo, setCustomTo] = useState(todayIso());

  const todayLocalDate = toLocalDateValue(new Date());
  const selectedSession = useMemo(
    () =>
      getSessionForDate(
        cashierSessionsQuery.data ?? [],
        sessionReportDate,
        todayLocalDate,
      ),
    [cashierSessionsQuery.data, sessionReportDate, todayLocalDate],
  );
  const sessionStockItems = useMemo(() => {
    const session = selectedSession.session;
    if (!session) return [];

    const productById = new Map(
      rawProducts.map((product) => [product.id, product]),
    );

    return session.openingStock.flatMap((item) => {
      const product = productById.get(item.itemId);
      if (!product || !isTrackedStockType(product.type)) return [];
      const type = product.type;
      if (sessionStockType !== 'all' && type !== sessionStockType) return [];

      return [
        {
          itemId: item.itemId,
          name: product.name ?? item.itemName,
          type,
          uom: item.uom || product?.uom || '',
          openingQty: item.quantity,
          soldQty: item.soldQuantity ?? 0,
        },
      ];
    });
  }, [selectedSession.session, rawProducts, sessionStockType]);
  const selectedSessionItem =
    sessionStockItems.find((item) => item.itemId === sessionItemId) ??
    sessionStockItems[0];
  const selectedSessionItemId = selectedSessionItem?.itemId ?? '';
  const sessionStockDonutData = selectedSessionItem
    ? [
        {
          name: 'Sold',
          value: Math.min(
            selectedSessionItem.soldQty,
            selectedSessionItem.openingQty,
          ),
          color: 'var(--accent)',
        },
        {
          name: 'Remaining',
          value: Math.max(
            selectedSessionItem.openingQty - selectedSessionItem.soldQty,
            0,
          ),
          color: 'var(--border-strong)',
        },
      ].filter((item) => item.value > 0)
    : [];

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

  const chartData = useMemo(
    () => buildChartSeries(transactions, period, customFrom, customTo),
    [transactions, period, customFrom, customTo],
  );
  const chartTotal = chartData.reduce(
    (sum, point) => sum + point[chartMetric],
    0,
  );

  const todayKey = new Date().toDateString();
  const todayTransactions = useMemo(
    () =>
      realtimeTransactions.filter(
        (transaction) =>
          transaction.status === 'complete' &&
          new Date(transaction.recordedAt).toDateString() === todayKey,
      ),
    [realtimeTransactions, todayKey],
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const itemCategories = useMemo(
    () =>
      [
        ...new Set(
          products.map((product) => product.category || 'Uncategorized'),
        ),
      ].sort(),
    [products],
  );
  const itemCashiers = useMemo(
    () =>
      [
        ...new Set(todayTransactions.map((transaction) => transaction.cashier)),
      ].sort(),
    [todayTransactions],
  );

  const itemSalesReport = useMemo(() => {
    const matchedTransactionIds = new Set<string>();
    const grouped = new Map<
      string,
      {
        itemId: string;
        name: string;
        category: string;
        revenue: number;
        units: number;
        transactionIds: Set<string>;
      }
    >();

    for (const transaction of todayTransactions) {
      if (
        itemCashierFilter !== 'all' &&
        transaction.cashier !== itemCashierFilter
      )
        continue;
      if (
        itemPaymentFilter !== 'all' &&
        transaction.paymentMethod !== itemPaymentFilter
      )
        continue;

      for (const line of transaction.items) {
        const product = productById.get(line.productId);
        const category = product?.category || 'Uncategorized';
        if (itemCategoryFilter !== 'all' && category !== itemCategoryFilter)
          continue;

        matchedTransactionIds.add(transaction.id);
        const current = grouped.get(line.productId) ?? {
          itemId: line.productId,
          name: line.name,
          category,
          revenue: 0,
          units: 0,
          transactionIds: new Set<string>(),
        };
        current.revenue += line.total;
        current.units += line.qty;
        current.transactionIds.add(transaction.id);
        grouped.set(line.productId, current);
      }
    }

    const rows = [...grouped.values()]
      .map((item) => ({ ...item, orders: item.transactionIds.size }))
      .sort((a, b) => b[itemSalesMetric] - a[itemSalesMetric]);
    const totals = rows.reduce(
      (sum, item) => ({
        revenue: sum.revenue + item.revenue,
        units: sum.units + item.units,
        orders: 0,
      }),
      { revenue: 0, units: 0, orders: 0 },
    );
    totals.orders = matchedTransactionIds.size;

    return { rows: rows.slice(0, 8), totals };
  }, [
    todayTransactions,
    productById,
    itemCategoryFilter,
    itemCashierFilter,
    itemPaymentFilter,
    itemSalesMetric,
  ]);

  const reportUpdatedAt = realtimeTransactionsQuery.dataUpdatedAt
    ? new Date(realtimeTransactionsQuery.dataUpdatedAt).toLocaleTimeString(
        'id-ID',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        },
      )
    : '—';

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
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={
          transactionsQuery.isLoading
            ? `Loading sales · ${getPeriodLabel(period)}`
            : transactionsQuery.isError
              ? 'Sales data unavailable'
              : `${getPeriodLabel(period)} · ${filteredComplete.length} completed sales`
        }
      />

      {/* Period filter */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
            <CalendarRange size={16} />
            Date range
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={period === opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:scale-[0.98] sm:px-4 ${
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={
            transactionsQuery.isLoading
              ? 'Loading…'
              : transactionsQuery.isError
                ? 'Unavailable'
                : formatRp(metrics.revenue, true)
          }
          hint={
            transactionsQuery.isLoading
              ? 'Loading sales'
              : transactionsQuery.isError
                ? 'Sales data unavailable'
                : metrics.revenueDelta >= 0
                  ? `+${metrics.revenueDelta}% vs previous period`
                  : `${metrics.revenueDelta}% vs previous period`
          }
          trend={
            transactionsQuery.isLoading || transactionsQuery.isError
              ? 'neutral'
              : metrics.revenueDelta >= 0
                ? 'up'
                : 'down'
          }
        />

        <MetricCard
          title="Transactions"
          value={
            transactionsQuery.isLoading
              ? 'Loading…'
              : transactionsQuery.isError
                ? 'Unavailable'
                : String(metrics.orderCount)
          }
          hint={
            transactionsQuery.isLoading
              ? 'Loading sales'
              : transactionsQuery.isError
                ? 'Sales data unavailable'
                : metrics.pendingCount > 0
                  ? `${metrics.pendingCount} pending payment`
                  : 'Completed sales only'
          }
          trend="neutral"
        />

        <MetricCard
          title="Avg. order value"
          value={
            transactionsQuery.isLoading
              ? 'Loading…'
              : transactionsQuery.isError
                ? 'Unavailable'
                : formatRp(metrics.avgOrder, true)
          }
          hint={
            transactionsQuery.isLoading
              ? 'Loading sales'
              : transactionsQuery.isError
                ? 'Sales data unavailable'
                : `Peak hour ${metrics.peakHour}`
          }
          trend="neutral"
        />

        <MetricCard
          title="Items"
          value={
            productsQuery.isLoading
              ? 'Loading…'
              : productsQuery.isError
                ? 'Unavailable'
                : String(products.length)
          }
          hint={
            productsQuery.isLoading
              ? 'Loading inventory'
              : productsQuery.isError
                ? 'Inventory data unavailable'
                : metrics.lowStock + metrics.outOfStock > 0
                  ? `${metrics.lowStock} low stock · ${metrics.outOfStock} out of stock`
                  : 'All stock healthy'
          }
          trend={
            productsQuery.isLoading || productsQuery.isError
              ? 'neutral'
              : metrics.lowStock + metrics.outOfStock > 0
                ? 'down'
                : 'up'
          }
        />
      </div>

      <section
        aria-labelledby="stock-watch-title"
        aria-busy={productsQuery.isLoading}
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:p-5"
      >
        <h2 id="stock-watch-title" className="sr-only">
          Inventory stock watch
        </h2>
        {productsQuery.isLoading ? (
          <div className="flex min-h-12 items-center gap-3" role="status">
            <div className="size-9 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-muted)]" />
              <div className="h-3 w-48 max-w-[60vw] animate-pulse rounded bg-[var(--surface-muted)]" />
            </div>
            <span className="sr-only">Loading inventory status</span>
          </div>
        ) : productsQuery.isError ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={19}
                className="mt-0.5 shrink-0 text-[var(--status-danger)]"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">Stock status unavailable</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Inventory could not be loaded. Try again to check for
                  low-stock items.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void productsQuery.refetch()}
              className="min-h-10 self-start sm:self-auto"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : stockWatchItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={19}
                  className="mt-0.5 shrink-0 text-[var(--status-pending)]"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-semibold">Stock needs attention</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {metrics.outOfStock} out of stock · {metrics.lowStock} low
                    stock
                  </p>
                </div>
              </div>
              <Link
                to="/products"
                className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:self-auto"
              >
                Review inventory
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {stockWatchItems.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/products/${product.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {product.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                        product.stock === 0
                          ? 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                          : 'bg-[var(--status-pending)]/15 text-[var(--foreground)]'
                      }`}
                    >
                      {product.stock === 0
                        ? 'Out of stock'
                        : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex min-h-12 items-center gap-3">
            <CheckCircle2
              size={19}
              className="shrink-0 text-[var(--status-success)]"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold">Stock looks healthy</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                No items are at or below 5 units.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <Card className="min-w-0 overflow-hidden border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="gap-4 border-b border-[var(--border)]/70 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[var(--accent)]">
                <ChartNoAxesCombined size={15} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  Sales intelligence
                </span>
              </div>
              <CardTitle className="text-lg">
                {chartMetric === 'revenue'
                  ? 'Revenue trend'
                  : 'Completed orders'}
              </CardTitle>
              <CardDescription>
                {getPeriodLabel(period)} · completed sales only
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/70 p-1">
              <Button
                size="sm"
                variant={chartMetric === 'revenue' ? 'default' : 'ghost'}
                aria-pressed={chartMetric === 'revenue'}
                onClick={() => setChartMetric('revenue')}
              >
                Revenue
              </Button>
              <Button
                size="sm"
                variant={chartMetric === 'transactions' ? 'default' : 'ghost'}
                aria-pressed={chartMetric === 'transactions'}
                onClick={() => setChartMetric('transactions')}
              >
                Orders
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_180px]">
            <div
              className="h-[240px] min-w-0 sm:h-[300px]"
              role="img"
              aria-label={`${chartMetric === 'revenue' ? 'Revenue' : 'Orders'} chart for ${getPeriodLabel(period)}`}
            >
              {transactionsQuery.isLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
              ) : transactionsQuery.isError ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--status-danger)]">
                  Report data is unavailable.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 12, right: 8, bottom: 0, left: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashboard-report-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--accent)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--accent)"
                          stopOpacity={0.015}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--border)"
                      strokeDasharray="3 6"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      tickMargin={12}
                    />
                    <YAxis
                      width={54}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 10 }}
                      tickFormatter={(value: number) =>
                        chartMetric === 'revenue'
                          ? formatRp(value, true)
                          : String(value)
                      }
                    />
                    <Tooltip
                      cursor={{
                        stroke: 'var(--accent)',
                        strokeDasharray: '4 4',
                        strokeOpacity: 0.5,
                      }}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--foreground)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      }}
                      labelStyle={{ color: 'var(--muted)', marginBottom: 4 }}
                      formatter={(value) => [
                        chartMetric === 'revenue'
                          ? formatRp(Number(value))
                          : `${Number(value)} orders`,
                        chartMetric === 'revenue'
                          ? 'Revenue'
                          : 'Completed orders',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric}
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      fill="url(#dashboard-report-fill)"
                      activeDot={{
                        r: 5,
                        strokeWidth: 0,
                        fill: 'var(--accent-strong)',
                      }}
                      animationDuration={450}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-row items-end justify-between gap-4 border-t border-[var(--border)]/70 pt-4 lg:flex-col lg:items-start lg:justify-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {chartMetric === 'revenue'
                    ? 'Period revenue'
                    : 'Completed orders'}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {transactionsQuery.isLoading
                    ? 'Loading…'
                    : transactionsQuery.isError
                      ? 'Unavailable'
                      : chartMetric === 'revenue'
                        ? formatRp(chartTotal, true)
                        : chartTotal}
                </p>
              </div>
              <p className="text-right text-xs text-[var(--muted)] lg:text-left">
                {chartData.length} report intervals · select a point for details
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="gap-4 border-b border-[var(--border)]/70 xl:flex xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[var(--status-success)]">
                <Radio size={14} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  Live · refresh 15s
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  Updated {reportUpdatedAt}
                </span>
              </div>
              <CardTitle className="text-lg">Today's sales by item</CardTitle>
              <CardDescription>
                Completed POS transactions · local store time
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/70 p-1">
                {(
                  [
                    ['revenue', 'Revenue'],
                    ['units', 'Units'],
                    ['orders', 'Orders'],
                  ] as const
                ).map(([metric, label]) => (
                  <Button
                    key={metric}
                    size="sm"
                    variant={itemSalesMetric === metric ? 'default' : 'ghost'}
                    aria-pressed={itemSalesMetric === metric}
                    onClick={() => setItemSalesMetric(metric)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/70 p-1">
                <Button
                  size="sm"
                  variant={itemSalesChart === 'bar' ? 'default' : 'ghost'}
                  aria-pressed={itemSalesChart === 'bar'}
                  onClick={() => setItemSalesChart('bar')}
                >
                  Bar
                </Button>
                <Button
                  size="sm"
                  variant={itemSalesChart === 'donut' ? 'default' : 'ghost'}
                  aria-pressed={itemSalesChart === 'donut'}
                  onClick={() => setItemSalesChart('donut')}
                >
                  Donut
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <AppSelect
                aria-label="Filter item category"
                value={itemCategoryFilter}
                onValueChange={setItemCategoryFilter}
                options={[
                  { value: 'all', label: 'All categories' },
                  ...itemCategories.map((category) => ({
                    value: category,
                    label: category,
                  })),
                ]}
              />
              <AppSelect
                aria-label="Filter cashier"
                value={itemCashierFilter}
                onValueChange={setItemCashierFilter}
                options={[
                  { value: 'all', label: 'All cashiers' },
                  ...itemCashiers.map((cashier) => ({
                    value: cashier,
                    label: cashier,
                  })),
                ]}
              />
              <AppSelect
                aria-label="Filter payment method"
                value={itemPaymentFilter}
                onValueChange={setItemPaymentFilter}
                options={[
                  { value: 'all', label: 'All payment methods' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'qris', label: 'QRIS' },
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Revenue
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {realtimeTransactionsQuery.isLoading
                    ? 'Loading…'
                    : realtimeTransactionsQuery.isError
                      ? 'Unavailable'
                      : formatRp(itemSalesReport.totals.revenue, true)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Units sold
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {realtimeTransactionsQuery.isLoading
                    ? 'Loading…'
                    : realtimeTransactionsQuery.isError
                      ? 'Unavailable'
                      : itemSalesReport.totals.units}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Orders
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {realtimeTransactionsQuery.isLoading
                    ? 'Loading…'
                    : realtimeTransactionsQuery.isError
                      ? 'Unavailable'
                      : itemSalesReport.totals.orders}
                </p>
              </div>
            </div>

            <div
              className="h-[280px] min-w-0 sm:h-[320px]"
              role="img"
              aria-label={`Today's item sales by ${itemSalesMetric}`}
            >
              {realtimeTransactionsQuery.isLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
              ) : realtimeTransactionsQuery.isError ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--status-danger)]">
                  Today's item report is unavailable.
                </div>
              ) : itemSalesReport.rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] text-center">
                  <ShoppingCart size={22} className="text-[var(--muted)]" />
                  <p className="text-sm font-medium">
                    No completed item sales match these filters.
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    This report refreshes automatically every 15 seconds.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {itemSalesChart === 'bar' ? (
                    <BarChart
                      data={itemSalesReport.rows}
                      layout="vertical"
                      margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="var(--border)"
                        strokeDasharray="3 6"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted)', fontSize: 10 }}
                        tickFormatter={(value: number) =>
                          itemSalesMetric === 'revenue'
                            ? formatRp(value, true)
                            : String(value)
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={96}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{
                          fill: 'var(--surface-accent)',
                          fillOpacity: 0.35,
                        }}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          color: 'var(--foreground)',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                        }}
                        formatter={(value) => [
                          itemSalesMetric === 'revenue'
                            ? formatRp(Number(value))
                            : Number(value),
                          itemSalesMetric === 'revenue'
                            ? 'Revenue'
                            : itemSalesMetric === 'units'
                              ? 'Units sold'
                              : 'Orders',
                        ]}
                        labelFormatter={(name) => String(name)}
                      />
                      <Bar
                        dataKey={itemSalesMetric}
                        radius={[0, 7, 7, 0]}
                        maxBarSize={28}
                      >
                        {itemSalesReport.rows.map((item, index) => (
                          <Cell
                            key={item.itemId}
                            fill={
                              itemSalesColors[index % itemSalesColors.length]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          color: 'var(--foreground)',
                        }}
                        formatter={(value) => [
                          itemSalesMetric === 'revenue'
                            ? formatRp(Number(value))
                            : Number(value),
                          itemSalesMetric === 'revenue'
                            ? 'Revenue'
                            : itemSalesMetric === 'units'
                              ? 'Units sold'
                              : 'Orders',
                        ]}
                      />
                      <Legend verticalAlign="bottom" height={32} />
                      <Pie
                        data={itemSalesReport.rows}
                        dataKey={itemSalesMetric}
                        nameKey="name"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={3}
                        stroke="var(--card)"
                        strokeWidth={3}
                        animationDuration={450}
                      >
                        {itemSalesReport.rows.map((item, index) => (
                          <Cell
                            key={item.itemId}
                            fill={
                              itemSalesColors[index % itemSalesColors.length]
                            }
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              {realtimeTransactionsQuery.isLoading
                ? "Loading today's item sales…"
                : realtimeTransactionsQuery.isError
                  ? "Today's item sales are unavailable."
                  : itemSalesReport.rows.length === 0
                    ? 'No item sales match these filters.'
                    : `Showing top ${itemSalesReport.rows.length} items · total ${
                        itemSalesMetric === 'revenue'
                          ? formatRp(itemSalesReport.totals.revenue)
                          : `${itemSalesReport.totals[itemSalesMetric]} ${
                              itemSalesMetric === 'units'
                                ? 'units sold'
                                : 'orders'
                            }`
                      }`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden border-[var(--border)] bg-[var(--card)]">
        <CardHeader className="gap-4 border-b border-[var(--border)]/70 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">
              Session stock: opening vs sold
            </CardTitle>
            <CardDescription>
              Compare opening stock with sold quantity for Raw Materials and
              Finished Goods using the quantities recorded in the cashier
              session.
            </CardDescription>
          </div>
          <div className="w-full sm:w-auto sm:min-w-48">
            <label
              htmlFor="session-stock-date"
              className="mb-1.5 block text-xs font-medium text-[var(--muted)]"
            >
              Session date
            </label>
            <input
              id="session-stock-date"
              type="date"
              value={sessionReportDate}
              max={todayLocalDate}
              onChange={(event) => {
                setSessionReportDate(event.target.value);
                setSessionItemId('');
              }}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {cashierSessionsQuery.isLoading ||
          productsQuery.isLoading ||
          realtimeTransactionsQuery.isLoading ? (
            <div
              className="flex min-h-48 items-center justify-center text-sm text-[var(--muted)]"
              role="status"
            >
              Loading session stock…
            </div>
          ) : cashierSessionsQuery.isError ||
            productsQuery.isError ||
            realtimeTransactionsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
              <p className="text-sm text-[var(--status-danger)]" role="alert">
                Session stock data is unavailable. Retry to load opening and
                sales quantities.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="min-h-10"
                onClick={() => {
                  if (cashierSessionsQuery.isError)
                    void cashierSessionsQuery.refetch();
                  if (productsQuery.isError) void productsQuery.refetch();
                  if (realtimeTransactionsQuery.isError)
                    void realtimeTransactionsQuery.refetch();
                }}
              >
                <RefreshCw size={14} aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : !selectedSession.session ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] text-center">
              <CalendarRange
                size={22}
                className="text-[var(--muted)]"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                No cashier session on this date.
              </p>
              <p className="text-xs text-[var(--muted)]">
                Choose another date to view its opening and sold quantities.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedSession.isFallback
                      ? 'Latest cashier session'
                      : selectedSession.session.status === 'OPEN'
                        ? 'Active cashier session'
                        : 'Closed cashier session'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selectedSession.isFallback
                      ? `No session on today’s date · opened ${new Date(
                          selectedSession.session.openedAt,
                        ).toLocaleDateString('id-ID')}`
                      : `Opened ${new Date(
                          selectedSession.session.openedAt,
                        ).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`}
                    {' · '}
                    {selectedSession.session.openedBy.username}
                  </p>
                </div>
                <div
                  className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1"
                  role="group"
                  aria-label="Filter session stock by item type"
                >
                  {(
                    [
                      ['all', 'All'],
                      ['raw_material', 'Raw material'],
                      ['finished_good', 'Finished good'],
                    ] as const
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={sessionStockType === type}
                      onClick={() => {
                        setSessionStockType(type);
                        setSessionItemId('');
                      }}
                      className={`min-h-10 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        sessionStockType === type
                          ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {sessionStockItems.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] text-center">
                  <p className="text-sm font-medium">
                    No opening stock for this item type in the session.
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Choose another type or a date with a recorded cashier
                    session.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] lg:items-center">
                  <div className="space-y-4">
                    <AppSelect
                      aria-label="Select item for session stock comparison"
                      value={selectedSessionItemId}
                      onValueChange={setSessionItemId}
                      options={sessionStockItems.map((item) => ({
                        value: item.itemId,
                        label: `${item.name} · ${ITEM_TYPE_LABELS[item.type]}`,
                      }))}
                    />
                    {selectedSessionItem && (
                      <>
                        <div>
                          <p className="text-sm font-medium">
                            {selectedSessionItem.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {ITEM_TYPE_LABELS[selectedSessionItem.type]}
                          </p>
                        </div>
                        <dl className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
                            <dt className="text-xs text-[var(--muted)]">
                              Sold qty
                            </dt>
                            <dd className="mt-1 text-lg font-semibold tabular-nums">
                              {formatQuantity(selectedSessionItem.soldQty)}{' '}
                              {selectedSessionItem.uom}
                            </dd>
                          </div>
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
                            <dt className="text-xs text-[var(--muted)]">
                              Opening qty
                            </dt>
                            <dd className="mt-1 text-lg font-semibold tabular-nums">
                              {formatQuantity(selectedSessionItem.openingQty)}{' '}
                              {selectedSessionItem.uom}
                            </dd>
                          </div>
                        </dl>
                        {selectedSessionItem.soldQty >
                          selectedSessionItem.openingQty && (
                          <p className="text-xs text-[var(--status-pending)]">
                            Sold quantity is greater than the opening quantity
                            by{' '}
                            {formatQuantity(
                              selectedSessionItem.soldQty -
                                selectedSessionItem.openingQty,
                            )}{' '}
                            {selectedSessionItem.uom}.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {selectedSessionItem && selectedSessionItem.openingQty > 0 ? (
                    <div className="mx-auto w-full max-w-72">
                      <div
                        className="relative h-64 w-full"
                        role="img"
                        aria-label={`${formatQuantity(selectedSessionItem.soldQty)} ${selectedSessionItem.uom} sold out of ${formatQuantity(selectedSessionItem.openingQty)} ${selectedSessionItem.uom} opening quantity for ${selectedSessionItem.name}`}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                color: 'var(--foreground)',
                              }}
                              formatter={(value, name) => [
                                `${formatQuantity(Number(value))} ${selectedSessionItem.uom}`,
                                String(name),
                              ]}
                            />
                            <Pie
                              data={sessionStockDonutData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="70%"
                              outerRadius="92%"
                              paddingAngle={2}
                              stroke="var(--card)"
                              strokeWidth={3}
                              isAnimationActive={false}
                            >
                              {sessionStockDonutData.map((segment) => (
                                <Cell key={segment.name} fill={segment.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xs text-[var(--muted)]">
                            Opening qty
                          </span>
                          <span className="mt-1 text-2xl font-semibold tabular-nums">
                            {formatQuantity(selectedSessionItem.openingQty)}
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            {selectedSessionItem.uom}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2.5 rounded-full bg-[var(--accent)]" />
                          Sold
                        </span>
                        <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                          <span className="size-2.5 rounded-full bg-[var(--border-strong)]" />
                          Remaining
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] p-5 text-center">
                      <p className="text-sm font-medium">
                        No opening quantity was recorded for this item.
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Sold quantity:{' '}
                        {formatQuantity(selectedSessionItem?.soldQty ?? 0)}{' '}
                        {selectedSessionItem?.uom}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <SectionCard
        title="Recent transactions"
        description="Latest activity within the selected date range."
      >
        <div className="space-y-3">
          {transactionsQuery.isLoading ? (
            <div
              className="rounded-[12px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]"
              role="status"
            >
              Loading recent transactions…
            </div>
          ) : transactionsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-[var(--border)] p-6 text-center">
              <p className="text-sm text-[var(--status-danger)]" role="alert">
                Recent transactions could not be loaded.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void transactionsQuery.refetch()}
                className="min-h-10"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
              No transactions in this period.
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] p-3 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--surface-muted)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{tx.invoice}</p>

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

                  <p className="truncate text-sm text-[var(--muted)]">
                    {tx.customer}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="whitespace-nowrap font-semibold tabular-nums">
                    {formatRp(tx.total)}
                  </p>

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
        description={
          transactionsQuery.isError
            ? 'Sales insights are unavailable.'
            : 'Highlights from filtered sales data.'
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[12px] bg-[var(--canvas-soft)] p-4">
            <p className="text-sm text-[var(--muted)]">Peak hour</p>

            <p className="mt-2 text-xl font-semibold">
              {transactionsQuery.isLoading
                ? 'Loading…'
                : transactionsQuery.isError
                  ? 'Unavailable'
                  : metrics.peakHour}
            </p>
          </div>

          <div className="rounded-[12px] border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--muted)]">Best seller</p>

            <p className="mt-2 text-xl font-semibold">
              {transactionsQuery.isLoading
                ? 'Loading…'
                : transactionsQuery.isError
                  ? 'Unavailable'
                  : metrics.bestSeller}
            </p>
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
