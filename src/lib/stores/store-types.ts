export type StoreRole = 'ADMIN' | 'CASHIER';

export function normalizeStoreRole(value: unknown): StoreRole | null {
  if (typeof value !== 'string') return null;
  const role = value.toUpperCase();
  return role === 'ADMIN' || role === 'CASHIER' ? role : null;
}

export type StoreMember = {
  id: string;
  username: string;
  email: string;
  role: StoreRole | 'USER';
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
};

export type StorePayload = {
  storeId: string;
  role: StoreRole;
};

export type SelectStoreResponse = {
  success: boolean;
  data: {
    store: any;
    role: StoreRole;
  };
};

/** Shape of a single store returned by GET /api/v1/store/my-store */
export type ApiStore = {
  id: string;
  name: string;
  imageUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  storeMember: ApiStoreMember[];
  creator: {
    email: string,
    id: string,
    lastLogin: string,
    role: string,
    status: string,
    username: string
  }
};

export type ApiStoreMember = {
  id: string;
  isDefault: boolean;
  role: StoreRole;
  storeId: string;
  userId: string;
};

/** GET /api/v1/store/my-store — paginated response */
export type MyStoreResponse = {
  count: number;
  rows: ApiStore[];
};

/** POST /api/v1/store — request body */
export type CreateStoreDto = {
  name: string;
  imageUrl?: string;
  address?: string;
  phone?: string;
};
