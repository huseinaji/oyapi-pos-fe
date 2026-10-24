import type { ApiStoreRole, ApiUserRole, ApiUserStatus } from '@/types/api';

export type StoreRole = ApiStoreRole;

export type StoreMember = {
  id: string;
  storeId: string;
  userId: string;
  role: StoreRole;
  isDefault: boolean | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: ApiUserRole;
    status: ApiUserStatus;
    lastLogin: string | null;
  };
};

/** Shape of a single store returned by GET /api/v1/store/my-store */
export type ApiStore = {
  id: string;
  name: string;
  imageUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  status?: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy?: string | null;
  storeMember: ApiStoreMember[];
  creator?: {
    email: string;
    id: string;
    lastLogin: string | null;
    role: string;
    status: string;
    username: string;
  } | null;
};

export type ApiStoreMember = {
  id: string;
  isDefault: boolean | null;
  role: StoreRole;
  storeId: string;
  userId: string;
};

/** GET /api/v1/store/my-store — paginated response */
export type MyStoreResponse = {
  count: number;
  rows: ApiStore[];
};

export type StoreMemberListResponse = {
  count: number;
  rows: StoreMember[];
};

/** POST /api/v1/store — request body */
export type CreateStoreDto = {
  name: string;
  imageUrl?: string;
  address?: string;
  phone?: string;
};
