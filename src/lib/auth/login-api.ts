import { Api } from "#lib/api/index";
import type { AuthUser } from "#lib/auth/auth-store";
import type { LoginDto } from "@/types/api";

export const AuthApi = {
  login: (dto: LoginDto) => Api.post('/api/v1/auth/login', dto),
  getCsrfToken: () => Api.get('/api/v1/auth/csrf'),
  me: () => Api.get<AuthUser>('/api/v1/auth/me').then(m => m.data),
}