import type {
  ApiItem,
  CreateItemDto,
  ItemFilters,
  SellableItemResponse,
  UpdateItemDto,
} from '@/lib/product/product-types';
import { Api } from '../api';
import { fetchAllPages, type PaginatedResponse } from '../api/pagination';

function storeItemsPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/items`;
}

function sellableItemsPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/transaction/sellable-item`;
}

export const productsApi = {
  listSellableItems: (storeId: string) =>
    Api.get<SellableItemResponse[]>(sellableItemsPath(storeId)).then(
      (response) => response.data,
    ),
  list: async (storeId: string, filters: ItemFilters = {}) => {
    return fetchAllPages((page, limit) =>
      Api.get<PaginatedResponse<ApiItem>>(storeItemsPath(storeId), {
        params: { ...filters, page, limit },
      }).then((result) => result.data),
    );
  },
  get: (storeId: string, id: string) =>
    Api.get<ApiItem>(
      `${storeItemsPath(storeId)}/${encodeURIComponent(id)}`,
    ).then((response) => response.data),
  create: (storeId: string, body: CreateItemDto) =>
    Api.post<ApiItem>(storeItemsPath(storeId), body).then(
      (response) => response.data,
    ),
  update: (storeId: string, id: string, body: UpdateItemDto) =>
    Api.patch<ApiItem>(
      `${storeItemsPath(storeId)}/${encodeURIComponent(id)}`,
      body,
    ).then((response) => response.data),
  remove: (storeId: string, id: string) =>
    Api.delete<void>(`${storeItemsPath(storeId)}/${encodeURIComponent(id)}`),
};
