import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Unsubscribe 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebaseClient";
import QRCode from "qrcode";
import { 
  Student, 
  Attendance, 
  ScheduleItem, 
  Assignment, 
  Submission, 
  StudentGrade, 
  JournalEntry, 
  HomeroomNote, 
  HomeVisitReport 
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
  classList?: string[];
  students: Student[];
  attendanceList: Attendance[];
  grades: StudentGrade[];
  schedule: ScheduleItem[];
  assignments: Assignment[];
  submissions: Submission[];
  journals: JournalEntry[];
  homeroomNotes: HomeroomNote[];
  homeVisits: HomeVisitReport[];
  lastUpdated: number;
  updatedBy: string;
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

const COLLECTION_NAME = "guru_data";

export async function saveGuruDataToFirestore(
  syncKey: string, 
  data: Partial<GuruSyncPayload>, 
  deviceLabel?: string
): Promise<{ success: boolean; timestamp: number; error?: string }> {
  if (!syncKey || !syncKey.trim()) {
    return { success: false, timestamp: Date.now(), error: "Kode Sinkronisasi kosong" };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docRef = doc(db, COLLECTION_NAME, cleanKey);
  const now = Date.now();

  const payload: Partial<GuruSyncPayload> = {
    ...data,
    syncKey: cleanKey,
    lastUpdated: now,
    updatedBy: deviceLabel || getDeviceLabel()
  };

  const sanitized = sanitizePayload(payload);

  try {
    await setDoc(docRef, sanitized, { merge: true });
    return { success: true, timestamp: now };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTION_NAME}/${cleanKey}`);
    return { success: false, timestamp: now, error: err?.message || String(err) };
  }
}

export async function fetchGuruDataFromFirestore(
  syncKey: string
): Promise<{ success: boolean; data?: GuruSyncPayload; error?: string }> {
  if (!syncKey || !syncKey.trim()) {
    return { success: false, error: "Kode Sinkronisasi kosong" };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docRef = doc(db, COLLECTION_NAME, cleanKey);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { success: true, data: snap.data() as GuruSyncPayload };
    }
    return { success: false, error: "Dokumen belum tersedia di Cloud Firestore" };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `${COLLECTION_NAME}/${cleanKey}`);
    return { success: false, error: err?.message || String(err) };
  }
}

export function subscribeToGuruRealtimeData(
  syncKey: string,
  onUpdate: (data: GuruSyncPayload) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!syncKey || !syncKey.trim()) return null;

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docRef = doc(db, COLLECTION_NAME, cleanKey);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GuruSyncPayload;
        if (data) {
          onUpdate(data);
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
  studentCount: number;
  gradeCount: number;
  journalCount: number;
  classCount: number;
  deviceLabel: string;
}

const BACKUP_COLLECTION_NAME = "guru_daily_backups";
const BACKUP_INDEX_COLLECTION = "guru_backup_indexes";

export async function saveDailyBackupToFirestore(
  syncKey: string,
  data: Partial<GuruSyncPayload>,
  deviceLabel?: string
): Promise<{ success: boolean; dateStr: string; timestamp: number; error?: string }> {
  if (!syncKey || !syncKey.trim()) {
    return { success: false, dateStr: "", timestamp: Date.now(), error: "Kode Sinkronisasi belum diatur." };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const docId = `${cleanKey}_${dateStr}`;
  const docRef = doc(db, BACKUP_COLLECTION_NAME, docId);
  const indexDocRef = doc(db, BACKUP_INDEX_COLLECTION, cleanKey);

  const timestamp = now.getTime();
  const formattedDate = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const payload: Partial<GuruSyncPayload> = {
    ...data,
    syncKey: cleanKey,
    lastUpdated: timestamp,
    updatedBy: deviceLabel || getDeviceLabel()
  };

  const sanitized = sanitizePayload(payload);

  const backupItem: DailyBackupItem = {
    id: docId,
    dateStr,
    timestamp,
    formattedDate,
    studentCount: data.students?.length || 0,
    gradeCount: data.grades?.length || 0,
    journalCount: data.journals?.length || 0,
    classCount: data.classList?.length || 0,
    deviceLabel: deviceLabel || getDeviceLabel()
  };

  try {
    await setDoc(docRef, sanitized, { merge: true });

    const indexSnap = await getDoc(indexDocRef);
    let existingList: DailyBackupItem[] = [];
    if (indexSnap.exists() && Array.isArray(indexSnap.data()?.backups)) {
      existingList = indexSnap.data().backups;
    }

    const filtered = existingList.filter(item => item.dateStr !== dateStr);
    const updatedList = [backupItem, ...filtered].slice(0, 30); // simpan 30 cadangan harian terakhir

    await setDoc(indexDocRef, { backups: sanitizePayload(updatedList), lastUpdated: timestamp }, { merge: true });

    return { success: true, dateStr, timestamp };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `${BACKUP_COLLECTION_NAME}/${docId}`);
    return { success: false, dateStr, timestamp, error: err?.message || String(err) };
  }
}

export async function fetchDailyBackupHistoryFromFirestore(
  syncKey: string
): Promise<{ success: boolean; backups: DailyBackupItem[]; error?: string }> {
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
  dateStr: string
): Promise<{ success: boolean; data?: GuruSyncPayload; error?: string }> {
  if (!syncKey || !syncKey.trim()) {
    return { success: false, error: "Kode Sinkronisasi belum diatur." };
  }

  const cleanKey = syncKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const docId = `${cleanKey}_${dateStr}`;
  const docRef = doc(db, BACKUP_COLLECTION_NAME, docId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { success: true, data: snap.data() as GuruSyncPayload };
    }
    return { success: false, error: `Cadangan tanggal ${dateStr} tidak ditemukan di Database Cloud` };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, `${BACKUP_COLLECTION_NAME}/${docId}`);
    return { success: false, error: err?.message || String(err) };
  }
}

