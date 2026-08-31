// Safe Storage with IndexedDB backing and QuotaExceededError protection

const memoryCache = new Map<string, string>();

// IndexedDB Helper
const DB_NAME = "EduAsistenDB";
const STORE_NAME = "keyval_store";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => {
          console.warn("IndexedDB open error:", e);
          resolve(null);
        };
      } catch (err) {
        console.warn("IndexedDB initialization error:", err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function idbSet(key: string, val: string): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn("idbSet failed:", err);
  }
}

export async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // ignore
  }
}

// Pruning strategy when LocalStorage quota is exceeded
function pruneLocalStorageQuota() {
  try {
    const nonEssentialKeys = [
      "guru_sync_logs",
      "eduasisten_history",
      "guru_temp_cache"
    ];
    for (const key of nonEssentialKeys) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined") return null;
      const val = localStorage.getItem(key);
      if (val !== null) {
        memoryCache.set(key, val);
        return val;
      }
      return memoryCache.get(key) || null;
    } catch {
      return memoryCache.get(key) || null;
    }
  },

  getJSON: <T>(key: string, fallback: T): T => {
    try {
      const raw = safeStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setItem: (key: string, value: any): boolean => {
    if (typeof window === "undefined") return false;
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    
    // Always update in-memory cache
    memoryCache.set(key, stringValue);

    // Save to IndexedDB asynchronously as durable unlimited storage
    idbSet(key, stringValue).catch(() => {});

    try {
      localStorage.setItem(key, stringValue);
      return true;
    } catch (err: any) {
      console.warn(`[SafeStorage] localStorage quota exceeded on key "${key}". Saving to IndexedDB & Memory.`, err);
      
      // Attempt quota recovery
      try {
        pruneLocalStorageQuota();
        localStorage.setItem(key, stringValue);
        return true;
      } catch {
        // LocalStorage is full, but memoryCache + IndexedDB have the data safely.
        return false;
      }
    }
  },

  removeItem: (key: string): void => {
    memoryCache.delete(key);
    idbRemove(key).catch(() => {});
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },

  clearAllData: () => {
    memoryCache.clear();
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
    } catch {
      // ignore
    }
  }
};
