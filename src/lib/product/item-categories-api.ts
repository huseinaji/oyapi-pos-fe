import { Api } from '../api';
import type {
  CreateStoreItemCategoryDto,
  StoreItemCategoryListResponse,
  StoreItemCategory,
} from './product-types';
import { fetchAllPages } from '../api/pagination';

function categoriesPath(storeId: string): string {
  return `/api/v1/store/${encodeURIComponent(storeId)}/items/categories`;
}

export const itemCategoriesApi = {
  list: (storeId: string) =>
    fetchAllPages((page, limit) =>
      Api.get<StoreItemCategoryListResponse>(categoriesPath(storeId), {
        params: { page, limit },
      }).then((response) => response.data),
    ),
  create: (storeId: string, body: CreateStoreItemCategoryDto) =>
    Api.post<StoreItemCategory>(categoriesPath(storeId), body).then(
      (response) => response.data,
    ),
  remove: (storeId: string, categoryId: string) =>
    Api.delete<void>(
      `${categoriesPath(storeId)}/${encodeURIComponent(categoryId)}`,
    ),
};
