import { useState, useEffect, useCallback, useMemo, ChangeEvent, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Cpu, 
  Calendar, 
  BookOpen, 
  FileSpreadsheet, 
  BookOpenText,
  User,
  GraduationCap,
  Clock,
  Menu,
  X,
  FileCheck2,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Building2,
  Users,
  Check,
  FileUp,
  Download,
  AlertCircle,
  CheckCircle2,
  FileType,
  ShieldCheck,
  Camera,
  Bot,
  RefreshCw,
  Database,
  UploadCloud,
  Cloud,
  AlertTriangle,
  Radio,
  Zap,
  Activity,
  Sparkles,
  RotateCcw
} from "lucide-react";

// Import types and presets
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
} from "./types";

import { 
  CLASSES, 
  PRESET_STUDENTS, 
  PRESET_SCHEDULE, 
  PRESET_ASSIGNMENTS, 
  PRESET_SUBMISSIONS, 
  PRESET_GRADES, 
  PRESET_JOURNAL 
} from "./data/presets";

// Import Firebase Firestore Realtime Multi-Device Sync & Daily Backups
import { 
  saveGuruDataToFirestore, 
  subscribeToGuruRealtimeData, 
  fetchGuruDataFromFirestore,
  saveDailyBackupToFirestore,
  fetchDailyBackupHistoryFromFirestore,
  restoreDailyBackupFromFirestore,
  DailyBackupItem,
  GuruSyncPayload,
  getDeviceLabel
} from "./lib/firestoreSync";
import CloudSyncModal, { SyncLogEntry } from "./components/CloudSyncModal";

import { safeStorage } from "./lib/safeStorage";
import { compressImage } from "./lib/imageUtils";

