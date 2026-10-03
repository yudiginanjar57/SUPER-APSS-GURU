import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache,
  setLogLevel
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { safeStorage } from "./safeStorage";

// Clean up any stale quota blocks from previous sessions
try {
  safeStorage.removeItem("guru_firestore_quota_until");
} catch {
  // ignore
}

// Silence verbose Firebase SDK internal log noise
try {
  setLogLevel("silent");
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

// Check if quota is currently exceeded (with brief transient backoff)
let firestoreQuotaExceededUntil = 0;

export function isFirestoreQuotaExceeded(): boolean {
  return firestoreQuotaExceededUntil > 0 && Date.now() < firestoreQuotaExceededUntil;
}

export function markFirestoreQuotaExceeded(durationMinutes = 5): void {
  firestoreQuotaExceededUntil = Date.now() + durationMinutes * 60 * 1000;
}

export function clearFirestoreQuotaExceeded(): void {
  firestoreQuotaExceededUntil = 0;
  try {
    safeStorage.removeItem("guru_firestore_quota_until");
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
    errInfo.error.includes("Quota exceeded") ||
    errInfo.error.includes("quota");

  if (isQuotaErr) {
    markFirestoreQuotaExceeded(30);
    console.warn(`[Firestore Quota Notice - ${operationType}] at ${path}: Kuota harian Firestore free tier tercapai.`);
  } else {
    console.warn(`[Firestore Notice - ${operationType}] at ${path}:`, errInfo.error);
  }

  return errInfo;
}

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with memory cache and specific database ID
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
