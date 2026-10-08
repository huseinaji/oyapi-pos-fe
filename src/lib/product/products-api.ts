import type {
  ApiItem,
  ApiItemResponse,
  CreateItemDto,
  ItemFilters,
  UpdateItemDto,
} from '#lib/product/product-types';
import { Api } from '../api';
import { fetchAllPages, type PaginatedResponse } from '../api/pagination';

function storeItemsPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/items`;
}

function normalizeItem(value: ApiItemResponse): ApiItem {
  const rawCategory = value.category;
  const categoryObject =
    rawCategory && typeof rawCategory === 'object' ? rawCategory : {};
  const categoryId =
    value.categoryId ??
    categoryObject.categoryId ??
    categoryObject.id ??
    categoryObject._id;
  const categoryName =
    typeof rawCategory === 'string'
      ? rawCategory
      : categoryObject.name ?? categoryObject.categoryName ?? value.categoryName ?? '';

  return {
    ...value,
    type: value.type ?? '',
    categoryId: categoryId == null ? undefined : String(categoryId),
    category: categoryName,
  };
}

export const productsApi = {
  list: async (storeId: string, filters: ItemFilters = {}) => {
    const response = await fetchAllPages((page, limit) =>
      Api.get<PaginatedResponse<ApiItemResponse>>(storeItemsPath(storeId), {
        params: { ...filters, page, limit },
      }).then((result) => result.data),
    );

    return {
      ...response,
      rows: response.rows.map(normalizeItem),
    };
  },
  get: (storeId: string, id: string) =>
    Api.get<ApiItemResponse>(`${storeItemsPath(storeId)}/${encodeURIComponent(id)}`).then(
      (response) => normalizeItem(response.data),
    ),
  create: (storeId: string, body: CreateItemDto) =>
    Api.post<ApiItemResponse>(storeItemsPath(storeId), body).then((response) =>
      normalizeItem(response.data),
    ),
  update: (storeId: string, id: string, body: UpdateItemDto) =>
    Api.patch<ApiItemResponse>(
      `${storeItemsPath(storeId)}/${encodeURIComponent(id)}`,
      body,
    ).then((response) => normalizeItem(response.data)),
  remove: (storeId: string, id: string) =>
    Api.delete<void>(`${storeItemsPath(storeId)}/${encodeURIComponent(id)}`),
};
