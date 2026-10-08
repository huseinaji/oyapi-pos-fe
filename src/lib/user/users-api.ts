import { Api } from '../api';
import type {
  ApiUser,
  ChangePasswordDto,
  SignupDto,
  UpdateUserDto,
} from '../../types/api';

export const usersApi = {
  async list() {
    const response = await Api.get<
      ApiUser[] | { rows?: ApiUser[]; data?: ApiUser[] }
    >('/api/v1/users');
    return Array.isArray(response.data)
      ? response.data
      : (response.data.rows ?? response.data.data ?? []);
  },
  get: (id: string) => Api.get<ApiUser>(`/api/v1/users/${id}`).then((response) => response.data),
  update: async (id: string, body: UpdateUserDto) => {
    const response = await Api.patch<ApiUser | { data: ApiUser }>(
      `/api/v1/users/${id}`,
      body,
    );
    return 'data' in response.data ? response.data.data : response.data;
  },
  remove: (id: string) => Api.delete<void>(`/api/v1/users/${id}`),
  register: (body: SignupDto) =>
    Api.post<ApiUser>('/api/v1/auth/register', body).then((response) => response.data),
  changePassword: (id: string, body: ChangePasswordDto) =>
    Api.patch<ApiUser>(`/api/v1/users/${id}`, {
      password: body.newPassword,
    }).then((response) => response.data),
};
