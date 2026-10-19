
import type { ApiUser, UpdateUserDto } from '@/types/api';
import { usersApi } from './users-api';
import { createStore } from '@/lib/store-utils';

type UserState = {
  users: ApiUser[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateUser: (id: string, dto: UpdateUserDto) => Promise<ApiUser>;
  deleteUser: (id: string) => Promise<void>;
};
const store = createStore<UserState>({
  users: [],
  isLoading: true,
  error: null,
  async fetchUsers() {
    store.setState({ isLoading: true, error: null });
    try {
      store.setState({ users: await usersApi.list(), isLoading: false });
    } catch (error) {
      store.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load users',
      });
    }
  },
  async updateUser(id, dto) {
    const user = await usersApi.update(id, dto);
    store.setState({
      users: store
        .getState()
        .users.map((current) => (current.id === id ? user : current)),
    });
    return user;
  },
  async deleteUser(id) {
    await usersApi.remove(id);
    store.setState({
      users: store.getState().users.filter((user) => user.id !== id),
    });
  },
});
export const useUserStore = store.useStore;
export const userStore = {
  fetchUsers: () => store.getState().fetchUsers(),
  updateUser: (id: string, dto: UpdateUserDto) =>
    store.getState().updateUser(id, dto),
  deleteUser: (id: string) => store.getState().deleteUser(id),
};
