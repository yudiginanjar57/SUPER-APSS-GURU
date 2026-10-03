import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  deleteDoc,
  onSnapshot, 
  Unsubscribe 
} from "firebase/firestore";
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
  clearFirestoreQuotaExceeded
} from "./firebaseClient";
export {
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
  clearFirestoreQuotaExceeded
};
import QRCode from "qrcode";
import { safeStorage } from "./safeStorage";
import { 
  Student, 
  Attendance, 
  ScheduleItem, 
  Assignment, 
  Submission, 
  StudentGrade, 
  JournalEntry, 
  HomeroomNote, 
  HomeVisitReport,
  LearningMaterial,
  QuestionBankItem
} from "../types";

export interface GuruSyncPayload {
  syncKey?: string;
  teacherName: string;
  nip: string;
  subject: string;
  institution: string;
  currentMonth: string;
  currentWeek: string;
  profilePhoto: string;
  homeroomClass: string;
  headmasterName?: string;
  headmasterNip?: string;
  headmasterRank?: string;
  documentCity?: string;
  schoolNpsn?: string;
  academicYear?: string;
  classList: string[];
  students: Student[];
  attendanceList: Attendance[];
  grades: StudentGrade[];
  schedule: ScheduleItem[];
  assignments: Assignment[];
  submissions: Submission[];
  journals: JournalEntry[];
  homeroomNotes: HomeroomNote[];
  homeVisits: HomeVisitReport[];
  materials?: LearningMaterial[];
  bankQuestions?: QuestionBankItem[];
  eduasistenSessions?: any[];
  savedModules?: any[];
  lastUpdated: number;
  updatedBy: string;
  _isChunked?: boolean;
  _totalChunks?: number;
  _totalSize?: number;
}

export function getDeviceLabel(): string {
  if (typeof window === "undefined" || !window.navigator) return "Perangkat";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "HP Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Windows/i.test(ua)) return "Laptop Windows";
  if (/Mac/i.test(ua)) return "MacBook / Mac";
  if (/Linux/i.test(ua)) return "Komputer Linux";
  return "Perangkat Guru";
}

