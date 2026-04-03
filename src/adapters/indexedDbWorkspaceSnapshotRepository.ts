import type {
  PersistedWorkspaceSnapshot,
  WorkspaceSnapshotRepository,
} from '../features/workspace/workspacePersistence';

const databaseName = 'llm-todo';
const databaseVersion = 1;
const storeName = 'workspaceSnapshots';
const snapshotKey = 'primary-workspace';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPersistedWorkspaceSnapshot(value: unknown): value is PersistedWorkspaceSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.noteTitle === 'string' &&
    typeof value.noteText === 'string' &&
    Array.isArray(value.blocks) &&
    Array.isArray(value.interpretations) &&
    Array.isArray(value.checkedTodoIds)
  );
}

function getIndexedDbFactory(): IDBFactory | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!('indexedDB' in window)) {
    return null;
  }

  return window.indexedDB;
}

function openDatabase(): Promise<IDBDatabase | null> {
  const factory = getIndexedDbFactory();

  if (factory === null) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion);

    request.onerror = () => {
      reject(request.error);
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runReadonlyGet(
  database: IDBDatabase,
): Promise<PersistedWorkspaceSnapshot | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(snapshotKey);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const result = request.result;

      if (isPersistedWorkspaceSnapshot(result)) {
        resolve(result);
        return;
      }

      resolve(null);
    };
  });
}

function runReadwritePut(
  database: IDBDatabase,
  snapshot: PersistedWorkspaceSnapshot,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      resolve();
    };

    store.put(snapshot, snapshotKey);
  });
}

export class IndexedDbWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  async load(): Promise<PersistedWorkspaceSnapshot | null> {
    const database = await openDatabase().catch(() => null);

    if (database === null) {
      return null;
    }

    try {
      return await runReadonlyGet(database);
    } finally {
      database.close();
    }
  }

  async save(snapshot: PersistedWorkspaceSnapshot): Promise<void> {
    const database = await openDatabase();

    if (database === null) {
      return;
    }

    try {
      await runReadwritePut(database, snapshot);
    } finally {
      database.close();
    }
  }
}

export const indexedDbWorkspaceSnapshotRepository = new IndexedDbWorkspaceSnapshotRepository();
