import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeQuery } from '@/lib/auth/auth-store';
import { stockAdjustmentApi } from './stock-adjustment-api';
import type { CreateStockAdjustmentDto } from './stock-adjustment-types';

export const stockAdjustmentQueryKeys = {
  all: ['stock-adjustments'] as const,
  list: (storeId?: string) =>
    [...stockAdjustmentQueryKeys.all, 'list', storeId] as const,
};

export function useStockAdjustmentsQuery() {
  const storeId = useMeQuery().data?.store?.storeId;

  return useQuery({
    queryKey: stockAdjustmentQueryKeys.list(storeId),
    queryFn: () => stockAdjustmentApi.list(storeId!),
    enabled: Boolean(storeId),
  });
}

export function useCreateStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (body: CreateStockAdjustmentDto) => {
      if (!storeId) {
        throw new Error('Select a store before creating a stock adjustment.');
      }

      return stockAdjustmentApi.create(storeId, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: stockAdjustmentQueryKeys.list(storeId),
      });
    },
  });
}
