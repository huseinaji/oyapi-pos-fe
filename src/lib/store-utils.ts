import { create, type StoreApi, type UseBoundStore } from 'zustand';

export type ZustandStore<T extends object> = UseBoundStore<StoreApi<T>>;

export function createStore<T extends object>(
  initial: T,
): {
  getState: ZustandStore<T>['getState'];
  setState: ZustandStore<T>['setState'];
  useStore: ZustandStore<T>;
} {
  const useStore = create<T>()(() => initial);

  return {
    getState: useStore.getState,
    setState: useStore.setState,
    useStore,
  };
}
