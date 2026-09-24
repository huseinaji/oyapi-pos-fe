/**
 * TypeScript types derived from the backend Swagger contract.
 * Base URL: http://localhost:3001
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** POST /api/v1/auth/login — request body */
export type LoginDto = {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
};

/** POST /api/v1/auth/login — successful response */
export type LoginResponse = {
  message?: string;
  data?: {
    accessToken?: string;
  };
};



/** POST /api/v1/auth/register — request body */
export type SignupDto = {
  username: string;
  email: string;
  password: string;
  role: ApiUserRole;
};

export type ApiUserRole = 'ADMIN' | 'USER' | 'CASHIER';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE';

/** POST /api/v1/pos/transaction — request body */
export type CreatePOSTransactionDto = {
  paymentMethod: 'cash' | 'qris';
  customer?: string;
  invoice?: string;
  cashier?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  items?: Array<{
    id?: string;
    itemId?: string;
    name?: string;
    qty?: number;
    price?: number;
    total?: number;
  }>;
};

/** GET /api/v1/invoices — list response */
export type SalesInvoiceItem = {
  id: string;
  salesInvoiceId: string;
  itemId: string;
  item: {
    name: string;
    description: string;
    uom: string;
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
};

export type SalesInvoice = {
  id: string;
  userId: string;
  invoiceId: string;
  customer?: string;
  paymentMethod: 'cash' | 'qris';
  totalAmount: number;
  status: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  salesInvoiceItems: SalesInvoiceItem[];
  creator: SalesInvoiceCreator;
};

export type SalesInvoiceListResponse = {
  count: number;
  rows: SalesInvoice[];
};

// ---------------------------------------------------------------------------
// Item (Product)
// ---------------------------------------------------------------------------

export type ApiItemBin = {
  itemId: number;
  stockValue: number;
  uom: number;
};

/** Shape of a single item returned by the API */
export type ApiItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock: boolean;
  stock?: number;
  bin?: ApiItemBin;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** GET /api/v1/items — list response */
export type ItemListResponse = {
  count: number;
  rows: ApiItem[];
};

/** POST /api/v1/items — request body */
export type CreateItemDto = {
  name: string;
  category: string;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  isMaintainStock?: boolean;
};

/** PATCH /api/v1/items/{id} — request body (all fields optional) */
export type UpdateItemDto = Partial<CreateItemDto>;

/** Enum values accepted by the backend for item category */
export const ITEM_CATEGORY_OPTIONS = ['raw_material', 'finished_good'] as const;
export type ItemCategory = (typeof ITEM_CATEGORY_OPTIONS)[number];

/** Display labels for item categories */
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
};

/** Enum values accepted by the backend for item unit of measure */
export const ITEM_UOM_OPTIONS = ['pcs', 'box', 'kg'] as const;
export type ItemUom = (typeof ITEM_UOM_OPTIONS)[number];

/** Display labels for item UOM */
export const ITEM_UOM_LABELS: Record<ItemUom, string> = {
  pcs: 'Pieces',
  box: 'Box',
  kg: 'Kilogram',
};

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/** Shape of a single user returned by GET /api/v1/users or /api/v1/users/:id */
export type ApiUser = {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** GET /api/v1/users — list response (plain array) */
export type UserListResponse = ApiUser[];

/** PATCH /api/v1/users/:id — request body (all optional) */
export type UpdateUserDto = {
  username?: string;
  email?: string;
  role?: ApiUserRole;
  status?: ApiUserStatus;
};

/** PATCH /api/v1/users/:id/password — change password request */
export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};

/** GET /api/v1/items query params */
export type ItemFilterParams = {
  name?: string;
  category?: string;
  uom?: string;
  basePrice?: number;
  sellingPrice?: number;
  isMaintainStock?: boolean;
};

// ---------------------------------------------------------------------------
// Generic API error shape
// ---------------------------------------------------------------------------

export type ApiErrorBody = {
  message: string | string[];
  error?: string;
  statusCode: number;
};

