import { Api } from '@/lib/api/index';
import type {
  ApiStore,
  AssignStoreMemberDto,
  CreateStoreDto,
  DisableStoreMemberDto,
  EditStoreMemberDto,
  MyStoreResponse,
  StoreMemberListResponse,
} from './store-types';

export const StoreApi = {
  myStores: () =>
    Api.get<MyStoreResponse>('/api/v1/store/my-store').then(
      (response) => response.data,
    ),
  select: (id: string) =>
    Api.post<void>(`/api/v1/store/${encodeURIComponent(id)}/select`).then(
      (response) => response.data,
    ),
  getById: (id: string) =>
    Api.get<ApiStore>(`/api/v1/store/${encodeURIComponent(id)}`).then(
      (response) => response.data,
    ),
  members: (storeId: string) =>
    Api.get<StoreMemberListResponse>(
      `/api/v1/store/${encodeURIComponent(storeId)}/members`,
    ).then((response) => response.data),
  assignMember: (storeId: string, body: AssignStoreMemberDto) =>
    Api.post<void>(
      `/api/v1/store/${encodeURIComponent(storeId)}/assign`,
      body,
    ).then((response) => response.data),
  editMember: (
    storeId: string,
    memberId: string,
    body: EditStoreMemberDto,
  ) =>
    Api.patch<void>(
      `/api/v1/store/${encodeURIComponent(storeId)}/members/${encodeURIComponent(memberId)}`,
      body,
    ).then((response) => response.data),
  disableMember: (storeId: string, body: DisableStoreMemberDto) =>
    Api.post<void>(
      `/api/v1/store/${encodeURIComponent(storeId)}/disable`,
      body,
    ).then((response) => response.data),
  create: (body: CreateStoreDto) =>
    Api.post<ApiStore>('/api/v1/store', body).then((m) => m.data),
};
