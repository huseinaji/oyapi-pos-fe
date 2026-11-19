import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Search,
  SearchX,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from 'cn';

export type ItemType = 'raw_material' | 'finished_good' | 'bundle';

export interface BundleComponent {
  menuId: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  itemType?: ItemType;
  category: string;
  unitOfMeasure?: string;
  basePrice?: number;
  price: number;
  bundleComponents?: BundleComponent[];
  imageUrl?: string;
  stock: number;
  isVisible: boolean;
}

export interface CartItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export interface StorefrontCatalogResponse {
  storeName: string;
  isSelfOrderEnabled: boolean;
  categories: string[];
  menuItems: MenuItem[];
  updatedAt: string;
}

interface CartEntry {
  quantity: number;
  note: string;
}

const DEMO_CATALOG: StorefrontCatalogResponse = {
  storeName: 'Kopi & Dapur Senja',
  isSelfOrderEnabled: true,
  categories: [
    'Kopi & Espresso',
    'Non-Kopi',
    'Makanan Berat',
    'Pastry & Snack',
  ],
  updatedAt: '2026-11-19T00:00:00.000Z',
  menuItems: [
    {
      id: 'kopi-susu-gula-aren',
      name: 'Kopi Susu Gula Aren',
      description:
        'Espresso house-blend, susu segar dingin, dan gula aren organik.',
      itemType: 'finished_good',
      category: 'Kopi & Espresso',
      unitOfMeasure: 'gelas',
      price: 26000,
      imageUrl:
        'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&q=80&fit=crop',
      stock: 17,
      isVisible: true,
    },
    {
      id: 'espresso-tonic-orange',
      name: 'Espresso Tonic Orange',
      description:
        'Double shot espresso dengan tonic water dingin dan kulit jeruk segar.',
      itemType: 'finished_good',
      category: 'Kopi & Espresso',
      unitOfMeasure: 'gelas',
      price: 32000,
      imageUrl:
        'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=640&q=80&fit=crop',
      stock: 1,
      isVisible: true,
    },
    {
      id: 'matcha-oat-latte',
      name: 'Matcha Oat Latte',
      description: 'Matcha seremonial Uji dipadukan dengan oat milk creamy.',
      itemType: 'finished_good',
      category: 'Non-Kopi',
      unitOfMeasure: 'gelas',
      price: 36000,
      imageUrl:
        'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=640&q=80&fit=crop',
      stock: 12,
      isVisible: true,
    },
    {
      id: 'es-teh-leci-mint',
      name: 'Es Teh Leci Mint',
      description:
        'Teh melati seduh dingin dengan buah leci utuh dan daun mint segar.',
      itemType: 'finished_good',
      category: 'Non-Kopi',
      unitOfMeasure: 'pcs',
      price: 25000,
      imageUrl:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&q=80&fit=crop',
      stock: 9,
      isVisible: true,
    },
    {
      id: 'chicken-katsu-mentai',
      name: 'Chicken Katsu Mentai',
      description:
        'Nasi hangat, ayam katsu renyah, saus mentai bakar, dan nori.',
      itemType: 'finished_good',
      category: 'Makanan Berat',
      unitOfMeasure: 'porsi',
      price: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=640&q=80&fit=crop',
      stock: 2,
      isVisible: true,
    },
    {
      id: 'gyudon-beef-ajitama',
      name: 'Gyudon Beef Ajitama',
      description:
        'Irisan daging sapi panggang, bawang karamel, dan telur ajitama.',
      itemType: 'finished_good',
      category: 'Makanan Berat',
      unitOfMeasure: 'porsi',
      price: 54000,
      imageUrl:
        'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=640&q=80&fit=crop',
      stock: 7,
      isVisible: true,
    },
    {
      id: 'almond-butter-croissant',
      name: 'Almond Butter Croissant',
      description:
        'Croissant lapis mentega renyah dengan taburan almond panggang.',
      itemType: 'finished_good',
      category: 'Pastry & Snack',
      unitOfMeasure: 'pcs',
      price: 29000,
      imageUrl:
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&q=80&fit=crop',
      stock: 0,
      isVisible: true,
    },
    {
      id: 'parmesan-herb-fries',
      name: 'Parmesan Herb Fries',
      description:
        'Kentang goreng renyah dengan keju parmesan parut dan garlic aioli.',
      itemType: 'finished_good',
      category: 'Pastry & Snack',
      unitOfMeasure: 'porsi',
      price: 28000,
      imageUrl:
        'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=640&q=80&fit=crop',
      stock: 14,
      isVisible: true,
    },
  ],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StorefrontPage() {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const urlToken = searchParams.get('token')?.trim() ?? '';
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(0);
  const [detailNote, setDetailNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [checkoutToken, setCheckoutToken] = useState(urlToken);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return DEMO_CATALOG.menuItems.filter((item) => {
      if (!item.isVisible) return false;
      const matchesCategory =
        selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const cartItems = useMemo<CartItem[]>(() => {
    const items: CartItem[] = [];

    for (const menuItem of DEMO_CATALOG.menuItems) {
      const entry = cart[menuItem.id];
      if (
        !menuItem.isVisible ||
        !entry ||
        entry.quantity <= 0 ||
        menuItem.stock <= 0
      ) {
        continue;
      }

      items.push({
        menuId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: Math.min(entry.quantity, menuItem.stock),
        note: entry.note.trim() || undefined,
      });
    }

    return items;
  }, [cart]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const updateCartQuantity = (
    menuId: string,
    delta: number,
    maxStock: number,
  ) => {
    setPreviewSubmitted(false);
    setCart((previous) => {
      const current = previous[menuId] ?? { quantity: 0, note: '' };
      const nextQuantity = Math.max(
        0,
        Math.min(maxStock, current.quantity + delta),
      );
      if (nextQuantity === 0) {
        const next = { ...previous };
        delete next[menuId];
        return next;
      }

      return {
        ...previous,
        [menuId]: { ...current, quantity: nextQuantity },
      };
    });
  };

  const updateCartNote = (menuId: string, note: string) => {
    setPreviewSubmitted(false);
    setCart((previous) => {
      const current = previous[menuId];
      if (!current) return previous;
      return { ...previous, [menuId]: { ...current, note } };
    });
  };

  const saveCartFromDetail = () => {
    if (!detailItem) return;

    setPreviewSubmitted(false);
    setCart((previous) => {
      if (detailQuantity <= 0) {
        const next = { ...previous };
        delete next[detailItem.id];
        return next;
      }

      return {
        ...previous,
        [detailItem.id]: {
          quantity: Math.min(detailQuantity, detailItem.stock),
          note: detailNote,
        },
      };
    });
    setDetailItem(null);
  };

  const openItemDetail = (item: MenuItem) => {
    setDetailItem(item);
    setDetailQuantity(Math.min(cart[item.id]?.quantity ?? 0, item.stock));
    setDetailNote(cart[item.id]?.note ?? '');
  };

  const submitPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPreviewSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-28 text-[var(--primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-5xl px-4 py-1 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
                <Store aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-base font-bold text-[var(--accent)]">
                    {DEMO_CATALOG.storeName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-5 rounded-md border-[var(--status-success)]/30 bg-[var(--surface-accent)] px-2 text-[var(--status-success)]"
                  >
                    Buka
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  Self-Order Katalog · Verifikasi Token WhatsApp
                </p>
              </div>
            </div>
            {!urlToken && (
              <Button
                type="button"
                variant="outline"
                render={<Link to="/" />}
                className="h-9 shrink-0 rounded-xl border-[var(--border)] px-3 text-xs"
              >
                <SlidersHorizontal data-icon="inline-start" />
                Panel POS
              </Button>
            )}
          </div>

          <div className="mt-3.5 flex min-w-0 flex-col gap-2.5 pb-0.5 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="relative w-full md:max-w-xs md:shrink-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
              />
              <Input
                type="search"
                aria-label="Cari menu"
                placeholder="Cari kopi, rice bowl, pastry..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 rounded-xl border-[var(--border)] bg-[var(--background)] pl-9 text-sm"
              />
            </div>

            <nav
              aria-label="Kategori menu"
              className="flex min-w-0 flex-wrap gap-1.5 md:flex-1 md:justify-start lg:justify-end"
            >
              {['Semua', ...DEMO_CATALOG.categories].map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <Button
                    key={category}
                    type="button"
                    variant={isSelected ? 'default' : 'ghost'}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'h-9 shrink-0 rounded-xl px-3 text-xs sm:px-4',
                      !isSelected &&
                        'bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--primary)]',
                    )}
                  >
                    {category}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            Menampilkan{' '}
            <span className="font-semibold tabular-nums text-[var(--primary)]">
              {filteredItems.length}
            </span>{' '}
            menu tersedia
          </p>
          <p className="text-xs text-[var(--muted)]">
            Data contoh · stok tidak realtime
          </p>
        </div>

        {filteredItems.length === 0 ? (
          <Card className="items-center px-6 py-12 text-center shadow-none">
            <SearchX
              className="size-8 text-[var(--muted)]"
              aria-hidden="true"
            />
            <CardTitle className="mt-2">Menu tidak ditemukan</CardTitle>
            <CardDescription className="max-w-sm text-pretty">
              Coba kata kunci lain atau reset filter untuk melihat semua menu.
            </CardDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedCategory('Semua');
                setSearchQuery('');
              }}
            >
              Reset filter
            </Button>
          </Card>
        ) : (
          <section aria-label="Daftar menu katalog">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 sm:gap-4">
              {filteredItems.map((item) => {
                const quantity = Math.min(
                  cart[item.id]?.quantity ?? 0,
                  item.stock,
                );

                return (
                  <Card
                    key={item.id}
                    role="article"
                    aria-label={item.name}
                    className={cn(
                      'flex-row items-stretch gap-4 border-[var(--border)] !p-0 shadow-none transition-colors hover:border-[var(--accent)]/50',
                      item.stock <= 0 && 'opacity-55',
                    )}
                  >
                    <div className="relative w-24 shrink-0 self-stretch overflow-hidden sm:w-28">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                      />
                    </div>
                    <CardContent className="flex min-w-0 flex-1 flex-col self-stretch gap-1 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <button
                          type="button"
                          className="min-w-0 truncate text-left text-sm font-semibold leading-5 text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                          aria-label={`Detail menu: ${item.name}`}
                          onClick={() => openItemDetail(item)}
                        >
                          {item.name}
                        </button>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-5 shrink-0 rounded-md px-2 text-[11px] font-medium',
                            item.stock <= 0
                              ? 'border-[var(--status-danger)]/25 bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                              : item.stock <= 2
                                ? 'border-[var(--status-pending)]/40 bg-[var(--status-pending)]/15 text-[var(--status-pending)]'
                                : 'border-[var(--status-success)]/30 bg-[var(--surface-accent)] text-[var(--status-success)]',
                          )}
                        >
                          {item.stock <= 0
                            ? 'Habis'
                            : item.stock <= 2
                              ? `Sisa ${item.stock}`
                              : `Stok ${item.stock}`}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-xs leading-5">
                        {item.description}
                      </CardDescription>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <p className="text-sm font-bold tabular-nums text-[var(--primary)]">
                          {formatCurrency(item.price)}
                        </p>
                        {quantity > 0 ? (
                          <div
                            className="flex items-center gap-2"
                            aria-label={`Jumlah ${item.name}`}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Kurangi satu ${item.name}`}
                              onClick={() =>
                                updateCartQuantity(item.id, -1, item.stock)
                              }
                            >
                              <Minus data-icon="inline-start" />
                            </Button>
                            <span
                              className="min-w-5 text-center font-semibold tabular-nums"
                              aria-live="polite"
                            >
                              {quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Tambah satu ${item.name}`}
                              disabled={quantity >= item.stock}
                              onClick={() =>
                                updateCartQuantity(item.id, 1, item.stock)
                              }
                            >
                              <Plus data-icon="inline-start" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={item.stock <= 0}
                            aria-label={`Tambah ${item.name}`}
                            className="h-9 rounded-xl px-3"
                            onClick={() =>
                              updateCartQuantity(item.id, 1, item.stock)
                            }
                          >
                            <Plus data-icon="inline-start" />
                            Tambah
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">
                {totalItems} item di keranjang
              </p>
              <p className="truncate font-semibold tabular-nums">
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setCartOpen(true)}
              className="h-11 rounded-xl px-5"
              aria-label={`Buka keranjang, ${totalItems} item`}
            >
              <ShoppingBag data-icon="inline-start" />
              Lihat keranjang
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      <Drawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent className="w-full md:w-96">
          <DrawerHeader className="relative border-b border-[var(--border)] px-5 py-5 pr-14">
            <DrawerTitle>Keranjang Anda</DrawerTitle>
            <DrawerDescription>
              {totalItems} item · {DEMO_CATALOG.storeName}
            </DrawerDescription>
            <DrawerClose>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Tutup keranjang"
              >
                <X data-icon="inline-start" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          {cartItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag
                className="size-8 text-[var(--muted)]"
                aria-hidden="true"
              />
              <p className="font-medium">Keranjang masih kosong</p>
              <p className="text-sm text-[var(--muted)]">
                Tambahkan menu untuk memulai pesanan.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4">
                {cartItems.map((item) => {
                  const menuItem = DEMO_CATALOG.menuItems.find(
                    (entry) => entry.id === item.menuId,
                  );
                  if (!menuItem) return null;

                  return (
                    <div
                      key={item.menuId}
                      className="flex gap-3 border-b border-[var(--border)] pb-4 last:border-b-0"
                    >
                      <img
                        src={menuItem.imageUrl}
                        alt=""
                        className="size-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-sm tabular-nums text-[var(--muted)]">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Hapus ${item.name}`}
                            onClick={() =>
                              updateCartQuantity(
                                item.menuId,
                                -item.quantity,
                                menuItem.stock,
                              )
                            }
                          >
                            <X data-icon="inline-start" />
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <Input
                            aria-label={`Catatan ${item.name}`}
                            placeholder="Catatan untuk menu"
                            value={cart[item.menuId]?.note ?? ''}
                            onChange={(event) =>
                              updateCartNote(item.menuId, event.target.value)
                            }
                            className="h-8 min-w-0 text-xs"
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              aria-label={`Kurangi satu ${item.name}`}
                              onClick={() =>
                                updateCartQuantity(
                                  item.menuId,
                                  -1,
                                  menuItem.stock,
                                )
                              }
                            >
                              <Minus data-icon="inline-start" />
                            </Button>
                            <span className="min-w-4 text-center text-sm font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              aria-label={`Tambah satu ${item.name}`}
                              disabled={item.quantity >= menuItem.stock}
                              onClick={() =>
                                updateCartQuantity(
                                  item.menuId,
                                  1,
                                  menuItem.stock,
                                )
                              }
                            >
                              <Plus data-icon="inline-start" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DrawerFooter className="border-t border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Total</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <Button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
                setPreviewSubmitted(false);
              }}
              className="h-10 w-full rounded-xl"
            >
              Lanjut ke data pemesan
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent className="w-full md:w-96">
          {detailItem && (
            <>
              <DrawerHeader className="relative px-5 py-5 pr-14">
                <DrawerTitle>{detailItem.name}</DrawerTitle>
                <DrawerDescription>
                  Detail menu dan catatan pesanan.
                </DrawerDescription>
                <DrawerClose>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="Tutup detail menu"
                  >
                    <X data-icon="inline-start" />
                  </Button>
                </DrawerClose>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-5 pb-5">
                <img
                  src={detailItem.imageUrl}
                  alt={detailItem.name}
                  className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover"
                />
                <Badge variant="secondary">{detailItem.category}</Badge>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  {detailItem.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(detailItem.price)}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {detailItem.stock > 0
                      ? `${detailItem.stock} ${detailItem.unitOfMeasure ?? 'tersedia'}`
                      : 'Stok habis'}
                  </span>
                </div>
                <FieldGroup className="mt-5 gap-3">
                  <Field>
                    <FieldLabel htmlFor="detail-note">
                      Catatan untuk menu
                    </FieldLabel>
                    <Input
                      id="detail-note"
                      value={detailNote}
                      onChange={(event) => setDetailNote(event.target.value)}
                      placeholder="Contoh: less sugar"
                    />
                    <FieldDescription>
                      Catatan ini ikut tersimpan di item keranjang.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </div>
              <DrawerFooter className="border-t border-[var(--border)] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted)]">Jumlah</span>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Kurangi jumlah menu"
                      disabled={detailQuantity <= 0}
                      onClick={() =>
                        setDetailQuantity((quantity) =>
                          Math.max(0, quantity - 1),
                        )
                      }
                    >
                      <Minus data-icon="inline-start" />
                    </Button>
                    <span
                      className="min-w-5 text-center font-semibold tabular-nums"
                      aria-live="polite"
                    >
                      {detailQuantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Tambah jumlah menu"
                      disabled={detailQuantity >= detailItem.stock}
                      onClick={() =>
                        setDetailQuantity((quantity) =>
                          Math.min(detailItem.stock, quantity + 1),
                        )
                      }
                    >
                      <Plus data-icon="inline-start" />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={detailItem.stock <= 0}
                  onClick={saveCartFromDetail}
                  className="h-10 w-full rounded-xl"
                >
                  <Check data-icon="inline-start" />
                  Simpan ke keranjang
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerContent className="w-full md:w-96">
          <DrawerHeader className="relative border-b border-[var(--border)] px-5 py-5 pr-14">
            <DrawerTitle>Data pemesan</DrawerTitle>
            <DrawerDescription>
              Lengkapi data untuk melihat simulasi pesanan.
            </DrawerDescription>
            <DrawerClose>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Tutup data pemesan"
              >
                <X data-icon="inline-start" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <form
            onSubmit={submitPreview}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="customer-name">Nama pemesan</FieldLabel>
                  <Input
                    id="customer-name"
                    autoComplete="name"
                    required
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value);
                      setPreviewSubmitted(false);
                    }}
                    placeholder="Masukkan nama"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="checkout-token">Kode pesanan</FieldLabel>
                  <Input
                    id="checkout-token"
                    required
                    value={checkoutToken}
                    onChange={(event) => {
                      setCheckoutToken(event.target.value);
                      setPreviewSubmitted(false);
                    }}
                    placeholder="Masukkan token pesanan"
                  />
                  <FieldDescription>
                    Kode dari tautan pemesanan yang dibagikan toko.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">{totalItems} item</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                {previewSubmitted && (
                  <p
                    role="status"
                    className="mt-3 rounded-lg bg-[var(--surface-accent)] px-3 py-2 text-sm leading-5 text-[var(--primary)]"
                  >
                    Mode pratinjau aktif. Pesanan belum dikirim atau disimpan.
                  </p>
                )}
              </div>
            </div>
            <DrawerFooter className="border-t border-[var(--border)] px-5 py-4">
              <p className="text-xs leading-5 text-[var(--muted)]">
                Antarmuka ini memakai data contoh dan belum terhubung ke API
                checkout.
              </p>
              <Button
                type="submit"
                disabled={cartItems.length === 0}
                className="h-10 w-full rounded-xl"
              >
                Lihat simulasi
                <ArrowRight data-icon="inline-end" />
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
