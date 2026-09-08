import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache,
  setLogLevel,
  disableNetwork,
  enableNetwork
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { safeStorage } from "./safeStorage";

// Silence verbose Firebase SDK log noise on network/quota errors
try {
  setLogLevel("error");
} catch {
  // ignore
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

let firestoreQuotaExceededUntil: number = 0;

export function isFirestoreQuotaExceeded(): boolean {
  if (firestoreQuotaExceededUntil === 0) {
    try {
      const saved = safeStorage.getItem("guru_firestore_quota_until");
      if (saved) {
        firestoreQuotaExceededUntil = Number(saved) || 0;
      }
    } catch {
      // ignore
    }
  }
  return Date.now() < firestoreQuotaExceededUntil;
}

export function markFirestoreQuotaExceeded(durationMinutes = 120): void {
  firestoreQuotaExceededUntil = Date.now() + durationMinutes * 60 * 1000;
  try {
    safeStorage.setItem("guru_firestore_quota_until", String(firestoreQuotaExceededUntil));
  } catch {
    // ignore
  }
  try {
    if (db) {
      disableNetwork(db).catch(() => {});
    }
  } catch {
    // ignore
  }
}

export function clearFirestoreQuotaExceeded(): void {
  firestoreQuotaExceededUntil = 0;
  try {
    safeStorage.removeItem("guru_firestore_quota_until");
  } catch {
    // ignore
  }
  try {
    if (db) {
      enableNetwork(db).catch(() => {});
    }
  } catch {
    // ignore
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };

  const isQuotaErr = 
    errInfo.error.includes("resource-exhausted") || 
    errInfo.error.includes("Quota limit exceeded") || 
    errInfo.error.includes("quota") ||
    errInfo.error.includes("Quota exceeded");

  if (isQuotaErr) {
    markFirestoreQuotaExceeded(120);
    console.info(`[Firestore Quota Notice - ${operationType}] at ${path}: Kuota harian Firestore free tier tercapai. Aplikasi berjalan dalam mode penyimpanan lokal.`);
  } else {
    console.warn(`[Firestore Error - ${operationType}] at ${path}:`, errInfo.error);
  }

  return errInfo;
}

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with memory cache and firestoreDatabaseId
const dbId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-superappguru-d6d8d37d-7a79-4e4e-a3a7-8fb5ab409838";
let dbInstance;
try {
  const firestoreSettings = {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
  };
  if (dbId) {
    dbInstance = initializeFirestore(app, firestoreSettings, dbId);
  } else {
    dbInstance = initializeFirestore(app, firestoreSettings);
  }
} catch {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);

// Automatically disable Firestore network if quota is marked exceeded
if (isFirestoreQuotaExceeded()) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {
    // ignore
  }
}
