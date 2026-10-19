import { Api } from '@/lib/api/index';
import { normalizeStoreRole } from './store-types';
import type {
  ApiStore,
  CreateStoreDto,
  MyStoreResponse,
  StoreMember,
} from './store-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapMembers(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const response = asRecord(value);
  if (!response) {
    throw new Error('The store members response has an invalid format.');
  }

  for (const candidate of [
    response.rows,
    response.members,
    response.users,
    response.data,
  ]) {
    if (Array.isArray(candidate)) return candidate;
    const nested = asRecord(candidate);
    if (nested) {
      for (const nestedCandidate of [
        nested.rows,
        nested.members,
        nested.users,
        nested.data,
      ]) {
        if (Array.isArray(nestedCandidate)) return nestedCandidate;
      }
    }
  }

  throw new Error('The store members response does not contain a member list.');
}

function normalizeMember(value: unknown): StoreMember {
  const member = asRecord(value);
  const user = asRecord(member?.user) ?? member;
  const id = member?.userId ?? user?.id ?? member?.id;
  const username = user?.username;
  const email = user?.email;
  const roleValue = member?.role ?? user?.role;
  const storeRole = normalizeStoreRole(roleValue);
  const role =
    storeRole ??
    (typeof roleValue === 'string' && roleValue.toUpperCase() === 'USER'
      ? 'USER'
      : null);
  const createdAt = member?.createdAt ?? user?.createdAt;
  const updatedAt = member?.updatedAt ?? user?.updatedAt;

  if (
    typeof id !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    role === null
  ) {
    throw new Error('The store members response contains an invalid member.');
  }

  const status = user?.status;
  return {
    id,
    username,
    email,
    role,
    ...(status === 'ACTIVE' || status === 'INACTIVE' ? { status } : {}),
    ...(typeof createdAt === 'string' ? { createdAt } : {}),
    ...(typeof updatedAt === 'string' ? { updatedAt } : {}),
  };
}

function normalizeMyStores(value: unknown): MyStoreResponse {
  const response =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const nested = response.data;
  const nestedResponse =
    nested && !Array.isArray(nested) && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : {};
  const rows = Array.isArray(response.rows)
    ? response.rows
    : Array.isArray(nested)
      ? nested
      : Array.isArray(nestedResponse.rows)
        ? nestedResponse.rows
        : [];

  return {
    count:
      (typeof response.count === 'number' ? response.count : undefined) ??
      (typeof nestedResponse.count === 'number'
        ? nestedResponse.count
        : undefined) ??
      rows.length,
    rows: rows as ApiStore[],
  };
}

export const StoreApi = {
  myStores: () =>
    Api.get<unknown>('/api/v1/store/my-store').then((response) =>
      normalizeMyStores(response.data),
    ),
  select: (id: string) =>
    Api.post<void>(`/api/v1/store/${encodeURIComponent(id)}/select`).then(
      (response) => response.data,
    ),
  getById: (id: string) =>
    Api.get<ApiStore>(`/api/v1/store/${encodeURIComponent(id)}`).then(
      (response) => response.data,
    ),
  members: async (storeId: string) => {
    const response = await Api.get<unknown>(
      `/api/v1/store/${encodeURIComponent(storeId)}/members`,
    );
    return unwrapMembers(response.data).map(normalizeMember);
  },
  assignMember: (storeId: string, userId: string) =>
    Api.post<void>(`/api/v1/store/${encodeURIComponent(storeId)}/assign`, {
      userId,
    }).then((response) => response.data),
  create: (body: CreateStoreDto) =>
    Api.post<ApiStore>('/api/v1/store', body).then((m) => m.data),
};
