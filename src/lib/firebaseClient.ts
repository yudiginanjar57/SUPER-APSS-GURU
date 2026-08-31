import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

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
  console.warn(`[Firestore Error - ${operationType}] at ${path}:`, errInfo.error);
  return errInfo;
}

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with memory cache and firestoreDatabaseId
const dbId = (firebaseConfig as any).firestoreDatabaseId;
let dbInstance;
try {
  if (dbId) {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, dbId);
  } else {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  }
} catch {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
