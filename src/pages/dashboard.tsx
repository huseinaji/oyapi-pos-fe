import { useMemo, useState } from 'react';
import { ShoppingCart, TrendingUp, CalendarRange, ChartNoAxesCombined, Radio } from 'lucide-react';
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

import { AppButton } from '../components/ui/app-button';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { MetricCard } from '../components/ui/metric-card';
import { PageHeader } from '../components/ui/page-header';
import { SectionCard } from '../components/ui/section-card';
import { AppSelect } from '../components/ui/app-select';

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
} from '../lib/dashboard-utils';
import { daysAgoIso, todayIso } from '../lib/transaction-utils';
import { useRealtimeTransactionsQuery, useTransactionsQuery } from '#lib/transaction/transaction-store';
import { usePosProductsQuery } from '#lib/product/product-store';

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

export default function Home() {
  // ---------------------------------------------------------------------------
  // Zustand state
  // ---------------------------------------------------------------------------

  const transactionsQuery = useTransactionsQuery();
  const transactions = transactionsQuery.data ?? [];
  const realtimeTransactionsQuery = useRealtimeTransactionsQuery();
  const realtimeTransactions = realtimeTransactionsQuery.data ?? [];

  const productsQuery = usePosProductsQuery();
  const products = productsQuery.data;

  // ---------------------------------------------------------------------------
  // Period filter
  // ---------------------------------------------------------------------------

  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemCashierFilter, setItemCashierFilter] = useState('all');
  const [itemPaymentFilter, setItemPaymentFilter] = useState('all');
  const [itemSalesMetric, setItemSalesMetric] = useState<ItemSalesMetric>('revenue');
  const [itemSalesChart, setItemSalesChart] = useState<ItemSalesChart>('bar');

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
    () => realtimeTransactions.filter((transaction) =>
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
    () => [...new Set(products.map((product) => product.category || 'Uncategorized'))].sort(),
    [products],
  );
  const itemCashiers = useMemo(
    () => [...new Set(todayTransactions.map((transaction) => transaction.cashier))].sort(),
    [todayTransactions],
  );

  const itemSalesReport = useMemo(() => {
    const matchedTransactionIds = new Set<string>();
    const grouped = new Map<string, {
      itemId: string;
      name: string;
      category: string;
      revenue: number;
      units: number;
      transactionIds: Set<string>;
    }>();

    for (const transaction of todayTransactions) {
      if (itemCashierFilter !== 'all' && transaction.cashier !== itemCashierFilter) continue;
      if (itemPaymentFilter !== 'all' && transaction.paymentMethod !== itemPaymentFilter) continue;

      for (const line of transaction.items) {
        const product = productById.get(line.productId);
        const category = product?.category || 'Uncategorized';
        if (itemCategoryFilter !== 'all' && category !== itemCategoryFilter) continue;

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
    ? new Date(realtimeTransactionsQuery.dataUpdatedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
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
          title="Items"
          value={String(products.length)}
          hint={
            metrics.lowStock + metrics.outOfStock > 0
              ? `${metrics.lowStock} low stock · ${metrics.outOfStock} out of stock`
              : 'All stock healthy'
          }
          trend={metrics.lowStock + metrics.outOfStock > 0 ? 'down' : 'up'}
        />
      </div>
      
      <div className='flex flex-col gap-4 md:flex-row'>
        <Card className="overflow-hidden border-[var(--accent)]/20 bg-[var(--card)] shadow-[0_18px_50px_-32px_var(--accent)]">
          <CardHeader className="gap-4 border-b border-[var(--border)]/70 sm:flex sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[var(--accent)]">
                <ChartNoAxesCombined size={15} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                  Sales intelligence
                </span>
              </div>
              <CardTitle className="text-lg">
                {chartMetric === 'revenue' ? 'Revenue trend' : 'Completed orders'}
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
          <CardContent className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_180px]">
            <div className="h-[260px] min-w-0 sm:h-[320px]" role="img" aria-label={`${chartMetric === 'revenue' ? 'Revenue' : 'Orders'} chart for ${getPeriodLabel(period)}`}>
              {transactionsQuery.isLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
              ) : transactionsQuery.isError ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--status-danger)]">
                  Report data is unavailable.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="dashboard-report-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.015} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      tickMargin={12}
                    />
                    <YAxis
                      width={64}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 10 }}
                      tickFormatter={(value: number) =>
                        chartMetric === 'revenue' ? formatRp(value, true) : String(value)
                      }
                    />
                    <Tooltip
                      cursor={{ stroke: 'var(--accent)', strokeDasharray: '4 4', strokeOpacity: 0.5 }}
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
                        chartMetric === 'revenue' ? 'Revenue' : 'Completed orders',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric}
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      fill="url(#dashboard-report-fill)"
                      activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent-strong)' }}
                      animationDuration={450}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-row items-end justify-between gap-4 border-t border-[var(--border)]/70 pt-4 lg:flex-col lg:items-start lg:justify-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {chartMetric === 'revenue' ? 'Period revenue' : 'Completed orders'}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
                  {chartMetric === 'revenue' ? formatRp(chartTotal, true) : chartTotal}
                </p>
              </div>
              <p className="text-right text-xs text-[var(--muted)] lg:text-left">
                {chartData.length} report intervals · hover chart for details
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[var(--accent)]/20 bg-[var(--card)] shadow-[0_18px_50px_-32px_var(--accent)]">
          <CardHeader className="gap-4 border-b border-[var(--border)]/70 xl:flex xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[var(--status-success)]">
                <Radio size={14} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Live · refresh 15s</span>
                <span className="text-[10px] text-[var(--muted)]">Updated {reportUpdatedAt}</span>
              </div>
              <CardTitle className="text-lg">Today's sales by item</CardTitle>
              <CardDescription>Completed POS transactions · local store time</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/70 p-1">
                {([
                  ['revenue', 'Revenue'],
                  ['units', 'Units'],
                  ['orders', 'Orders'],
                ] as const).map(([metric, label]) => (
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
                  ...itemCategories.map((category) => ({ value: category, label: category })),
                ]}
              />
              <AppSelect
                aria-label="Filter cashier"
                value={itemCashierFilter}
                onValueChange={setItemCashierFilter}
                options={[
                  { value: 'all', label: 'All cashiers' },
                  ...itemCashiers.map((cashier) => ({ value: cashier, label: cashier })),
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Revenue</p>
                <p className="mt-1 truncate text-sm font-bold">{formatRp(itemSalesReport.totals.revenue, true)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Units sold</p>
                <p className="mt-1 truncate text-sm font-bold">{itemSalesReport.totals.units}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Orders</p>
                <p className="mt-1 truncate text-sm font-bold">{itemSalesReport.totals.orders}</p>
              </div>
            </div>

            <div className="h-[300px] min-w-0 sm:h-[360px]" role="img" aria-label={`Today's item sales by ${itemSalesMetric}`}>
              {realtimeTransactionsQuery.isLoading ? (
                <div className="h-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
              ) : realtimeTransactionsQuery.isError ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--status-danger)]">
                  Today's item report is unavailable.
                </div>
              ) : itemSalesReport.rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] text-center">
                  <ShoppingCart size={22} className="text-[var(--muted)]" />
                  <p className="text-sm font-medium">No completed item sales match these filters.</p>
                  <p className="text-xs text-[var(--muted)]">This report refreshes automatically every 15 seconds.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {itemSalesChart === 'bar' ? (
                    <BarChart
                      data={itemSalesReport.rows}
                      layout="vertical"
                      margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 6" />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted)', fontSize: 10 }}
                        tickFormatter={(value: number) => itemSalesMetric === 'revenue' ? formatRp(value, true) : String(value)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={112}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--surface-accent)', fillOpacity: 0.35 }}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          color: 'var(--foreground)',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                        }}
                        formatter={(value) => [
                          itemSalesMetric === 'revenue' ? formatRp(Number(value)) : Number(value),
                          itemSalesMetric === 'revenue' ? 'Revenue' : itemSalesMetric === 'units' ? 'Units sold' : 'Orders',
                        ]}
                        labelFormatter={(name) => String(name)}
                      />
                      <Bar dataKey={itemSalesMetric} radius={[0, 7, 7, 0]} maxBarSize={28}>
                        {itemSalesReport.rows.map((item, index) => (
                          <Cell key={item.itemId} fill={itemSalesColors[index % itemSalesColors.length]} />
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
                          itemSalesMetric === 'revenue' ? formatRp(Number(value)) : Number(value),
                          itemSalesMetric === 'revenue' ? 'Revenue' : itemSalesMetric === 'units' ? 'Units sold' : 'Orders',
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
                          <Cell key={item.itemId} fill={itemSalesColors[index % itemSalesColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Showing top {itemSalesReport.rows.length} items · total{' '}
              {itemSalesMetric === 'revenue'
                ? formatRp(itemSalesReport.totals.revenue)
                : `${itemSalesReport.totals[itemSalesMetric]} ${itemSalesMetric === 'units' ? 'units sold' : 'orders'}`}
            </p>
          </CardContent>
        </Card>
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
                to={`/transactions/${tx.id}`}
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
