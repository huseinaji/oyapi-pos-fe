import { Api } from '../api';
import type {
  ApiUser,
  ChangePasswordDto,
  SignupDto,
  UpdateUserDto,
} from '../../types/api';

type UsersListResponse =
  ApiUser[] | { rows?: ApiUser[]; data?: ApiUser[] | { rows?: ApiUser[] } };

function unwrapUsers(response: UsersListResponse): ApiUser[] {
  if (Array.isArray(response)) return response;
  if (response.rows) return response.rows;
  if (Array.isArray(response.data)) return response.data;
  return response.data?.rows ?? [];
}

export const usersApi = {
  async list() {
    const response = await Api.get<UsersListResponse>('/api/v1/users');
    return unwrapUsers(response.data);
  },
  async findByUsername(username: string) {
    const response = await Api.get<UsersListResponse>('/api/v1/users', {
      params: { username },
    });
    const normalizedUsername = username.toLowerCase();
    return (
      unwrapUsers(response.data).find(
        (user) => user.username.toLowerCase() === normalizedUsername,
      ) ?? null
    );
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
