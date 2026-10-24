/**
 * API types derived from Swagger request schemas and verified runtime responses.
 * Base URL: http://localhost:3001
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** POST /api/v1/auth/login — request body */
export type LoginDto = {
  usernameOrEmail: string;
  password: string;
  rememberMe: boolean;
};

/** POST /api/v1/auth/login — successful response */
export type LoginResponse = {
  message?: string;
};

/** POST /api/v1/auth/logout — OpenAPI documents 201 with no response schema. */
export type LogoutResponse = void;

export type AuthMeUser = {
  sub: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  store?: {
    storeId: string;
    role: ApiStoreRole;
  };
};

export type AuthMeResponse = {
  userPayload: AuthMeUser;
  rememberMe: boolean;
};

/** POST /api/v1/auth/register — request body */
export type SignupDto = {
  username: string;
  email: string;
  password: string;
};

export type ApiUserRole = 'ADMIN' | 'USER' | 'CASHIER';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE';
export type ApiStoreRole = 'admin' | 'cashier';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

/** Shape of a single user returned by GET /api/v1/users or /api/v1/users/:id */
export type ApiUser = {
  id: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  storeMembers: Array<{
    id: string;
    storeId: string;
    userId: string;
    role: ApiStoreRole;
    isDefault: boolean | null;
    store: {
      name: string;
      imageUrl: string | null;
      address: string | null;
      phone: string | null;
    };
  }>;
};

/** GET /api/v1/users — paginated response */
export type UserListResponse = {
  count: number;
  rows: ApiUser[];
};

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

/** GET /api/v1/store/{storeId}/items query params */
export type ItemFilterParams = {
  name?: string;
  type?: string;
  uom?: string;
  basePrice?: number;
  sellingPrice?: number;
  categoryId?: string;
  description?: string;
  isMaintainStock?: boolean;
  initialStock?: number;
  page?: number;
  limit?: number;
};

// ---------------------------------------------------------------------------
// Generic API error shape
// ---------------------------------------------------------------------------

export type ApiErrorBody = {
  message: string | string[];
  error?: string;
  statusCode: number;
};
