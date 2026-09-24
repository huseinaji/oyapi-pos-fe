import type { Product } from '../types/inde';
import { createStore } from '../lib/store-utils';
export type CartItem = Product & { quantity: number };
export const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = subtotal > 100000 ? subtotal * 0.1 : 0;
  return { subtotal, discount, total: subtotal - discount };
};
type CartState = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  recalculate: () => void;
  clearCart: () => void;
};
const store = createStore<CartState>({
  items: [],
  ...calculateTotals([]),
  addItem: (product) => {
    const items = [...store.getState().items];
    const existing = items.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else items.push({ ...product, quantity: 1 });
    store.setState({ items, ...calculateTotals(items) });
  },
  removeItem: (id) => {
    const items = store.getState().items.filter((item) => item.id !== id);
    store.setState({ items, ...calculateTotals(items) });
  },
  updateQty: (id, qty) => {
    const items = store
      .getState()
      .items.map((item) => (item.id === id ? { ...item, quantity: qty } : item))
      .filter((item) => item.quantity > 0);
    store.setState({ items, ...calculateTotals(items) });
  },
  recalculate: () => store.setState(calculateTotals(store.getState().items)),
  clearCart: () => store.setState({ items: [], ...calculateTotals([]) }),
});
export const useCartStore = store.useStore;
export const cartStore = {
  addItem: (product: Product) => store.getState().addItem(product),
  removeItem: (id: string) => store.getState().removeItem(id),
  updateQty: (id: string, qty: number) => store.getState().updateQty(id, qty),
  clearCart: () => store.getState().clearCart(),
};
