import type {
  CreatePOSTransactionDto,
  SalesInvoice,
  SalesInvoiceFilters,
  SalesInvoiceListResponse,
  SalesInvoicePageParams,
} from '#lib/transaction/transaction-types';
import { Api } from '../api';
import { fetchAllPages } from '../api/pagination';

function invoicePath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/invoice`;
}

export const transactionsApi = {
  list: (storeId: string, filters: SalesInvoiceFilters = {}) =>
    transactionsApi.listAll(storeId, 100, filters),
  listPage: (storeId: string, filters: SalesInvoicePageParams = {}) =>
    Api.get<SalesInvoiceListResponse>(invoicePath(storeId), {
      params: filters,
    }).then((response) => response.data),
  listAll: async (
    storeId: string,
    limit = 100,
    filters: SalesInvoiceFilters = {},
  ) => {
    const response = await fetchAllPages(
      (page, pageLimit) =>
        transactionsApi.listPage(storeId, {
          ...filters,
          page,
          limit: pageLimit,
        }),
      limit,
    );
    return response.rows;
  },
  getById: (storeId: string, id: string) =>
    Api.get<SalesInvoice>(
      `${invoicePath(storeId)}/${encodeURIComponent(id)}`,
    ).then((response) => response.data),
  create: (storeId: string, body: CreatePOSTransactionDto) =>
    Api.post<SalesInvoice>(`/api/v1/store/${encodeURIComponent(storeId)}/transaction`, body).then((response) => response.data),
  complete: (storeId: string, id: string) =>
    Api.patch<void>(
      `${invoicePath(storeId)}/${encodeURIComponent(id)}/complete`,
    ).then((response) => response.data),
  delete: (storeId: string, id: string) =>
    Api.delete<void>(
      `/api/v1/store/${encodeURIComponent(storeId)}/transaction/${encodeURIComponent(id)}`,
    ),
};
