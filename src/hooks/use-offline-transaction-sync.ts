import { useEffect } from 'react';
import { toast } from 'sonner';
import { syncOfflineTransactions } from '../lib/transaction/offline-transaction-queue';

export function useOfflineTransactionSync(): void {
  useEffect(() => {
    const sync = async () => {
      const syncedCount = await syncOfflineTransactions();
      if (syncedCount > 0) {
        toast.success(`${syncedCount} offline transaction(s) synced`);
      }
    };

    void sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);
}
