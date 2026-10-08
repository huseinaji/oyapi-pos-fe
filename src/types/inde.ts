export type Product = {
  id: string;
  name: string;
  imageUrl?: string | null;
  description: string;
  category: string;
  categoryId?: string;
  uom: string;
  price: number;
  stock: number;
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
