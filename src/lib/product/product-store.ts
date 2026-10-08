import { productsApi } from '#lib/product/products-api';
import type {
  ApiItem,
  CreateItemDto,
  ItemFilters,
  UpdateItemDto,
} from '#lib/product/product-types';
import type { Product } from '@/types/inde';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '#lib/auth/auth-store';

export const productQueryKeys = {
  all: ['products'] as const,
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
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.list(storeId) });
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
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.list(storeId) });
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
      queryClient.removeQueries({ queryKey: productQueryKeys.detail(storeId, id), exact: true });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.list(storeId) });
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
    : item.stock ?? 0,
  description: item.description ?? '',
  uom: item.uom,
});

export function usePosProductsQuery(filters: ItemFilters = {}) {
  const query = useProductsQuery(filters);
  return {
    ...query,
    data: query.data?.rows.map(mapProduct) ?? [],
  };
}

