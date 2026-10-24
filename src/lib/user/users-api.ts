import { Api } from '../api';
import type {
  ApiUser,
  ChangePasswordDto,
  SignupDto,
  UpdateUserDto,
  UserListResponse,
} from '../../types/api';

export const usersApi = {
  list: () =>
    Api.get<UserListResponse>('/api/v1/users').then(
      (response) => response.data,
    ),
  async findByUsername(username: string) {
    const response = await Api.get<UserListResponse>('/api/v1/users', {
      params: { username },
    });
    const normalizedUsername = username.toLowerCase();
    return (
      response.data.rows.find(
        (user) => user.username.toLowerCase() === normalizedUsername,
      ) ?? null
    );
  },
  get: (id: string) =>
    Api.get<ApiUser>(`/api/v1/users/${id}`).then((response) => response.data),
  update: (id: string, body: UpdateUserDto) =>
    Api.patch<ApiUser>(`/api/v1/users/${id}`, body).then(
      (response) => response.data,
    ),
  remove: (id: string) => Api.delete<void>(`/api/v1/users/${id}`),
  register: (body: SignupDto) =>
    Api.post<ApiUser>('/api/v1/auth/register', body).then(
      (response) => response.data,
    ),
  changePassword: (id: string, body: ChangePasswordDto) =>
    Api.patch<ApiUser>(`/api/v1/users/${id}`, {
      password: body.newPassword,
    }).then((response) => response.data),
};
