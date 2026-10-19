import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '@/lib/auth/auth-store';
import { itemCategoriesApi } from './item-categories-api';
import type {
  CreateStoreItemCategoryDto,
  StoreItemCategoryListResponse,
} from './product-types';

export const itemCategoryQueryKeys = {
  all: ['item-categories'] as const,
  list: (storeId?: string) => [...itemCategoryQueryKeys.all, storeId] as const,
};

export function useItemCategoriesQuery() {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: itemCategoryQueryKeys.list(storeId),
    queryFn: () => itemCategoriesApi.list(storeId!),
    enabled: Boolean(storeId),
  });
}

export function useCreateItemCategoryMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (body: CreateStoreItemCategoryDto) => {
      if (!storeId) throw new Error('Select a store before creating categories.');
      return itemCategoriesApi.create(storeId, body);
    },
    onSuccess: async (category) => {
      queryClient.setQueryData<StoreItemCategoryListResponse>(
        itemCategoryQueryKeys.list(storeId),
        (current) =>
          current
            ? {
                count: current.count + 1,
                rows: [...current.rows, category],
              }
            : current,
      );
      await queryClient.invalidateQueries({
        queryKey: itemCategoryQueryKeys.list(storeId),
      });
    },
  });
}

export function useDeleteItemCategoryMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (categoryId: string) => {
      if (!storeId) throw new Error('Select a store before deleting categories.');
      return itemCategoriesApi.remove(storeId, categoryId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemCategoryQueryKeys.list(storeId),
      });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}