// Import modular child components
import Dashboard from "./components/Dashboard";
import Absensi from "./components/Absensi";
import Penilaian from "./components/Penilaian";
import Penjadwalan from "./components/Penjadwalan";
import ManajemenTugas from "./components/ManajemenTugas";
import DaftarNilai from "./components/DaftarNilai";
import JurnalHarian from "./components/JurnalHarian";
import WaliKelas from "./components/WaliKelas";
import EduAsisten from "./components/EduAsisten";

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teacherName, setTeacherName] = useState<string>(() => {
    return safeStorage.getItem("guru_name") || "YUDI GINANJAR";
  });
  const [nip, setNip] = useState<string>(() => {
    return safeStorage.getItem("guru_nip") || "199605242024211008";
  });
  const [subject, setSubject] = useState<string>(() => {
    return safeStorage.getItem("guru_subject") || "EKONOMI";
  });
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    return safeStorage.getItem("guru_month") || "JANUARI 2026";
  });
  const [currentWeek, setCurrentWeek] = useState<string>(() => {
    return safeStorage.getItem("guru_week") || "2";
  });
  const [institution, setInstitution] = useState<string>(() => {
    return safeStorage.getItem("guru_institution") || "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya";
  });
  const [profilePhoto, setProfilePhoto] = useState<string>(() => {
    return safeStorage.getItem("guru_profile_photo") || "";
  });

  useEffect(() => {
    if (profilePhoto) {
      safeStorage.setItem("guru_profile_photo", profilePhoto);
    } else {
      safeStorage.removeItem("guru_profile_photo");
    }
  }, [profilePhoto]);

  const handleProfilePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const compressed = await compressImage(file);
      setProfilePhoto(compressed);
    } catch (err) {
      console.warn("Gagal memproses foto profil:", err);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhoto("");
  };

  // Settings & Management Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "classes" | "students" | "reset" | "backup">("profile");

  // Backup & Restore States
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Reset Data States
  const [resetDataChoices, setResetDataChoices] = useState({
    attendance: false,
    grades: false,
    assignments: false,
    journals: false,
    schedule: false,
    students: false
  });
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState(Math.floor(Math.random() * 8999 + 1000).toString());
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState("");
  const [editingClassName, setEditingClassName] = useState<{ oldName: string; newName: string } | null>(null);
  const [deletingClassName, setDeletingClassName] = useState<string | null>(null);
  const [classErrorMsg, setClassErrorMsg] = useState<string | null>(null);
  const [classSuccessMsg, setClassSuccessMsg] = useState<string | null>(null);

  const [selectedStudentClassFilter, setSelectedStudentClassFilter] = useState<string>("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNis, setNewStudentNis] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [studentErrorMsg, setStudentErrorMsg] = useState<string | null>(null);
  const [studentSuccessMsg, setStudentSuccessMsg] = useState<string | null>(null);

  // Excel Import States
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    students: { name: string; nis: string; className: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Keep a real-time ticking clock for premium visual experience
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync teacher profile to safeStorage
  useEffect(() => {
    safeStorage.setItem("guru_name", teacherName);
    safeStorage.setItem("guru_nip", nip);
    safeStorage.setItem("guru_subject", subject);
    safeStorage.setItem("guru_month", currentMonth);
    safeStorage.setItem("guru_week", currentWeek);
    safeStorage.setItem("guru_institution", institution);
  }, [teacherName, nip, subject, currentMonth, currentWeek, institution]);

  // Helper to load stored state without forcing non-empty preset overrides when arrays are empty
  const loadStoredState = <T,>(key: string, fallback: T): T => {
    const raw = safeStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      return parsed as T;
    } catch {
      return fallback;
    }
  };

  // Dynamic Class List & Student Model (Backed by safeStorage with safe non-empty fallback)
  const [classList, setClassList] = useState<string[]>(() => {
    return loadStoredState<string[]>("guru_classes", CLASSES);
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const rawList = loadStoredState<Student[]>("guru_students", PRESET_STUDENTS);
    const seen = new Set<string>();
    return rawList.filter(s => {
      if (!s || !s.id) return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  });

  useEffect(() => {
    // Run deduplication once on mount to clear out any duplicate IDs in safeStorage or existing state
    setStudents(prev => {
      const seen = new Set<string>();
      const unique = prev.filter(s => {
        if (!s || !s.id) return false;
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      if (unique.length !== prev.length) {
        return unique;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    safeStorage.setItem("guru_classes", classList);
  }, [classList]);

  useEffect(() => {
    // Always save clean deduplicated student records
    const seen = new Set<string>();
    const unique = students.filter(s => {
      if (!s || !s.id) return false;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    safeStorage.setItem("guru_students", unique);
  }, [students]);

  // Global background grading status from Penilaian
  const [globalGradingStatus, setGlobalGradingStatus] = useState<{ isGrading: boolean; progressText?: string }>({
    isGrading: false,
    progressText: ""
  });

  const handleGradingStateChange = useCallback((isGrading: boolean, progressText: string) => {
    setGlobalGradingStatus(prev => {
      if (prev.isGrading === isGrading && prev.progressText === progressText) {
        return prev;
      }
      return { isGrading, progressText };
    });
  }, []);

  const teacherProfileObj = useMemo(() => ({
    name: teacherName,
    nip,
    subject,
    month: currentMonth,
    weekNum: currentWeek
  }), [teacherName, nip, subject, currentMonth, currentWeek]);

  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    return loadStoredState<ScheduleItem[]>("guru_schedule", PRESET_SCHEDULE);
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    return loadStoredState<Assignment[]>("guru_assignments", PRESET_ASSIGNMENTS);
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    return loadStoredState<Submission[]>("guru_submissions", PRESET_SUBMISSIONS);
  });

  const [grades, setGrades] = useState<StudentGrade[]>(() => {
    return loadStoredState<StudentGrade[]>("guru_grades", PRESET_GRADES);
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    return loadStoredState<JournalEntry[]>("guru_journals", PRESET_JOURNAL);
  });

  const [attendanceList, setAttendanceList] = useState<Attendance[]>(() => {
    return safeStorage.getJSON<Attendance[]>("guru_attendance", []);
  });

  // Homeroom Teacher (Wali Kelas) States
  const [homeroomClass, setHomeroomClass] = useState<string>(() => {
    return safeStorage.getItem("guru_homeroom_class") || "X-MIPA-1";
  });

  const [homeroomNotes, setHomeroomNotes] = useState<HomeroomNote[]>(() => {
    const defaultNotes: HomeroomNote[] = [
      {
        id: "hn-1",
        studentId: "s-1",
        studentName: "Ahmad Fauzi",
        className: "X-MIPA-1",
        date: "2026-02-05",
        category: "Kedisiplinan",
        note: "Siswa tidak hadir tanpa keterangan (Alpa) 2 hari berturut-turut.",
        actionTaken: "Menghubungi Orang Tua via Telepon & Bimbingan Wali Kelas"
      }
    ];
    return loadStoredState<HomeroomNote[]>("guru_homeroom_notes", defaultNotes);
  });

  const [homeVisits, setHomeVisits] = useState<HomeVisitReport[]>(() => {
    const defaultVisits: HomeVisitReport[] = [
      {
        id: "hv-1",
        studentId: "s-1",
        studentName: "Ahmad Fauzi",
        className: "X-MIPA-1",
        date: "2026-02-06",
        parentName: "Bpk. Hendra Fauzi",
        address: "Jl. Mawar No. 14, Tasikmalaya",
        reason: "Siswa sering alpa dan belum menyerahkan tugas harian.",
        result: "Orang tua bersedia mendampingi anak belajar di rumah dan menyetujui komitmen kedisiplinan.",
        photos: []
      }
    ];
    return loadStoredState<HomeVisitReport[]>("guru_home_visits", defaultVisits);
  });

  // Master Restore Default Preset Function
  const handleRestorePresets = async () => {
    setClassList(CLASSES);
    setStudents(PRESET_STUDENTS);
    setSchedule(PRESET_SCHEDULE);
    setAssignments(PRESET_ASSIGNMENTS);
    setSubmissions(PRESET_SUBMISSIONS);
    setGrades(PRESET_GRADES);
    setJournals(PRESET_JOURNAL);
    setTeacherName("YUDI GINANJAR");
    setNip("199605242024211008");
    setSubject("EKONOMI");
    setInstitution("Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya");
    setHomeroomClass("X-MIPA-1");

    safeStorage.setItem("guru_classes", CLASSES);
    safeStorage.setItem("guru_students", PRESET_STUDENTS);
    safeStorage.setItem("guru_schedule", PRESET_SCHEDULE);
    safeStorage.setItem("guru_assignments", PRESET_ASSIGNMENTS);
    safeStorage.setItem("guru_submissions", PRESET_SUBMISSIONS);
    safeStorage.setItem("guru_grades", PRESET_GRADES);
    safeStorage.setItem("guru_journals", PRESET_JOURNAL);
    safeStorage.setItem("guru_name", "YUDI GINANJAR");
    safeStorage.setItem("guru_nip", "199605242024211008");
    safeStorage.setItem("guru_subject", "EKONOMI");
    safeStorage.setItem("guru_institution", "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya");

    // Immediately push to cloud
    await saveGuruDataToFirestore(syncKey, {
      teacherName: "YUDI GINANJAR",
      nip: "199605242024211008",
      subject: "EKONOMI",
      institution: "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya",
      currentMonth: "JANUARI 2026",
      currentWeek: "2",
      profilePhoto: "",
      homeroomClass: "X-MIPA-1",
      classList: CLASSES,
      students: PRESET_STUDENTS,
      schedule: PRESET_SCHEDULE,
      assignments: PRESET_ASSIGNMENTS,
      submissions: PRESET_SUBMISSIONS,
      grades: PRESET_GRADES,
      journals: PRESET_JOURNAL,
      attendanceList: [],
      homeroomNotes: [
        {
          id: "hn-1",
          studentId: "s-1",
          studentName: "Ahmad Fauzi",
          className: "X-MIPA-1",
          date: "2026-02-05",
          category: "Kedisiplinan",
          note: "Siswa tidak hadir tanpa keterangan (Alpa) 2 hari berturut-turut.",
          actionTaken: "Menghubungi Orang Tua via Telepon & Bimbingan Wali Kelas"
        }
      ],
      homeVisits: [
        {
          id: "hv-1",
          studentId: "s-1",
          studentName: "Ahmad Fauzi",
          className: "X-MIPA-1",
          date: "2026-02-06",
          parentName: "Bpk. Hendra Fauzi",
          address: "Jl. Mawar No. 14, Tasikmalaya",
          reason: "Siswa sering alpa dan belum menyerahkan tugas harian.",
          result: "Orang tua bersedia mendampingi anak belajar di rumah dan menyetujui komitmen kedisiplinan.",
          photos: []
        }
      ]
    });
  };

  // Safe Storage Sync Effects
  useEffect(() => {
    safeStorage.setItem("guru_homeroom_class", homeroomClass);
  }, [homeroomClass]);

  useEffect(() => {
    safeStorage.setItem("guru_homeroom_notes", homeroomNotes);
  }, [homeroomNotes]);

  useEffect(() => {
    safeStorage.setItem("guru_home_visits", homeVisits);
  }, [homeVisits]);

  const handleAddHomeroomNote = (newNote: Omit<HomeroomNote, "id">) => {
    const created: HomeroomNote = {
      ...newNote,
      id: `hn-${Date.now()}`
    };
    setHomeroomNotes(prev => [created, ...prev]);
  };

  const handleDeleteHomeroomNote = (id: string) => {
    setHomeroomNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleAddHomeVisit = (newVisit: Omit<HomeVisitReport, "id">) => {
    const created: HomeVisitReport = {
      ...newVisit,
      id: `hv-${Date.now()}`
    };
    setHomeVisits(prev => [created, ...prev]);
  };

  const handleDeleteHomeVisit = (id: string) => {
    setHomeVisits(prev => prev.filter(v => v.id !== id));
  };

  useEffect(() => {
    safeStorage.setItem("guru_schedule", schedule);
  }, [schedule]);

  useEffect(() => {
    safeStorage.setItem("guru_assignments", assignments);
  }, [assignments]);

  useEffect(() => {
    safeStorage.setItem("guru_submissions", submissions);
  }, [submissions]);

  useEffect(() => {
    safeStorage.setItem("guru_grades", grades);
  }, [grades]);

  useEffect(() => {
    safeStorage.setItem("guru_journals", journals);
  }, [journals]);

  useEffect(() => {
    safeStorage.setItem("guru_attendance", attendanceList);
  }, [attendanceList]);

  // ====================================================
  // FIRESTORE REALTIME MULTI-DEVICE SYNC (HP ⇄ LAPTOP)
  // ====================================================
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [syncKey, setSyncKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get("syncKey");
      if (urlKey && urlKey.trim()) {
        safeStorage.setItem("guru_sync_key", urlKey.trim());
        return urlKey.trim();
      }
    }
    return safeStorage.getItem("guru_sync_key") || "guru-yudi-1996";
  });

  const [isRealtimeSyncEnabled, setIsRealtimeSyncEnabled] = useState<boolean>(() => {
    const saved = safeStorage.getItem("guru_realtime_sync_enabled");
    return saved !== null ? saved === "true" : true;
  });

  const [realtimeSyncStatus, setRealtimeSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return safeStorage.getItem("guru_last_sync_time") || null;
  });
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(() => {
    return safeStorage.getItem("guru_last_updated_by") || null;
  });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => {
    return safeStorage.getJSON<SyncLogEntry[]>("guru_sync_logs", []);
  });
  const [cloudSyncNotice, setCloudSyncNotice] = useState<{ message: string; fromDevice?: string } | null>(null);

  // Daily Backup States (Akhir Hari Backup to Cloud Firestore & Google Drive)
  const [dailyBackupHistory, setDailyBackupHistory] = useState<DailyBackupItem[]>([]);
  const [lastDailyBackupDate, setLastDailyBackupDate] = useState<string>(() => {
    return safeStorage.getItem("guru_last_daily_backup_date") || "";
  });
  const [isDailyBackupSaving, setIsDailyBackupSaving] = useState(false);
  const [dailyBackupNotice, setDailyBackupNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync ref flags to prevent circular echo updates
  const isIncomingRemoteUpdateRef = useRef(false);
  const isPushingRef = useRef(false);
  const lastRemoteUpdatedTimeRef = useRef<number>(0);
  const syncTimeoutRef = useRef<any>(null);

  const addSyncLog = (message: string, type: "success" | "info" | "warning" | "error" = "info", device?: string) => {
    const newLog: SyncLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      message,
      type,
      device: device || getDeviceLabel()
    };
    setSyncLogs(prev => {
      const updated = [newLog, ...prev.slice(0, 29)];
      safeStorage.setItem("guru_sync_logs", updated);
      return updated;
    });
  };

  // Push local data to Firestore Cloud
  const pushDataToCloud = async (isManual = false) => {
    if (!isRealtimeSyncEnabled && !isManual) return;
    if (!syncKey || !syncKey.trim()) return;

    isPushingRef.current = true;
    setRealtimeSyncStatus("syncing");

    const pushTime = Date.now();
    lastRemoteUpdatedTimeRef.current = pushTime;

    const payload: Partial<GuruSyncPayload> = {
      teacherName,
      nip,
      subject,
      institution,
      currentMonth,
      currentWeek,
      profilePhoto,
      homeroomClass,
      classList,
      students,
      attendanceList,
      grades,
      schedule,
      assignments,
      submissions,
      journals,
      homeroomNotes,
      homeVisits,
      lastUpdated: pushTime
    };

    try {
      const res = await saveGuruDataToFirestore(syncKey, payload);
      if (res.success) {
        lastRemoteUpdatedTimeRef.current = res.timestamp;
        const timeStr = new Date(res.timestamp).toLocaleTimeString("id-ID");
        const dev = getDeviceLabel();
        setLastSyncTime(timeStr);
        setLastUpdatedBy(dev);
        safeStorage.setItem("guru_last_sync_time", timeStr);
        safeStorage.setItem("guru_last_updated_by", dev);
        setRealtimeSyncStatus("synced");
        addSyncLog(`Data berhasil dikirim ke Cloud (${dev})`, "success", dev);
      } else {
        setRealtimeSyncStatus("error");
        addSyncLog(`Gagal sync ke Cloud: ${res.error}`, "error");
      }
    } finally {
      setTimeout(() => {
        isPushingRef.current = false;
      }, 800);
    }
  };

  // Manual pull from Firestore Cloud
  const handleManualPull = async () => {
    setRealtimeSyncStatus("syncing");
    const res = await fetchGuruDataFromFirestore(syncKey);
    if (res.success && res.data) {
      const remoteData = res.data;
      isIncomingRemoteUpdateRef.current = true;
      if (remoteData.teacherName !== undefined) setTeacherName(remoteData.teacherName);
      if (remoteData.nip !== undefined) setNip(remoteData.nip);
      if (remoteData.subject !== undefined) setSubject(remoteData.subject);
      if (remoteData.institution !== undefined) setInstitution(remoteData.institution);
      if (remoteData.currentMonth !== undefined) setCurrentMonth(remoteData.currentMonth);
      if (remoteData.currentWeek !== undefined) setCurrentWeek(remoteData.currentWeek);
      if (remoteData.profilePhoto !== undefined) setProfilePhoto(remoteData.profilePhoto);
      if (remoteData.homeroomClass !== undefined) setHomeroomClass(remoteData.homeroomClass);
      if (Array.isArray(remoteData.classList)) setClassList(remoteData.classList);
      if (Array.isArray(remoteData.students)) setStudents(remoteData.students);
      if (Array.isArray(remoteData.attendanceList)) setAttendanceList(remoteData.attendanceList);
      if (Array.isArray(remoteData.grades)) setGrades(remoteData.grades);
      if (Array.isArray(remoteData.schedule)) setSchedule(remoteData.schedule);
      if (Array.isArray(remoteData.assignments)) setAssignments(remoteData.assignments);
      if (Array.isArray(remoteData.submissions)) setSubmissions(remoteData.submissions);
      if (Array.isArray(remoteData.journals)) setJournals(remoteData.journals);
      if (Array.isArray(remoteData.homeroomNotes)) setHomeroomNotes(remoteData.homeroomNotes);
      if (Array.isArray(remoteData.homeVisits)) setHomeVisits(remoteData.homeVisits);

      const timeStr = new Date(remoteData.lastUpdated || Date.now()).toLocaleTimeString("id-ID");
      setLastSyncTime(timeStr);
      setLastUpdatedBy(remoteData.updatedBy || "Cloud");
      setRealtimeSyncStatus("synced");
      addSyncLog(`Data berhasil ditarik manual dari Cloud`, "success");
      setTimeout(() => {
        isIncomingRemoteUpdateRef.current = false;
      }, 800);
    } else {
      setRealtimeSyncStatus("error");
      addSyncLog(`Gagal menarik data: ${res.error || "Data belum ada"}`, "error");
    }
  };

  // Realtime Bi-Directional Firestore Listener
  useEffect(() => {
    safeStorage.setItem("guru_sync_key", syncKey);
    safeStorage.setItem("guru_realtime_sync_enabled", isRealtimeSyncEnabled ? "true" : "false");

    if (!isRealtimeSyncEnabled || !syncKey.trim()) return;

    setRealtimeSyncStatus("syncing");
    const unsubscribe = subscribeToGuruRealtimeData(
      syncKey,
      (remoteData: GuruSyncPayload) => {
        if (!remoteData) return;

        // Skip if this device is currently pushing local changes
        if (isPushingRef.current) {
          return;
        }

        // Skip if this update was triggered by this device's own recent push
        if (remoteData.lastUpdated && remoteData.lastUpdated <= lastRemoteUpdatedTimeRef.current) {
          setRealtimeSyncStatus("synced");
          return;
        }

        lastRemoteUpdatedTimeRef.current = remoteData.lastUpdated || Date.now();
        isIncomingRemoteUpdateRef.current = true;

        // Apply remote changes from other device (HP / Laptop) with safety guards
        if (remoteData.teacherName !== undefined) setTeacherName(remoteData.teacherName);
        if (remoteData.nip !== undefined) setNip(remoteData.nip);
        if (remoteData.subject !== undefined) setSubject(remoteData.subject);
        if (remoteData.institution !== undefined) setInstitution(remoteData.institution);
        if (remoteData.currentMonth !== undefined) setCurrentMonth(remoteData.currentMonth);
        if (remoteData.currentWeek !== undefined) setCurrentWeek(remoteData.currentWeek);
        if (remoteData.profilePhoto !== undefined) setProfilePhoto(remoteData.profilePhoto);
        if (remoteData.homeroomClass !== undefined) setHomeroomClass(remoteData.homeroomClass);
        if (Array.isArray(remoteData.classList)) setClassList(remoteData.classList);
        if (Array.isArray(remoteData.students)) setStudents(remoteData.students);
        if (Array.isArray(remoteData.attendanceList)) setAttendanceList(remoteData.attendanceList);
        if (Array.isArray(remoteData.grades)) setGrades(remoteData.grades);
        if (Array.isArray(remoteData.schedule)) setSchedule(remoteData.schedule);
        if (Array.isArray(remoteData.assignments)) setAssignments(remoteData.assignments);
        if (Array.isArray(remoteData.submissions)) setSubmissions(remoteData.submissions);
        if (Array.isArray(remoteData.journals)) setJournals(remoteData.journals);
        if (Array.isArray(remoteData.homeroomNotes)) setHomeroomNotes(remoteData.homeroomNotes);
        if (Array.isArray(remoteData.homeVisits)) setHomeVisits(remoteData.homeVisits);

        const timeStr = new Date(remoteData.lastUpdated || Date.now()).toLocaleTimeString("id-ID");
        setLastSyncTime(timeStr);
        setLastUpdatedBy(remoteData.updatedBy || "Cloud");
        safeStorage.setItem("guru_last_sync_time", timeStr);
        safeStorage.setItem("guru_last_updated_by", remoteData.updatedBy || "Cloud");
        setRealtimeSyncStatus("synced");

        const devLabel = remoteData.updatedBy || "Perangkat lain";
        addSyncLog(`Pembaruan realtime diterima dari ${devLabel}`, "success", devLabel);

        setCloudSyncNotice({
          message: `Data sinkron otomatis dari ${devLabel} (${timeStr})`,
          fromDevice: devLabel
        });
        setTimeout(() => setCloudSyncNotice(null), 5000);

        setTimeout(() => {
          isIncomingRemoteUpdateRef.current = false;
        }, 800);
      },
      (err) => {
        setRealtimeSyncStatus("error");
        addSyncLog(`Koneksi realtime Firestore terputus`, "warning");
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncKey, isRealtimeSyncEnabled]);

  // Debounced Auto-Push on Local Edits (Edit di HP -> langsung update ke Laptop)
  useEffect(() => {
    if (isIncomingRemoteUpdateRef.current) return;
    if (isPushingRef.current) return;
    if (!isRealtimeSyncEnabled) return;
    if (!syncKey.trim()) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      pushDataToCloud(false);
    }, 500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [
    teacherName,
    nip,
    subject,
    institution,
    currentMonth,
    currentWeek,
    profilePhoto,
    homeroomClass,
    classList,
    students,
    attendanceList,
    grades,
    schedule,
    assignments,
    submissions,
    journals,
    homeroomNotes,
    homeVisits,
    isRealtimeSyncEnabled,
    syncKey
  ]);

  // Daily Backup Handlers (Akhir Hari Backup)
  const triggerDailyBackup = useCallback(async (isManual = false) => {
    if (!syncKey || !syncKey.trim()) {
      if (isManual) {
        setDailyBackupNotice({ type: "error", message: "Kode sinkronisasi belum diatur." });
      }
      return;
    }

    setIsDailyBackupSaving(true);
    setDailyBackupNotice(null);

    const payload: Partial<GuruSyncPayload> = {
      teacherName,
      nip,
      subject,
      institution,
      currentMonth,
      currentWeek,
      profilePhoto,
      homeroomClass,
      classList,
      students,
      attendanceList,
      grades,
      schedule,
      assignments,
      submissions,
      journals,
      homeroomNotes,
      homeVisits
    };

    const res = await saveDailyBackupToFirestore(syncKey, payload);
    setIsDailyBackupSaving(false);

    if (res.success) {
      setLastDailyBackupDate(res.dateStr);
      safeStorage.setItem("guru_last_daily_backup_date", res.dateStr);
      setDailyBackupNotice({
        type: "success",
        message: `Cadangan data harian (${res.dateStr}) berhasil disimpan ke Cloud Database!`
      });
      addSyncLog(`Cadangan harian ${res.dateStr} tersimpan di Database Cloud`, "success");

      const hist = await fetchDailyBackupHistoryFromFirestore(syncKey);
      if (hist.success) {
        setDailyBackupHistory(hist.backups);
      }
    } else {
      setDailyBackupNotice({
        type: "error",
        message: `Gagal menyimpan cadangan harian: ${res.error}`
      });
      addSyncLog(`Gagal cadangkan harian: ${res.error}`, "error");
    }
  }, [syncKey, teacherName, nip, subject, institution, currentMonth, currentWeek, profilePhoto, homeroomClass, classList, students, attendanceList, grades, schedule, assignments, submissions, journals, homeroomNotes, homeVisits]);

  // Auto daily backup runner (runs once per day if syncKey is set)
  useEffect(() => {
    if (!syncKey || !syncKey.trim()) return;

    const todayStr = new Date().toISOString().split("T")[0];

    fetchDailyBackupHistoryFromFirestore(syncKey).then(hist => {
      if (hist.success) {
        setDailyBackupHistory(hist.backups);
      }
    });

    const lastSaved = safeStorage.getItem("guru_last_daily_backup_date");
    if (lastSaved !== todayStr) {
      const timer = setTimeout(() => {
        triggerDailyBackup(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [syncKey, triggerDailyBackup]);

  // Restore from Cloud Snapshot
  const handleRestoreDailyBackupFromCloud = async (backupItem: DailyBackupItem) => {
    if (!window.confirm(`Apakah Anda yakin ingin memulihkan cadangan data tanggal ${backupItem.formattedDate}? Data aplikasi saat ini akan diperbarui.`)) {
      return;
    }

    setRestoreError(null);
    setRestoreSuccess(false);

    const res = await restoreDailyBackupFromFirestore(syncKey, backupItem.dateStr);
    if (res.success && res.data) {
      const data = res.data;
      if (data.teacherName !== undefined) setTeacherName(data.teacherName);
      if (data.nip !== undefined) setNip(data.nip);
      if (data.subject !== undefined) setSubject(data.subject);
      if (data.institution !== undefined) setInstitution(data.institution);
      if (data.currentMonth !== undefined) setCurrentMonth(data.currentMonth);
      if (data.currentWeek !== undefined) setCurrentWeek(data.currentWeek);
      if (data.profilePhoto !== undefined) setProfilePhoto(data.profilePhoto);
      if (data.homeroomClass !== undefined) setHomeroomClass(data.homeroomClass);
      if (Array.isArray(data.classList)) setClassList(data.classList);
      if (Array.isArray(data.students)) setStudents(data.students);
      if (Array.isArray(data.attendanceList)) setAttendanceList(data.attendanceList);
      if (Array.isArray(data.grades)) setGrades(data.grades);
      if (Array.isArray(data.schedule)) setSchedule(data.schedule);
      if (Array.isArray(data.assignments)) setAssignments(data.assignments);
      if (Array.isArray(data.submissions)) setSubmissions(data.submissions);
      if (Array.isArray(data.journals)) setJournals(data.journals);
      if (Array.isArray(data.homeroomNotes)) setHomeroomNotes(data.homeroomNotes);
      if (Array.isArray(data.homeVisits)) setHomeVisits(data.homeVisits);

      setRestoreSuccess(true);
      addSyncLog(`Data dipulihkan dari cadangan Cloud (${backupItem.formattedDate})`, "success");

      setTimeout(() => {
        pushDataToCloud(true);
      }, 500);
    } else {
      setRestoreError(res.error || "Gagal memulihkan cadangan data");
    }
  };



  // ----------------------------------------------------
  // HANDLERS & BRIDGING METHODS
  // ----------------------------------------------------

  // CLASS MANAGEMENT HANDLERS
  const handleAddClass = (className: string) => {
    setClassErrorMsg(null);
    setClassSuccessMsg(null);
    const trimmed = className.trim();
    if (!trimmed) {
      setClassErrorMsg("Nama kelas tidak boleh kosong.");
      return;
    }
    if (classList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setClassErrorMsg(`Kelas "${trimmed}" sudah terdaftar.`);
      return;
    }
    setClassList(prev => [...prev, trimmed]);
    setNewClassNameInput("");
    setClassSuccessMsg(`Kelas "${trimmed}" berhasil ditambahkan.`);
    setTimeout(() => setClassSuccessMsg(null), 3500);
  };

  const handleRenameClass = (oldName: string, newName: string) => {
    setClassErrorMsg(null);
    setClassSuccessMsg(null);
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) {
      setEditingClassName(null);
      return;
    }
    if (classList.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== oldName)) {
      setClassErrorMsg(`Kelas "${trimmed}" sudah digunakan oleh kelas lain.`);
      return;
    }
    
    // Rename class in classList
    setClassList(prev => prev.map(c => c === oldName ? trimmed : c));

    // Cascade rename across all models
    setStudents(prev => prev.map(s => s.className === oldName ? { ...s, className: trimmed } : s));
    setSchedule(prev => prev.map(s => s.className === oldName ? { ...s, className: trimmed } : s));
    setAssignments(prev => prev.map(a => a.className === oldName ? { ...a, className: trimmed } : a));
    setGrades(prev => prev.map(g => g.className === oldName ? { ...g, className: trimmed } : g));
    setJournals(prev => prev.map(j => j.className === oldName ? { ...j, className: trimmed } : j));
    setAttendanceList(prev => prev.map(a => a.className === oldName ? { ...a, className: trimmed } : a));

    if (homeroomClass === oldName) {
      setHomeroomClass(trimmed);
    }
    if (selectedStudentClassFilter === oldName) {
      setSelectedStudentClassFilter(trimmed);
    }

    setEditingClassName(null);
    setClassSuccessMsg(`Nama kelas berhasil diubah menjadi "${trimmed}".`);
    setTimeout(() => setClassSuccessMsg(null), 3500);
  };

  const handlePromptDeleteClass = (classNameToDelete: string) => {
    setClassErrorMsg(null);
    setClassSuccessMsg(null);
    setDeletingClassName(classNameToDelete);
  };

  const handleExecuteDeleteClass = (classNameToDelete: string) => {
    setClassErrorMsg(null);
    
    // 1. Remove from classList
    const nextClasses = classList.filter(c => c !== classNameToDelete);
    setClassList(nextClasses);

    // 2. Cascade delete associated records
    setStudents(prev => prev.filter(s => s.className !== classNameToDelete));
    setAttendanceList(prev => prev.filter(a => a.className !== classNameToDelete));
    setAssignments(prev => prev.filter(a => a.className !== classNameToDelete));
    setGrades(prev => prev.filter(g => g.className !== classNameToDelete));
    setJournals(prev => prev.filter(j => j.className !== classNameToDelete));
    setSchedule(prev => prev.filter(s => s.className !== classNameToDelete));

    // 3. Fallback homeroom and student class filter if needed
    if (homeroomClass === classNameToDelete) {
      setHomeroomClass(nextClasses[0] || "");
    }
    if (selectedStudentClassFilter === classNameToDelete) {
      setSelectedStudentClassFilter(nextClasses[0] || "");
    }

    setDeletingClassName(null);
    setClassSuccessMsg(`Kelas "${classNameToDelete}" dan seluruh data di dalamnya berhasil dihapus.`);
    setTimeout(() => setClassSuccessMsg(null), 4000);
  };

  // STUDENT MANAGEMENT HANDLERS
  const handleAddStudent = (name: string, nis: string, targetClass: string) => {
    setStudentErrorMsg(null);
    setStudentSuccessMsg(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStudentErrorMsg("Nama siswa tidak boleh kosong.");
      return;
    }
    const finalClass = targetClass || selectedStudentClassFilter || classList[0] || "X-MIPA-1";
    const created: Student = {
      id: `s-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      name: trimmedName,
      nis: nis.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      className: finalClass
    };
    setStudents(prev => [...prev, created]);
    setNewStudentName("");
    setNewStudentNis("");
    setStudentSuccessMsg(`Siswa "${trimmedName}" berhasil ditambahkan ke kelas ${finalClass}.`);
    setTimeout(() => setStudentSuccessMsg(null), 3500);
  };

  const handleSaveStudentEdit = (updated: Student) => {
    setStudentErrorMsg(null);
    if (!updated.name.trim()) {
      setStudentErrorMsg("Nama siswa tidak boleh kosong.");
      return;
    }
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingStudent(null);
    setStudentSuccessMsg("Data siswa berhasil diperbarui.");
    setTimeout(() => setStudentSuccessMsg(null), 3500);
  };

  const handleExecuteDeleteStudent = (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setDeletingStudentId(null);
    if (targetStudent) {
      setStudentSuccessMsg(`Data siswa "${targetStudent.name}" berhasil dihapus.`);
      setTimeout(() => setStudentSuccessMsg(null), 3500);
    }
  };

  // EXCEL IMPORT HANDLERS
  const downloadExcelTemplate = () => {
    const templateData = [
      { "Nama Lengkap": "Ahmad Fauzi", "NIS": "20241001", "Kelas": "X-MIPA-1" },
      { "Nama Lengkap": "Budi Santoso", "NIS": "20241002", "Kelas": "X-MIPA-1" },
      { "Nama Lengkap": "Citra Dewi", "NIS": "20241003", "Kelas": "XI-MIPA-3" },
      { "Nama Lengkap": "Dewi Lestari", "NIS": "20241004", "Kelas": "XII-IPS-2" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Siswa");
    XLSX.writeFile(workbook, "Template_Daftar_Siswa.xlsx");
  };

  const handleExcelFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          setImportError("File Excel kosong atau tidak memiliki data.");
          return;
        }

        const defaultClass = selectedStudentClassFilter || classList[0] || "X-MIPA-1";
        const parsedStudents: { name: string; nis: string; className: string }[] = [];

        rawRows.forEach((row) => {
          let name = "";
          let nis = "";
          let studentClass = defaultClass;
          Object.keys(row).forEach((key) => {
            const trimmedKey = key.trim().toLowerCase();
            const val = String(row[key]).trim();

            if (trimmedKey.includes("nama") || trimmedKey.includes("name") || trimmedKey === "siswa") {
              if (val) name = val;
            } else if (trimmedKey.includes("nis") || trimmedKey.includes("nipd") || trimmedKey.includes("induk")) {
              if (val) nis = val;
            } else if (trimmedKey.includes("kelas") || trimmedKey.includes("class")) {
              if (val) studentClass = val;
            }
          });

          if (name) {
            parsedStudents.push({
              name,
              nis: nis || `${Math.floor(10000000 + Math.random() * 90000000)}`,
              className: studentClass
            });
          }
        });

        if (parsedStudents.length === 0) {
          setImportError("Tidak ditemukan nama siswa. Pastikan header kolom Excel memiliki tulisan 'Nama' atau 'Nama Lengkap'.");
          return;
        }

        setImportPreview({
          fileName: file.name,
          students: parsedStudents
        });
      } catch (err) {
        console.error(err);
        setImportError("Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv.");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset input
  };

  const handleConfirmImport = (mode: "merge" | "replace") => {
    if (!importPreview || importPreview.students.length === 0) return;

    // Check if new classes exist in Excel, register them automatically
    const uniqueExcelClasses = Array.from(new Set(importPreview.students.map(s => s.className)));
    setClassList(prev => {
      const existing = new Set(prev);
      const updated = [...prev];
      uniqueExcelClasses.forEach(c => {
        if (c && !existing.has(c)) {
          updated.push(c);
        }
      });
      return updated;
    });

    const newStudentObjects: Student[] = importPreview.students.map((s, idx) => ({
      id: `s-imp-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`,
      name: s.name,
      nis: s.nis,
      className: s.className
    }));

    if (mode === "replace") {
      const targetClassesSet = new Set(uniqueExcelClasses);
      setStudents(prev => [
        ...prev.filter(s => !targetClassesSet.has(s.className)),
        ...newStudentObjects
      ]);
    } else {
      setStudents(prev => [...prev, ...newStudentObjects]);
    }

    setImportSuccessMsg(`Berhasil mengimpor ${newStudentObjects.length} siswa dari ${importPreview.fileName}`);
    setImportPreview(null);
  };

  // 1. Absensi: Save/update attendance records
  const handleSaveAttendance = (newAttendance: Attendance[]) => {
    setAttendanceList(prev => {
      // Filter out existing records matching student ID + Date in payload to avoid duplicates
      const idsToReplace = new Set(newAttendance.map(n => n.id));
      const filtered = prev.filter(p => !idsToReplace.has(p.id));
      return [...filtered, ...newAttendance];
    });
  };

  // 2. Penjadwalan: Add a new weekly schedule item
  const handleAddSchedule = (newItem: Omit<ScheduleItem, "id">) => {
    const created: ScheduleItem = {
      ...newItem,
      id: `sch-${Date.now()}`
    };
    setSchedule(prev => [...prev, created]);
  };

  // 3. ManajemenTugas: Create, Edit, Delete an assignment
  const handleAddAssignment = (newItem: Omit<Assignment, "id">, applyToAll?: boolean) => {
    const classes = applyToAll ? classList : [newItem.className];
    
    const newAssignments: Assignment[] = [];
    const newSubmissions: Submission[] = [];
    
    classes.forEach(className => {
        const assignmentId = `assign-${Date.now()}-${className}`;
        const createdAssignment: Assignment = {
          ...newItem,
          className: className,
          id: assignmentId
        };
        newAssignments.push(createdAssignment);
        
        const targetStudents = students.filter(s => s.className === className);
        const seededSubmissions: Submission[] = targetStudents.map(student => ({
          id: `sub-${student.id}-${assignmentId}`,
          assignmentId: assignmentId,
          studentId: student.id,
          studentName: student.name,
          submittedDate: "",
          studentAnswer: "",
          score: null,
          status: "Belum Dikumpulkan"
        }));
        newSubmissions.push(...seededSubmissions);
    });

    setAssignments(prev => [...prev, ...newAssignments]);
    setSubmissions(prev => [...prev, ...newSubmissions]);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setAssignments(prev => prev.map(a => a.id === assignment.id ? assignment : a));
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    setSubmissions(prev => prev.filter(s => s.assignmentId !== assignmentId));
  };

  // 4. Penilaian: Apply a final grade (either AI suggested or teacher edited) to a student's record
  const handleApplyGrade = (assignmentId: string, studentId: string, score: number, aiAnalysis?: any) => {
    // A. Update Submission Record
    setSubmissions(prev => {
      return prev.map(sub => {
        if (sub.assignmentId === assignmentId && sub.studentId === studentId) {
          return {
            ...sub,
            score,
            status: "Selesai",
            aiAnalysis
          };
        }
        return sub;
      });
    });

    // B. Update Core Grade Book sheet state
    setGrades(prev => {
      const existIdx = prev.findIndex(g => g.studentId === studentId);
      if (existIdx > -1) {
        const updated = [...prev];
        updated[existIdx] = {
          ...updated[existIdx],
          assignmentScores: {
            ...updated[existIdx].assignmentScores,
            [assignmentId]: score
          }
        };
        return updated;
      } else {
        const studentInfo = students.find(s => s.id === studentId);
        const newRow: StudentGrade = {
          studentId,
          studentName: studentInfo?.name || "Siswa Baru",
          className: studentInfo?.className || CLASSES[0],
          assignmentScores: { [assignmentId]: score },
          examScore: 0
        };
        return [...prev, newRow];
      }
    });
  };

  // 4b. Bulk / Batch Apply Grades to Gradebook (Daftar Nilai)
  const handleApplyBatchGrades = (
    assignmentId: string,
    gradesList: Array<{ studentId: string; studentName: string; score: number; aiAnalysis?: any }>,
    targetType: "assignment" | "midterm" | "exam" | "character" = "assignment",
    newAssignmentTitle?: string,
    targetClass?: string
  ) => {
    let finalAssignmentId = assignmentId;

    // If teacher wants a new assignment column created in Gradebook
    if (targetType === "assignment" && (!finalAssignmentId || newAssignmentTitle)) {
      const actualTitle = newAssignmentTitle || `Penilaian AI - ${new Date().toLocaleDateString("id-ID")}`;
      const actualClass = targetClass || classList[0] || "X-MIPA-1";
      finalAssignmentId = `assign-ai-${Date.now()}`;

      const newAssignment: Assignment = {
        id: finalAssignmentId,
        title: actualTitle,
        className: actualClass,
        category: "Ulangan Harian",
        dueDate: new Date().toISOString().split("T")[0],
        maxScore: 100
      };

      setAssignments(prev => [...prev, newAssignment]);
    }

    // A. Update Submissions
    if (targetType === "assignment" && finalAssignmentId) {
      setSubmissions(prev => {
        const updated = [...prev];
        gradesList.forEach(item => {
          const subIdx = updated.findIndex(s => s.assignmentId === finalAssignmentId && s.studentId === item.studentId);
          if (subIdx > -1) {
            updated[subIdx] = {
              ...updated[subIdx],
              score: item.score,
              status: "Selesai",
              aiAnalysis: item.aiAnalysis
            };
          } else {
            updated.push({
              id: `sub-${item.studentId}-${finalAssignmentId}`,
              assignmentId: finalAssignmentId,
              studentId: item.studentId,
              studentName: item.studentName,
              submittedDate: new Date().toISOString().split("T")[0],
              studentAnswer: item.aiAnalysis?.analysis || "Jawaban dinilai oleh AI",
              score: item.score,
              status: "Selesai",
              aiAnalysis: item.aiAnalysis
            });
          }
        });
        return updated;
      });
    }

    // B. Update Core Grades (Daftar Nilai)
    setGrades(prev => {
      const updated = [...prev];
      gradesList.forEach(item => {
        const existIdx = updated.findIndex(g => g.studentId === item.studentId);
        if (existIdx > -1) {
          const curr = updated[existIdx];
          if (targetType === "midterm") {
            updated[existIdx] = { ...curr, midtermScore: item.score };
          } else if (targetType === "exam") {
            updated[existIdx] = { ...curr, examScore: item.score };
          } else if (targetType === "character") {
            updated[existIdx] = { ...curr, characterScore: item.score };
          } else {
            updated[existIdx] = {
              ...curr,
              assignmentScores: {
                ...curr.assignmentScores,
                [finalAssignmentId]: item.score
              }
            };
          }
        } else {
          const studentInfo = students.find(s => s.id === item.studentId);
          const newRow: StudentGrade = {
            studentId: item.studentId,
            studentName: item.studentName || studentInfo?.name || "Siswa",
            className: studentInfo?.className || targetClass || CLASSES[0],
            assignmentScores: targetType === "assignment" ? { [finalAssignmentId]: item.score } : {},
            midtermScore: targetType === "midterm" ? item.score : 0,
            examScore: targetType === "exam" ? item.score : 0,
            characterScore: targetType === "character" ? item.score : 85
          };
          updated.push(newRow);
        }
      });
      return updated;
    });
  };

  // 5. JurnalHarian: Write, edit, and delete learning journals
  const handleAddJournal = (newJournal: JournalEntry) => {
    setJournals(prev => [newJournal, ...prev]);
  };

  const handleEditJournal = (updatedJournal: JournalEntry) => {
    setJournals(prev => prev.map(j => j.id === updatedJournal.id ? updatedJournal : j));
  };

  const handleDeleteJournal = (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  // 6. DaftarNilai: Update individual cell inside spreadsheet
  const handleUpdateGradeCell = (studentId: string, type: string, value: number) => {
    setGrades(prev => {
      const existIdx = prev.findIndex(g => g.studentId === studentId);
      if (existIdx > -1) {
        const updated = [...prev];
        if (type === "exam") {
          updated[existIdx] = { ...updated[existIdx], examScore: value };
        } else if (type === "midterm") {
          updated[existIdx] = { ...updated[existIdx], midtermScore: value };
        } else if (type === "character") {
          updated[existIdx] = { ...updated[existIdx], characterScore: value };
        } else {
          updated[existIdx] = {
            ...updated[existIdx],
            assignmentScores: {
              ...updated[existIdx].assignmentScores,
              [type]: value
            }
          };
        }
        return updated;
      } else {
        const studentInfo = students.find(s => s.id === studentId);
        const newRow: StudentGrade = {
          studentId,
          studentName: studentInfo?.name || "Siswa Baru",
          className: studentInfo?.className || CLASSES[0],
          assignmentScores: (type === "exam" || type === "midterm" || type === "character") ? {} : { [type]: value },
          examScore: type === "exam" ? value : 0,
          midtermScore: type === "midterm" ? value : undefined,
          characterScore: type === "character" ? value : undefined
        };
        return [...prev, newRow];
      }
    });
  };

  // Reset Data Handler
  const handleResetData = () => {
    if (captchaValue !== captchaAnswer) {
      alert("Captcha salah! Coba lagi.");
      setCaptchaAnswer(Math.floor(Math.random() * 8999 + 1000).toString());
      setCaptchaValue("");
      return;
    }

    if (resetDataChoices.attendance) setAttendanceList([]);
    if (resetDataChoices.grades) setGrades([]);
    if (resetDataChoices.assignments) { setAssignments([]); setSubmissions([]); }
    if (resetDataChoices.journals) setJournals([]);
    if (resetDataChoices.schedule) setSchedule([]);
    if (resetDataChoices.students) setStudents([]);

    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
    setCaptchaAnswer(Math.floor(Math.random() * 8999 + 1000).toString());
    setCaptchaValue("");
    setResetDataChoices({
        attendance: false,
        grades: false,
        assignments: false,
        journals: false,
        schedule: false,
        students: false
    });
  };

  // Export Backup Handler
  const handleExportBackup = () => {
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      teacherProfile: {
        teacherName,
        nip,
        subject,
        currentMonth,
        currentWeek,
        institution,
        profilePhoto,
        homeroomClass
      },
      students,
      classList,
      attendanceList,
      grades,
      assignments,
      submissions,
      journals,
      schedule,
      homeroomNotes,
      homeVisits
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `eduasisten_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Restore Handler
  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || typeof json !== "object") {
          throw new Error("Format file cadangan tidak valid.");
        }

        if (json.teacherProfile) {
          if (json.teacherProfile.teacherName) setTeacherName(json.teacherProfile.teacherName);
          if (json.teacherProfile.nip !== undefined) setNip(json.teacherProfile.nip);
          if (json.teacherProfile.subject) setSubject(json.teacherProfile.subject);
          if (json.teacherProfile.currentMonth) setCurrentMonth(json.teacherProfile.currentMonth);
          if (json.teacherProfile.currentWeek) setCurrentWeek(json.teacherProfile.currentWeek);
          if (json.teacherProfile.institution) setInstitution(json.teacherProfile.institution);
          if (json.teacherProfile.profilePhoto !== undefined) setProfilePhoto(json.teacherProfile.profilePhoto);
          if (json.teacherProfile.homeroomClass) setHomeroomClass(json.teacherProfile.homeroomClass);
        }

        if (Array.isArray(json.students)) setStudents(json.students);
        if (Array.isArray(json.classList)) setClassList(json.classList);
        if (Array.isArray(json.attendanceList)) setAttendanceList(json.attendanceList);
        if (Array.isArray(json.grades)) setGrades(json.grades);
        if (Array.isArray(json.assignments)) setAssignments(json.assignments);
        if (Array.isArray(json.submissions)) setSubmissions(json.submissions);
        if (Array.isArray(json.journals)) setJournals(json.journals);
        if (Array.isArray(json.schedule)) setSchedule(json.schedule);
        if (Array.isArray(json.homeroomNotes)) setHomeroomNotes(json.homeroomNotes);
        if (Array.isArray(json.homeVisits)) setHomeVisits(json.homeVisits);

        setRestoreSuccess(true);
        setRestoreError("");
        setTimeout(() => setRestoreSuccess(false), 4000);
      } catch (err: any) {
        console.error(err);
        setRestoreError(err.message || "Gagal memulihkan data. Pastikan file JSON valid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Bridge navigation triggers from Dashboard quick clicks
  const handleQuickAction = (action: string) => {
    if (action === "create-journal") {
      setActiveTab("jurnal");
    } else if (action === "grade-essay") {
      setActiveTab("penilaian");
    } else if (action.startsWith("start-class-")) {
      setActiveTab("absensi");
    }
  };


  // ----------------------------------------------------
  // NAVIGATION MAPS
  // ----------------------------------------------------
  const navItems = [
    { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
    { id: "eduasisten", label: "EduAsisten AI", icon: Bot },
    { id: "walikelas", label: "Ruang Wali Kelas", icon: ShieldCheck },
    { id: "absensi", label: "Absensi Digital", icon: CheckSquare },
    { id: "penilaian", label: "Penilaian AI", icon: Cpu },
    { id: "jadwal", label: "Jadwal Kelas", icon: Calendar },
    { id: "tugas", label: "Kelola Tugas", icon: BookOpen },
    { id: "nilai", label: "Daftar Nilai", icon: FileSpreadsheet },
    { id: "jurnal", label: "Jurnal Harian", icon: BookOpenText }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-800 font-sans">
      
      {/* SIDEBAR: Desktop Left Menu Shell */}
      <aside className="hidden md:flex md:w-64 bg-indigo-700 flex-col justify-between p-6 shrink-0 relative z-20 text-white">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3" id="brand-logo">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <div className="w-5 h-5 bg-indigo-600 rounded-sm rotate-45 flex items-center justify-center">
                <GraduationCap size={12} className="text-white -rotate-45" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight font-display text-white">JANG GURU APP HUB</h1>
              <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Layanan Administrasi</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" id="desktop-nav-menu">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative cursor-pointer ${
                    isActive 
                      ? "text-white bg-white/10 shadow-xs" 
                      : "text-indigo-100 hover:text-white hover:bg-white/5"
                  }`}
                  id={`nav-item-${item.id}`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-lg"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon size={16} className={isActive ? "text-white" : "text-indigo-200"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === "penilaian" && globalGradingStatus.isGrading && (
                    <span className="flex items-center justify-center w-5 h-5 bg-amber-400 text-slate-900 rounded-full animate-pulse text-[9px] font-black shrink-0 shadow-sm" title="Proses Koreksi AI Aktif">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Dedicated Firestore Sync Button in Sidebar */}
          <div className="pt-2">
            <button
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-indigo-900/60 hover:bg-indigo-900 text-white border border-indigo-500/30 transition-all cursor-pointer shadow-xs group"
              title="Klik untuk membuka Pengaturan Sinkronisasi Realtime HP & Laptop"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  realtimeSyncStatus === "syncing" 
                    ? "bg-amber-400 animate-spin" 
                    : isRealtimeSyncEnabled 
                    ? "bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" 
                    : "bg-slate-400"
                }`} />
                <div className="text-left truncate">
                  <div className="text-[11px] font-black text-white truncate">HP ⇄ Laptop Sync</div>
                  <div className="text-[9px] text-indigo-300 font-medium truncate">
                    {lastSyncTime ? `Sync: ${lastSyncTime}` : "Firestore Aktif"}
                  </div>
                </div>
              </div>
              <Cloud size={15} className="text-emerald-300 shrink-0 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* User Card footer */}
        <div 
          className="border-t border-indigo-600/30 pt-5 flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors" 
          id="desktop-user-footer"
          onClick={() => setIsProfileModalOpen(true)}
          title="Pengaturan Profil & Sekolah"
        >
          <div className="w-10 h-10 bg-indigo-800 border border-indigo-600/30 text-white rounded-xl shadow-xs shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs">
            {profilePhoto ? (
              <img src={profilePhoto} alt={teacherName} className="w-full h-full object-cover" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="font-extrabold text-xs text-white truncate" title={teacherName}>{teacherName || "Nama Guru"}</p>
            <p className="text-[10px] text-indigo-200 font-medium truncate">{nip ? `NIP. ${nip}` : "Klik untuk atur NIP"}</p>
            <p className="text-[9px] text-indigo-300/80 font-semibold truncate">{institution ? institution.split('\n').pop() : "Nama Sekolah"}</p>
          </div>
        </div>
      </aside>

      {/* MOBILE SHELL: Top Header & Bottom Navigation Bar */}
      <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs" id="mobile-header">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-xl">
            <GraduationCap size={16} />
          </div>
          <span className="text-xs font-black tracking-tight text-slate-800 font-display">JANG GURU APP HUB</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile Background Grading Status Indicator */}
          {globalGradingStatus.isGrading && activeTab !== "penilaian" && (
            <button
              onClick={() => setActiveTab("penilaian")}
              className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-extrabold px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs animate-pulse"
              title="Koreksi AI Aktif di Latar Belakang"
            >
              <Cpu size={11} className="text-amber-600 animate-spin" />
              <span>AI</span>
            </button>
          )}

          {/* Mobile Firestore Sync Button */}
          <button
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Sinkronisasi Cloud HP ⇄ Laptop"
          >
            <span className={`w-2 h-2 rounded-full ${
              realtimeSyncStatus === "syncing" ? "bg-amber-500 animate-spin" : "bg-emerald-500 animate-pulse"
            }`} />
            <Cloud size={11} className="text-emerald-600" />
            <span className="font-extrabold">Sync</span>
          </button>

          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-1 rounded-lg truncate max-w-[85px] cursor-pointer flex items-center gap-1"
            title="Buka Pengaturan Profil & Sekolah"
          >
            <Building2 size={11} className="shrink-0 text-indigo-600" />
            <span className="truncate">{institution ? institution.split('\n').pop() : teacherName}</span>
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            id="mobile-hamburger"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            id="mobile-drawer-overlay"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-64 bg-indigo-700 h-full p-5 shadow-xl flex flex-col justify-between text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-indigo-600/30">
                  <div className="p-1.5 bg-white text-indigo-700 rounded-xl">
                    <GraduationCap size={16} />
                  </div>
                  <span className="text-xs font-black tracking-tight text-white font-display">JANG GURU APP HUB</span>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive 
                            ? "text-white bg-white/10" 
                            : "text-indigo-100 hover:text-white hover:bg-white/5"
                        }`}
                        id={`mobile-nav-item-${item.id}`}
                      >
                        <item.icon size={15} className={isActive ? "text-white" : "text-indigo-200"} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.id === "penilaian" && globalGradingStatus.isGrading && (
                          <span className="flex items-center justify-center w-5 h-5 bg-amber-400 text-slate-900 rounded-full animate-pulse text-[9px] font-black shrink-0 shadow-xs">
                            AI
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-2 border-t border-indigo-600/30 space-y-1">
                </div>
              </div>

              {/* Mobile Teacher Info Card */}
              <div 
                className="border-t border-indigo-600/30 pt-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                <div className="w-9 h-9 bg-indigo-800 text-white rounded-lg shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs border border-indigo-600/30">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={teacherName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-extrabold text-[11px] text-white truncate">{teacherName || "Guru"}</p>
                  <p className="text-[9px] text-indigo-200 font-semibold truncate">{nip ? `NIP. ${nip}` : "Pengaturan"}</p>
                  <p className="text-[9px] text-indigo-300/80 font-semibold truncate">{institution ? institution.split('\n').pop() : ""}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto" id="main-viewport-content">
        
        {/* Top Desktop Bar (Header metadata with premium look) */}
        <header className="hidden md:flex bg-white px-8 py-3.5 border-b border-slate-100 items-center justify-between sticky top-0 z-10 shadow-2xs" id="desktop-top-bar">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 tracking-tight whitespace-pre-line leading-snug">
                {institution || "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya"}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Mata Pelajaran: <strong className="text-indigo-600 font-bold">{subject || "EKONOMI"}</strong>
              </p>
            </div>
          </div>

          {/* Clock, Firestore Sync & Profile Summary */}
          <div className="flex items-center gap-3">
            {/* Background Grading Status Pill */}
            {globalGradingStatus.isGrading && activeTab !== "penilaian" && (
              <button 
                onClick={() => setActiveTab("penilaian")}
                className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold cursor-pointer shadow-xs animate-pulse transition-all"
                title="Koreksi AI Sedang Berjalan di Latar Belakang. Klik untuk membuka."
              >
                <Cpu size={14} className="text-amber-600 animate-spin" />
                <span>Koreksi AI Aktif: {globalGradingStatus.progressText || "Mengoreksi..."}</span>
              </button>
            )}

            {/* Real-time Ticking Clock */}
            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold shadow-xs">
              <Clock size={12} className="text-indigo-600" />
              <span>{currentTime.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
              <span>•</span>
              <span className="text-indigo-600">{currentTime.toLocaleTimeString("id-ID")}</span>
            </div>

            {/* Live Firestore Sync Status Button */}
            <button
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs group"
              title="Status Sinkronisasi Firestore Realtime Multi-Perangkat"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${
                realtimeSyncStatus === "syncing"
                  ? "bg-amber-500 animate-spin"
                  : isRealtimeSyncEnabled
                  ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-400/30"
                  : "bg-slate-400"
              }`} />
              <Cloud size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[11px] font-extrabold">
                  {realtimeSyncStatus === "syncing" ? "Menyinkronkan..." : "Cloud Live"}
                </span>
                <span className="text-[9px] text-emerald-600 font-medium">
                  {lastSyncTime ? `Pukul ${lastSyncTime}` : "HP ⇄ Laptop"}
                </span>
              </div>
            </button>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 pl-4 border-l border-slate-200 text-left cursor-pointer hover:opacity-85 transition-opacity"
              title="Klik untuk membuka Pengaturan Profil & Sekolah"
            >
              <div className="text-right">
                <p className="text-xs font-black text-slate-800">{teacherName || "Nama Guru"}</p>
                <p className="text-[10px] text-indigo-600 font-bold font-mono">
                  {nip ? `NIP. ${nip}` : "NIP belum diisi"}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0 overflow-hidden border border-indigo-200">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={teacherName} className="w-full h-full object-cover" />
                ) : (
                  teacherName ? teacherName.split(" ").map(n => n[0]).slice(0, 2).join("") : "GR"
                )}
              </div>
            </button>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT CONTENT WRAPPER */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto" id="tab-viewport-body">
          
          {/* Quick 1-Click Restore Banner if Data is Empty */}
          {students.length === 0 && (
            <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white border-2 border-amber-400/50 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Data Administrasi Masih Kosong</h4>
                  <p className="text-xs text-slate-600">
                    Klik tombol di samping untuk langsung mengisi data contoh lengkap (Daftar Siswa, Jadwal Mengajar, Nilai, Jurnal, Tugas & Wali Kelas) dan menyinkronkannya ke Firestore.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRestorePresets}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <RotateCcw size={14} />
                <span>Muat Data Contoh Lengkap Sekarang</span>
              </button>
            </div>
          )}

          {/* Keep Penilaian alive in the background to prevent losing state or interrupting background AI processes */}
          <div className={activeTab === "penilaian" ? "block" : "hidden"}>
            <Penilaian
              students={students}
              assignments={assignments}
              submissions={submissions}
              onApplyGrade={handleApplyGrade}
              onApplyBatchGrades={handleApplyBatchGrades}
              onNavigateToGradebook={() => {
                setActiveTab("daftarnilai");
              }}
              classList={classList}
              onGradingStateChange={handleGradingStateChange}
            />
          </div>

          <AnimatePresence mode="wait">
            {activeTab !== "penilaian" && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                id="active-tab-body"
              >
                {activeTab === "dashboard" && (
                  <Dashboard
                    schedule={schedule}
                    students={students}
                    journals={journals}
                    assignments={assignments}
                    attendanceList={attendanceList}
                    submissions={submissions}
                    grades={grades}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    teacherName={teacherName}
                    setTeacherName={setTeacherName}
                    onQuickAction={handleQuickAction}
                    classList={classList}
                  />
                )}

                {activeTab === "eduasisten" && (
                  <EduAsisten />
                )}

                {activeTab === "walikelas" && (
                  <WaliKelas
                    homeroomClass={homeroomClass}
                    setHomeroomClass={setHomeroomClass}
                    classList={classList}
                    students={students}
                    attendanceList={attendanceList}
                    assignments={assignments}
                    grades={grades}
                    teacherName={teacherName}
                    nip={nip}
                    institution={institution}
                    notes={homeroomNotes}
                    onAddNote={handleAddHomeroomNote}
                    onDeleteNote={handleDeleteHomeroomNote}
                    homeVisits={homeVisits}
                    onAddHomeVisit={handleAddHomeVisit}
                    onDeleteHomeVisit={handleDeleteHomeVisit}
                    onOpenSettings={() => {
                      setIsProfileModalOpen(true);
                      setSettingsTab("profile");
                    }}
                  />
                )}


                {activeTab === "absensi" && (
                  <Absensi
                    students={students}
                    attendanceList={attendanceList}
                    onSaveAttendance={handleSaveAttendance}
                    classList={classList}
                  />
                )}

              {activeTab === "jadwal" && (
                <Penjadwalan
                  schedule={schedule}
                  onAddSchedule={handleAddSchedule}
                  onImportSchedules={(newItems, mode) => {
                    const withIds: ScheduleItem[] = newItems.map((item, i) => ({
                      ...item,
                      id: `sch-imp-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`
                    }));
                    if (mode === "replace") {
                      setSchedule(withIds);
                    } else {
                      setSchedule(prev => [...prev, ...withIds]);
                    }
                  }}
                  onUpdateSchedule={(updatedItem) => {
                    setSchedule(prev => prev.map(s => s.id === updatedItem.id ? updatedItem : s));
                  }}
                  onDeleteSchedule={(id) => {
                    setSchedule(prev => prev.filter(s => s.id !== id));
                  }}
                  onClearSchedule={() => {
                    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh jadwal mengajar?")) {
                      setSchedule([]);
                    }
                  }}
                  classList={classList}
                />
              )}

              {activeTab === "tugas" && (
                <ManajemenTugas
                  students={students}
                  assignments={assignments}
                  submissions={submissions}
                  onAddAssignment={handleAddAssignment}
                  onEditAssignment={handleEditAssignment}
                  onDeleteAssignment={handleDeleteAssignment}
                  classList={classList}
                  onSelectSubmissionToGrade={(assignmentId, submissionId) => {
                    // Navigate directly to the grading tab & seed variables!
                    setActiveTab("penilaian");
                    // Wait briefly for component to modify then pre-select
                    setTimeout(() => {
                      const sel = document.getElementById("grade-assignment-select") as HTMLSelectElement;
                      if (sel) {
                        sel.value = assignmentId;
                        sel.dispatchEvent(new Event("change", { bubbles: true }));
                      }
                      const studSel = document.getElementById("grade-student-select") as HTMLSelectElement;
                      if (studSel) {
                        studSel.value = submissionId;
                        studSel.dispatchEvent(new Event("change", { bubbles: true }));
                      }
                    }, 50);
                  }}
                />
              )}

              {activeTab === "nilai" && (
                <DaftarNilai
                  students={students}
                  assignments={assignments}
                  grades={grades}
                  onUpdateGradeCell={handleUpdateGradeCell}
                  classList={classList}
                />
              )}

              {activeTab === "jurnal" && (
                <JurnalHarian
                  journals={journals}
                  onAddJournal={handleAddJournal}
                  onEditJournal={handleEditJournal}
                  onDeleteJournal={handleDeleteJournal}
                  classList={classList}
                  teacherProfile={teacherProfileObj}
                />
              )}
            </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Aesthetic footer copyright */}
        <footer className="text-center py-6 text-slate-400 text-[10px] font-semibold border-t border-slate-100 bg-white" id="applet-footer">
          <span>© 2026 SUPER APP GURU • SISTEM KEPENDIDIKAN REVOLUSIONER BERBASIS GOOGLE GEMINI AI</span>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAVIGATION RAIL: Premium feel and instant mobile reachability */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-2.5 z-40 shadow-lg" id="mobile-bottom-bar">
        {[
          { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
          { id: "eduasisten", label: "Asisten", icon: Bot },
          { id: "absensi", label: "Absen", icon: CheckSquare },
          { id: "penilaian", label: "AI", icon: Cpu },
          { id: "nilai", label: "Nilai", icon: FileSpreadsheet },
          { id: "profil", label: "Profil", icon: User }
        ].map((item) => {
          const isActive = item.id === "profil" ? isProfileModalOpen : activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "profil") {
                  setIsProfileModalOpen(true);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex flex-col items-center gap-1 text-[9px] font-black cursor-pointer transition-transform active:scale-95 relative ${
                isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
              id={`mobile-bottom-item-${item.id}`}
            >
              {item.id === "profil" && profilePhoto ? (
                <div className={`w-4 h-4 rounded-full overflow-hidden border ${isActive ? "border-indigo-600 ring-1 ring-indigo-400" : "border-slate-300"}`}>
                  <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="relative">
                  <item.icon size={16} className={isActive ? "text-indigo-500 scale-110" : "text-slate-400"} />
                  {item.id === "penilaian" && globalGradingStatus.isGrading && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  )}
                  {item.id === "penilaian" && globalGradingStatus.isGrading && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  )}
                </div>
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Spacer to prevent bottom bar overlapping content on mobile */}
      <div className="md:hidden h-14" />

      {/* PROFILE & SETTINGS MANAGEMENT MODAL */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Pengaturan & Kelola Data</h2>
                    <p className="text-xs text-slate-500 font-medium">Atur profil guru, daftar kelas, dan data siswa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-2xl my-4 gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => setSettingsTab("profile")}
                  className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    settingsTab === "profile" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <User size={14} /> Profil & Sekolah
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("classes")}
                  className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    settingsTab === "classes" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Building2 size={14} /> Kelola Kelas ({classList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("students")}
                  className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    settingsTab === "students" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users size={14} /> Siswa ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("backup")}
                  className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    settingsTab === "backup" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Download size={14} /> Cadangkan
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab("reset")}
                  className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    settingsTab === "reset" 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Trash2 size={14} /> Reset Data
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
                {settingsTab === "profile" && (
                  <div className="space-y-4">
                    {/* Profile Photo Upload Section */}
                    <div className="bg-gradient-to-r from-indigo-50/80 via-slate-50 to-indigo-50/50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-xs">
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md overflow-hidden border-2 border-white ring-2 ring-indigo-200/80">
                          {profilePhoto ? (
                            <img src={profilePhoto} alt={teacherName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={38} className="text-white/80" />
                          )}
                        </div>
                        <label 
                          htmlFor="modal-profile-photo-upload" 
                          className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer border border-white"
                          title="Unggah Foto Profil Baru"
                        >
                          <Camera size={14} />
                          <input 
                            id="modal-profile-photo-upload" 
                            type="file" 
                            accept="image/*" 
                            onChange={handleProfilePhotoChange} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      <div className="space-y-1.5 text-center sm:text-left flex-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-sm font-extrabold text-slate-800">Foto Profil Guru</h3>
                          {profilePhoto && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                              Tersimpan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Unggah foto profil resmi untuk ditampilkan di header aplikasi, sidebar, serta laporan administratif.
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <label 
                            htmlFor="modal-profile-photo-btn" 
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <FileUp size={13} /> {profilePhoto ? "Ganti Foto Profil" : "Unggah Foto Profil"}
                            <input 
                              id="modal-profile-photo-btn" 
                              type="file" 
                              accept="image/*" 
                              onChange={handleProfilePhotoChange} 
                              className="hidden" 
                            />
                          </label>

                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={handleRemoveProfilePhoto}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 size={13} /> Hapus Foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Lengkap & Gelar</label>
                      <input 
                        type="text" 
                        value={teacherName} 
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-semibold"
                        placeholder="Contoh: YUDI GINANJAR, S.Pd"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NIP</label>
                        <input 
                          type="text" 
                          value={nip} 
                          onChange={(e) => setNip(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          placeholder="Nomor Induk Pegawai"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mata Pelajaran Utama</label>
                        <input 
                          type="text" 
                          value={subject} 
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          placeholder="Contoh: EKONOMI"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kelas Binaan (Tugas Wali Kelas)</label>
                      <select
                        value={homeroomClass}
                        onChange={(e) => setHomeroomClass(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-bold text-indigo-700 cursor-pointer"
                      >
                        {classList.map(cls => (
                          <option key={cls} value={cls}>Wali Kelas {cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Instansi / Sekolah</label>

                      <textarea 
                        rows={2}
                        value={institution} 
                        onChange={(e) => setInstitution(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                        placeholder="Nama sekolah dan pemerintah daerah"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bulan Default Jurnal</label>
                        <input 
                          type="text" 
                          value={currentMonth} 
                          onChange={(e) => setCurrentMonth(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          placeholder="Contoh: JANUARI 2026"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Minggu Ke</label>
                        <input 
                          type="text" 
                          value={currentWeek} 
                          onChange={(e) => setCurrentWeek(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                          placeholder="Contoh: 2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CLASS MANAGEMENT */}
                {settingsTab === "classes" && (
                  <div className="space-y-5 py-2">
                    {/* Error and Success Banners */}
                    {classErrorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0 text-rose-600" />
                          <span>{classErrorMsg}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setClassErrorMsg(null)} 
                          className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {classSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                          <span>{classSuccessMsg}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setClassSuccessMsg(null)} 
                          className="text-emerald-400 hover:text-emerald-600 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Add class box */}
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                        <Plus size={14} /> Tambah Kelas Baru
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newClassNameInput}
                          onChange={(e) => setNewClassNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddClass(newClassNameInput);
                            }
                          }}
                          placeholder="cth: XI-IPA-3, XII-IPS-1, atau X-D4"
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddClass(newClassNameInput)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Plus size={14} /> Tambah
                        </button>
                      </div>
                    </div>

                    {/* Classes list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Daftar Kelas Terdaftar ({classList.length})
                        </label>
                        {classList.length > 0 && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Klik ikon tempat sampah untuk menghapus kelas
                          </span>
                        )}
                      </div>

                      {classList.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                          <Building2 size={28} className="mx-auto text-slate-400" />
                          <p className="text-xs font-bold text-slate-700">Belum ada kelas terdaftar</p>
                          <p className="text-[11px] text-slate-400">Gunakan kolom di atas untuk menambahkan kelas baru.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {classList.map((cls) => {
                            const classStudentCount = students.filter(s => s.className === cls).length;
                            const isEditing = editingClassName?.oldName === cls;
                            const isDeleting = deletingClassName === cls;

                            return (
                              <div 
                                key={cls}
                                className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl transition-all"
                              >
                                {isEditing ? (
                                  <div className="flex gap-2 items-center">
                                    <input 
                                      type="text" 
                                      value={editingClassName.newName}
                                      onChange={(e) => setEditingClassName({ ...editingClassName, newName: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleRenameClass(cls, editingClassName.newName);
                                        } else if (e.key === "Escape") {
                                          setEditingClassName(null);
                                        }
                                      }}
                                      className="px-3 py-1.5 bg-white border border-indigo-400 rounded-xl text-xs font-bold text-slate-800 flex-1 focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRenameClass(cls, editingClassName.newName)}
                                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                                      title="Simpan perubahan nama"
                                    >
                                      <Check size={14} /> Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingClassName(null)}
                                      className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : isDeleting ? (
                                  <div className="p-2 space-y-2.5">
                                    <div className="flex items-start gap-2.5">
                                      <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-0.5">
                                        <AlertTriangle size={16} />
                                      </div>
                                      <div className="flex-1 text-xs">
                                        <p className="font-bold text-rose-900">
                                          Hapus Kelas "{cls}"?
                                        </p>
                                        <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                                          {classStudentCount > 0 
                                            ? `Terdapat ${classStudentCount} siswa di kelas ini. Seluruh data siswa, nilai, jurnal, dan absensi di kelas "${cls}" akan ikut terhapus.`
                                            : `Kelas "${cls}" belum memiliki siswa. Kelas akan dihapus dari daftar aplikasi.`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60">
                                      <button
                                        type="button"
                                        onClick={() => setDeletingClassName(null)}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                      >
                                        Batal
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleExecuteDeleteClass(cls)}
                                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 size={13} /> Ya, Hapus Kelas
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs">
                                        {cls}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                                        <Users size={12} className="text-slate-400" />
                                        {classStudentCount} siswa
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeletingClassName(null);
                                          setEditingClassName({ oldName: cls, newName: cls });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                        title="Ubah nama kelas"
                                      >
                                        <Edit3 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingClassName(null);
                                          handlePromptDeleteClass(cls);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title={`Hapus kelas ${cls}`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: STUDENT MANAGEMENT */}
                {settingsTab === "students" && (
                  <div className="space-y-5 py-2">
                    {/* Error and Success Banners */}
                    {studentErrorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0 text-rose-600" />
                          <span>{studentErrorMsg}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setStudentErrorMsg(null)} 
                          className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {studentSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                          <span>{studentSuccessMsg}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setStudentSuccessMsg(null)} 
                          className="text-emerald-400 hover:text-emerald-600 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Class filter selector */}
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-slate-600 uppercase">Pilih Kelas:</label>
                      <select
                        value={selectedStudentClassFilter || classList[0] || ""}
                        onChange={(e) => setSelectedStudentClassFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
                      >
                        {classList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Add student box */}
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                        <Plus size={14} /> Tambah Siswa Ke Kelas {selectedStudentClassFilter || classList[0] || "-"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || classList[0]);
                            }
                          }}
                          placeholder="Nama Lengkap Siswa"
                          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                        <input 
                          type="text" 
                          value={newStudentNis}
                          onChange={(e) => setNewStudentNis(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || classList[0]);
                            }
                          }}
                          placeholder="NIS / NISN (Opsional)"
                          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || classList[0])}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Plus size={14} /> Tambahkan Siswa
                      </button>
                    </div>

                    {/* EXCEL IMPORT CARD */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <FileSpreadsheet size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Impor Siswa via Excel (.xlsx)</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Unggah berkas daftar siswa otomatis</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={downloadExcelTemplate}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                        >
                          <Download size={13} /> Unduh Template Excel
                        </button>
                      </div>

                      {/* Error Banner */}
                      {importError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                          <AlertCircle size={16} className="shrink-0" />
                          <span>{importError}</span>
                        </div>
                      )}

                      {/* Success Banner */}
                      {importSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                          <span>{importSuccessMsg}</span>
                        </div>
                      )}

                      {/* File upload input */}
                      <div>
                        <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                          <FileUp size={15} /> Pilih File Excel (.xlsx, .xls, .csv)
                          <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleExcelFileUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      {/* Import Preview Drawer */}
                      {importPreview && (
                        <div className="p-3.5 bg-white border border-indigo-200 rounded-xl space-y-3 mt-2 shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <FileType size={14} className="text-indigo-600" /> {importPreview.fileName}
                              </span>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Terbaca <strong className="text-indigo-600 font-bold">{importPreview.students.length}</strong> siswa
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setImportPreview(null)}
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          {/* Preview List */}
                          <div className="max-h-36 overflow-y-auto space-y-1 text-xs border border-slate-100 rounded-xl p-2 bg-slate-50/80">
                            {importPreview.students.slice(0, 10).map((s, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 px-1 border-b border-slate-200/50 last:border-0 text-[11px]">
                                <span className="font-semibold text-slate-700">{s.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-mono text-[10px]">NIS: {s.nis}</span>
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[10px]">{s.className}</span>
                                </div>
                              </div>
                            ))}
                            {importPreview.students.length > 10 && (
                              <p className="text-[10px] text-center text-slate-400 font-semibold pt-1">
                                + {importPreview.students.length - 10} siswa lainnya dalam file...
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmImport("merge")}
                              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              Gabungkan Data Siswa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmImport("replace")}
                              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              title="Ganti semua data siswa pada kelas terkait"
                            >
                              Ganti Siswa Kelas Ini
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Students list */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Daftar Siswa Kelas {selectedStudentClassFilter || classList[0] || "-"} (
                        {students.filter(s => s.className === (selectedStudentClassFilter || classList[0])).length} siswa)
                      </label>
                      
                      {students.filter(s => s.className === (selectedStudentClassFilter || classList[0])).length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
                          Belum ada siswa di kelas ini. Tambahkan siswa secara manual atau melalui impor Excel.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {students
                            .filter(s => s.className === (selectedStudentClassFilter || classList[0]))
                            .map((student) => {
                              const isEditing = editingStudent?.id === student.id;
                              const isDeleting = deletingStudentId === student.id;

                              return (
                                <div 
                                  key={student.id}
                                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl transition-all"
                                >
                                  {isEditing ? (
                                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                                      <input 
                                        type="text" 
                                        value={editingStudent.name}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                        className="px-3 py-1.5 bg-white border border-indigo-400 rounded-xl text-xs font-bold text-slate-800 flex-1 focus:outline-none"
                                        placeholder="Nama Siswa"
                                        autoFocus
                                      />
                                      <input 
                                        type="text" 
                                        value={editingStudent.nis}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, nis: e.target.value })}
                                        className="px-3 py-1.5 bg-white border border-indigo-400 rounded-xl text-xs font-bold text-slate-800 w-28 focus:outline-none"
                                        placeholder="NIS"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveStudentEdit(editingStudent)}
                                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                                        >
                                          <Check size={14} /> Simpan
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingStudent(null)}
                                          className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : isDeleting ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-xs text-rose-800">
                                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                                        <span>Hapus data siswa <strong>"{student.name}"</strong> (NIS: {student.nis})?</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => setDeletingStudentId(null)}
                                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExecuteDeleteStudent(student.id)}
                                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                                        >
                                          <Trash2 size={12} /> Hapus
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="font-bold text-xs text-slate-800">{student.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</p>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDeletingStudentId(null);
                                            setEditingStudent(student);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                          title="Ubah data siswa"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingStudent(null);
                                            setDeletingStudentId(student.id);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Hapus siswa"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: BACKUP & RESTORE */}
                {settingsTab === "backup" && (
                  <div className="space-y-6 py-2">
                    {/* Header Banner */}
                    <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl flex items-start gap-3.5 shadow-md relative overflow-hidden">
                      <div className="p-2.5 bg-white/10 border border-white/20 text-emerald-400 rounded-xl mt-0.5 shrink-0">
                        <Database size={22} />
                      </div>
                      <div className="space-y-1 relative z-10">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black tracking-tight text-white">
                            Pencadangan Data Harian & Google Drive
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            Otomatis Akhir Hari
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-200 leading-relaxed font-medium">
                          Setiap akhir hari, sistem secara otomatis mencadangkan seluruh data administrasi Anda (Siswa, Absensi, Nilai, Jurnal, Tugas) ke Database Cloud Firestore. Anda juga dapat mengunduh berkas cadangan untuk disimpan di Google Drive.
                        </p>
                      </div>
                    </div>

                    {restoreSuccess && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        <span>Data berhasil dipulihkan secara penuh!</span>
                      </div>
                    )}

                    {restoreError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                        <AlertCircle size={18} className="shrink-0 text-rose-600" />
                        <span>{restoreError}</span>
                      </div>
                    )}

                    {dailyBackupNotice && (
                      <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 border animate-in fade-in ${
                        dailyBackupNotice.type === "success" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-rose-50 border-rose-200 text-rose-900"
                      }`}>
                        {dailyBackupNotice.type === "success" ? (
                          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle size={18} className="shrink-0 text-rose-600" />
                        )}
                        <span>{dailyBackupNotice.message}</span>
                      </div>
                    )}

                    {/* SECTION 1: Automatic Daily Cloud Database Backup */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">1</span>
                            <h5 className="text-xs font-extrabold text-slate-900">Cadangan Harian ke Database Cloud</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-8">
                            Status pencadangan otomatis hari ini: {lastDailyBackupDate ? (
                              <strong className="text-emerald-700 font-bold">Terakhir disimpan tanggal {lastDailyBackupDate}</strong>
                            ) : (
                              <span className="text-amber-600 font-bold">Belum ada cadangan hari ini</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerDailyBackup(true)}
                          disabled={isDailyBackupSaving}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <UploadCloud size={16} className={isDailyBackupSaving ? "animate-bounce" : ""} />
                          {isDailyBackupSaving ? "Menyimpan Cadangan..." : "Cadangkan ke Database Sekarang"}
                        </button>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2.5">
                        <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Fitur Otomatis Akhir Hari:</strong> Aplikasi secara cerdas mendeteksi pergantian hari dan otomatis menyimpan snapshot data Anda ke Firestore Cloud setiap kali Anda menutup atau membuka aplikasi.
                        </span>
                      </div>
                    </div>

                    {/* SECTION 2: Google Drive & File JSON Backup */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">2</span>
                          <h5 className="text-xs font-extrabold text-slate-900">Cadangkan ke Google Drive / Berkas (.json)</h5>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-8">
                          Unduh berkas cadangan format JSON untuk disimpan di Google Drive sekolah atau penyimpanan lokal komputer/ponsel.
                        </p>
                      </div>

                      <div className="pl-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <Download size={16} /> Unduh Berkas (.json) untuk Google Drive
                        </button>

                        <a
                          href="https://drive.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <Cloud size={16} className="text-blue-600" /> Buka Google Drive
                        </a>
                      </div>

                      <div className="pl-8 text-[11px] text-slate-500 space-y-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/60">
                        <div className="font-bold text-indigo-950">Cara Simpan di Google Drive:</div>
                        <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                          <li>Klik <strong>Unduh Berkas (.json)</strong> di atas.</li>
                          <li>Buka <strong>drive.google.com</strong> di peramban Anda.</li>
                          <li>Seret (drag & drop) file JSON hasil unduhan ke folder Google Drive Anda untuk pengarsipan akhir hari.</li>
                        </ol>
                      </div>
                    </div>

                    {/* SECTION 3: Database Daily Backups History & 1-Click Restore */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">3</span>
                          <h5 className="text-xs font-extrabold text-slate-900">Riwayat Cadangan Harian di Database Cloud</h5>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{dailyBackupHistory.length} cadangan tersimpan</span>
                      </div>

                      {dailyBackupHistory.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-[11px] text-slate-400 italic">
                          Belum ada riwayat cadangan harian. Klik tombol "Cadangkan ke Database Sekarang" di atas untuk membuat cadangan pertama.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {dailyBackupHistory.map((item) => (
                            <div 
                              key={item.id}
                              className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="font-extrabold text-xs text-indigo-950 flex items-center gap-2">
                                  <span>{item.formattedDate}</span>
                                  <span className="px-2 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                    {item.deviceLabel}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-3">
                                  <span>👤 {item.studentCount} Siswa</span>
                                  <span>📊 {item.gradeCount} Nilai</span>
                                  <span>📖 {item.journalCount} Jurnal</span>
                                  <span>🏫 {item.classCount} Kelas</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRestoreDailyBackupFromCloud(item)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <RotateCcw size={12} /> Pulihkan (Restore)
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 4: Import Restore from File (.json) */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">4</span>
                          <h5 className="text-xs font-extrabold text-slate-900">Pulihkan Data dari Berkas File (.json)</h5>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-8">Muat kembali data dari berkas cadangan JSON yang diunduh sebelumnya atau dari Google Drive Anda.</p>
                      </div>
                      <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 transition-all rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer text-center group">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <FileUp size={20} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Klik untuk pilih berkas cadangan (.json)</span>
                          <span className="text-[10px] text-slate-400">Pilih file .json cadangan EduAsisten Anda</span>
                        </div>
                        <input 
                          type="file"
                          accept=".json"
                          onChange={handleImportBackup}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 5: RESET DATA */}
                {settingsTab === "reset" && (
                  <div className="space-y-4 py-2">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-xl mt-0.5">
                        <AlertCircle size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-900">Zona Berbahaya: Reset Data Aplikasi</h4>
                        <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                          Tindakan ini akan menghapus data yang Anda pilih secara permanen dari penyimpanan lokal browser. Data yang sudah dihapus tidak dapat dikembalikan.
                        </p>
                      </div>
                    </div>

                    {resetSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                        <span>Data terpilih berhasil direset!</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                        <span>Pilih Jenis Data yang Akan Dihapus:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const allTrue = Object.values(resetDataChoices).every(Boolean);
                            setResetDataChoices({
                              attendance: !allTrue,
                              grades: !allTrue,
                              assignments: !allTrue,
                              journals: !allTrue,
                              schedule: !allTrue,
                              students: !allTrue
                            });
                          }}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                        >
                          {Object.values(resetDataChoices).every(Boolean) ? "Batalkan Semua" : "Pilih Semua"}
                        </button>
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.attendance ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Data Kehadiran / Absensi</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.attendance}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, attendance: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.grades ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Data Penilaian / Nilai</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.grades}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, grades: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.assignments ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Tugas & Pengumpulan Siswa</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.assignments}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, assignments: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.journals ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Jurnal Mengajar Guru</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.journals}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, journals: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.schedule ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Jadwal Pelajaran</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.schedule}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, schedule: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>

                        <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resetDataChoices.students ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <span className="text-xs font-bold text-slate-700">Daftar Seluruh Siswa</span>
                          <input 
                            type="checkbox"
                            checked={resetDataChoices.students}
                            onChange={(e) => setResetDataChoices({ ...resetDataChoices, students: e.target.checked })}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Captcha Verification */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-rose-600" /> Verifikasi Keamanan (Ketik Kode di Bawah)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-slate-800 text-emerald-400 font-mono font-bold tracking-widest text-base rounded-xl select-none shadow-inner">
                          {captchaAnswer}
                        </div>
                        <input 
                          type="text"
                          value={captchaValue}
                          onChange={(e) => setCaptchaValue(e.target.value)}
                          placeholder="Masukkan 4 digit kode"
                          maxLength={4}
                          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold tracking-widest text-slate-800 focus:outline-none focus:border-rose-500 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCaptchaAnswer(Math.floor(Math.random() * 8999 + 1000).toString());
                            setCaptchaValue("");
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Acak ulang kode"
                        >
                          Acak
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetData}
                      disabled={!Object.values(resetDataChoices).some(Boolean) || captchaValue !== captchaAnswer}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        Object.values(resetDataChoices).some(Boolean) && captchaValue === captchaAnswer
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Trash2 size={15} /> Reset Data Terpilih Sekarang
                    </button>

                    <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                      <div className="text-xs text-slate-500 font-medium">Atau pulihkan seluruh data ke data contoh lengkap:</div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Muat ulang seluruh data contoh bawaan? Seluruh data akan diisi dengan data contoh lengkap.")) {
                            await handleRestorePresets();
                            setResetSuccess(true);
                            setTimeout(() => setResetSuccess(false), 3000);
                          }
                        }}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <RotateCcw size={15} /> Muat Ulang Data Contoh Lengkap (Preset Default)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="pt-4 border-t border-slate-100 mt-2">
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer text-xs"
                >
                  Selesai & Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FIRESTORE REALTIME CLOUD SYNC MODAL */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        syncKey={syncKey}
        onUpdateSyncKey={(newKey) => setSyncKey(newKey)}
        isRealtimeSyncEnabled={isRealtimeSyncEnabled}
        onToggleRealtimeSync={(enabled) => setIsRealtimeSyncEnabled(enabled)}
        onManualPush={() => pushDataToCloud(true)}
        onManualPull={handleManualPull}
        realtimeSyncStatus={realtimeSyncStatus}
        lastSyncTime={lastSyncTime}
        lastUpdatedBy={lastUpdatedBy}
        syncLogs={syncLogs}
        onClearLogs={() => {
          setSyncLogs([]);
          safeStorage.setItem("guru_sync_logs", []);
        }}
        onRestorePresets={handleRestorePresets}
        currentDataSummary={{
          studentsCount: students.length,
          attendanceCount: attendanceList.length,
          gradesCount: grades.length,
          journalsCount: journals.length,
          scheduleCount: schedule.length,
          notesCount: homeroomNotes.length + homeVisits.length
        }}
      />

      {/* REALTIME MULTI-DEVICE FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {cloudSyncNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 backdrop-blur-md text-xs font-bold"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Cloud size={18} className="animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="text-emerald-300 font-extrabold text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Sinkronisasi Firestore Realtime
              </div>
              <div className="text-slate-200 text-xs font-medium">{cloudSyncNotice.message}</div>
            </div>
            <button 
              onClick={() => setCloudSyncNotice(null)}
              className="text-slate-400 hover:text-white p-1 ml-2 cursor-pointer transition-colors"
              title="Tutup Notifikasi"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
