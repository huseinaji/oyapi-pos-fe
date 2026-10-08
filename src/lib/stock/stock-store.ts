import { useQuery } from '@tanstack/react-query';
import { stockApi } from './stock-api';
import { useMeQuery } from '#lib/auth/auth-store';

export const stockQueryKeys = {
  all: ['stock'] as const,
  ledger: (storeId: string | undefined, page: number, limit: number) =>
    [...stockQueryKeys.all, 'ledger', storeId, page, limit] as const,
  bins: (storeId: string | undefined, itemId?: string) =>
    [...stockQueryKeys.all, 'bins', storeId, itemId] as const,
};

export function useStockLedgerQuery(page: number, limit: number) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: stockQueryKeys.ledger(storeId, page, limit),
    queryFn: () => stockApi.list(storeId!, page, limit),
    enabled: Boolean(storeId),
  });
}

export function useStockBinsQuery(itemId?: string) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: stockQueryKeys.bins(storeId, itemId),
    queryFn: () => stockApi.bins(storeId!, { itemId }),
    enabled: Boolean(storeId),
  });
}
