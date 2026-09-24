import { apiClient } from '../api-client';
import type {
  ApiUser,
  ChangePasswordDto,
  SignupDto,
  UpdateUserDto,
} from '../../types/api';

export const usersApi = {
  async list() {
    const response = await apiClient.get<
      ApiUser[] | { rows?: ApiUser[]; data?: ApiUser[] }
    >('/api/v1/users');
    return Array.isArray(response)
      ? response
      : (response.rows ?? response.data ?? []);
  },
  get: (id: string) => apiClient.get<ApiUser>(`/api/v1/users/${id}`),
  update: async (id: string, body: UpdateUserDto) => {
    const response = await apiClient.patch<ApiUser | { data: ApiUser }>(
      `/api/v1/users/${id}`,
      body,
    );
    return 'data' in response ? response.data : response;
  },
  remove: (id: string) => apiClient.delete<void>(`/api/v1/users/${id}`),
  register: (body: SignupDto) =>
    apiClient.post<ApiUser>('/api/v1/auth/register', body),
  changePassword: (id: string, body: ChangePasswordDto) =>
    apiClient.patch<ApiUser>(`/api/v1/users/${id}`, {
      password: body.newPassword,
    }),
};
