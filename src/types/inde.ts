export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  uom: string;
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

export type Transaction = {
  id: string;
  invoice: string;
  customer: string;
  paymentMethod: 'cash' | 'qris';
  status: 'complete' | 'pending';
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

export type StoreSettings = {
  storeName: string;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
  /** e.g. "INV" → produces "INV-1023" */
  invoicePrefix: string;
  /** 0–100 whole number, e.g. 11 means 11% */
  taxRate: number;
  currency: string;
  /** Optional data-URL or remote URL for a logo image */
  logoUrl: string;
  thankYouMessage: string;
};