// Clean payload to ensure no `undefined` values that Firestore rejects
function sanitizePayload(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  if (typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizePayload(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Firestore single document hard limit is 1,048,576 bytes (1 MiB).
// By splitting large data into ~500 KB chunks stored in a subcollection,
// we can support backups and sync payloads up to 50 MB or more without limit.
const CHUNK_CHAR_SIZE = 500_000; // ~500 KB per chunk

async function saveLargePayloadToFirestore(
  collectionName: string,
  docId: string,
  payload: any,
  metaExtra: Record<string, any> = {}
): Promise<{ totalSize: number; isChunked: boolean }> {
  const docRef = doc(db, collectionName, docId);
  const jsonStr = JSON.stringify(payload);
  const totalBytes = new Blob([jsonStr]).size;

  // If payload fits safely in a single document (< 600 KB)
  if (totalBytes <= 600_000) {
    try {
      const chunksColl = collection(db, collectionName, docId, "chunks");
      const existingChunks = await getDocs(chunksColl);
      if (!existingChunks.empty) {
        for (const cDoc of existingChunks.docs) {
          await deleteDoc(cDoc.ref);
        }
      }
    } catch {
      // ignore
    }

    await setDoc(docRef, {
      ...payload,
      ...metaExtra,
      _isChunked: false,
      _totalSize: totalBytes
    });

    return { totalSize: totalBytes, isChunked: false };
  }

  // If payload is large (> 600 KB, e.g. 1MB - 50MB):
  // Split into chunks of 500,000 chars and store in subcollection "chunks"
  const chunks: string[] = [];
  for (let i = 0; i < jsonStr.length; i += CHUNK_CHAR_SIZE) {
    chunks.push(jsonStr.substring(i, i + CHUNK_CHAR_SIZE));
  }

  // Clean excess old chunk docs if previous save had more chunks
  try {
    const chunksColl = collection(db, collectionName, docId, "chunks");
    const existingChunks = await getDocs(chunksColl);
    for (const cDoc of existingChunks.docs) {
      const idx = Number(cDoc.id);
      if (isNaN(idx) || idx >= chunks.length) {
        await deleteDoc(cDoc.ref);
      }
    }
  } catch {
    // ignore
  }

  // Write new chunks in parallel
  await Promise.all(
    chunks.map((chunkData, index) =>
      setDoc(doc(db, collectionName, docId, "chunks", String(index)), {
        index,
        data: chunkData
      })
    )
  );

  // Write root metadata document (only ~1-2 KB, comfortably within Firestore limit)
  await setDoc(docRef, {
    ...metaExtra,
    _isChunked: true,
    _totalChunks: chunks.length,
    _chunkSize: CHUNK_CHAR_SIZE,
    _totalSize: totalBytes,
    syncKey: payload.syncKey || metaExtra.syncKey,
    lastUpdated: payload.lastUpdated || metaExtra.lastUpdated || Date.now(),
    updatedBy: payload.updatedBy || metaExtra.updatedBy
  }, { merge: true });

  return { totalSize: totalBytes, isChunked: true };
}

async function readLargePayloadFromFirestore(
  collectionName: string,
  docId: string,
  rootDocData: any
): Promise<any> {
  if (!rootDocData) return null;

  if (rootDocData._isChunked) {
    const chunksColl = collection(db, collectionName, docId, "chunks");
    const chunksSnap = await getDocs(chunksColl);
    if (chunksSnap.empty) {
      throw new Error(`Data pecahan cadangan (chunks) tidak ditemukan untuk dokumen: ${docId}`);
    }
    const chunkDocs = chunksSnap.docs
      .map(d => d.data() as { index: number; data: string })
      .sort((a, b) => a.index - b.index);
    const fullJson = chunkDocs.map(c => c.data).join("");
    return JSON.parse(fullJson);
  }

  return rootDocData;
}

// Global Circuit Breaker for Firestore Quota is managed in firebaseClient.ts

function formatFirestoreErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (
    msg.includes("resource-exhausted") || 
    msg.includes("Quota limit exceeded") || 
    msg.includes("quota") ||
    msg.includes("Quota exceeded")
  ) {
    markFirestoreQuotaExceeded(60);
    return "Batas kuota harian Cloud Firestore (free tier) telah tercapai. Data Anda tetap tersimpan aman di penyimpanan lokal (HP/Laptop).";
  }
  return msg;
}

const COLLECTION_NAME = "guru_data";

export async function saveGuruDataToFirestore(
  syncKey: string, 
  data: Partial<GuruSyncPayload>, 
  deviceLabel?: string
): Promise<{ success: boolean; timestamp: number; error?: string }> {
  if (isFirestoreQuotaExceeded()) {
    return { 
      success: false, 
      timestamp: Date.now(), 
      error: "Batas kuota harian Cloud Firestore (free tier) telah tercapai. Data tersimpan aman di lokal HP/Laptop." 
    };
  }

  if (!syncKey || !syncKey.trim()) {
    return { success: false, timestamp: Date.now(), error: "Kode Sinkronisasi kosong" };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const now = Date.now();

  const payload: Partial<GuruSyncPayload> = {
    ...data,
    syncKey: cleanKey,
    lastUpdated: now,
    updatedBy: deviceLabel || getDeviceLabel()
  };

  let sanitized = sanitizePayload(payload);
  
  // Safeguard: only strip enormous base64 images if data exceeds 25 MB
  const approxSize = new Blob([JSON.stringify(sanitized)]).size;
  if (approxSize > 25_000_000) {
    const stripBase64 = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') {
        if (obj.startsWith('data:image/') && obj.length > 50000) {
          return "";
        }
        return obj;
      }
      if (Array.isArray(obj)) return obj.map(stripBase64);
      if (typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          cleaned[key] = stripBase64(obj[key]);
        }
        return cleaned;
      }
      return obj;
    };
    sanitized = stripBase64(sanitized);
  }

  try {
    await saveLargePayloadToFirestore(COLLECTION_NAME, cleanKey, sanitized, {
      syncKey: cleanKey,
      lastUpdated: now,
      updatedBy: deviceLabel || getDeviceLabel()
    });
    return { success: true, timestamp: now };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${cleanKey}`);
    return { success: false, timestamp: now, error: formatFirestoreErrorMessage(err) };
  }
}

export async function fetchGuruDataFromFirestore(
  syncKey: string
): Promise<{ success: boolean; data?: GuruSyncPayload; error?: string }> {
  if (isFirestoreQuotaExceeded()) {
    return { 
      success: false, 
      error: "Batas kuota harian Cloud Firestore tercapai. Menggunakan data lokal." 
    };
  }

  if (!syncKey || !syncKey.trim()) {
    return { success: false, error: "Kode Sinkronisasi kosong" };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docRef = doc(db, COLLECTION_NAME, cleanKey);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const fullData = await readLargePayloadFromFirestore(COLLECTION_NAME, cleanKey, snap.data());
      return { success: true, data: fullData as GuruSyncPayload };
    }
    return { success: false, error: "Dokumen belum tersedia di Cloud Firestore" };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `${COLLECTION_NAME}/${cleanKey}`);
    return { success: false, error: formatFirestoreErrorMessage(err) };
  }
}

// Fetch absolute latest dataset available in Firestore (checking main doc + backup indexes)
export async function fetchLatestGuruDataFromCloud(
  syncKey: string
): Promise<{ success: boolean; data?: GuruSyncPayload; error?: string }> {
  if (isFirestoreQuotaExceeded()) {
    return { success: false, error: "Batas kuota harian Cloud Firestore tercapai. Menggunakan data lokal." };
  }

  if (!syncKey || !syncKey.trim()) {
    return { success: false, error: "Kode Sinkronisasi kosong" };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  try {
    // 1. Fetch main document
    const mainRes = await fetchGuruDataFromFirestore(cleanKey);
    let newestPayload: GuruSyncPayload | undefined = mainRes.success ? mainRes.data : undefined;
    let newestTime = newestPayload?.lastUpdated || 0;

    // 2. Check backup index to see if any daily backup has an even newer timestamp
    try {
      const backupIndexRes = await fetchDailyBackupHistoryFromFirestore(cleanKey);
      if (backupIndexRes.success && backupIndexRes.backups && backupIndexRes.backups.length > 0) {
        const latestBackupItem = backupIndexRes.backups.reduce((prev, curr) => 
          (curr.timestamp > prev.timestamp) ? curr : prev, backupIndexRes.backups[0]
        );

        if (latestBackupItem && latestBackupItem.timestamp > newestTime) {
          const backupPayloadRes = await restoreDailyBackupFromFirestore(cleanKey, latestBackupItem.id);
          if (backupPayloadRes.success && backupPayloadRes.data) {
            const restoredTime = backupPayloadRes.data.lastUpdated || latestBackupItem.timestamp;
            if (restoredTime > newestTime) {
              newestPayload = {
                ...backupPayloadRes.data,
                lastUpdated: restoredTime
              };
              newestTime = restoredTime;
            }
          }
        }
      }
    } catch {
      // ignore backup index error
    }

    if (newestPayload) {
      return { success: true, data: newestPayload };
    }

    return { success: false, error: mainRes.error || "Data belum tersedia di Cloud Firestore" };
  } catch (err: any) {
    return { success: false, error: formatFirestoreErrorMessage(err) };
  }
}

export function subscribeToGuruRealtimeData(
  syncKey: string,
  onUpdate: (data: GuruSyncPayload) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (isFirestoreQuotaExceeded()) {
    if (onError) onError(new Error("Batas kuota harian Cloud Firestore tercapai. Mode offline aktif."));
    return null;
  }

  if (!syncKey || !syncKey.trim()) return null;

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docRef = doc(db, COLLECTION_NAME, cleanKey);

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        try {
          const fullData = await readLargePayloadFromFirestore(COLLECTION_NAME, cleanKey, snapshot.data());
          if (fullData) {
            onUpdate(fullData as GuruSyncPayload);
          }
        } catch (e) {
          console.error("Gagal membaca payload chunk realtime:", e);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${cleanKey}`);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff"
      }
    });
  } catch (err) {
    console.error("Gagal membuat QR Code:", err);
    return "";
  }
}

