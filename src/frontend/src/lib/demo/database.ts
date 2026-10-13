import {
  User,
  Ingredient,
  RecipeVersion,
  MediaAsset,
  AiCandidate,
  DocumentDraft,
  PublishedDocument,
  AuditEntry,
  DemoSettings,
  DemoError,
} from './types';
import {
  SEED_USERS,
  SEED_INGREDIENTS,
  getSeedMedia,
  SEED_RECIPES,
  SEED_DOCUMENT_DRAFTS,
  SEED_SETTINGS,
  SEED_AUDIT_LOGS,
} from './seed';

const DB_NAME = 'recipehub_demo_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
  initPromise = promise;

  if (typeof window === 'undefined' || !window.indexedDB) {
    reject(new DemoError('StorageUnavailable', 'Môi trường hiện tại không hỗ trợ IndexedDB'));
    return initPromise;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;

    if (!db.objectStoreNames.contains('users')) {
      const store = db.createObjectStore('users', { keyPath: 'id' });
      store.createIndex('email', 'email', { unique: true });
    }

    if (!db.objectStoreNames.contains('ingredients')) {
      const store = db.createObjectStore('ingredients', { keyPath: 'id' });
      store.createIndex('code', 'code', { unique: true });
      store.createIndex('group', 'group', { unique: false });
    }

    if (!db.objectStoreNames.contains('recipes')) {
      const store = db.createObjectStore('recipes', { keyPath: 'id' });
      store.createIndex('recipeId', 'recipeId', { unique: false });
      store.createIndex('code', 'code', { unique: false });
      store.createIndex('status', 'status', { unique: false });
    }

    if (!db.objectStoreNames.contains('media')) {
      const store = db.createObjectStore('media', { keyPath: 'id' });
      store.createIndex('state', 'state', { unique: false });
      store.createIndex('source', 'source', { unique: false });
    }

    if (!db.objectStoreNames.contains('aiCandidates')) {
      const store = db.createObjectStore('aiCandidates', { keyPath: 'id' });
      store.createIndex('stepId', 'stepId', { unique: false });
    }

    if (!db.objectStoreNames.contains('documentDrafts')) {
      const store = db.createObjectStore('documentDrafts', { keyPath: 'id' });
      store.createIndex('sourceVersionId', 'sourceVersionId', { unique: true });
    }

    if (!db.objectStoreNames.contains('publishedDocuments')) {
      const store = db.createObjectStore('publishedDocuments', { keyPath: 'id' });
      store.createIndex('sourceVersionId', 'sourceVersionId', { unique: false });
      store.createIndex('recipeCode', 'recipeCode', { unique: false });
    }

    if (!db.objectStoreNames.contains('auditLogs')) {
      const store = db.createObjectStore('auditLogs', { keyPath: 'id' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('actorEmail', 'actorEmail', { unique: false });
    }

    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }
  };

  request.onsuccess = async (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    dbInstance = db;

    try {
      await ensureSeeded(db);
      resolve(db);
    } catch (err) {
      reject(err);
    }
  };

  request.onerror = () => {
    reject(new DemoError('StorageUnavailable', 'Không thể mở IndexedDB. Vui lòng kiểm tra quyền lưu trữ trình duyệt.'));
  };

  return initPromise;
}

async function ensureSeeded(db: IDBDatabase): Promise<void> {
  const userCount = await countRecords(db, 'users');
  if (userCount > 0) {
    return; // Already seeded, do not overwrite user data across refresh
  }

  await seedDatabase(db);
}

export async function seedDatabase(db: IDBDatabase): Promise<void> {
  const stores = ['users', 'ingredients', 'recipes', 'media', 'documentDrafts', 'settings', 'auditLogs'];
  const tx = db.transaction(stores, 'readwrite');

  const userStore = tx.objectStore('users');
  for (const u of SEED_USERS) {
    userStore.put(u);
  }

  const ingStore = tx.objectStore('ingredients');
  for (const ing of SEED_INGREDIENTS) {
    ingStore.put(ing);
  }

  const mediaStore = tx.objectStore('media');
  for (const m of getSeedMedia()) {
    mediaStore.put(m);
  }

  const recipeStore = tx.objectStore('recipes');
  for (const r of SEED_RECIPES) {
    recipeStore.put(r);
  }

  const draftStore = tx.objectStore('documentDrafts');
  for (const d of SEED_DOCUMENT_DRAFTS) {
    draftStore.put(d);
  }

  const settingsStore = tx.objectStore('settings');
  settingsStore.put({ key: 'main', ...SEED_SETTINGS });

  const auditStore = tx.objectStore('auditLogs');
  for (const a of SEED_AUDIT_LOGS) {
    auditStore.put(a);
  }

  const { promise, resolve, reject } = Promise.withResolvers<void>();
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(new Error('Seed transaction aborted'));
  return promise;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  const stores = [
    'users',
    'ingredients',
    'recipes',
    'media',
    'aiCandidates',
    'documentDrafts',
    'publishedDocuments',
    'auditLogs',
    'settings',
  ];

  const tx = db.transaction(stores, 'readwrite');
  for (const storeName of stores) {
    tx.objectStore(storeName).clear();
  }

  const { promise, resolve, reject } = Promise.withResolvers<void>();
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  await promise;

  await seedDatabase(db);
}

function countRecords(db: IDBDatabase, storeName: string): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).count();
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
  return promise;
}

export function getAll<T>(storeName: string): Promise<T[]> {
  return getDb().then((db) => {
    const { promise, resolve, reject } = Promise.withResolvers<T[]>();
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
    return promise;
  });
}

export function getById<T>(storeName: string, id: string): Promise<T | null> {
  return getDb().then((db) => {
    const { promise, resolve, reject } = Promise.withResolvers<T | null>();
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
    return promise;
  });
}

export function putRecord<T>(storeName: string, record: T): Promise<void> {
  return getDb().then((db) => {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    return promise;
  });
}

export function deleteRecord(storeName: string, id: string): Promise<void> {
  return getDb().then((db) => {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    return promise;
  });
}
