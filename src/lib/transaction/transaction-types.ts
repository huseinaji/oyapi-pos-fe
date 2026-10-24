import type { ApiUserRole, ApiUserStatus } from '@/types/api';

/** POST /api/v1/store/{storeId}/transaction — request body */
export type CreatePOSTransactionDto = {
  paymentMethod: 'cash' | 'qris';
  customer: string;
  items: Array<{
    itemId: string;
    qty: number;
  }>;
};

/** GET /api/v1/store/{storeId}/transaction — list response */
export type SalesInvoiceItem = {
  id: string;
  salesInvoiceId: string;
  itemId: string;
  item: {
    name: string;
    description: string;
    uom: string;
    sellingPrice: number;
  } | null;
  qty: number;
  amount: number;
};

export type SalesInvoiceCreator = {
  id: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  lastLogin: string;
};

export type SalesInvoice = {
  id: string;
  invoiceId: string;
  storeId: string;
  posSessionId: string;
  customer: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  salesInvoiceItems: SalesInvoiceItem[];
  creator?: SalesInvoiceCreator | null;
};

export type Transaction = {
  id: string;
  invoice: string;
  customer: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashier: string;
  /** Locale-formatted display string, e.g. "15/09/2026 17.22.43" */
  date: string;
  /** ISO timestamp from the API — used for filtering and sorting */
  recordedAt: string;
  items: TransactionItem[];
};

export type TransactionItem = {
  id: string;
  transactionId: string;
  productId: string;
  name: string;
  description?: string;
  uom: string;
  qty: number;
  total: number;
};

export type SalesInvoiceListResponse = {
  count: number;
  rows: SalesInvoice[];
};

export type SalesInvoiceFilters = {
  storeId?: string;
  posSessionId?: string;
  customer?: string;
  invoiceId?: string;
  paymentMethod?: string;
  totalAmount?: number;
  status?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type SalesInvoicePageParams = SalesInvoiceFilters & {
  page?: number;
  limit?: number;
};

export type PaymentMethod = 'cash' | 'qris';

export type TransactionStatus = 'complete' | 'pending';
