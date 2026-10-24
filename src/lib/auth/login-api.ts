import { Api } from '@/lib/api/index';
import type { AuthUser } from '@/lib/auth/auth-store';
import type {
  AuthMeResponse,
  LoginDto,
  LoginResponse,
  LogoutResponse,
} from '@/types/api';

export const AuthApi = {
  login: (dto: LoginDto) =>
    Api.post<LoginResponse>('/api/v1/auth/login', dto).then((res) => res.data),
  me: async (): Promise<AuthUser> => {
    const response = await Api.get<AuthMeResponse>('/api/v1/auth/me');
    return response.data.userPayload;
  },
  logout: () =>
    Api.post<LogoutResponse>('/api/v1/auth/logout').then((res) => res.data),
};
