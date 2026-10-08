import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePOSTransactionDto,
  SalesInvoice,
  SalesInvoiceFilters,
} from '#lib/transaction/transaction-types';
import type { Transaction } from './transaction-types';
import { productQueryKeys } from '#lib/product/product-store';
import { transactionsApi } from './transactions-api';
import { useMeQuery } from '#lib/auth/auth-store';

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  list: (storeId?: string, filters: SalesInvoiceFilters = {}) =>
    [...transactionQueryKeys.all, 'list', storeId, filters] as const,
  detail: (storeId: string | undefined, id: string) =>
    [...transactionQueryKeys.all, 'detail', storeId, id] as const,
};

export const mapInvoice = (invoice: SalesInvoice): Transaction => ({
  id: invoice.id,
  invoice: invoice.invoiceId,
  customer: invoice.customer?.trim() || 'Walk-in Customer',
  paymentMethod: invoice.paymentMethod,
  status:
    invoice.status === 'complete' || invoice.status === 'compeleted'
      ? 'complete'
      : 'pending',
  subtotal: invoice.totalAmount,
  discount: 0,
  tax: 0,
  total: invoice.totalAmount,
  cashier: invoice.creator?.username ?? 'System',
  date: new Date(invoice.createdAt).toLocaleString('id-ID'),
  recordedAt: invoice.createdAt,
  items: (invoice.salesInvoiceItems ?? []).map((item) => ({
    id: item.id,
    transactionId: invoice.id,
    productId: item.itemId,
    name: item.item?.name ?? item.itemId,
    uom: item.item?.uom ?? '',
    description: item.item?.description,
    qty: item.qty,
    total: item.amount,
  })),
});

export function useTransactionsQuery(filters: SalesInvoiceFilters = {}) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: transactionQueryKeys.list(storeId, filters),
    queryFn: async () => {
      const invoices = await transactionsApi.list(storeId!, filters);
      return invoices.map(mapInvoice);
    },
    enabled: Boolean(storeId),
    refetchOnWindowFocus: true,
  });
}

export function useRealtimeTransactionsQuery() {
  return useTransactionsQuery();
}

export function useTransactionQuery(id: string) {
  const storeId = useMeQuery().data?.store?.storeId;
  return useQuery({
    queryKey: transactionQueryKeys.detail(storeId, id),
    queryFn: () => transactionsApi.getById(storeId!, id).then(mapInvoice),
    enabled: Boolean(id && storeId),
  });
}

export function useCreatePOSTransactionMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (body: CreatePOSTransactionDto) => {
      if (!storeId) throw new Error('Select a store before creating a transaction.');
      return transactionsApi.create(storeId, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

export function useCompleteTransactionMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (id: string) => {
      if (!storeId) throw new Error('Select a store before completing a transaction.');
      return transactionsApi.complete(storeId, id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.detail(storeId, id) });
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();
  const storeId = useMeQuery().data?.store?.storeId;

  return useMutation({
    mutationFn: (id: string) => {
      if (!storeId) throw new Error('Select a store before deleting a transaction.');
      return transactionsApi.delete(storeId, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: transactionQueryKeys.detail(storeId, id),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
    },
  });
}
