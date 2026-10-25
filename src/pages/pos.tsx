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
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AppButton } from '../components/ui/app-button';
import { PageHeader } from '../components/ui/page-header';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { useCartStore } from '../stores/cart-store';
import { useSettingsStore } from '../stores/settings-store';
import { formatRp } from '../lib/transaction-utils';
import { ApiError } from '@/lib/api/index';
import { ProductGridSkeleton } from '../components/ui/skeleton';
import { usePosProductsQuery } from '@/lib/product/product-store';
import { useCreatePOSTransactionMutation } from '@/lib/transaction/transaction-store';
import { useMeQuery } from '@/lib/auth/auth-store';
import type { Product } from '../types/inde';

const paymentSteps = ['Cart', 'Payment', 'Review'] as const;
type PaymentStep = 0 | 1 | 2;

const WALK_IN_CUSTOMER = 'Walk-in Customer';

function getProductCategoryKey(
  product: Pick<Product, 'category' | 'categoryId'>,
) {
  if (product.categoryId) return `id:${product.categoryId}`;
  if (product.category) return `name:${product.category}`;
  return null;
}

function showInsufficientStockToast(description: string) {
  toast.error('Insufficient Stock', {
    description,
    icon: <TriangleAlert size={17} className="text-[var(--status-danger)]" />,
  });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PosPage() {
  const navigate = useNavigate();
  const { addItem, recalculate } = useCartStore();
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = usePosProductsQuery();
  const { settings } = useSettingsStore();
  const { data: currentUser } = useMeQuery();
  const storeId = currentUser?.store?.storeId;

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const [search, setSearch] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    null,
  );
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [focusedProductIndex, setFocusedProductIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const productButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Ctrl/Cmd+K → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const availableProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchesSearch = `${p.name} ${p.id}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory =
          selectedCategoryKey === null ||
          getProductCategoryKey(p) === selectedCategoryKey;
        return matchesSearch && matchesCategory;
      }),
    [products, search, selectedCategoryKey],
  );

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      const key = getProductCategoryKey(product);
      if (key) categories.set(key, product.category || 'Uncategorized');
    }
    return [...categories].map(([id, name]) => ({ id, name }));
  }, [products]);

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const cartItems = useCartStore.getState().items;
    if (product.stock <= 0) {
      showInsufficientStockToast(`${product.name} is out of stock.`);
      return;
    }
    const inCart = cartItems.find((i) => i.id === productId);
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

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden sm:h-[calc(100dvh-3.5rem)] xl:h-[calc(100dvh-6.5rem)] xl:flex-row xl:gap-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0">
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
        </div>

        <div className="shrink-0 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategoryKey(null)}
              aria-pressed={selectedCategoryKey === null}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                selectedCategoryKey === null
                  ? 'bg-[var(--accent-strong)] text-white shadow-sm'
                  : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]'
              }`}
            >
              All
            </button>
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryKey(category.id)}
                aria-pressed={selectedCategoryKey === category.id}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  selectedCategoryKey === category.id
                    ? 'bg-[var(--accent-strong)] text-white shadow-sm'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-3 pr-1 pb-28 xl:pb-4">
          {isProductsLoading ? (
            <ProductGridSkeleton />
          ) : isProductsError ? (
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--status-danger)]/40 bg-[var(--card)] px-6 py-16 text-center">
              <TriangleAlert
                size={32}
                className="text-[var(--status-danger)]"
              />
              <p className="mt-3 font-medium">Unable to load sellable items</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                {productsError instanceof Error
                  ? productsError.message
                  : 'Please try again.'}
              </p>
              <div className="mt-4">
                <AppButton
                  variant="secondary"
                  onClick={() => void refetchProducts()}
                >
                  <RotateCcw size={14} />
                  Retry
                </AppButton>
              </div>
            </div>
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
              {availableProducts.map((product, productIndex) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  inCartQty={
                    useCartStore
                      .getState()
                      .items.find((i) => i.id === product.id)?.quantity ?? 0
                  }
                  isHighlighted={lastAddedId === product.id}
                  buttonRef={(el) => {
                    productButtonRefs.current[productIndex] = el;
                  }}
                  onKeyDown={(e) => handleProductKeyDown(e, productIndex)}
                  onAdd={() => handleAddProduct(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden h-full min-h-0 w-[400px] shrink-0 xl:flex xl:flex-col">
        <CartPanel
          products={products}
          storeId={storeId}
          settings={settings}
          navigate={navigate}
        />
      </div>

      {/* Mobile cart drawer */}
      <CartDrawer
        products={products}
        storeId={storeId}
        settings={settings}
        navigate={navigate}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product card — shadcn Card, image as first child (largest highlight)
// ---------------------------------------------------------------------------

const PLACEHOLDER_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/4/4a/Croffles_5.jpg';

function ProductCard({
  product,
  inCartQty,
  isHighlighted,
  buttonRef,
  onKeyDown,
  onAdd,
}: {
  product: Product;
  inCartQty: number;
  isHighlighted: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onAdd: () => void;
}) {
  const isOutOfStock = product.stock <= 0;

  return (
    <Card
      noPadding
      className={`h-full overflow-hidden transition-all ${
        isHighlighted
          ? 'ring-2 ring-[var(--accent-strong)] ring-offset-1'
          : isOutOfStock
            ? 'opacity-60'
            : 'hover:ring-1 hover:ring-[var(--accent)]/40'
      }`}
    >
      {/* Image — first child, shadcn card removes top padding automatically */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={PLACEHOLDER_IMG}
          alt={product.name}
          className="h-full w-full object-cover brightness-90 dark:brightness-75"
        />
        <span className="absolute right-2 top-2 rounded-full bg-[var(--card)]/90 px-2 py-0.5 text-sm font-bold text-[var(--accent)] shadow-sm backdrop-blur-sm">
          {formatRp(product.price)}
        </span>
        {inCartQty > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--accent-strong)] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            {inCartQty} in cart
          </span>
        )}
      </div>

      <CardContent className="flex-1 px-3 pt-2.5 pb-2">
        <p className="truncate text-sm font-semibold leading-snug">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-1">
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
            {product.category || 'Uncategorized'}
          </span>
          <span
            className={`text-[11px] font-medium ${isOutOfStock ? 'text-[var(--status-danger)]' : 'text-[var(--muted)]'}`}
          >
            {isOutOfStock ? 'Out of stock' : `Stock ${product.stock}`}
          </span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto border-t-0 bg-transparent p-0">
        <button
          ref={buttonRef}
          type="button"
          disabled={isOutOfStock}
          onClick={onAdd}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-center gap-1.5 rounded-b-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isOutOfStock
              ? 'bg-[var(--surface-muted)] text-[var(--muted)]'
              : isHighlighted
                ? 'bg-[var(--accent-strong)] text-white'
                : 'bg-[var(--accent-strong)] text-white hover:bg-[var(--accent)]'
          }`}
        >
          {isOutOfStock ? (
            'Out of stock'
          ) : (
            <>
              <Plus size={14} /> Add to cart
            </>
          )}
        </button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared cart/checkout logic — used by both CartPanel and CartDrawer
// ---------------------------------------------------------------------------

type CheckoutProps = {
  products: Product[];
  storeId: string | undefined;
  settings: { invoicePrefix: string };
  navigate: ReturnType<typeof useNavigate>;
};

function useCheckout({ products, storeId, settings, navigate }: CheckoutProps) {
  const { items, subtotal, discount, total, removeItem, updateQty, clearCart } =
    useCartStore();
  const createTransactionMutation = useCreatePOSTransactionMutation();

  const [step, setStep] = useState<PaymentStep>(0);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{
    invoice: string;
    total: number;
    customer: string;
    paymentMethod: 'cash' | 'qris';
  } | null>(null);

  const cartQty = items.reduce((s, i) => s + i.quantity, 0);
  const cashReceivedNum = Number(cashReceived.replace(/\D/g, '')) || 0;
  const change =
    paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - total) : 0;
  const cashSufficient = paymentMethod !== 'cash' || cashReceivedNum >= total;
  const canProceed = items.length > 0;

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

  const handleIncQty = (id: string, currentQty: number) => {
    const product = products.find((p) => p.id === id);
    if (product && currentQty >= product.stock) {
      showInsufficientStockToast(
        `${product.name} has only ${product.stock} available.`,
      );
      return;
    }
    updateQty(id, currentQty + 1);
  };

  const handlePlaceOrder = async () => {
    if (!canProceed || !cashSufficient) return;
    if (!storeId) {
      toast.error('No active store selected', {
        description: 'Select a store before creating a POS transaction.',
        action: {
          label: 'Select store',
          onClick: () => void navigate('/select-store'),
        },
      });
      return;
    }
    try {
      await createTransactionMutation.mutateAsync({
        paymentMethod,
        customer: customer || WALK_IN_CUSTOMER,
        items: items.map((item) => ({
          itemId: item.id,
          qty: item.quantity,
        })),
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.message.toLowerCase().includes('insufficient stock')
      ) {
        showInsufficientStockToast(
          'One or more items no longer have enough stock. Review your cart and try again.',
        );
      } else {
        toast.error('Unable to place order', {
          description:
            error instanceof Error ? error.message : 'Please try again.',
        });
      }
      return;
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
    setCustomer('');
    setPaymentMethod('cash');
    setCashReceived('');
  };

  const handleContinue = () => {
    if (step === 0 && canProceed) setStep(1);
    else if (step === 1 && cashSufficient) setStep(2);
  };

  return {
    items,
    subtotal,
    discount,
    total,
    cartQty,
    removeItem,
    updateQty,
    clearCart,
    step,
    setStep,
    customer,
    setCustomer,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    cashReceivedNum,
    change,
    cashSufficient,
    canProceed,
    invoice,
    quickCashAmounts,
    completedOrder,
    handleIncQty,
    handlePlaceOrder,
    handleNewOrder,
    handleContinue,
    isPending: createTransactionMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// Cart content — shared JSX between panel and drawer
// ---------------------------------------------------------------------------

function CartContent({
  checkout,
  products,
  isDesktop = false,
}: {
  checkout: ReturnType<typeof useCheckout>;
  products: Product[];
  isDesktop?: boolean;
}) {
  const {
    items,
    subtotal,
    discount,
    total,
    removeItem,
    updateQty,
    clearCart,
    step,
    setStep,
    customer,
    setCustomer,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    cashReceivedNum,
    change,
    cashSufficient,
    canProceed,
    invoice,
    quickCashAmounts,
    completedOrder,
    handleIncQty,
    handlePlaceOrder,
    handleNewOrder,
    handleContinue,
    isPending,
  } = checkout;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — dark band on mobile drawer, light surface on desktop */}
      <div
        className={`shrink-0  ${
          isDesktop
            ? 'px-4 py-4 border-b border-[var(--border)] bg-[var(--surface-muted)]'
            : 'py-2 bg-[var(--band-bg)] text-[var(--band-text)]'
        }`}
      >
        {isDesktop && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag
                size={16}
                className={
                  isDesktop
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--band-text-muted)]'
                }
              />
              <span
                className={`text-sm font-semibold ${isDesktop ? 'text-[var(--foreground)]' : 'text-white'}`}
              >
                Current order
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isDesktop
                  ? 'bg-[var(--surface-accent)] text-[var(--accent)]'
                  : 'bg-white/10 text-white'
              }`}
            >
              {checkout.cartQty} {checkout.cartQty === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
        <div className="mt-4 flex gap-1">
          {paymentSteps.map((label, index) => {
            const isActive = step === index;
            const isDone =
              step > index || (index === 2 && Boolean(completedOrder));
            return (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                    isDone
                      ? 'bg-[var(--accent-strong)] text-white'
                      : isActive
                        ? isDesktop
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-white text-[var(--band-bg)]'
                        : isDesktop
                          ? 'bg-[var(--border)] text-[var(--muted)]'
                          : 'bg-white/10 text-white/50'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={14} /> : index + 1}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isActive
                      ? isDesktop
                        ? 'text-[var(--foreground)]'
                        : 'text-white'
                      : isDesktop
                        ? 'text-[var(--muted)]'
                        : 'text-white/50'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className={`min-h-0 flex-1 p-4 ${
          step === 0 && !completedOrder ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {completedOrder && step === 2 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[var(--accent-strong)]">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Payment successful</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Invoice {completedOrder.invoice} generated.
            </p>
            <div className="mt-6 w-full rounded-[12px] bg-[var(--surface-muted)] p-4 text-left text-sm">
              <Row label="Customer" value={completedOrder.customer} />
              <Row
                label="Payment"
                value={
                  completedOrder.paymentMethod === 'cash' ? 'Cash' : 'QRIS'
                }
                className="mt-2"
              />
              <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2">
                <span className="font-semibold">Total paid</span>
                <span className="font-semibold text-[var(--accent)]">
                  {formatRp(completedOrder.total)}
                </span>
              </div>
            </div>
          </div>
        ) : step === 0 ? (
          items.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                <ShoppingBag size={32} />
              </div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1.5 max-w-[220px] text-sm text-[var(--muted)]">
                Tap any product to add it to this order.
              </p>
            </div>
          ) : (
            <ul className="max-h-full space-y-2 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatRp(item.price)} each
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 rounded-full p-1.5 text-[var(--muted)] transition hover:text-[var(--status-danger)]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateQty(item.id, Math.max(0, item.quantity - 1))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] transition active:scale-95"
                        aria-label="Decrease"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncQty(item.id, item.quantity)}
                        disabled={
                          products.find((p) => p.id === item.id)?.stock ===
                          item.quantity
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatRp(item.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
                <User size={14} /> Customer name{' '}
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
              <div className={`grid grid-cols-2 gap-2`}>
                {(['cash', 'qris'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-[12px] border p-3 text-left transition active:scale-[0.98] ${paymentMethod === method ? 'border-[var(--accent-strong)] bg-[var(--surface-accent)]' : 'border-[var(--border)] bg-[var(--surface-muted)]/50 hover:border-[var(--accent)]/30'}`}
                  >
                    {method === 'cash' ? (
                      <CreditCard
                        size={18}
                        className={
                          paymentMethod === 'cash'
                            ? 'text-[var(--accent-strong)]'
                            : 'text-[var(--muted)]'
                        }
                      />
                    ) : (
                      <QrCode
                        size={18}
                        className={
                          paymentMethod === 'qris'
                            ? 'text-[var(--accent-strong)]'
                            : 'text-[var(--muted)]'
                        }
                      />
                    )}
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {method}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {method === 'cash' ? 'Pay at counter' : 'Scan to pay'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
                <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
                  <Banknote size={14} /> Cash received
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
                    className={`flex items-center justify-between rounded-[12px] px-3 py-2 text-sm ${cashSufficient ? 'bg-[var(--surface-accent)] text-[var(--accent)]' : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'}`}
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
                <Row label="Invoice" value={invoice} />
                <Row label="Customer" value={customer || 'Walk-in'} />
                <Row
                  label="Payment"
                  value={paymentMethod === 'cash' ? 'Cash' : 'QRIS'}
                />
                {paymentMethod === 'cash' && cashReceivedNum > 0 && (
                  <>
                    <Row
                      label="Cash received"
                      value={formatRp(cashReceivedNum)}
                    />
                    <Row label="Change" value={formatRp(change)} />
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

      {/* Pinned footer */}
      <div className="shrink-0 border-t border-[var(--border)] p-4">
        {/* Totals */}
        <div className="space-y-1 text-sm">
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
        </div>
        {/* Total + action on same row */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-[var(--muted)]">Total</span>
            <span className="text-lg font-bold tracking-tight text-[var(--accent)]">
              {formatRp(total)}
            </span>
          </div>
          <div className="flex flex-1 gap-2">
            {completedOrder && step === 2 ? (
              <button
                onClick={handleNewOrder}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95"
              >
                <RotateCcw size={14} /> New order
              </button>
            ) : (
              <>
                {step > 0 && (
                  <AppButton
                    variant="secondary"
                    onClick={() => setStep((step - 1) as PaymentStep)}
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
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {step === 0 ? 'Continue to payment' : 'Review order'}
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() => void handlePlaceOrder()}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPending ? 'Placing…' : 'Place order'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {step === 1 && !cashSufficient && cashReceivedNum > 0 && (
          <p className="mt-2 text-center text-xs text-[var(--status-danger)]">
            Cash received must be at least {formatRp(total)}
          </p>
        )}
        {step === 0 && !canProceed && (
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Add at least one product to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop cart panel — fixed to right side, doesn't scroll with products
// ---------------------------------------------------------------------------

function CartPanel(props: CheckoutProps) {
  const checkout = useCheckout(props);
  return (
    <Card
      noPadding
      className="flex h-full flex-col overflow-hidden rounded-[14px] p-0"
    >
      <CartContent checkout={checkout} products={props.products} isDesktop />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mobile cart drawer — only renders when cart has items
// ---------------------------------------------------------------------------

function CartDrawer(props: CheckoutProps) {
  const checkout = useCheckout(props);
  const [open, setOpen] = useState(false);
  const { cartQty, total } = checkout;

  // Auto-close when cart empties
  useEffect(() => {
    if (cartQty === 0) setOpen(false);
  }, [cartQty]);

  // Only mount when there are items
  if (cartQty === 0) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col xl:hidden`}
        style={{
          maxHeight: '90dvh',
          ...(open ? { height: 'min(90dvh, calc(100dvh - 1rem))' } : {}),
        }}
      >
        {/* Collapsed bar — always visible when cart has items */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-t-[20px] border border-b-0 border-[var(--border)] bg-[var(--band-bg)] px-4 py-3 text-left shadow-[0_-4px_24px_rgba(0,0,0,0.18)]"
        >
          {/* Drag handle */}
          {/* <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" /> */}

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white">
            <ShoppingBag size={17} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Current order
              </span>
              <span className="rounded-md bg-[var(--accent-strong)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                {cartQty}
              </span>
            </span>
            <span className="block text-[11px] text-white/60">
              Tap to {open ? 'collapse' : 'checkout'}
            </span>
          </span>

          {/* Total — far right */}
          <span className="shrink-0 text-right">
            <span className="block text-base font-bold text-white">
              {formatRp(total)}
            </span>
          </span>

          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <ChevronUp size={16} />
          </span>
        </button>

        {/* Expanded content */}
        {open && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-x border-[var(--border)] bg-[var(--card)]">
            <CartContent checkout={checkout} products={props.products} />
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
