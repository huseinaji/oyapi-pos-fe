import type { StoreSettings } from '../types/inde';
import { createStore } from '../lib/store-utils';
export const defaultSettings: StoreSettings = {
  storeName: 'POS Studio',
  ownerName: '',
  address: '',
  phone: '',
  email: '',
  invoicePrefix: 'INV',
  taxRate: 11,
  currency: 'IDR',
  logoUrl: '',
  thankYouMessage: 'Thank you for your purchase!',
};
type SettingsState = {
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => void;
  resetSettings: () => void;
};
const store = createStore<SettingsState>({
  settings: { ...defaultSettings },
  updateSettings: (updates) =>
    store.setState((state) => ({
      settings: { ...state.settings, ...updates },
    })),
  resetSettings: () => store.setState({ settings: { ...defaultSettings } }),
});
export const useSettingsStore = store.useStore;
