import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashierSessionsApi } from './cashier-sessions-api';
import type { CashierStockSnapshot } from './cashier-sessions-types';

export const cashierSessionQueryKeys = {
  all: ['cashier-sessions'] as const,
  list: (storeId?: string) => [...cashierSessionQueryKeys.all, storeId] as const,
};

export function useCashierSessionsQuery(storeId?: string) {
  return useQuery({
    queryKey: cashierSessionQueryKeys.list(storeId),
    queryFn: () => cashierSessionsApi.list(storeId!),
    enabled: Boolean(storeId),
    refetchOnWindowFocus: true,
  });
}

export function useOpenCashierSessionMutation(storeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (openingStock: CashierStockSnapshot[]) => {
      if (!storeId) throw new Error('Select a store before opening cashier.');
      return cashierSessionsApi.open(storeId, openingStock);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: cashierSessionQueryKeys.list(storeId),
      }),
  });
}

export function useCloseCashierSessionMutation(storeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error('Select a store before closing cashier.');
      return cashierSessionsApi.close(storeId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: cashierSessionQueryKeys.list(storeId),
      }),
  });
}