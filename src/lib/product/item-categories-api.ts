import { Api } from '../api';
import type {
  CreateStoreItemCategoryDto,
  StoreItemCategory,
  StoreItemCategoryListResponse,
} from './product-types';
import { fetchAllPages } from '../api/pagination';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === 'object' ? (value as RawRecord) : {};
}

function categoriesPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/items/categories`;
}

function normalizeCategory(value: unknown, index = 0): StoreItemCategory {
  const raw = asRecord(value);
  return {
    id: String(raw.id ?? raw._id ?? raw.categoryId ?? `category-${index}`),
    name: String(raw.name ?? raw.categoryName ?? ''),
  };
}

function normalizeList(value: unknown): StoreItemCategoryListResponse {
  const raw = asRecord(value);
  const payload = asRecord(raw.data);
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(raw.rows)
      ? raw.rows
      : Array.isArray(raw.data)
        ? raw.data
        : Array.isArray(payload.rows)
          ? payload.rows
          : [];

  return {
    count:
      (typeof raw.count === 'number' ? raw.count : undefined) ??
      (typeof payload.count === 'number' ? payload.count : undefined) ??
      rows.length,
    rows: rows.map(normalizeCategory),
  };
}

function normalizeOne(value: unknown): StoreItemCategory {
  const raw = asRecord(value);
  return normalizeCategory(raw.data ?? value);
}

export const itemCategoriesApi = {
  list: (storeId: string) =>
    fetchAllPages((page, limit) =>
      Api.get<unknown>(categoriesPath(storeId), {
        params: { page, limit },
      }).then((response) => normalizeList(response.data)),
    ),
  create: (storeId: string, body: CreateStoreItemCategoryDto) =>
    Api.post<unknown>(categoriesPath(storeId), body).then((response) =>
      normalizeOne(response.data),
    ),
  remove: (storeId: string, categoryId: string) =>
    Api.delete<void>(
      `${categoriesPath(storeId)}/${encodeURIComponent(categoryId)}`,
    ),
};