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
};

/** POST /api/v1/auth/logout — OpenAPI documents 201 with no response schema. */
export type LogoutResponse = void;



/** POST /api/v1/auth/register — request body */
export type SignupDto = {
  username: string;
  email: string;
  password: string;
  role: ApiUserRole;
};

export type ApiUserRole = 'ADMIN' | 'USER' | 'CASHIER';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE';


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

