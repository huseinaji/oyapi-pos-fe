import { Api } from '#lib/api/index';
import type { ApiStore, CreateStoreDto, MyStoreResponse } from './store-types';

function normalizeMyStores(value: unknown): MyStoreResponse {
  const response = value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
  const nested = response.data;
  const nestedResponse = nested && !Array.isArray(nested) && typeof nested === 'object'
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
      (typeof nestedResponse.count === 'number' ? nestedResponse.count : undefined) ??
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
  create: (body: CreateStoreDto) => Api.post<ApiStore>('/api/v1/store', body).then(m => m.data),
};
