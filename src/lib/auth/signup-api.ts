import type { ApiUserStatus } from '@/types/api';
import { Api } from '../api';

export type SignupDto = {
  username: string;
  email: string;
  password: string;
};

type SignupRes = {
  id: string;
  username: string;
  email: string;
  role: string;
  status: ApiUserStatus;
  createdAt: string;
};

export const SignupApi = {
  signup: (dto: SignupDto) =>
    Api.post<SignupRes>('/api/v1/auth/register', dto).then((res) => res.data),
};
