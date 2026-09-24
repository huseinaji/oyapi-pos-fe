import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, clearSession } from '../api-client';
import type { ApiUser, ApiUserRole, ApiUserStatus, LoginDto } from '../../types/api';
import { createStore } from '../store-utils';
import { Api } from '#lib/api/index';
import { AuthApi } from '#lib/auth/login-api';
import type { StorePayload } from '#lib/stores/store-types';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  store?: StorePayload;
};

/** GET /api/v1/auth/me — response */
type UserPayload = {
  sub: string;
  username: string;
  email: string;
  role: ApiUserRole;
  status: ApiUserStatus;
  store?: StorePayload
}

export type AuthMeResponse = {
  userPayload: UserPayload;
  rememberMe: boolean;
};

type AuthState = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
};

function mapUser(me: AuthMeResponse): AuthUser {
  const userPayload = me.userPayload;
  return {
    id: userPayload.sub,
    username: userPayload.username,
    email: userPayload.email,
    role: userPayload.role,
    status: userPayload.status,
    store: userPayload.store,
  };
}

const store = createStore<AuthState>({
  currentUser: null,
  isAuthenticated: false,
  setUser: (user) =>
    store.setState({
      currentUser: user,
      isAuthenticated: Boolean(user),
    }),
});

export const useAuthStore = store.useStore;

export const authQueryKeys = {
  me: ['auth', 'me'],
} as const;

export async function fetchMe(): Promise<AuthUser> {
  const me = await Api.get('/api/v1/auth/me');
  return mapUser(me.data);
}

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      await AuthApi.getCsrfToken();
      await AuthApi.login(dto);

      const user = await AuthApi.me();
      return user;
    },
    onSuccess: (user) => {
      store.setState({
        currentUser: user,
        isAuthenticated: true,
      });
      queryClient.setQueryData(authQueryKeys.me, user);
    },
    onError: () => {
      store.setState({
        currentUser: null,
        isAuthenticated: false,
      });
      queryClient.setQueryData(authQueryKeys.me, null);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post('/api/v1/auth/logout');
      } finally {
        clearSession();
      }
    },
    onSuccess: () => {
      store.setState({
        currentUser: null,
        isAuthenticated: false,
      });
      queryClient.setQueryData(authQueryKeys.me, null);
      queryClient.removeQueries({ queryKey: authQueryKeys.me, exact: true });
      window.location.href = '/login';
    },
    onError: () => {
      clearSession();
      store.setState({
        currentUser: null,
        isAuthenticated: false,
      });
      queryClient.setQueryData(authQueryKeys.me, null);
      window.location.href = '/login';
    },
  });
}

export const authStore = {
  setUser: (user: ApiUser | null) => store.getState().setUser(
    user
      ? {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      }
      : null,
  ),
};
