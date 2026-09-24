import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StoreApi } from './store-api';
import { authQueryKeys } from '#lib/auth/auth-store';

export function useSelectStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => StoreApi.select(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}

export function useListMyStoreQuery() {
  return useQuery({
    queryKey: ['listMyStore'],
    queryFn: StoreApi.myStores,
  })
}

