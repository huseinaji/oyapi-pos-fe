import { productsApi } from '@/lib/product/products-api';
import type {
  ApiItem,
  CreateItemDto,
  ItemFilters,
  SellableItemResponse,
  UpdateItemDto,
} from '@/lib/product/product-types';
import type { Product } from '@/types/inde';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '@/lib/auth/auth-store';

export const productQueryKeys = {
  all: ['products'] as const,
  sellableItems: (storeId?: string) =>
    [...productQueryKeys.all, 'sellable-items', storeId] as const,
  list: (storeId?: string, filters: ItemFilters = {}) =>
    [...productQueryKeys.all, 'list', storeId, filters] as const,
  detail: (storeId: string | undefined, id: string) =>
    [...productQueryKeys.all, 'detail', storeId, id] as const,
};

export function useProductsQuery(filters: ItemFilters = {}) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: productQueryKeys.list(storeId, filters),
    queryFn: () => productsApi.list(storeId!, filters),
    enabled: Boolean(storeId),
  });
}

export function useProductQuery(id: string) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: productQueryKeys.detail(storeId, id),
    queryFn: () => productsApi.get(storeId!, id),
    enabled: Boolean(id && storeId),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (body: CreateItemDto) => {
      if (!storeId) throw new Error('Select a store before creating products.');
      return productsApi.create(storeId, body);
    },
    onSuccess: (item) => {
      queryClient.setQueryData(productQueryKeys.detail(storeId, item.id), item);
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(storeId),
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.sellableItems(storeId),
      });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateItemDto }) => {
      if (!storeId) throw new Error('Select a store before updating products.');
      return productsApi.update(storeId, id, body);
    },
    onSuccess: (item) => {
      queryClient.setQueryData(productQueryKeys.detail(storeId, item.id), item);
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(storeId),
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.sellableItems(storeId),
      });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (id: string) => {
      if (!storeId) throw new Error('Select a store before deleting products.');
      return productsApi.remove(storeId, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: productQueryKeys.detail(storeId, id),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.list(storeId),
      });
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.sellableItems(storeId),
      });
    },
  });
}

export const mapProduct = (item: ApiItem): Product => ({
  id: item.id,
  name: item.name,
  imageUrl: item.imageUrl,
  category: item.category,
  categoryId: item.categoryId,
  price: item.sellingPrice,
  stock: item.bin
    ? Math.max(
        0,
        (item.bin.actualQty ?? item.bin.stockValue ?? item.stock ?? 0) -
          (item.bin.reservedQty ?? 0),
      )
    : (item.stock ?? 0),
  description: item.description ?? '',
  uom: item.uom,
});

const mapSellableProduct = (
  item: SellableItemResponse,
  category?: Pick<ApiItem, 'category' | 'categoryId'>,
): Product => ({
  id: item.id,
  name: item.name,
  imageUrl: item.imageUrl,
  category: category?.category ?? '',
  categoryId: category?.categoryId,
  price: item.sellingPrice,
  stock: item.availableQty,
  description: item.description ?? '',
  uom: item.uom,
});

export function usePosProductsQuery() {
  const storeId = useMeQuery().data?.store?.storeId;
  const query = useQuery({
    queryKey: productQueryKeys.sellableItems(storeId),
    queryFn: async () => {
      const [sellableItems, { rows: items }] = await Promise.all([
        productsApi.listSellableItems(storeId!),
        productsApi.list(storeId!),
      ]);
      const itemsById = new Map(items.map((item) => [item.id, item]));

      return sellableItems.map((item) =>
        mapSellableProduct(item, itemsById.get(item.id)),
      );
    },
    enabled: Boolean(storeId),
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
