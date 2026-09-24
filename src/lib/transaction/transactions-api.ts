import { apiClient } from '../api-client';
import type {
  CreatePOSTransactionDto,
  SalesInvoice,
  SalesInvoiceListResponse,
} from '../../types/api';

export const transactionsApi = {
  list: () => apiClient.get<SalesInvoiceListResponse>('/api/v1/invoices'),
  getById: (id: string) =>
    apiClient.get<SalesInvoice>(`/api/v1/invoices/${id}`),
  create: (body: CreatePOSTransactionDto) =>
    apiClient.post<void>('/api/v1/pos/transaction', body),
  complete: (id: string) =>
    apiClient.patch<void>(`/api/v1/invoices/${id}/complete`),
  delete: (id: string) => apiClient.delete<void>(`/api/v1/invoices/${id}`),
};
