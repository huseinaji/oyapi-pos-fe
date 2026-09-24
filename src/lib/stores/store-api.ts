import { Api } from '#lib/api/index';
import type { ApiStore, CreateStoreDto, MyStoreResponse } from './store-types';

export const StoreApi = {
  myStores: () => Api.get<MyStoreResponse>('/api/v1/store/my-store').then(m => m.data),
  select: (id: string) => Api.post<void>(`/api/v1/store/${id}/select`),
  create: (body: CreateStoreDto) => Api.post<ApiStore>('/api/v1/store', body).then(m => m.data),
};
