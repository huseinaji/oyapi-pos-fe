import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginDto } from '../../types/api';
import { createStore } from '../store-utils';
import { AuthApi } from '@/lib/auth/login-api';
import type { AuthMeUser } from '@/types/api';

export type AuthUser = AuthMeUser;

export function getAuthenticatedHomePath(user: AuthUser): string {
  if (!user.store) return '/select-store';
  return user.role === 'ADMIN' ? '/' : '/cashier-sessions';
}

type AuthState = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
};

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

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: AuthApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: LoginDto) => {
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
      await AuthApi.logout();
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
      store.setState({
        currentUser: null,
        isAuthenticated: false,
      });
      queryClient.setQueryData(authQueryKeys.me, null);
      window.location.href = '/login';
    },
  });
}
