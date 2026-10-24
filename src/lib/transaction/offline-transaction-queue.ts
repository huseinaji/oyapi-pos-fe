import type { CreatePOSTransactionDto } from './transaction-types';
import { transactionsApi } from './transactions-api';

const DATABASE_NAME = 'pos-offline';
const DATABASE_VERSION = 1;
const STORE_NAME = 'transaction-queue';

type QueuedTransaction = {
  localId: string;
  storeId?: string;
  payload: CreatePOSTransactionDto & { storeId?: string };
  createdAt: string;
};

function createLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'localId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineTransaction(
  storeId: string,
  payload: CreatePOSTransactionDto,
): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }

  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      localId: createLocalId(),
      storeId,
      payload,
      createdAt: new Date().toISOString(),
    } satisfies QueuedTransaction);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function syncOfflineTransactions(): Promise<number> {
  if (typeof indexedDB === 'undefined' || !navigator.onLine) return 0;

  const database = await openDatabase();
  const queuedTransactions = await new Promise<QueuedTransaction[]>(
    (resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result as QueuedTransaction[]);
      request.onerror = () => reject(request.error);
    },
  );
  database.close();

  let syncedCount = 0;
  for (const queuedTransaction of queuedTransactions) {
    try {
      const storeId =
        queuedTransaction.storeId ?? queuedTransaction.payload.storeId;
      if (!storeId) break;
      const payload: CreatePOSTransactionDto = {
        customer: queuedTransaction.payload.customer,
        paymentMethod: queuedTransaction.payload.paymentMethod,
        items: queuedTransaction.payload.items.map(({ itemId, qty }) => ({
          itemId,
          qty,
        })),
      };
      await transactionsApi.create(storeId, payload);
      const deleteDatabase = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = deleteDatabase.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(queuedTransaction.localId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      deleteDatabase.close();
      syncedCount += 1;
    } catch {
      // Keep failed entries for the next online event or manual retry.
      break;
    }
  }

  return syncedCount;
}

export function isNetworkError(error: unknown): boolean {
  return (
    !navigator.onLine ||
    (error instanceof TypeError &&
      error.message.toLowerCase().includes('fetch'))
  );
}
