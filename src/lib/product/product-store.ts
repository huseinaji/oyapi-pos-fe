import { productsApi } from '#lib/product/products-api';
import type { ApiItem, CreateItemDto, UpdateItemDto } from '@/types/api';
import { createStore } from '#lib/store-utils';
import type { Product } from '@/types/inde';

const map = (item: ApiItem): Product => ({
  id: item.id,
  name: item.name,
  category: item.category,
  price: item.sellingPrice,
  stock: item.bin?.stockValue ?? item.stock ?? 0,
  description: item.description ?? '',
  uom: item.uom,
});
type ProductState = {
  items: ApiItem[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (dto: CreateItemDto) => Promise<ApiItem>;
  updateItem: (id: string, dto: UpdateItemDto) => Promise<ApiItem>;
  deleteItem: (id: string) => Promise<void>;
  decrementStock: (id: string, qty: number) => void;
};
const store = createStore<ProductState>({
  items: [],
  products: [],
  isLoading: true,
  error: null,
  async fetchItems() {
    store.setState({ isLoading: true, error: null });
    try {
      const response = await productsApi.list();
      store.setState({
        items: response.rows,
        products: response.rows.map(map),
        isLoading: false,
      });
    } catch (error) {
      store.setState({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to load products',
      });
    }
  },
  async addItem(dto) {
    const item = await productsApi.create(dto);
    const items = [item, ...store.getState().items];
    store.setState({ items, products: items.map(map) });
    return item;
  },
  async updateItem(id, dto) {
    const item = await productsApi.update(id, dto);
    const items = store
      .getState()
      .items.map((current) => (current.id === id ? item : current));
    store.setState({ items, products: items.map(map) });
    return item;
  },
  async deleteItem(id) {
    await productsApi.remove(id);
    const items = store.getState().items.filter((item) => item.id !== id);
    store.setState({ items, products: items.map(map) });
  },
  decrementStock(id, qty) {
    store.setState({
      products: store
        .getState()
        .products.map((product) =>
          product.id === id
            ? { ...product, stock: Math.max(0, product.stock - qty) }
            : product,
        ),
    });
  },
});
export const useProductStore = store.useStore;
export const productStore = {
  fetchItems: () => store.getState().fetchItems(),
  addItem: (dto: CreateItemDto) => store.getState().addItem(dto),
  updateItem: (id: string, dto: UpdateItemDto) =>
    store.getState().updateItem(id, dto),
  deleteItem: (id: string) => store.getState().deleteItem(id),
  decrementStock: (id: string, qty: number) =>
    store.getState().decrementStock(id, qty),
};
