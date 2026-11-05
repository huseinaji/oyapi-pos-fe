import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StoreApi } from './store-api';
import { authQueryKeys, useMeQuery } from '@/lib/auth/auth-store';
import type { CreateStoreDto } from './store-types';

export const storeQueryKeys = {
  myStores: ['listMyStore'] as const,
};

export const storeMemberQueryKeys = {
  all: ['store-members'] as const,
  list: (storeId: string) => [...storeMemberQueryKeys.all, storeId] as const,
  getById: (id?: string) => ['store', id ?? 'inactive'] as const,
};

export function useStoreMembersQuery(storeId: string | undefined) {
  return useQuery({
    queryKey: storeId
      ? storeMemberQueryKeys.list(storeId)
      : [...storeMemberQueryKeys.all, 'inactive'],
    queryFn: () => {
      if (!storeId) {
        throw new Error('An active store is required to load members.');
      }
      return StoreApi.members(storeId);
    },
    enabled: Boolean(storeId),
  });
}

export function useAssignStoreMemberMutation(storeId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!storeId) {
        throw new Error('An active store is required to assign a member.');
      }
      return StoreApi.assignMember(storeId, userId);
    },
    onSuccess: async () => {
      if (storeId) {
        await queryClient.invalidateQueries({
          queryKey: storeMemberQueryKeys.list(storeId),
        });
      }
    },
  });
}

export function useDisableStoreMemberMutation(storeId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!storeId) {
        throw new Error('An active store is required to disable a member.');
      }
      return StoreApi.disableMember(storeId, { userId });
    },
    onSuccess: async () => {
      if (storeId) {
        await queryClient.invalidateQueries({
          queryKey: storeMemberQueryKeys.list(storeId),
        });
      }
    },
  });
}

export function useSelectStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) => StoreApi.select(storeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}

export function useCreateStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStoreDto) => StoreApi.create(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: storeQueryKeys.myStores,
      });
    },
  });
}

export function useGetCurrentStoreQuery() {
  const storeId = useMeQuery().data?.store?.storeId;

  return useQuery({
    queryKey: storeMemberQueryKeys.getById(storeId),
    queryFn: () => {
      if (!storeId) {
        throw new Error('An active store is required to load store details.');
      }
      return StoreApi.getById(storeId);
    },
    enabled: Boolean(storeId),
  });
}

export function useListMyStoreQuery() {
  return useQuery({
    queryKey: storeQueryKeys.myStores,
    queryFn: StoreApi.myStores,
  });
}
