import { Api } from '#lib/api/index';
import type { AuthUser } from "#lib/auth/auth-store";
import type {
  ApiUserRole,
  ApiUserStatus,
  LoginDto,
  LoginResponse,
  LogoutResponse,
} from '@/types/api';
import type { StorePayload } from '#lib/stores/store-types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function mapAuthUser(value: unknown): AuthUser {
  const envelope = asRecord(value);
  const user = asRecord(
    envelope.userPayload ?? envelope.user ?? envelope.data ?? value,
  );
  const rawStore = user.store;
  const store = asRecord(rawStore);
  const nestedStore = asRecord(store.store);
  const storeId =
    (typeof rawStore === 'string' ? rawStore : undefined) ??
    store.storeId ??
    store.id ??
    nestedStore.storeId ??
    nestedStore.id;

  return {
    id: String(user.sub ?? user.id ?? ''),
    username: String(user.username ?? ''),
    email: String(user.email ?? ''),
    role: user.role as ApiUserRole,
    status: user.status as ApiUserStatus,
    ...(storeId
      ? {
          store: {
            storeId: String(storeId),
            role: (store.role ?? user.role) as StorePayload['role'],
          },
        }
      : {}),
  };
}

export const AuthApi = {
  login: (dto: LoginDto) =>
    Api.post<LoginResponse>('/api/v1/auth/login', dto).then((res) => res.data),
  me: async () => {
    const response = await Api.get<unknown>('/api/v1/auth/me');
    return mapAuthUser(response.data);
  },
  logout: () => Api.post<LogoutResponse>('/api/v1/auth/logout').then((res) => res.data),
}