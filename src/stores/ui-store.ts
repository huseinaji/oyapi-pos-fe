import { createStore } from '../lib/store-utils';

type UIState = {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setMobile: (mobile: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  initializeTheme: () => void;
};

const store = createStore<UIState>({
  sidebarOpen: false,
  sidebarCollapsed: false,
  isMobile: false,
  theme: 'light',

  toggleSidebar: () =>
    store.setState((s) => ({ sidebarOpen: !s.sidebarOpen })),

  collapseSidebar: () =>
    store.setState({ sidebarCollapsed: true, sidebarOpen: false }),

  expandSidebar: () =>
    store.setState({ sidebarCollapsed: false }),

  setMobile: (mobile) =>
    store.setState({ isMobile: mobile }),

  setTheme: (theme) => {
    store.setState({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('pos-theme', theme);
    }
  },

  initializeTheme: () => {
    if (typeof document === 'undefined') return;
    const saved = localStorage.getItem('pos-theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved ?? (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    store.setState({ theme });
  },
});

export const useUIStore = store.useStore;
export const uiStore = {
  setTheme: (theme: 'light' | 'dark') => store.getState().setTheme(theme),
  toggleSidebar: () => store.getState().toggleSidebar(),
};