export interface DailyBackupItem {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  formattedDate: string;
  backupTime?: string;
  studentCount: number;
  gradeCount: number;
  journalCount: number;
  classCount: number;
  attendanceCount?: number;
  homeroomCount?: number;
  homeVisitsCount?: number;
  scheduleCount?: number;
  assignmentCount?: number;
  teacherName?: string;
  deviceLabel: string;
  sizeKB?: number;
  isChunked?: boolean;
}

const BACKUP_COLLECTION_NAME = "guru_daily_backups";
const BACKUP_INDEX_COLLECTION = "guru_backup_indexes";

export async function saveDailyBackupToFirestore(
  syncKey: string,
  data: Partial<GuruSyncPayload>,
  deviceLabel?: string,
  customTimeLabel?: string
): Promise<{ success: boolean; dateStr: string; timestamp: number; backupTime: string; totalSizeKB?: number; error?: string }> {
  if (!syncKey || !syncKey.trim()) {
    return { success: false, dateStr: "", timestamp: Date.now(), backupTime: "", error: "Kode Sinkronisasi belum diatur." };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const docId = `${cleanKey}_${dateStr}`;
  const indexDocRef = doc(db, BACKUP_INDEX_COLLECTION, cleanKey);

  const timestamp = now.getTime();
  const timeStr = customTimeLabel || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
  const formattedDate = `${now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })} (${timeStr})`;

  if (isFirestoreQuotaExceeded()) {
    return {
      success: false,
      dateStr,
      timestamp,
      backupTime: timeStr,
      error: "Batas kuota harian Cloud Firestore (free tier) telah tercapai. Cadangan tersimpan aman di lokal HP/Laptop."
    };
  }

  const payload: Partial<GuruSyncPayload> = {
    ...data,
    syncKey: cleanKey,
    lastUpdated: timestamp,
    updatedBy: deviceLabel || getDeviceLabel()
  };

  let sanitized = sanitizePayload(payload);
  
  // Safeguard: only strip enormous base64 images if data exceeds 25 MB
  const approxSize = new Blob([JSON.stringify(sanitized)]).size;
  if (approxSize > 25_000_000) {
    const stripBase64 = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') {
        if (obj.startsWith('data:image/') && obj.length > 50000) {
          return "";
        }
        return obj;
      }
      if (Array.isArray(obj)) return obj.map(stripBase64);
      if (typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          cleaned[key] = stripBase64(obj[key]);
        }
        return cleaned;
      }
      return obj;
    };
    sanitized = stripBase64(sanitized);
  }

  const backupMeta = {
    id: docId,
    dateStr,
    timestamp,
    formattedDate,
    backupTime: timeStr,
    studentCount: data.students?.length || 0,
    gradeCount: data.grades?.length || 0,
    journalCount: data.journals?.length || 0,
    classCount: data.classList?.length || 0,
    attendanceCount: data.attendanceList?.length || 0,
    homeroomCount: data.homeroomNotes?.length || 0,
    homeVisitsCount: data.homeVisits?.length || 0,
    scheduleCount: data.schedule?.length || 0,
    assignmentCount: data.assignments?.length || 0,
    teacherName: data.teacherName || "",
    deviceLabel: deviceLabel || getDeviceLabel()
  };

  try {
    const saveResult = await saveLargePayloadToFirestore(
      BACKUP_COLLECTION_NAME, 
      docId, 
      sanitized, 
      backupMeta
    );

    const sizeKB = Math.round(saveResult.totalSize / 1024);

    const backupItem: DailyBackupItem = {
      ...backupMeta,
      sizeKB,
      isChunked: saveResult.isChunked
    };

    const indexSnap = await getDoc(indexDocRef);
    let existingList: DailyBackupItem[] = [];
    if (indexSnap.exists() && Array.isArray(indexSnap.data()?.backups)) {
      existingList = indexSnap.data().backups;
    }

    const filtered = existingList.filter(item => item.dateStr !== dateStr);
    
    // Autodelete cadangan yang lebih tua dari 5 hari (5 * 24 * 60 * 60 * 1000 ms)
    const cutoffTime = timestamp - (5 * 24 * 60 * 60 * 1000);
    const toKeep = filtered.filter(item => item.timestamp >= cutoffTime);
    const toDelete = filtered.filter(item => item.timestamp < cutoffTime);

    const updatedList = [backupItem, ...toKeep].slice(0, 30);

    // Hapus dokumen backup lama beserta chunks-nya dari Firestore
    for (const old of toDelete) {
      try {
        const chunksColl = collection(db, BACKUP_COLLECTION_NAME, old.id, "chunks");
        const chunkSnaps = await getDocs(chunksColl);
        for (const cDoc of chunkSnaps.docs) {
          await deleteDoc(cDoc.ref);
        }
        await deleteDoc(doc(db, BACKUP_COLLECTION_NAME, old.id));
      } catch (e) {
        console.warn("Gagal menghapus cadangan lama:", old.id, e);
      }
    }

    await setDoc(indexDocRef, { backups: sanitizePayload(updatedList), lastUpdated: timestamp }, { merge: true });

    return { success: true, dateStr, timestamp, backupTime: timeStr, totalSizeKB: sizeKB };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${BACKUP_COLLECTION_NAME}/${docId}`);
    return { success: false, dateStr, timestamp, backupTime: timeStr, error: formatFirestoreErrorMessage(err) };
  }
}

export async function fetchDailyBackupHistoryFromFirestore(
  syncKey: string
): Promise<{ success: boolean; backups: DailyBackupItem[]; error?: string }> {
  if (isFirestoreQuotaExceeded()) {
    return { success: false, backups: [], error: "Batas kuota harian Cloud Firestore tercapai." };
  }

  if (!syncKey || !syncKey.trim()) {
    return { success: false, backups: [], error: "Kode Sinkronisasi belum diatur." };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const indexDocRef = doc(db, BACKUP_INDEX_COLLECTION, cleanKey);

  try {
    const snap = await getDoc(indexDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.backups)) {
      return { success: true, backups: snap.data().backups as DailyBackupItem[] };
    }
    return { success: true, backups: [] };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `${BACKUP_INDEX_COLLECTION}/${cleanKey}`);
    return { success: false, backups: [], error: err?.message || String(err) };
  }
}

export async function restoreDailyBackupFromFirestore(
  syncKey: string,
  backupIdOrDateStr: string
): Promise<{ success: boolean; data?: GuruSyncPayload; error?: string }> {
  if (isFirestoreQuotaExceeded()) {
    return { success: false, error: "Batas kuota harian Cloud Firestore tercapai. Pemulihan online tidak tersedia." };
  }

  if (!syncKey || !syncKey.trim()) {
    return { success: false, error: "Kode Sinkronisasi belum diatur." };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docId = backupIdOrDateStr.startsWith(`${cleanKey}_`)
    ? backupIdOrDateStr
    : `${cleanKey}_${backupIdOrDateStr}`;
  const docRef = doc(db, BACKUP_COLLECTION_NAME, docId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const fullData = await readLargePayloadFromFirestore(BACKUP_COLLECTION_NAME, docId, snap.data());
      return { success: true, data: fullData as GuruSyncPayload };
    }

    // Secondary fallback: check exact backupIdOrDateStr if doc was created with raw ID
    const fallbackRef = doc(db, BACKUP_COLLECTION_NAME, backupIdOrDateStr);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists()) {
      const fullData = await readLargePayloadFromFirestore(BACKUP_COLLECTION_NAME, backupIdOrDateStr, fallbackSnap.data());
      return { success: true, data: fullData as GuruSyncPayload };
    }

    return { success: false, error: `Cadangan tanggal/ID (${backupIdOrDateStr}) tidak ditemukan di Database Cloud.` };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `${BACKUP_COLLECTION_NAME}/${docId}`);
    return { success: false, error: err?.message || String(err) };
  }
}

