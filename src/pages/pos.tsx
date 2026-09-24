import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Search,
  ShoppingBag,
  User,
  Banknote,
  RotateCcw,
  Receipt,
  Package,
  Keyboard,
  TriangleAlert,
  Badge,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { useCartStore } from '../stores/cart-store';
import { useSettingsStore } from '../stores/settings-store';
import { formatRp } from '../lib/transaction-utils';
import { transactionsApi } from '../lib/transaction/transactions-api';
import { ApiError } from '../lib/api-client';
import { ProductGridSkeleton } from '../components/ui/skeleton';
import { ITEM_CATEGORY_LABELS } from '../types/api';
import { useProductStore } from '#lib/product/product-store';
import { useTransactionStore } from '#lib/transaction/transaction-store';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '#components/ui/card';
import { Button } from '#components/ui/button';

const paymentSteps = ['Cart', 'Payment', 'Review'] as const;
const WALK_IN_CUSTOMER = 'Walk-in Customer';

function showInsufficientStockToast(description: string) {
  toast.error('Insufficient Stock', {
    description,
    icon: <TriangleAlert size={17} className="text-[var(--status-danger)]" />,
  });
}

export default function PosPage() {
  const {
    items,
    subtotal,
    discount,
    total,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    recalculate,
  } = useCartStore();
  const products = useProductStore((state) => state.products);
  const isProductsLoading = useProductStore((state) => state.isLoading);
  const fetchItems = useProductStore((state) => state.fetchItems);
  const decrementStock = useProductStore((state) => state.decrementStock);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const { settings } = useSettingsStore();

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState(WALK_IN_CUSTOMER);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{
    invoice: string;
    total: number;
    customer: string;
    paymentMethod: 'cash' | 'qris';
  } | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [desktopTab, setDesktopTab] = useState<'products' | 'order'>(
    'products',
  );
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [focusedProductIndex, setFocusedProductIndex] = useState<number>(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const productButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const productFetchRequestedRef = useRef(false);

  useEffect(() => {
    if (products.length > 0 || productFetchRequestedRef.current) return;
    productFetchRequestedRef.current = true;
    void fetchItems();
  }, [fetchItems, products.length]);

  // ── ⌘K / Ctrl+K → focus search ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key === 'k';
      if (!isShortcut) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Arrow-key navigation through product grid ────────────────────────────
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next =
        focusedProductIndex < availableProducts.length - 1
          ? focusedProductIndex + 1
          : 0;
      setFocusedProductIndex(next);
      productButtonRefs.current[next]?.focus();
    }
  };

  const handleProductKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const count = availableProducts.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = index < count - 1 ? index + 1 : 0;
      setFocusedProductIndex(next);
      productButtonRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = index > 0 ? index - 1 : count - 1;
      setFocusedProductIndex(prev);
      productButtonRefs.current[prev]?.focus();
    } else if (e.key === 'Escape') {
      setFocusedProductIndex(-1);
      searchRef.current?.focus();
    }
  };

  const availableProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = `${product.name} ${product.id}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const categoryOptions = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category))],
    [products],
  );

  const canProceed = items.length > 0;
  const cashReceivedNum = Number(cashReceived.replace(/\D/g, '')) || 0;
  const change =
    paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - total) : 0;
  const cashSufficient = paymentMethod !== 'cash' || cashReceivedNum >= total;
  const invoice =
    completedOrder?.invoice ??
    `${settings.invoicePrefix.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quickCashAmounts = useMemo(
    () => [
      ...new Set([
        total,
        Math.ceil(total / 10000) * 10000,
        Math.ceil(total / 50000) * 50000,
      ]),
    ],
    [total],
  );

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.stock <= 0) {
      showInsufficientStockToast(`${product.name} is out of stock.`);
      return;
    }
    const inCart = items.find((item) => item.id === productId);
    if (inCart && inCart.quantity >= product.stock) {
      showInsufficientStockToast(
        `${product.name} has only ${product.stock} available.`,
      );
      return;
    }
    addItem(product);
    setLastAddedId(productId);
    setTimeout(() => setLastAddedId(null), 400);
  };

  const handlePlaceOrder = async () => {
    if (!canProceed || !cashSufficient) return;

    const transactionId = `t-${Date.now()}`;
    const transaction = {
      id: transactionId,
      invoice,
      customer: customer || WALK_IN_CUSTOMER,
      paymentMethod,
      status: 'complete' as const,
      subtotal,
      discount,
      tax: 0,
      total,
      cashier: 'Admin',
      date:
        'Today · ' +
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      recordedAt: new Date().toISOString(),
      items: items.map((item, index) => ({
        id: `ti-${Date.now()}-${index}`,
        transactionId,
        productId: item.id,
        name: item.name,
        uom: item.uom ?? '',
        description: item.description,
        qty: item.quantity,
        total: item.price * item.quantity,
      })),
    };

    try {
      await transactionsApi.create({
        paymentMethod,
        customer: customer || WALK_IN_CUSTOMER,
        invoice,
        cashier: 'Admin',
        subtotal,
        discount,
        total,
        items: items.map((item) => ({
          id: item.id,
          itemId: item.id,
          name: item.name,
          qty: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.message.toLowerCase() === 'insufficient stock'
      ) {
        showInsufficientStockToast(
          'One or more items no longer have enough stock. Review your cart and try again.',
        );
      } else {
        console.error('Failed to sync POS transaction to backend:', error);
        toast.error('Unable to place order', {
          description:
            error instanceof Error ? error.message : 'Please try again.',
        });
      }
      return;
    }

    addTransaction(transaction);

    // Decrement stock for every sold item
    for (const item of items) {
      decrementStock(item.id, item.quantity);
    }

    setCompletedOrder({
      invoice,
      total,
      customer: customer || WALK_IN_CUSTOMER,
      paymentMethod,
    });
    clearCart();
    setStep(2);

    toast.success(`Order ${invoice} placed`, {
      description: `${formatRp(total)} · ${paymentMethod === 'cash' ? 'Cash' : 'QRIS'}`,
    });
  };

  const handleNewOrder = () => {
    setCompletedOrder(null);
    setStep(0);
    setCustomer(WALK_IN_CUSTOMER);
    setPaymentMethod('cash');
    setCashReceived('');
    setFocusedProductIndex(-1);
  };

  const handleContinue = () => {
    if (step === 0 && canProceed) setStep(1);
    else if (step === 1 && cashSufficient) setStep(2);
  };

  const cartQty = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-5 md:h-[calc(100dvh-7.5rem)] xl:flex-row xl:gap-6">
      <div className="flex rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-1 xl:hidden">
        <button
          type="button"
          onClick={() => setDesktopTab('products')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition ${desktopTab === 'products' ? 'bg-[var(--band-bg)] text-[var(--band-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]'}`}
        >
          <Package size={16} />
          Products
        </button>
        <button
          type="button"
          onClick={() => setDesktopTab('order')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition ${desktopTab === 'order' ? 'bg-[var(--band-bg)] text-[var(--band-text)]' : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]'}`}
        >
          <ShoppingBag size={16} />
          Current order
          {cartQty > 0 && (
            <span className="rounded-full bg-[var(--surface-accent)] px-2 py-0.5 text-xs text-[var(--accent)]">
              {cartQty}
            </span>
          )}
        </button>
      </div>

      {/* Product catalog */}
      <section
        className={`${desktopTab === 'products' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col gap-4 xl:flex`}
      >
        <PageHeader
          eyebrow="New sale"
          title="Point of sale"
          action={
            <label className="flex w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm backdrop-blur-sm sm:w-auto sm:min-w-[240px]">
              <Search
                size={16}
                className="shrink-0 text-[var(--band-text-muted)]"
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFocusedProductIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products…"
                className="w-full bg-transparent text-[var(--band-text)] outline-none placeholder:text-[var(--band-text-muted)]"
                autoFocus
              />
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--band-text-muted)] sm:flex">
                <Keyboard size={10} />K
              </kbd>
            </label>
          }
        />

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryOptions.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                selectedCategory === category
                  ? 'bg-[var(--accent-strong)] text-[var(--band-text)] shadow-sm'
                  : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]'
              }`}
            >
              {ITEM_CATEGORY_LABELS[category as keyof typeof ITEM_CATEGORY_LABELS] || 'All'}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isProductsLoading ? (
            <ProductGridSkeleton />
          ) : availableProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
              <Package size={32} className="text-[var(--muted)]" />
              <p className="mt-3 font-medium">No products found</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                Try a different search term or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {availableProducts.map((product, productIndex) => {
                const inCart = items.find((item) => item.id === product.id);
                const isHighlighted = lastAddedId === product.id;

                return (
                  <button
                    key={product.id}
                    ref={(el) => {
                      productButtonRefs.current[productIndex] = el;
                    }}
                    onKeyDown={(e) => handleProductKeyDown(e, productIndex)}
                    onClick={() => handleAddProduct(product.id)}
                    disabled={product.stock <= 0}
                    className={`group relative rounded-[12px] border bg-[var(--card)] p-4 text-left shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                      isHighlighted
                        ? 'border-[var(--accent-strong)] ring-2 ring-[var(--accent-strong)]/20'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <>
                      <Card>
                        <img
                          src="https://avatar.vercel.sh/shadcn1"
                          alt="Event cover"
                          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
                        />
                        <CardHeader>
                          <CardAction>
                            <Badge>Featured</Badge>
                          </CardAction>
                          <CardTitle>{product.name}</CardTitle>
                          <CardDescription>
                            {product.description}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter>
                          <Button 
                            key={product.id}
                            ref={(el) => {
                              productButtonRefs.current[productIndex] = el;
                            }}
                            onKeyDown={(e) => handleProductKeyDown(e, productIndex)}
                            onClick={() => handleAddProduct(product.id)}
                            disabled={product.stock <= 0}
                            className={`w-full ${isHighlighted
                              ? 'border-[var(--accent-strong)] ring-2 ring-[var(--accent-strong)]/20'
                              : 'border-[var(--border)] hover:border-[var(--accent)]/40'}`}
                          >View Event</Button>
                        </CardFooter>
                      </Card>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold group-hover:text-[var(--accent)]">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {product.description}
                          </p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--band-text)] opacity-0 transition group-hover:opacity-100">
                          <Plus size={16} />
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                        {product.uom}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                          {product.category}
                        </span>
                        <span className="font-semibold text-[var(--accent)]">
                          {formatRp(product.price)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-2)]">
                        <span>Stock {product.stock}</span>
                        {inCart && (
                          <span className="font-medium text-[var(--accent-strong)]">
                            {inCart.quantity} in cart
                          </span>
                        )}
                      </div>
                    </>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Cart & checkout panel */}
      <aside
        className={`${desktopTab === 'order' ? 'flex' : 'hidden'} w-full shrink-0 flex-col xl:w-[420px] xl:flex`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)] md:sticky md:top-24 md:max-h-[calc(100dvh-7.5rem)]">
          {/* Step indicator */}
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[var(--accent)]" />
                <span className="font-semibold">Current order</span>
              </div>
              <span className="rounded-full bg-[var(--surface-accent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                {cartQty} {cartQty === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="mt-3 flex gap-1">
              {paymentSteps.map((label, index) => {
                const isActive = step === index;
                const isDone = step > index || (index === 2 && completedOrder);
                return (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${
                        isDone
                          ? 'bg-[var(--accent-strong)] text-[var(--band-text)]'
                          : isActive
                            ? 'bg-[var(--accent)] text-[var(--band-text)]'
                            : 'bg-[var(--surface-muted)] text-[var(--muted)]'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={14} /> : index + 1}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${isActive ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {completedOrder && step === 2 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--accent-strong)]">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  Payment successful
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Invoice {completedOrder.invoice} has been generated.
                </p>
                <div className="mt-6 w-full rounded-[12px] bg-[var(--surface-muted)] p-4 text-left text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Customer</span>
                    <span className="font-medium">
                      {completedOrder.customer}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-[var(--muted)]">Payment</span>
                    <span className="font-medium">
                      {completedOrder.paymentMethod === 'cash'
                        ? 'Cash'
                        : 'QRIS'}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2">
                    <span className="font-semibold">Total paid</span>
                    <span className="font-semibold text-[var(--accent)]">
                      {formatRp(completedOrder.total)}
                    </span>
                  </div>
                </div>
              </div>
            ) : step === 0 ? (
              <>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                      <ShoppingBag size={32} />
                    </div>
                    <p className="font-semibold">Your cart is empty</p>
                    <p className="mt-1.5 max-w-[220px] text-sm text-[var(--muted)]">
                      Tap any product to add it to this order. Use{' '}
                      <kbd className="inline-flex items-center gap-0.5 rounded border border-[var(--border)] px-1 py-0.5 text-[10px] font-semibold">
                        <Keyboard size={9} />K
                      </kbd>{' '}
                      to search.
                    </p>
                    {availableProducts.length > 0 && (
                      <button
                        onClick={() =>
                          handleAddProduct(availableProducts[0].id)
                        }
                        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)] active:scale-95"
                      >
                        <Plus size={12} />
                        Try {availableProducts[0].name}
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {formatRp(item.price)} each
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--card)] hover:text-[var(--status-danger)]"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                updateQty(
                                  item.id,
                                  Math.max(0, item.quantity - 1),
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] transition active:scale-95"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => {
                                const product = products.find(
                                  (candidate) => candidate.id === item.id,
                                );
                                if (product && item.quantity >= product.stock) {
                                  showInsufficientStockToast(
                                    `${item.name} has only ${product.stock} available.`,
                                  );
                                  return;
                                }
                                updateQty(item.id, item.quantity + 1);
                              }}
                              disabled={
                                products.find(
                                  (product) => product.id === item.id,
                                )?.stock === item.quantity
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="font-semibold">
                            {formatRp(item.price * item.quantity)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
                    <User size={14} />
                    Customer name
                    <span className="text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Walk-in customer"
                    className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--muted)]">
                    Payment method
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`rounded-[12px] border p-3 text-left transition active:scale-[0.98] ${
                        paymentMethod === 'cash'
                          ? 'border-[var(--accent-strong)] bg-[var(--surface-accent)]'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]/50 hover:border-[var(--accent)]/30'
                      }`}
                    >
                      <CreditCard
                        size={18}
                        className={
                          paymentMethod === 'cash'
                            ? 'text-[var(--accent-strong)]'
                            : 'text-[var(--muted)]'
                        }
                      />
                      <p className="mt-2 text-sm font-semibold">Cash</p>
                      <p className="text-xs text-[var(--muted)]">
                        Pay at counter
                      </p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('qris')}
                      className={`rounded-[12px] border p-3 text-left transition active:scale-[0.98] ${
                        paymentMethod === 'qris'
                          ? 'border-[var(--accent-strong)] bg-[var(--surface-accent)]'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]/50 hover:border-[var(--accent)]/30'
                      }`}
                    >
                      <QrCode
                        size={18}
                        className={
                          paymentMethod === 'qris'
                            ? 'text-[var(--accent-strong)]'
                            : 'text-[var(--muted)]'
                        }
                      />
                      <p className="mt-2 text-sm font-semibold">QRIS</p>
                      <p className="text-xs text-[var(--muted)]">Scan to pay</p>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'cash' ? (
                  <div className="space-y-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
                      <Banknote size={14} />
                      Cash received
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashReceived}
                      onChange={(e) =>
                        setCashReceived(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="0"
                      className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-lg font-semibold outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                    />
                    <div className="flex flex-wrap gap-2">
                      {quickCashAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setCashReceived(String(amount))}
                          className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium transition hover:border-[var(--accent)]/40 active:scale-95"
                        >
                          {formatRp(amount)}
                        </button>
                      ))}
                    </div>
                    {cashReceivedNum > 0 && (
                      <div
                        className={`flex items-center justify-between rounded-[12px] px-3 py-2 text-sm ${
                          cashSufficient
                            ? 'bg-[var(--surface-accent)] text-[var(--accent)]'
                            : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                        }`}
                      >
                        <span>
                          {cashSufficient ? 'Change' : 'Insufficient cash'}
                        </span>
                        <span className="font-semibold">
                          {cashSufficient
                            ? formatRp(change)
                            : formatRp(total - cashReceivedNum)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 p-6 text-center">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--card)]">
                      <QrCode size={48} className="text-[var(--muted)]" />
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      Scan QR code to pay
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Amount: {formatRp(total)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success)]/15 px-3 py-1 text-xs font-semibold text-[var(--status-success)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--status-success)]" />
                      Awaiting payment
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-[12px] bg-[var(--surface-muted)] p-4 text-sm">
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Receipt size={14} />
                    <span>Order summary</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Invoice</span>
                      <span className="font-medium">{invoice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Customer</span>
                      <span className="font-medium">
                        {customer || 'Walk-in'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Payment</span>
                      <span className="font-medium">
                        {paymentMethod === 'cash' ? 'Cash' : 'QRIS'}
                      </span>
                    </div>
                    {paymentMethod === 'cash' && cashReceivedNum > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">
                            Cash received
                          </span>
                          <span className="font-medium">
                            {formatRp(cashReceivedNum)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Change</span>
                          <span className="font-medium">
                            {formatRp(change)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-[12px] border border-[var(--border)] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          × {item.quantity}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {formatRp(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Totals & actions — pinned bottom */}
          <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span>{formatRp(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[var(--status-success)]">
                  <span>Discount (10%)</span>
                  <span>− {formatRp(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="text-[var(--accent)]">{formatRp(total)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {completedOrder && step === 2 ? (
                <AppButton variant="primary" onClick={handleNewOrder}>
                  <RotateCcw size={16} className="mr-2 inline" />
                  New order
                </AppButton>
              ) : (
                <>
                  {step > 0 && (
                    <AppButton
                      variant="secondary"
                      onClick={() => setStep(step - 1)}
                    >
                      Back
                    </AppButton>
                  )}
                  {step === 0 && items.length > 0 && (
                    <AppButton variant="secondary" onClick={clearCart}>
                      Clear
                    </AppButton>
                  )}
                  {step < 2 ? (
                    <button
                      disabled={
                        (step === 0 && !canProceed) ||
                        (step === 1 && !cashSufficient)
                      }
                      onClick={handleContinue}
                      className="flex flex-1 items-center justify-center rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-[var(--band-text)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {step === 0 ? 'Continue to payment' : 'Review order'}
                      <ChevronRight size={16} className="ml-1" />
                    </button>
                  ) : (
                    <AppButton variant="primary" onClick={handlePlaceOrder}>
                      Place order
                    </AppButton>
                  )}
                </>
              )}
            </div>

            {step === 1 && !cashSufficient && cashReceivedNum > 0 && (
              <p className="mt-2 text-center text-xs text-[var(--status-danger)]">
                Cash received must be at least {formatRp(total)}
              </p>
            )}
            {step < 2 && !canProceed && step === 0 && (
              <p className="mt-2 text-center text-xs text-[var(--muted)]">
                Add at least one product to continue
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
