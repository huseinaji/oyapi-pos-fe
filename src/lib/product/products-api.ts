import { apiClient } from '../api-client';
import type {
  ApiItem,
  CreateItemDto,
  ItemListResponse,
  UpdateItemDto,
} from '../../types/api';

export const productsApi = {
  list: () => apiClient.get<ItemListResponse>('/api/v1/items'),
  get: (id: string) => apiClient.get<ApiItem>(`/api/v1/items/${id}`),
  create: (body: CreateItemDto) =>
    apiClient.post<ApiItem>('/api/v1/items', body),
  update: async (id: string, body: UpdateItemDto) => {
    const response = await apiClient.patch<ApiItem | { data: ApiItem }>(
      `/api/v1/items/${id}`,
      body,
    );
    return 'data' in response ? response.data : response;
  },
  remove: (id: string) => apiClient.delete<void>(`/api/v1/items/${id}`),
};
