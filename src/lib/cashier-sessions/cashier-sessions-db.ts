import type {
  CashierOperator,
  CashierSession,
  CashierStockSnapshot,
} from './cashier-sessions-types';
export type {
  CashierOperator,
  CashierSession,
  CashierSessionStatus,
  CashierStockSnapshot,
} from './cashier-sessions-types';

const DATABASE_NAME = 'pos-cashier-documents';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'sessions';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
        request.result.createObjectStore(OBJECT_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listCashierSessions(
  storeId: string,
): Promise<CashierSession[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(OBJECT_STORE, 'readonly')
      .objectStore(OBJECT_STORE)
      .getAll();
    request.onsuccess = () => {
      database.close();
      resolve(
        (request.result as CashierSession[])
          .filter((session) => session.storeId === storeId)
          .sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
      );
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function openCashierSession(input: {
  storeId: string;
  openedBy: CashierOperator;
  openingStock: CashierStockSnapshot[];
}): Promise<CashierSession> {
  const database = await openDatabase();
  const session: CashierSession = {
    id: createSessionId(),
    storeId: input.storeId,
    status: 'OPEN',
    openedAt: new Date().toISOString(),
    openedBy: input.openedBy,
    participants: [input.openedBy],
    openingStock: input.openingStock,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    const objectStore = transaction.objectStore(OBJECT_STORE);
    const request = objectStore.getAll();
    let failure: Error | undefined;

    request.onsuccess = () => {
      const hasOpenSession = (request.result as CashierSession[]).some(
        (existing) =>
          existing.storeId === input.storeId && existing.status === 'OPEN',
      );
      if (hasOpenSession) {
        failure = new Error('A cashier session is already open for this store.');
        transaction.abort();
        return;
      }
      objectStore.add(session);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(session);
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error ?? new Error('Unable to open cashier session.'));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Unable to open cashier session.'));
    };
  });
}

export async function closeCashierSession(input: {
  sessionId: string;
  storeId: string;
  closedBy: CashierOperator;
  closingStock: CashierStockSnapshot[];
  closedAt?: string;
}): Promise<CashierSession> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    const objectStore = transaction.objectStore(OBJECT_STORE);
    const request = objectStore.get(input.sessionId);
    let updatedSession: CashierSession | undefined;
    let failure: Error | undefined;

    request.onsuccess = () => {
      const session = request.result as CashierSession | undefined;
      if (!session || session.storeId !== input.storeId || session.status !== 'OPEN') {
        failure = new Error('This cashier session is not open.');
        transaction.abort();
        return;
      }
      updatedSession = {
        ...session,
        status: 'CLOSED',
        closedAt: input.closedAt ?? new Date().toISOString(),
        closedBy: input.closedBy,
        closingStock: input.closingStock,
      };
      objectStore.put(updatedSession);
    };
    transaction.oncomplete = () => {
      database.close();
      if (updatedSession) resolve(updatedSession);
      else reject(new Error('Unable to close cashier session.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error ?? new Error('Unable to close cashier session.'));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Unable to close cashier session.'));
    };
  });
}

export async function joinCashierSession(input: {
  sessionId: string;
  storeId: string;
  participant: CashierOperator;
}): Promise<CashierSession> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite');
    const objectStore = transaction.objectStore(OBJECT_STORE);
    const request = objectStore.get(input.sessionId);
    let updatedSession: CashierSession | undefined;
    let failure: Error | undefined;

    request.onsuccess = () => {
      const session = request.result as CashierSession | undefined;
      if (!session || session.storeId !== input.storeId || session.status !== 'OPEN') {
        failure = new Error('This cashier session is not open.');
        transaction.abort();
        return;
      }
      const participants = session.participants ?? [session.openedBy];
      updatedSession = participants.some(
        (participant) => participant.userId === input.participant.userId,
      )
        ? { ...session, participants }
        : { ...session, participants: [...participants, input.participant] };
      objectStore.put(updatedSession);
    };
    transaction.oncomplete = () => {
      database.close();
      if (updatedSession) resolve(updatedSession);
      else reject(new Error('Unable to join cashier session.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error ?? new Error('Unable to join cashier session.'));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Unable to join cashier session.'));
    };
  });
}