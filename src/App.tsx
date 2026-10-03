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
  Upload,
  FileText,
  Image as ImageIcon,
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
  ShieldAlert,
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
  RotateCcw,
  MonitorPlay
} from "lucide-react";

// Import types and presets
import { 
  QuestionBankItem,
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
  LearningMaterialNote
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
import { PRESET_LEARNING_MATERIALS } from "./data/presetMaterials";
import { useGoogleLogin } from '@react-oauth/google';
import { uploadBackupToDrive, listDriveBackups, downloadDriveBackup, pruneOldDriveBackups, sanitizeSyncKey, DriveBackupItem } from "./lib/driveSync";
import { formatDriveImageUrl } from "./lib/driveUtils";

// Import Firebase Firestore Realtime Multi-Device Sync & Daily Backups
import { 
  saveGuruDataToFirestore, 
  subscribeToGuruRealtimeData, 
  fetchGuruDataFromFirestore,
  fetchLatestGuruDataFromCloud,
  saveDailyBackupToFirestore,
  fetchDailyBackupHistoryFromFirestore,
  restoreDailyBackupFromFirestore,
  isFirestoreQuotaExceeded,
  DailyBackupItem,
  GuruSyncPayload,
  getDeviceLabel
} from "./lib/firestoreSync";
import CloudSyncModal, { SyncLogEntry } from "./components/CloudSyncModal";

import { safeStorage } from "./lib/safeStorage";
import { compressImage } from "./lib/imageUtils";
import { getLocalDateString } from "./lib/dateUtils";

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
import RuangBelajar from "./components/RuangBelajar";
import EvaluasiSiswa from "./components/EvaluasiSiswa";
import BankSoal from "./components/BankSoal";
import VerifikasiPengguna from "./components/VerifikasiPengguna";
import ManajemenDataSekolah from "./components/ManajemenDataSekolah";
import StudentDashboard from "./components/StudentDashboard";
import PengaturanSiswaModal from "./components/PengaturanSiswa";
import { DEFAULT_SUBJECTS, DEFAULT_SCHOOL_PROFILE } from "./data/masterDataPresets";
import { SubjectMaster, ClassMaster, SchoolMasterProfile } from "./types";

import { 
  subscribeToAuthChanges, 
  signOut, 
  AppUser, 
  userUpdateSelfProfile, 
  fetchMasterClassesFromAdmin, 
  saveMasterClassesToFirestore,
  fetchMasterStudentsFromAdmin,
  saveMasterStudentsToFirestore
} from "./lib/firebase";
import Login from "./components/Login";
import { Loader2, LogOut } from "lucide-react";

export default function App() {
  // Auth state
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

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
  const [headmasterName, setHeadmasterName] = useState<string>(() => {
    return safeStorage.getItem("guru_headmaster_name") || "Dr. Hj. Yanti Suryanti, M.Pd.";
  });
  const [headmasterNip, setHeadmasterNip] = useState<string>(() => {
    return safeStorage.getItem("guru_headmaster_nip") || "197005121995122001";
  });
  const [headmasterRank, setHeadmasterRank] = useState<string>(() => {
    return safeStorage.getItem("guru_headmaster_rank") || "Pembina Utama Muda, IV/c";
  });
  const [documentCity, setDocumentCity] = useState<string>(() => {
    return safeStorage.getItem("guru_document_city") || "Tasikmalaya";
  });
  const [schoolNpsn, setSchoolNpsn] = useState<string>(() => {
    return safeStorage.getItem("guru_school_npsn") || "20224510";
  });
  const [academicYear, setAcademicYear] = useState<string>(() => {
    return safeStorage.getItem("guru_academic_year") || "2025/2026 (Semester Genap)";
  });
  const [profilePhoto, setProfilePhoto] = useState<string>(() => {
    return safeStorage.getItem("guru_profile_photo") || "";
  });

  // Kop Surat States
  const [useKop, setUseKop] = useState<boolean>(() => {
    const saved = safeStorage.getItem("guru_kop_enabled");
    return saved === null ? true : saved === "true";
  });
  const [kopType, setKopType] = useState<"manual" | "image">(() => {
    const saved = safeStorage.getItem("guru_kop_type");
    return (saved === "manual" || saved === "image") ? saved : "manual";
  });
  const [kopManual, setKopManual] = useState(() => {
    const saved = safeStorage.getItem("guru_kop_manual");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved kop manual:", e);
      }
    }
    return {
      line1: "PEMERINTAH PROVINSI JAWA BARAT",
      line2: "DINAS PENDIDIKAN",
      line3: "SMA NEGERI 2 TASIKMALAYA",
      line4: "Jl. Ir. H. Juanda No. 93, Coblong, Kota Bandung | Telp: (022) 250123",
      line5: "Website: www.sman2tasikmalaya.sch.id | Email: info@sman2tasikmalaya.sch.id"
    };
  });
  const [kopImage, setKopImage] = useState<string>(() => {
    return safeStorage.getItem("guru_kop_image") || "";
  });
  const [kopLogo, setKopLogo] = useState<string>(() => {
    return safeStorage.getItem("guru_kop_logo") || "";
  });
  const [kopLogoPosition, setKopLogoPosition] = useState<"left" | "right" | "both" | "none">(() => {
    return (safeStorage.getItem("guru_kop_logo_position") as any) || "left";
  });
  const [kopLogoSize, setKopLogoSize] = useState<number>(() => {
    const saved = safeStorage.getItem("guru_kop_logo_size");
    return saved ? parseInt(saved, 10) : 55;
  });

  // Sync Kop Surat states to safeStorage
  useEffect(() => {
    safeStorage.setItem("guru_kop_enabled", useKop.toString());
    safeStorage.setItem("guru_kop_type", kopType);
    safeStorage.setItem("guru_kop_manual", JSON.stringify(kopManual));
    safeStorage.setItem("guru_kop_image", kopImage);
    safeStorage.setItem("guru_kop_logo", kopLogo);
    safeStorage.setItem("guru_kop_logo_position", kopLogoPosition);
    safeStorage.setItem("guru_kop_logo_size", kopLogoSize.toString());
    
    // Notify other components of the change
    window.dispatchEvent(new CustomEvent("guru_kop_settings_changed"));
  }, [useKop, kopType, kopManual, kopImage, kopLogo, kopLogoPosition, kopLogoSize]);

  // Open profile settings listener
  useEffect(() => {
    const handleOpenProfile = () => {
      setSettingsTab("profile");
      setIsProfileModalOpen(true);
    };
    window.addEventListener("open_profile_settings", handleOpenProfile);
    return () => window.removeEventListener("open_profile_settings", handleOpenProfile);
  }, []);

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
  const [isStudentSettingsOpen, setIsStudentSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "classes" | "students" | "reset" | "backup">("profile");

  // App customization states (Logo & Theme)
  const [appLogo, setAppLogo] = useState<string>(() => {
    return safeStorage.getItem("app_logo_url") || "";
  });
  const [appTheme, setAppTheme] = useState<string>(() => {
    return safeStorage.getItem("app_theme") || "classic-indigo";
  });

  useEffect(() => {
    if (appLogo) {
      safeStorage.setItem("app_logo_url", appLogo);
    } else {
      safeStorage.removeItem("app_logo_url");
    }
  }, [appLogo]);

  useEffect(() => {
    safeStorage.setItem("app_theme", appTheme);
  }, [appTheme]);

  // Backup & Restore States
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    type: "cloud" | "file" | "drive";
    backupItem?: DailyBackupItem;
    driveItem?: DriveBackupItem;
    fileData?: any;
    fileName?: string;
    details?: {
      studentCount: number;
      gradeCount: number;
      journalCount: number;
      classCount: number;
      attendanceCount: number;
      homeroomCount?: number;
      homeVisitsCount?: number;
      scheduleCount?: number;
      assignmentCount?: number;
      teacherName?: string;
    };
  } | null>(null);

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
  const [isSyncingAdminClasses, setIsSyncingAdminClasses] = useState(false);
  const [syncAdminClassesMsg, setSyncAdminClassesMsg] = useState<string | null>(null);

  const handleSyncAdminClasses = async () => {
    setIsSyncingAdminClasses(true);
    setSyncAdminClassesMsg(null);
    try {
      const adminClasses = await fetchMasterClassesFromAdmin();
      if (adminClasses && adminClasses.length > 0) {
        setClassList(prev => Array.from(new Set([...prev, ...adminClasses])));
        setSyncAdminClassesMsg(`Berhasil menyinkronkan ${adminClasses.length} kelas dari database Administrator!`);
      } else {
        setSyncAdminClassesMsg("Daftar kelas telah mutakhir.");
      }
    } catch (err) {
      console.warn("Failed to sync admin classes:", err);
      setSyncAdminClassesMsg("Gagal mengambil data kelas dari database admin.");
    } finally {
      setIsSyncingAdminClasses(false);
      setTimeout(() => setSyncAdminClassesMsg(null), 4000);
    }
  };

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

  // Sync teacher and headmaster profile to safeStorage
  useEffect(() => {
    safeStorage.setItem("guru_name", teacherName);
    safeStorage.setItem("guru_nip", nip);
    safeStorage.setItem("guru_subject", subject);
    safeStorage.setItem("guru_month", currentMonth);
    safeStorage.setItem("guru_week", currentWeek);
    safeStorage.setItem("guru_institution", institution);
    safeStorage.setItem("guru_headmaster_name", headmasterName);
    safeStorage.setItem("guru_headmaster_nip", headmasterNip);
    safeStorage.setItem("guru_headmaster_rank", headmasterRank);
    safeStorage.setItem("guru_document_city", documentCity);
    safeStorage.setItem("guru_school_npsn", schoolNpsn);
    safeStorage.setItem("guru_academic_year", academicYear);
  }, [teacherName, nip, subject, currentMonth, currentWeek, institution, headmasterName, headmasterNip, headmasterRank, documentCity, schoolNpsn, academicYear]);

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

  const sanitizeStudentsList = (rawList: Student[]): Student[] => {
    if (!Array.isArray(rawList)) return [];
    const seen = new Set<string>();
    return rawList
      .filter(Boolean)
      .map((s, idx) => {
        let id = s.id || `s-${Date.now()}-${idx}`;
        if (seen.has(id)) {
          id = `${id}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        }
        seen.add(id);
        return { ...s, id };
      });
  };

  // Dynamic Class List & Student Model (Backed by safeStorage with safe non-empty fallback)
  const [classList, setClassList] = useState<string[]>(() => {
    return loadStoredState<string[]>("guru_classes", CLASSES);
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const rawList = loadStoredState<Student[]>("guru_students", PRESET_STUDENTS);
    return sanitizeStudentsList(rawList);
  });

  useEffect(() => {
    // Run deduplication once on mount to clear out any duplicate IDs in safeStorage or existing state
    setStudents(prev => sanitizeStudentsList(prev));
  }, []);

  // Fetch master classes from Administrator database on mount
  useEffect(() => {
    let isMounted = true;
    fetchMasterClassesFromAdmin().then(adminClasses => {
      if (isMounted && adminClasses && adminClasses.length > 0) {
        setClassList(prev => {
          const merged = Array.from(new Set([...prev, ...adminClasses]));
          safeStorage.setItem("guru_classes", merged);
          return merged;
        });
      }
    }).catch(err => console.warn("Auto fetch admin classes warning:", err));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    safeStorage.setItem("guru_classes", classList);
    saveMasterClassesToFirestore(classList).catch(() => {});
  }, [classList]);

  const [isSyncingAdminStudents, setIsSyncingAdminStudents] = useState(false);
  const [syncAdminStudentsMsg, setSyncAdminStudentsMsg] = useState<string | null>(null);

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
    if (user?.role === 'admin' && unique.length > 0) {
      saveMasterStudentsToFirestore(unique).catch(() => {});
    }
  }, [students, user?.role]);

  const handleSyncStudentsFromAdmin = async (targetClasses?: string[]) => {
    setIsSyncingAdminStudents(true);
    setSyncAdminStudentsMsg(null);
    try {
      const classesToFetch = targetClasses && targetClasses.length > 0
        ? targetClasses
        : (user?.teachingClasses && user.teachingClasses.length > 0 ? user.teachingClasses : classList);

      const fetched = await fetchMasterStudentsFromAdmin(classesToFetch);
      if (fetched && fetched.length > 0) {
        setStudents(prev => {
          const map = new Map<string, Student>();
          prev.forEach(s => { if (s && s.id) map.set(s.id, s); });
          fetched.forEach(s => { if (s && s.id) map.set(s.id, s); });
          const merged = Array.from(map.values());
          safeStorage.setItem("guru_students", merged);
          return merged;
        });
        setSyncAdminStudentsMsg(`Berhasil menarik ${fetched.length} data siswa dari database Administrator!`);
      } else {
        setSyncAdminStudentsMsg("Tidak ditemukan data siswa baru dari database Admin untuk kelas terpilih.");
      }
    } catch (err) {
      console.warn("Gagal menyinkronkan data siswa dari Admin:", err);
      setSyncAdminStudentsMsg("Gagal menyinkronkan data siswa dari Administrator.");
    } finally {
      setIsSyncingAdminStudents(false);
      setTimeout(() => setSyncAdminStudentsMsg(null), 4000);
    }
  };

  const handleSaveStudentsToMaster = async (studentsList: Student[]) => {
    if (!studentsList || studentsList.length === 0) return;
    try {
      await saveMasterStudentsToFirestore(studentsList);
      setSyncAdminStudentsMsg(`Berhasil menyimpan ${studentsList.length} data siswa ke Master Administrator!`);
    } catch (err) {
      console.warn("Gagal menyimpan ke master:", err);
      setSyncAdminStudentsMsg("Gagal menyimpan data siswa ke Master Admin.");
    } finally {
      setTimeout(() => setSyncAdminStudentsMsg(null), 4000);
    }
  };

  // Master Academic Data (Subjects, Class Metadata, School Master Profile)
  const [masterSubjects, setMasterSubjects] = useState<SubjectMaster[]>(() => {
    return loadStoredState<SubjectMaster[]>("guru_master_subjects", DEFAULT_SUBJECTS);
  });

  const [classMetadata, setClassMetadata] = useState<Record<string, Partial<ClassMaster>>>(() => {
    return loadStoredState<Record<string, Partial<ClassMaster>>>("guru_class_metadata", {});
  });

  const [schoolMasterProfile, setSchoolMasterProfile] = useState<SchoolMasterProfile>(() => {
    return loadStoredState<SchoolMasterProfile>("guru_school_master_profile", {
      ...DEFAULT_SCHOOL_PROFILE,
      schoolName: institution || DEFAULT_SCHOOL_PROFILE.schoolName,
      headmasterName: headmasterName || DEFAULT_SCHOOL_PROFILE.headmasterName,
      headmasterNip: headmasterNip || DEFAULT_SCHOOL_PROFILE.headmasterNip,
      headmasterRank: headmasterRank || DEFAULT_SCHOOL_PROFILE.headmasterRank,
      academicYear: academicYear || DEFAULT_SCHOOL_PROFILE.academicYear,
      city: documentCity || DEFAULT_SCHOOL_PROFILE.city,
      npsn: schoolNpsn || DEFAULT_SCHOOL_PROFILE.npsn
    });
  });

  useEffect(() => {
    safeStorage.setItem("guru_master_subjects", masterSubjects);
  }, [masterSubjects]);

  useEffect(() => {
    safeStorage.setItem("guru_class_metadata", classMetadata);
  }, [classMetadata]);

  useEffect(() => {
    safeStorage.setItem("guru_school_master_profile", schoolMasterProfile);
  }, [schoolMasterProfile]);

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
    weekNum: currentWeek,
    institution,
    headmasterName,
    headmasterNip,
    headmasterRank,
    documentCity,
    schoolNpsn,
    academicYear
  }), [teacherName, nip, subject, currentMonth, currentWeek, institution, headmasterName, headmasterNip, headmasterRank, documentCity, schoolNpsn, academicYear]);

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

  // Persistent attendance date and active class to ensure no reset during navigation
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    return getLocalDateString();
  });

  const [attendanceClass, setAttendanceClass] = useState<string>(() => {
    return safeStorage.getItem("guru_attendance_class") || "";
  });

  // Homeroom Teacher (Wali Kelas) States
  const [homeroomClass, setHomeroomClass] = useState<string>(() => {
    return safeStorage.getItem("guru_homeroom_class") || "X-MIPA-1";
  });

  const [teachingClasses, setTeachingClasses] = useState<string[]>(() => {
    return loadStoredState<string[]>("guru_teaching_classes", CLASSES);
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

  // E-Learning Ruang Belajar Media Materials State
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>(() => {
    const defaultBank: QuestionBankItem[] = [
      {
        id: "qb-1",
        type: "pg",
        question: "Apakah yang dimaksud dengan ilmu ekonomi?",
        options: ["Ilmu tentang kekayaan", "Ilmu tentang kelangkaan", "Ilmu tentang uang", "Ilmu tentang perdagangan"],
        correctAnswer: "Ilmu tentang kelangkaan",
        points: 10,
        className: "Kelas 10",
        subject: "EKONOMI",
        bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "qb-2",
        type: "pg",
        question: "Berikut ini yang merupakan faktor produksi turunan adalah...",
        options: ["Tanah dan Tenaga Kerja", "Modal dan Kewirausahaan", "Tenaga Kerja dan Modal", "Alam dan Modal"],
        correctAnswer: "Modal dan Kewirausahaan",
        points: 10,
        className: "Kelas 10",
        subject: "EKONOMI",
        bab: "BAB 2: Masalah Pokok Ekonomi",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "qb-3",
        type: "benar_salah",
        question: "Hukum permintaan menyatakan bahwa semakin tinggi harga barang, maka semakin banyak jumlah barang yang diminta.",
        correctAnswer: "Salah",
        points: 10,
        className: "Kelas 10",
        subject: "EKONOMI",
        bab: "BAB 3: Mekanisme Pasar",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    return loadStoredState<QuestionBankItem[]>("guru_bank_soal", defaultBank);
  });

  useEffect(() => {
    safeStorage.setItem("guru_bank_soal", bankQuestions);
  }, [bankQuestions]);

  const [materials, setMaterials] = useState<LearningMaterial[]>(() => {
    return loadStoredState<LearningMaterial[]>("guru_materials", PRESET_LEARNING_MATERIALS);
  });

  useEffect(() => {
    safeStorage.setItem("guru_materials", materials);
  }, [materials]);

  const handleAddMaterial = (newMat: LearningMaterial) => {
    setMaterials(prev => [newMat, ...prev]);
  };

  const handleEditMaterial = (updatedMat: LearningMaterial) => {
    setMaterials(prev => prev.map(m => m.id === updatedMat.id ? updatedMat : m));
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleAddMaterialNote = (materialId: string, noteText: string, timestamp?: string) => {
    const newNote: LearningMaterialNote = {
      id: `n-${Date.now()}`,
      timestamp: timestamp || "Catatan Mengajar",
      content: noteText,
      createdAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        return {
          ...m,
          notes: [...(m.notes || []), newNote]
        };
      }
      return m;
    }));
  };

  // Master Restore Default Preset Function
  const handleRestorePresets = async () => {
    setClassList(CLASSES);
    setStudents(PRESET_STUDENTS);
    setSchedule(PRESET_SCHEDULE);
    setAssignments(PRESET_ASSIGNMENTS);
    setSubmissions(PRESET_SUBMISSIONS);
    setGrades(PRESET_GRADES);
    setJournals(PRESET_JOURNAL);
    setMaterials(PRESET_LEARNING_MATERIALS);
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
    safeStorage.setItem("guru_materials", PRESET_LEARNING_MATERIALS);
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
      materials: PRESET_LEARNING_MATERIALS,
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
    safeStorage.setItem("guru_teaching_classes", teachingClasses);
  }, [teachingClasses]);

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

  // Bi-directional synchronization: Ensure grades from Daftar Nilai (grades) are integrated into submissions (Kelola Tugas)
  useEffect(() => {
    if (!grades || grades.length === 0 || !assignments || assignments.length === 0) return;

    let hasChanges = false;
    const subMap = new Map<string, Submission>();
    submissions.forEach(s => {
      subMap.set(`${s.studentId}_${s.assignmentId}`, s);
    });

    const nextSubmissions = [...submissions];

    grades.forEach(gradeRow => {
      if (!gradeRow.assignmentScores) return;
      const studentInfo = students.find(s => s.id === gradeRow.studentId);
      const studentName = studentInfo?.name || gradeRow.studentName || "Siswa";

      Object.entries(gradeRow.assignmentScores).forEach(([assignId, scoreVal]) => {
        const targetAssignment = assignments.find(a => a.id === assignId);
        if (targetAssignment && scoreVal !== undefined && scoreVal !== null && !isNaN(scoreVal)) {
          const key = `${gradeRow.studentId}_${assignId}`;
          const existingSub = subMap.get(key);

          if (!existingSub) {
            hasChanges = true;
            const newSub: Submission = {
              id: `sub-${gradeRow.studentId}-${assignId}`,
              assignmentId: assignId,
              studentId: gradeRow.studentId,
              studentName,
              submittedDate: new Date().toISOString().split("T")[0],
              studentAnswer: "Dinilai melalui Daftar Nilai",
              score: scoreVal,
              status: "Selesai"
            };
            nextSubmissions.push(newSub);
            subMap.set(key, newSub);
          } else if (existingSub.score !== scoreVal || existingSub.status !== "Selesai") {
            hasChanges = true;
            const idx = nextSubmissions.findIndex(s => s.id === existingSub.id);
            if (idx > -1) {
              nextSubmissions[idx] = {
                ...nextSubmissions[idx],
                score: scoreVal,
                status: "Selesai",
                submittedDate: nextSubmissions[idx].submittedDate || new Date().toISOString().split("T")[0],
                studentAnswer: nextSubmissions[idx].studentAnswer || "Dinilai melalui Daftar Nilai"
              };
            }
          }
        }
      });
    });

    if (hasChanges) {
      setSubmissions(nextSubmissions);
    }
  }, [grades, assignments, students]);

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

  const [isRealtimeSyncEnabled, setIsRealtimeSyncEnabled] = useState<boolean>(false);

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

  // Auto-switch teacher database partition and profile when an approved Guru logs in
  useEffect(() => {
    if (user && user.role === 'guru') {
      const emailDbKey = user.databaseKey || (user.email ? `guru_${user.email.replace(/[^a-z0-9_]/g, '_')}` : undefined);
      if (emailDbKey && emailDbKey !== syncKey) {
        setSyncKey(emailDbKey);
        safeStorage.setItem("guru_sync_key", emailDbKey);
      }
      if (user.name) {
        setTeacherName(user.name);
        safeStorage.setItem("guru_name", user.name);
      }
      if (user.nip) {
        setNip(user.nip);
        safeStorage.setItem("guru_nip", user.nip);
      }
      if (user.subject) {
        setSubject(user.subject);
        safeStorage.setItem("guru_subject", user.subject);
      }
      if (user.institution) {
        setInstitution(user.institution);
        safeStorage.setItem("guru_institution", user.institution);
      }
      if (user.homeroomClass) {
        setHomeroomClass(user.homeroomClass);
        safeStorage.setItem("guru_homeroom_class", user.homeroomClass);
      }
      if (user.teachingClasses) {
        setTeachingClasses(user.teachingClasses);
        safeStorage.setItem("guru_teaching_classes", user.teachingClasses);
        setClassList(prev => {
          const combined = Array.from(new Set([...user.teachingClasses!, ...prev]));
          safeStorage.setItem("guru_classes", combined);
          return combined;
        });
      }
    }
  }, [user]);

  // Derived filters based on user role and assignments
  const isGuru = user?.role === 'guru';
  const isAdmin = user?.role === 'admin';

  const validTeacherClasses = useMemo(() => {
    return Array.from(new Set([...teachingClasses, homeroomClass].filter(Boolean) as string[]));
  }, [teachingClasses, homeroomClass]);

  const filteredClassList = useMemo(() => {
    if (isGuru) {
      return classList.filter(c => validTeacherClasses.includes(c));
    }
    return classList;
  }, [isGuru, classList, validTeacherClasses]);

  const filteredStudents = useMemo(() => {
    if (isGuru) {
      return students.filter(s => validTeacherClasses.includes(s.className));
    }
    return students;
  }, [isGuru, students, validTeacherClasses]);

  // Daily Backup States (Akhir Hari Backup to Cloud Firestore & Google Drive)
  const [dailyBackupHistory, setDailyBackupHistory] = useState<DailyBackupItem[]>([]);
  const [lastDailyBackupDate, setLastDailyBackupDate] = useState<string>(() => {
    return safeStorage.getItem("guru_last_daily_backup_date") || "";
  });
  const [dailyBackupScheduleTime, setDailyBackupScheduleTime] = useState<string>(() => {
    return safeStorage.getItem("guru_daily_backup_schedule_time") || "14:00";
  });
  const [isDailyBackupSaving, setIsDailyBackupSaving] = useState(false);
  const [dailyBackupNotice, setDailyBackupNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync ref flags to prevent circular echo updates and race-condition overwrites
  const isIncomingRemoteUpdateRef = useRef(false);
  const isPushingRef = useRef(false);
  const isInitialSyncCompletedRef = useRef(false);
  const lastRemoteUpdatedTimeRef = useRef<number>(0);
  const localLastUpdatedRef = useRef<number>(
    typeof window !== "undefined" && safeStorage.getItem("guru_local_last_updated")
      ? Number(safeStorage.getItem("guru_local_last_updated")) || 0
      : 0
  );
  const syncTimeoutRef = useRef<any>(null);

  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);

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

  // Helper to safely apply remote Firestore data into all React states
  const applyRemoteDataToState = (remoteData: GuruSyncPayload) => {
    isIncomingRemoteUpdateRef.current = true;
    if (remoteData.teacherName !== undefined) setTeacherName(remoteData.teacherName);
    if (remoteData.nip !== undefined) setNip(remoteData.nip);
    if (remoteData.subject !== undefined) setSubject(remoteData.subject);
    if (remoteData.institution !== undefined) setInstitution(remoteData.institution);
    if (remoteData.currentMonth !== undefined) setCurrentMonth(remoteData.currentMonth);
    if (remoteData.currentWeek !== undefined) setCurrentWeek(remoteData.currentWeek);
    if (remoteData.headmasterName !== undefined) setHeadmasterName(remoteData.headmasterName);
    if (remoteData.headmasterNip !== undefined) setHeadmasterNip(remoteData.headmasterNip);
    if (remoteData.headmasterRank !== undefined) setHeadmasterRank(remoteData.headmasterRank);
    if (remoteData.documentCity !== undefined) setDocumentCity(remoteData.documentCity);
    if (remoteData.schoolNpsn !== undefined) setSchoolNpsn(remoteData.schoolNpsn);
    if (remoteData.academicYear !== undefined) setAcademicYear(remoteData.academicYear);
    if (remoteData.profilePhoto !== undefined) setProfilePhoto(remoteData.profilePhoto);
    if (remoteData.homeroomClass !== undefined) setHomeroomClass(remoteData.homeroomClass);
    const isEmptyDatabase = Array.isArray(remoteData.students) && remoteData.students.length === 0 && (!remoteData.schedule || remoteData.schedule.length === 0);

    if (isEmptyDatabase) {
      setStudents(PRESET_STUDENTS);
      setSchedule(PRESET_SCHEDULE);
      setAssignments(PRESET_ASSIGNMENTS);
      setSubmissions(PRESET_SUBMISSIONS);
      setGrades(PRESET_GRADES);
      setJournals(PRESET_JOURNAL);
      setMaterials(PRESET_LEARNING_MATERIALS);
      setClassList(CLASSES);

      // Auto-save preset template data back to Firestore so cloud partition is populated
      saveGuruDataToFirestore(syncKey, {
        students: PRESET_STUDENTS,
        schedule: PRESET_SCHEDULE,
        assignments: PRESET_ASSIGNMENTS,
        submissions: PRESET_SUBMISSIONS,
        grades: PRESET_GRADES,
        journals: PRESET_JOURNAL,
        materials: PRESET_LEARNING_MATERIALS,
        classList: CLASSES
      }).catch(err => console.warn("Auto-sync preset data to empty cloud database error:", err));
    } else {
      if (Array.isArray(remoteData.classList)) setClassList(remoteData.classList);
      if (Array.isArray(remoteData.students)) setStudents(sanitizeStudentsList(remoteData.students));
      if (Array.isArray(remoteData.attendanceList)) setAttendanceList(remoteData.attendanceList);
      if (Array.isArray(remoteData.grades)) setGrades(remoteData.grades);
      if (Array.isArray(remoteData.schedule)) setSchedule(remoteData.schedule);
      if (Array.isArray(remoteData.assignments)) setAssignments(remoteData.assignments);
      if (Array.isArray(remoteData.submissions)) setSubmissions(remoteData.submissions);
      if (Array.isArray(remoteData.journals)) setJournals(remoteData.journals);
      if (Array.isArray(remoteData.homeroomNotes)) setHomeroomNotes(remoteData.homeroomNotes);
      if (Array.isArray(remoteData.homeVisits)) setHomeVisits(remoteData.homeVisits);
      if (Array.isArray(remoteData.materials)) setMaterials(remoteData.materials);
      if (Array.isArray(remoteData.bankQuestions)) setBankQuestions(remoteData.bankQuestions);
    }

    const updateTime = remoteData.lastUpdated || Date.now();
    lastRemoteUpdatedTimeRef.current = updateTime;
    localLastUpdatedRef.current = updateTime;
    safeStorage.setItem("guru_local_last_updated", String(updateTime));

    const timeStr = new Date(updateTime).toLocaleTimeString("id-ID");
    const dev = remoteData.updatedBy || "Cloud";
    setLastSyncTime(timeStr);
    setLastUpdatedBy(dev);
    safeStorage.setItem("guru_last_sync_time", timeStr);
    safeStorage.setItem("guru_last_updated_by", dev);
    setRealtimeSyncStatus("synced");
  };

  // Track local modifications to update local timestamp
  useEffect(() => {
    if (!isInitialSyncCompletedRef.current) return;
    if (isIncomingRemoteUpdateRef.current) return;
    if (isPushingRef.current) return;

    const now = Date.now();
    localLastUpdatedRef.current = now;
    safeStorage.setItem("guru_local_last_updated", String(now));
  }, [
    teacherName,
    nip,
    subject,
    institution,
    currentMonth,
    currentWeek,
    headmasterName,
    headmasterNip,
    headmasterRank,
    documentCity,
    schoolNpsn,
    academicYear,
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
    materials,
    bankQuestions
  ]);

  // Push local data to Firestore Cloud with Timestamp-Authoritative Protection
  const pushDataToCloud = async (isManual = false) => {
    if (!isInitialSyncCompletedRef.current && !isManual) return;
    if (!syncKey || !syncKey.trim()) return;

    if (isFirestoreQuotaExceeded()) {
      if (isManual) {
        addSyncLog("Batas kuota Cloud Firestore (free tier) telah tercapai hari ini. Data Anda tetap aman di penyimpanan lokal. Gunakan 'Unduh Cadangan JSON' untuk berkas cadangan offline.", "warning");
        setCloudSyncNotice({
          message: "Batas kuota Cloud tercapai. Data Anda aman tersimpan di penyimpanan lokal.",
          fromDevice: "Sistem"
        });
        setTimeout(() => setCloudSyncNotice(null), 5000);
      }
      return;
    }

    // Safety guard: check if Cloud has a NEWER dataset from any device before overwriting
    try {
      const checkRes = await fetchLatestGuruDataFromCloud(syncKey);
      if (checkRes.success && checkRes.data?.lastUpdated) {
        const cloudTime = checkRes.data.lastUpdated;
        const localTime = localLastUpdatedRef.current || Number(safeStorage.getItem("guru_local_last_updated")) || 0;

        if (cloudTime > localTime) {
          const remoteDev = checkRes.data.updatedBy || "perangkat lain";
          const timeStr = new Date(cloudTime).toLocaleTimeString("id-ID");
          addSyncLog(`Ditemukan data yang lebih baru di Cloud (${timeStr} dari ${remoteDev}). Data mutakhir otomatis dimuat agar tidak tertimpa.`, "warning", remoteDev);
          applyRemoteDataToState(checkRes.data);
          setCloudSyncNotice({
            message: `Data paling mutakhir (${timeStr} dari ${remoteDev}) dimuat agar tidak tertimpa`,
            fromDevice: remoteDev
          });
          setTimeout(() => setCloudSyncNotice(null), 5000);
          setTimeout(() => {
            isIncomingRemoteUpdateRef.current = false;
          }, 800);
          return;
        }
      }
    } catch {
      // offline or network error, proceed with local push
    }

    isPushingRef.current = true;
    setRealtimeSyncStatus("syncing");

    const pushTime = Date.now();
    localLastUpdatedRef.current = pushTime;
    safeStorage.setItem("guru_local_last_updated", String(pushTime));

    const payload: Partial<GuruSyncPayload> = {
      teacherName,
      nip,
      subject,
      institution,
      currentMonth,
      currentWeek,
      headmasterName,
      headmasterNip,
      headmasterRank,
      documentCity,
      schoolNpsn,
      academicYear,
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
      materials,
      bankQuestions,
      lastUpdated: pushTime
    };

    try {
      const res = await saveGuruDataToFirestore(syncKey, payload);
      if (res.success) {
        lastRemoteUpdatedTimeRef.current = res.timestamp;
        localLastUpdatedRef.current = res.timestamp;
        safeStorage.setItem("guru_local_last_updated", String(res.timestamp));

        const timeStr = new Date(res.timestamp).toLocaleTimeString("id-ID");
        const dev = getDeviceLabel();
        setLastSyncTime(timeStr);
        setLastUpdatedBy(dev);
        safeStorage.setItem("guru_last_sync_time", timeStr);
        safeStorage.setItem("guru_last_updated_by", dev);
        setRealtimeSyncStatus("synced");
        addSyncLog(`Data berhasil diunggah ke Cloud Firestore (${dev}, ${timeStr}). Ditetapkan sebagai data paling mutakhir.`, "success", dev);
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

  // Manual pull from Firestore Cloud (loads absolute newest data)
  const handleManualPull = async () => {
    if (isFirestoreQuotaExceeded()) {
      setRealtimeSyncStatus("error");
      addSyncLog("Batas kuota Cloud Firestore (free tier) telah tercapai hari ini. Menggunakan data lokal saat ini.", "warning");
      return;
    }

    setRealtimeSyncStatus("syncing");
    const res = await fetchLatestGuruDataFromCloud(syncKey);
    if (res.success && res.data) {
      applyRemoteDataToState(res.data);
      const dev = res.data.updatedBy || "Cloud";
      const timeStr = new Date(res.data.lastUpdated || Date.now()).toLocaleTimeString("id-ID");
      addSyncLog(`Data paling mutakhir (${timeStr} dari ${dev}) berhasil ditarik dan dimuat.`, "success", dev);
      setTimeout(() => {
        isIncomingRemoteUpdateRef.current = false;
      }, 800);
    } else {
      setRealtimeSyncStatus("error");
      addSyncLog(`Gagal menarik data: ${res.error || "Data belum ada"}`, "error");
    }
  };

  // Dedicated Auto-Sync toggle handler: when turning ON, pull first before syncing edits
  const handleToggleRealtimeSync = async (enabled: boolean) => {
    setIsRealtimeSyncEnabled(enabled);
    safeStorage.setItem("guru_realtime_sync_enabled", enabled ? "true" : "false");
    
    if (enabled) {
      addSyncLog("Auto-sync diaktifkan. Memuat data paling mutakhir dari Cloud...", "info");
      await handleManualPull();
    } else {
      addSyncLog("Auto-sync dinonaktifkan.", "info");
    }
  };

  // INITIAL STARTUP PRE-SYNC:
  // Selalu muat data paling mutakhir dari seluruh sumber Cloud
  useEffect(() => {
    let isCancelled = false;

    const performStartupSync = async () => {
      if (!syncKey || !syncKey.trim()) {
        isInitialSyncCompletedRef.current = true;
        setIsInitialSyncing(false);
        return;
      }

      if (isFirestoreQuotaExceeded()) {
        isInitialSyncCompletedRef.current = true;
        setIsInitialSyncing(false);
        setRealtimeSyncStatus("synced");
        addSyncLog("Batas kuota harian Cloud Firestore (free tier) telah tercapai. Menggunakan data lokal perangkat.", "info");
        return;
      }

      setIsInitialSyncing(true);
      setRealtimeSyncStatus("syncing");

      try {
        const res = await fetchLatestGuruDataFromCloud(syncKey);
        if (isCancelled) return;

        if (res.success && res.data) {
          const cloudData = res.data;
          const cloudTime = cloudData.lastUpdated || 0;
          const localTime = localLastUpdatedRef.current || Number(safeStorage.getItem("guru_local_last_updated")) || 0;
          const remoteDev = cloudData.updatedBy || "perangkat terakhir";
          const timeStr = new Date(cloudTime).toLocaleTimeString("id-ID");

          // Always load Cloud data if Cloud data is newer, equal, or local state is default/unmodified
          if (cloudTime >= localTime || localTime === 0) {
            applyRemoteDataToState(cloudData);
            addSyncLog(`Data paling mutakhir dimuat dari Cloud (${remoteDev}, ${timeStr})`, "success", remoteDev);

            setCloudSyncNotice({
              message: `Data paling mutakhir (${timeStr} dari ${remoteDev}) otomatis dimuat`,
              fromDevice: remoteDev
            });
            setTimeout(() => setCloudSyncNotice(null), 5000);
          } else {
            // Local data on this device is newer
            addSyncLog(`Data lokal di ${getDeviceLabel()} (${new Date(localTime).toLocaleTimeString("id-ID")}) lebih baru dari Cloud. Tekan "Unggah ke Cloud" untuk memperbarui.`, "info");
            setRealtimeSyncStatus("synced");
          }
        } else {
          setRealtimeSyncStatus("synced");
        }
      } catch (err: any) {
        console.warn("Sinkronisasi awal Cloud:", err);
        setRealtimeSyncStatus("error");
        addSyncLog(`Gagal sinkron awal: ${err?.message || err}`, "warning");
      } finally {
        setTimeout(() => {
          isIncomingRemoteUpdateRef.current = false;
          isInitialSyncCompletedRef.current = true;
          if (!isCancelled) {
            setIsInitialSyncing(false);
          }
        }, 500);
      }
    };

    performStartupSync();

    return () => {
      isCancelled = true;
    };
  }, [syncKey]);

  // Save sync key to local storage
  useEffect(() => {
    safeStorage.setItem("guru_sync_key", syncKey);
  }, [syncKey]);

  const [isDriveBackupSaving, setIsDriveBackupSaving] = useState(false);
  const [driveBackupNotice, setDriveBackupNotice] = useState<{type: "success" | "error", message: string} | null>(null);
  
  const [driveToken, setDriveToken] = useState<string>("");
  const [driveBackupHistory, setDriveBackupHistory] = useState<DriveBackupItem[]>([]);
  const [isFetchingDriveHistory, setIsFetchingDriveHistory] = useState(false);

  const loginForDriveList = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      setDriveToken(tokenResponse.access_token);
      try {
        setIsFetchingDriveHistory(true);
        const files = await listDriveBackups(tokenResponse.access_token, syncKey);
        setDriveBackupHistory(files);
        if (files.length === 0) {
          setDriveBackupNotice({ type: "success", message: "Koneksi Google Drive berhasil. Belum ada berkas cadangan ditemukan." });
        } else {
          setDriveBackupNotice({ type: "success", message: `Berhasil memuat ${files.length} berkas riwayat dari Google Drive` });
        }
      } catch (err: any) {
        setDriveBackupNotice({ type: "error", message: `Gagal memuat dari Drive: ${err.message}` });
      } finally {
        setIsFetchingDriveHistory(false);
      }
    },
    onError: (error) => {
      const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
      if (errStr.includes('popup_closed') || errStr.includes('popup-closed')) {
        console.info('Login Google Drive dibatalkan oleh pengguna.');
        setIsFetchingDriveHistory(false);
        return;
      }
      console.warn('Google Drive Login notice:', error);
      setDriveBackupNotice({ type: "error", message: "Gagal mengautentikasi dengan Google Drive. Pastikan pop-up login tidak diblokir peramban." });
      setIsFetchingDriveHistory(false);
    }
  });

  const loginForDriveBackup = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse) => {
      setDriveToken(tokenResponse.access_token);
      try {
        setIsDriveBackupSaving(true);
        setDriveBackupNotice({ type: "success", message: "Menghubungkan ke Google Drive..." });

        const payload: Partial<GuruSyncPayload> = {
          teacherName, nip, subject, institution, currentMonth, currentWeek,
          headmasterName, headmasterNip, headmasterRank, documentCity, schoolNpsn,
          academicYear, profilePhoto, homeroomClass, classList, students,
          attendanceList, grades, schedule, assignments, submissions, journals,
          homeroomNotes, homeVisits, materials
        };

        // File name using clean key and current date
        const dateStr = getLocalDateString();
        const cleanKey = sanitizeSyncKey(syncKey);
        const filename = `Backup_SuperAppGuru_${cleanKey}_${dateStr}.json`;

        await uploadBackupToDrive(tokenResponse.access_token, payload, filename);
        
        // Hapus cadangan yang lebih lama dari 5 hari secara otomatis
        await pruneOldDriveBackups(tokenResponse.access_token, syncKey);

        // Auto refresh drive history list after upload
        try {
          const files = await listDriveBackups(tokenResponse.access_token, syncKey);
          setDriveBackupHistory(files);
        } catch (refreshErr) {
          console.warn("Auto refresh history error:", refreshErr);
        }

        setDriveBackupNotice({ type: "success", message: `Backup berhasil disimpan ke Google Drive dengan nama: ${filename}` });
      } catch (err: any) {
        setDriveBackupNotice({ type: "error", message: `Gagal mencadangkan ke Drive: ${err.message}` });
      } finally {
        setIsDriveBackupSaving(false);
      }
    },
    onError: (error) => {
      const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
      if (errStr.includes('popup_closed') || errStr.includes('popup-closed')) {
        console.info('Backup Google Drive dibatalkan oleh pengguna.');
        setIsDriveBackupSaving(false);
        return;
      }
      console.warn('Google Drive Login notice:', error);
      setDriveBackupNotice({ type: "error", message: "Gagal mengautentikasi dengan Google Drive. Pastikan pop-up login tidak diblokir peramban." });
      setIsDriveBackupSaving(false);
    }
  });

  // Daily Backup Handlers (Akhir Hari Backup)
  const triggerDailyBackup = useCallback(async (isManual = false, customTimeLabel?: string) => {
    if (!syncKey || !syncKey.trim()) {
      if (isManual) {
        setDailyBackupNotice({ type: "error", message: "Kode sinkronisasi belum diatur." });
      }
      return;
    }

    if (isFirestoreQuotaExceeded()) {
      setIsDailyBackupSaving(false);
      if (isManual) {
        setDailyBackupNotice({
          type: "error",
          message: "Batas kuota harian Cloud Firestore (free tier) telah tercapai. Data Anda tetap tersimpan aman di lokal HP/Laptop. Silakan unduh cadangan via tombol 'Unduh Cadangan (File JSON)'."
        });
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
      headmasterName,
      headmasterNip,
      headmasterRank,
      documentCity,
      schoolNpsn,
      academicYear,
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
      materials,
      bankQuestions
    };

    const res = await saveDailyBackupToFirestore(syncKey, payload, undefined, customTimeLabel);
    setIsDailyBackupSaving(false);

    if (res.success) {
      setLastDailyBackupDate(res.dateStr);
      safeStorage.setItem("guru_last_daily_backup_date", res.dateStr);
      const timeDisplay = res.backupTime ? ` - Pukul ${res.backupTime}` : "";
      const sizeDisplay = res.totalSizeKB ? ` (${res.totalSizeKB >= 1024 ? `${(res.totalSizeKB / 1024).toFixed(2)} MB` : `${res.totalSizeKB} KB`})` : "";
      setDailyBackupNotice({
        type: "success",
        message: `Cadangan data harian (${res.dateStr}${timeDisplay}${sizeDisplay}) berhasil disimpan ke Cloud Database!`
      });
      addSyncLog(`Cadangan harian ${res.dateStr} (${res.backupTime || "14:00 WIB"}${sizeDisplay}) tersimpan di Database Cloud`, "success");

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
  }, [syncKey, teacherName, nip, subject, institution, currentMonth, currentWeek, headmasterName, headmasterNip, headmasterRank, documentCity, schoolNpsn, academicYear, profilePhoto, homeroomClass, classList, students, attendanceList, grades, schedule, assignments, submissions, journals, homeroomNotes, homeVisits, materials, bankQuestions]);

  const triggerDailyBackupRef = useRef(triggerDailyBackup);
  triggerDailyBackupRef.current = triggerDailyBackup;

  // Auto daily backup runner (scheduled check e.g., 14:00 / Jam 2 Siang)
  useEffect(() => {
    if (!syncKey || !syncKey.trim()) return;

    if (!isFirestoreQuotaExceeded()) {
      fetchDailyBackupHistoryFromFirestore(syncKey).then(hist => {
        if (hist.success) {
          setDailyBackupHistory(hist.backups);
        }
      });
    }

    const checkAndRunDailyBackup = () => {
      if (isFirestoreQuotaExceeded()) return;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      const [schedHours, schedMinutes] = (dailyBackupScheduleTime || "14:00").split(":").map(Number);
      const isPastOrAtScheduleTime = (currentHours > schedHours) || (currentHours === schedHours && currentMinutes >= (schedMinutes || 0));

      const lastSaved = safeStorage.getItem("guru_last_daily_backup_date");
      const lastAttempt = safeStorage.getItem("guru_daily_backup_last_attempt_date");
      const lastAttemptTime = Number(safeStorage.getItem("guru_daily_backup_last_attempt_time")) || 0;

      // Auto trigger if not backed up today and time has passed schedule (e.g. 14:00),
      // with cooldown check (max 1 attempt per 60 minutes) to avoid repeated write loops on failure
      if (lastSaved !== todayStr && lastAttempt !== todayStr && isPastOrAtScheduleTime && (Date.now() - lastAttemptTime > 60 * 60 * 1000)) {
        safeStorage.setItem("guru_daily_backup_last_attempt_date", todayStr);
        safeStorage.setItem("guru_daily_backup_last_attempt_time", String(Date.now()));
        triggerDailyBackupRef.current(false, `${dailyBackupScheduleTime} WIB (Otomatis)`);
      }
    };

    // Check immediately on mount/load
    checkAndRunDailyBackup();

    // Check periodically every 5 minutes (300,000 ms) instead of 30 seconds
    const interval = setInterval(checkAndRunDailyBackup, 300000);
    return () => clearInterval(interval);
  }, [syncKey, dailyBackupScheduleTime]);

  // Core Restore Application Logic (Handles both Cloud Snapshots and File Imports)
  const applyRestoredData = useCallback((data: any, sourceTitle: string) => {
    if (!data || typeof data !== "object") {
      throw new Error("Data cadangan kosong atau tidak memiliki format yang valid.");
    }

    isIncomingRemoteUpdateRef.current = true;

    // Extract profile fields (support nested teacherProfile or flat top-level)
    const profile = data.teacherProfile || data;
    const tName = profile.teacherName || data.teacherName;
    const tNip = profile.nip !== undefined ? profile.nip : data.nip;
    const tSubject = profile.subject || data.subject;
    const tInstitution = profile.institution || data.institution;
    const tMonth = profile.currentMonth || data.currentMonth;
    const tWeek = profile.currentWeek || data.currentWeek;
    const tHeadmasterName = profile.headmasterName || data.headmasterName;
    const tHeadmasterNip = profile.headmasterNip !== undefined ? profile.headmasterNip : data.headmasterNip;
    const tHeadmasterRank = profile.headmasterRank || data.headmasterRank;
    const tDocumentCity = profile.documentCity || data.documentCity;
    const tSchoolNpsn = profile.schoolNpsn || data.schoolNpsn;
    const tAcademicYear = profile.academicYear || data.academicYear;
    const tPhoto = profile.profilePhoto !== undefined ? profile.profilePhoto : data.profilePhoto;
    const tHomeroom = profile.homeroomClass || data.homeroomClass;

    if (tName) {
      setTeacherName(tName);
      safeStorage.setItem("guru_name", tName);
    }
    if (tNip !== undefined) {
      setNip(tNip);
      safeStorage.setItem("guru_nip", tNip);
    }
    if (tSubject) {
      setSubject(tSubject);
      safeStorage.setItem("guru_subject", tSubject);
    }
    if (tInstitution) {
      setInstitution(tInstitution);
      safeStorage.setItem("guru_institution", tInstitution);
    }
    if (tMonth) {
      setCurrentMonth(tMonth);
      safeStorage.setItem("guru_month", tMonth);
    }
    if (tWeek) {
      setCurrentWeek(tWeek);
      safeStorage.setItem("guru_week", tWeek);
    }
    if (tHeadmasterName) {
      setHeadmasterName(tHeadmasterName);
      safeStorage.setItem("guru_headmaster_name", tHeadmasterName);
    }
    if (tHeadmasterNip !== undefined) {
      setHeadmasterNip(tHeadmasterNip);
      safeStorage.setItem("guru_headmaster_nip", tHeadmasterNip);
    }
    if (tHeadmasterRank) {
      setHeadmasterRank(tHeadmasterRank);
      safeStorage.setItem("guru_headmaster_rank", tHeadmasterRank);
    }
    if (tDocumentCity) {
      setDocumentCity(tDocumentCity);
      safeStorage.setItem("guru_document_city", tDocumentCity);
    }
    if (tSchoolNpsn) {
      setSchoolNpsn(tSchoolNpsn);
      safeStorage.setItem("guru_school_npsn", tSchoolNpsn);
    }
    if (tAcademicYear) {
      setAcademicYear(tAcademicYear);
      safeStorage.setItem("guru_academic_year", tAcademicYear);
    }
    if (tPhoto !== undefined) {
      setProfilePhoto(tPhoto);
      safeStorage.setItem("guru_profile_photo", tPhoto);
    }
    if (tHomeroom) {
      setHomeroomClass(tHomeroom);
      safeStorage.setItem("guru_homeroom_class", tHomeroom);
    }

    // Extract arrays (support both camelCase and alternate standard keys)
    const rawClasses = Array.isArray(data.classList) ? data.classList : (Array.isArray(data.classes) ? data.classes : null);
    if (rawClasses && rawClasses.length > 0) {
      setClassList(rawClasses);
      safeStorage.setItem("guru_classes", rawClasses);
    }

    const rawStudents = Array.isArray(data.students) ? data.students : null;
    if (rawStudents) {
      const unique = sanitizeStudentsList(rawStudents);
      setStudents(unique);
      safeStorage.setItem("guru_students", unique);
    }

    const rawAttendance = Array.isArray(data.attendanceList) ? data.attendanceList : (Array.isArray(data.attendance) ? data.attendance : null);
    if (rawAttendance) {
      setAttendanceList(rawAttendance);
      safeStorage.setItem("guru_attendance", rawAttendance);
    }

    const rawGrades = Array.isArray(data.grades) ? data.grades : null;
    if (rawGrades) {
      setGrades(rawGrades);
      safeStorage.setItem("guru_grades", rawGrades);
    }

    const rawSchedule = Array.isArray(data.schedule) ? data.schedule : null;
    if (rawSchedule) {
      setSchedule(rawSchedule);
      safeStorage.setItem("guru_schedule", rawSchedule);
    }

    const rawAssignments = Array.isArray(data.assignments) ? data.assignments : null;
    if (rawAssignments) {
      setAssignments(rawAssignments);
      safeStorage.setItem("guru_assignments", rawAssignments);
    }

    const rawSubmissions = Array.isArray(data.submissions) ? data.submissions : null;
    if (rawSubmissions) {
      setSubmissions(rawSubmissions);
      safeStorage.setItem("guru_submissions", rawSubmissions);
    }

    const rawJournals = Array.isArray(data.journals) ? data.journals : null;
    if (rawJournals) {
      setJournals(rawJournals);
      safeStorage.setItem("guru_journals", rawJournals);
    }

    const rawNotes = Array.isArray(data.homeroomNotes) ? data.homeroomNotes : (Array.isArray(data.notes) ? data.notes : null);
    if (rawNotes) {
      setHomeroomNotes(rawNotes);
      safeStorage.setItem("guru_homeroom_notes", rawNotes);
    }

    const rawVisits = Array.isArray(data.homeVisits) ? data.homeVisits : (Array.isArray(data.visits) ? data.visits : null);
    if (rawVisits) {
      setHomeVisits(rawVisits);
      safeStorage.setItem("guru_home_visits", rawVisits);
    }

    const summaryParts = [
      rawStudents ? `${rawStudents.length} Siswa` : null,
      rawAttendance ? `${rawAttendance.length} Absensi` : null,
      (rawNotes || rawVisits) ? `${(rawNotes?.length || 0) + (rawVisits?.length || 0)} Kegiatan Wali Kelas` : null,
      rawGrades ? `${rawGrades.length} Nilai` : null,
      rawJournals ? `${rawJournals.length} Jurnal` : null,
      rawClasses ? `${rawClasses.length} Kelas` : null,
      tName ? `Profil ${tName}` : null
    ].filter(Boolean);

    const detailMsg = `Data berhasil dipulihkan dari ${sourceTitle}${summaryParts.length > 0 ? ` (${summaryParts.join(", ")})` : ""}!`;
    setRestoreSuccessMsg(detailMsg);
    setRestoreErrorMsg(null);
    addSyncLog(detailMsg, "success");

    // Automatically trigger cloud push after 600ms so connected devices receive restored dataset
    setTimeout(() => {
      pushDataToCloud(true);
    }, 600);
  }, [syncKey, pushDataToCloud]);

  // Open confirmation modal for Cloud Restore
  const handleOpenCloudRestoreConfirm = (backupItem: DailyBackupItem) => {
    setRestoreErrorMsg(null);
    setRestoreSuccessMsg(null);
    setConfirmRestoreModal({
      isOpen: true,
      type: "cloud",
      backupItem,
      details: {
        studentCount: backupItem.studentCount || 0,
        gradeCount: backupItem.gradeCount || 0,
        journalCount: backupItem.journalCount || 0,
        classCount: backupItem.classCount || 0,
        attendanceCount: backupItem.attendanceCount || 0,
        homeroomCount: backupItem.homeroomCount || 0,
        homeVisitsCount: backupItem.homeVisitsCount || 0,
        scheduleCount: backupItem.scheduleCount || 0,
        assignmentCount: backupItem.assignmentCount || 0,
        teacherName: backupItem.teacherName || teacherName || "Guru"
      }
    });
  };

  // Process & preview imported JSON file
  const handleProcessImportFile = (file: File) => {
    if (!file) return;
    setRestoreErrorMsg(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        if (!json || typeof json !== "object") {
          throw new Error("Format file .json tidak valid.");
        }

        const profile = json.teacherProfile || json;
        const sCount = Array.isArray(json.students) ? json.students.length : 0;
        const gCount = Array.isArray(json.grades) ? json.grades.length : 0;
        const jCount = Array.isArray(json.journals) ? json.journals.length : 0;
        const cCount = Array.isArray(json.classList || json.classes) ? (json.classList || json.classes).length : 0;
        const aCount = Array.isArray(json.attendanceList || json.attendance) ? (json.attendanceList || json.attendance).length : 0;
        const hCount = Array.isArray(json.homeroomNotes || json.notes) ? (json.homeroomNotes || json.notes).length : 0;
        const hvCount = Array.isArray(json.homeVisits || json.visits) ? (json.homeVisits || json.visits).length : 0;
        const schCount = Array.isArray(json.schedule) ? json.schedule.length : 0;
        const assignCount = Array.isArray(json.assignments) ? json.assignments.length : 0;

        setConfirmRestoreModal({
          isOpen: true,
          type: "file",
          fileData: json,
          fileName: file.name,
          details: {
            studentCount: sCount,
            gradeCount: gCount,
            journalCount: jCount,
            classCount: cCount,
            attendanceCount: aCount,
            homeroomCount: hCount,
            homeVisitsCount: hvCount,
            scheduleCount: schCount,
            assignmentCount: assignCount,
            teacherName: profile.teacherName || json.teacherName || "Guru"
          }
        });
      } catch (err: any) {
        console.error("File parse error:", err);
        setRestoreErrorMsg(err?.message || "Berkas tidak dapat dibaca. Pastikan memilih berkas .json cadangan EduAsisten yang valid.");
      }
    };
    reader.readAsText(file);
  };

  // Execute restore after user confirms in the modal
  const handleExecuteRestore = async () => {
    if (!confirmRestoreModal) return;
    setIsRestoringData(true);
    setRestoreErrorMsg(null);

    try {
      if (confirmRestoreModal.type === "cloud" && confirmRestoreModal.backupItem) {
        const item = confirmRestoreModal.backupItem;
        const res = await restoreDailyBackupFromFirestore(syncKey, item.dateStr || item.id);
        if (res.success && res.data) {
          applyRestoredData(res.data, `Cloud Database (${item.formattedDate})`);
          setConfirmRestoreModal(null);
        } else {
          setRestoreErrorMsg(res.error || `Gagal mengambil cadangan data ${item.formattedDate} dari Firestore.`);
        }
      } else if (confirmRestoreModal.type === "drive" && confirmRestoreModal.driveItem) {
        if (!driveToken) {
          setRestoreErrorMsg("Sesi Google Drive telah habis, silakan muat ulang daftar riwayat.");
          setIsRestoringData(false);
          return;
        }
        const item = confirmRestoreModal.driveItem;
        const data = await downloadDriveBackup(driveToken, item.id);
        applyRestoredData(data, `Google Drive (${item.name})`);
        setConfirmRestoreModal(null);
      } else if (confirmRestoreModal.type === "file" && confirmRestoreModal.fileData) {
        applyRestoredData(confirmRestoreModal.fileData, `Berkas File (${confirmRestoreModal.fileName || "JSON"})`);
        setConfirmRestoreModal(null);
      }
    } catch (err: any) {
      console.error("Restore error:", err);
      setRestoreErrorMsg(err?.message || "Terjadi kesalahan saat memulihkan data.");
    } finally {
      setIsRestoringData(false);
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
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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

  const handleBatchDeleteStudents = (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) return;
    setStudents(prev => prev.filter(s => !studentIds.includes(s.id)));
    setStudentSuccessMsg(`${studentIds.length} data siswa berhasil dihapus secara massal.`);
    setTimeout(() => setStudentSuccessMsg(null), 3500);
  };

  // MASTER DATA MANAGEMENT HANDLERS (ADMINISTRATOR)
  const handleAddStudentFromAdmin = (s: Partial<Student>) => {
    const trimmedName = s.name?.trim() || "";
    if (!trimmedName) return;
    const finalClass = s.className || classList[0] || "X-1";
    const created: Student = {
      id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      nis: s.nis?.trim() || `${Math.floor(1000000 + Math.random() * 9000000)}`,
      nisn: s.nisn?.trim() || "",
      className: finalClass,
      gender: s.gender || 'L',
      attendanceNumber: s.attendanceNumber || '',
      parentName: s.parentName || '',
      parentPhone: s.parentPhone || '',
      studentPhone: s.studentPhone || '',
      address: s.address || ''
    };
    setStudents(prev => [...prev, created]);
    setStudentSuccessMsg(`Siswa "${trimmedName}" berhasil ditambahkan.`);
    setTimeout(() => setStudentSuccessMsg(null), 3500);
  };

  const handleBatchTransferClass = (studentIds: string[], targetClass: string) => {
    setStudents(prev => prev.map(s => studentIds.includes(s.id) ? { ...s, className: targetClass } : s));
    setStudentSuccessMsg(`${studentIds.length} siswa berhasil dimutasi ke kelas ${targetClass}.`);
    setTimeout(() => setStudentSuccessMsg(null), 3500);
  };

  const handleImportStudents = (imported: Student[]) => {
    let addedCount = 0;
    let enrichedCount = 0;
    let unchangedCount = 0;

    setStudents(prev => {
      const updatedList = [...prev];

      imported.forEach(imp => {
        const impNameNorm = (imp.name || "").trim().toLowerCase();
        const impClassNorm = (imp.className || "").trim().toLowerCase();
        const impNis = (imp.nis || "").trim();
        const impNisn = (imp.nisn || "").trim();

        const matchIndex = updatedList.findIndex(existing => {
          const exNis = (existing.nis || "").trim();
          const exNisn = (existing.nisn || "").trim();
          const exNameNorm = (existing.name || "").trim().toLowerCase();
          const exClassNorm = (existing.className || "").trim().toLowerCase();

          // Match by NISN if both have it
          if (impNisn && exNisn && impNisn === exNisn) return true;
          // Match by NIS if both have it
          if (impNis && exNis && impNis === exNis) return true;
          // Match by Name and Class
          if (impNameNorm && exNameNorm && impNameNorm === exNameNorm && (!impClassNorm || !exClassNorm || impClassNorm === exClassNorm)) return true;
          // Match by Name only if both have unique identical full names
          if (impNameNorm && exNameNorm && impNameNorm === exNameNorm && impNameNorm.length >= 4) return true;

          return false;
        });

        if (matchIndex >= 0) {
          const existing = updatedList[matchIndex];
          let hasEnrichment = false;

          // Only fill missing/empty fields, never overwrite existing valid data
          const enriched: Student = {
            ...existing,
            name: existing.name || imp.name,
            nis: existing.nis ? existing.nis : (imp.nis || ""),
            nisn: existing.nisn ? existing.nisn : (imp.nisn || ""),
            className: existing.className ? existing.className : (imp.className || ""),
            gender: existing.gender ? existing.gender : (imp.gender || 'L'),
            attendanceNumber: existing.attendanceNumber ? existing.attendanceNumber : (imp.attendanceNumber || ""),
            studentPhone: existing.studentPhone ? existing.studentPhone : (imp.studentPhone || ""),
            parentName: existing.parentName ? existing.parentName : (imp.parentName || ""),
            parentPhone: existing.parentPhone ? existing.parentPhone : (imp.parentPhone || ""),
            address: existing.address ? existing.address : (imp.address || ""),
          };

          if (
            (!existing.nis && imp.nis) ||
            (!existing.nisn && imp.nisn) ||
            (!existing.gender && imp.gender) ||
            (!existing.attendanceNumber && imp.attendanceNumber) ||
            (!existing.studentPhone && imp.studentPhone) ||
            (!existing.parentName && imp.parentName) ||
            (!existing.parentPhone && imp.parentPhone) ||
            (!existing.address && imp.address)
          ) {
            hasEnrichment = true;
          }

          if (hasEnrichment) {
            enrichedCount++;
            updatedList[matchIndex] = enriched;
          } else {
            unchangedCount++;
          }
        } else {
          addedCount++;
          updatedList.push(imp);
        }
      });

      return updatedList;
    });

    const msgParts: string[] = [];
    if (addedCount > 0) msgParts.push(`${addedCount} siswa baru ditambahkan`);
    if (enrichedCount > 0) msgParts.push(`${enrichedCount} data siswa berhasil dilengkapi`);
    if (unchangedCount > 0 && addedCount === 0 && enrichedCount === 0) msgParts.push(`${unchangedCount} siswa sudah lengkap (tidak ada data kosong yang diisi)`);

    setStudentSuccessMsg(`Impor selesai: ${msgParts.length > 0 ? msgParts.join(', ') : 'Data siswa telah sinkron'}.`);
    setTimeout(() => setStudentSuccessMsg(null), 4500);
  };

  const handleAddSubject = (sub: SubjectMaster) => {
    setMasterSubjects(prev => [...prev, sub]);
  };

  const handleEditSubject = (sub: SubjectMaster) => {
    setMasterSubjects(prev => prev.map(s => s.id === sub.id ? sub : s));
  };

  const handleDeleteSubject = (subId: string) => {
    setMasterSubjects(prev => prev.filter(s => s.id !== subId));
  };

  const handleUpdateSchoolProfile = (profile: SchoolMasterProfile) => {
    setSchoolMasterProfile(profile);
    if (profile.schoolName) setInstitution(profile.schoolName);
    if (profile.headmasterName) setHeadmasterName(profile.headmasterName);
    if (profile.headmasterNip) setHeadmasterNip(profile.headmasterNip);
    if (profile.headmasterRank) setHeadmasterRank(profile.headmasterRank);
    if (profile.academicYear) setAcademicYear(profile.academicYear);
    if (profile.city) setDocumentCity(profile.city);
    if (profile.npsn) setSchoolNpsn(profile.npsn);
  };

  const handleRestoreMasterData = (data: {
    students?: Student[];
    classList?: string[];
    subjects?: SubjectMaster[];
    schoolProfile?: SchoolMasterProfile;
  }) => {
    if (Array.isArray(data.students) && data.students.length > 0) {
      setStudents(data.students);
    }
    if (Array.isArray(data.classList) && data.classList.length > 0) {
      setClassList(data.classList);
    }
    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      setMasterSubjects(data.subjects);
    }
    if (data.schoolProfile) {
      handleUpdateSchoolProfile(data.schoolProfile);
    }
  };

  const handleUpdateClassMeta = (className: string, meta: Partial<ClassMaster>) => {
    setClassMetadata(prev => ({
      ...prev,
      [className]: {
        ...(prev[className] || {}),
        ...meta
      }
    }));
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
      id: `s-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 9)}`,
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
      setImportSuccessMsg(`Berhasil mengganti data kelas dengan ${newStudentObjects.length} siswa dari ${importPreview.fileName}`);
    } else {
      handleImportStudents(newStudentObjects);
      setImportSuccessMsg(`Berhasil memproses ${newStudentObjects.length} siswa dari ${importPreview.fileName}`);
    }

    setImportPreview(null);
  };

  // 1. Absensi: Save/update attendance records
  const handleSaveAttendance = (newAttendance: Attendance[]) => {
    setAttendanceList(prev => {
      // Filter out existing records matching student ID + Date in payload to avoid duplicates
      const keysToReplace = new Set(newAttendance.map(n => `${n.studentId}_${n.date}`));
      const idsToReplace = new Set(newAttendance.map(n => n.id));
      const filtered = prev.filter(p => !idsToReplace.has(p.id) && !keysToReplace.has(`${p.studentId}_${p.date}`));
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
    // A. Update Submission Record (create or update)
    setSubmissions(prev => {
      const exists = prev.some(sub => sub.assignmentId === assignmentId && sub.studentId === studentId);
      if (exists) {
        return prev.map(sub => {
          if (sub.assignmentId === assignmentId && sub.studentId === studentId) {
            return {
              ...sub,
              score,
              status: "Selesai",
              aiAnalysis: aiAnalysis || sub.aiAnalysis
            };
          }
          return sub;
        });
      } else {
        const studentInfo = students.find(s => s.id === studentId);
        const newSub: Submission = {
          id: `sub-${studentId}-${assignmentId || Date.now()}`,
          assignmentId: assignmentId || "general",
          studentId,
          studentName: studentInfo?.name || "Siswa",
          submittedDate: new Date().toISOString().split("T")[0],
          studentAnswer: "",
          score,
          status: "Selesai",
          aiAnalysis
        };
        return [...prev, newSub];
      }
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
          className: studentInfo?.className || (classList[0] || "X-MIPA-1"),
          assignmentScores: { [assignmentId]: score },
          examScore: 0
        };
        return [...prev, newRow];
      }
    });
  };

  // Quick Create Assignment from Penilaian AI
  const handleQuickCreateAssignment = (
    title: string,
    targetClass: string,
    category: 'Tugas' | 'Ulangan Harian' | 'Proyek' | 'Kuis' | 'Lainnya' = 'Ulangan Harian',
    maxScore: number = 100
  ) => {
    const newId = `assign-${Date.now()}`;
    const newAssign: Assignment = {
      id: newId,
      title,
      className: targetClass,
      category,
      dueDate: new Date().toISOString().split("T")[0],
      maxScore
    };
    
    const targetStudents = students.filter(s => s.className === targetClass);
    const seededSubs: Submission[] = targetStudents.map(student => ({
      id: `sub-${student.id}-${newId}`,
      assignmentId: newId,
      studentId: student.id,
      studentName: student.name,
      submittedDate: "",
      studentAnswer: "",
      score: null,
      status: "Belum Dikumpulkan"
    }));

    setAssignments(prev => [...prev, newAssign]);
    setSubmissions(prev => [...prev, ...seededSubs]);
    return newId;
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

  // 6. DaftarNilai: Update individual cell inside spreadsheet & synchronize with Kelola Tugas
  const handleUpdateGradeCell = (studentId: string, type: string, value: number) => {
    const studentInfo = students.find(s => s.id === studentId);
    const studentClass = studentInfo?.className || CLASSES[0];
    const todayStr = new Date().toISOString().split("T")[0];

    // Check if this is an STS/PTS or SAS/PAS ulangan assignment
    const matchingAsg = assignments.find(a => a.id === type);
    const isMidtermMatch = type === "midterm" || (matchingAsg && (
      matchingAsg.title.toLowerCase().includes("tengah semester") || 
      matchingAsg.title.toLowerCase().includes("sts") || 
      matchingAsg.title.toLowerCase().includes("pts")
    ));
    const isExamMatch = type === "exam" || (matchingAsg && (
      matchingAsg.title.toLowerCase().includes("akhir semester") || 
      matchingAsg.title.toLowerCase().includes("sas") || 
      matchingAsg.title.toLowerCase().includes("pas")
    ));

    // 1. Update Core Grade Matrix (StudentGrade)
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
          // Standard assignment or matching exam
          const nextScores = {
            ...updated[existIdx].assignmentScores,
            [type]: value
          };
          updated[existIdx] = {
            ...updated[existIdx],
            assignmentScores: nextScores,
            midtermScore: isMidtermMatch ? value : updated[existIdx].midtermScore,
            examScore: isExamMatch ? value : updated[existIdx].examScore
          };
        }
        return updated;
      } else {
        const newRow: StudentGrade = {
          studentId,
          studentName: studentInfo?.name || "Siswa Baru",
          className: studentClass,
          assignmentScores: (type === "exam" || type === "midterm" || type === "character") ? {} : { [type]: value },
          examScore: (type === "exam" || isExamMatch) ? value : 0,
          midtermScore: (type === "midterm" || isMidtermMatch) ? value : undefined,
          characterScore: type === "character" ? value : undefined
        };
        return [...prev, newRow];
      }
    });

    // 2. Synchronize to Submissions & Assignments (Kelola Tugas)
    if (type !== "character") {
      let targetAssignmentId = type;

      if (type === "midterm") {
        let stsAsg = assignments.find(a => 
          a.className === studentClass && 
          (a.id === `asg-sts-${studentClass}` || 
           a.title.toLowerCase().includes("tengah semester") || 
           a.title.toLowerCase().includes("sts") || 
           a.title.toLowerCase().includes("pts"))
        );
        if (!stsAsg) {
          const newSts: Assignment = {
            id: `asg-sts-${studentClass}`,
            title: "Sumatif Tengah Semester (STS / PTS)",
            category: "Ulangan",
            className: studentClass,
            dueDate: todayStr,
            maxScore: 100
          };
          setAssignments(prev => [...prev, newSts]);
          targetAssignmentId = newSts.id;
        } else {
          targetAssignmentId = stsAsg.id;
        }
      } else if (type === "exam") {
        let sasAsg = assignments.find(a => 
          a.className === studentClass && 
          (a.id === `asg-sas-${studentClass}` || 
           a.title.toLowerCase().includes("akhir semester") || 
           a.title.toLowerCase().includes("sas") || 
           a.title.toLowerCase().includes("pas"))
        );
        if (!sasAsg) {
          const newSas: Assignment = {
            id: `asg-sas-${studentClass}`,
            title: "Sumatif Akhir Semester (SAS / PAS)",
            category: "Ulangan",
            className: studentClass,
            dueDate: todayStr,
            maxScore: 100
          };
          setAssignments(prev => [...prev, newSas]);
          targetAssignmentId = newSas.id;
        } else {
          targetAssignmentId = sasAsg.id;
        }
      }

      setSubmissions(prev => {
        const studentName = studentInfo?.name || "Siswa";
        const existIdx = prev.findIndex(s => s.assignmentId === targetAssignmentId && s.studentId === studentId);

        if (existIdx > -1) {
          const updated = [...prev];
          updated[existIdx] = {
            ...updated[existIdx],
            score: value,
            status: "Selesai",
            submittedDate: updated[existIdx].submittedDate || todayStr,
            studentAnswer: updated[existIdx].studentAnswer || "Dinilai langsung melalui Daftar Nilai"
          };
          return updated;
        } else {
          const newSub: Submission = {
            id: `sub-${studentId}-${targetAssignmentId}`,
            assignmentId: targetAssignmentId,
            studentId,
            studentName,
            submittedDate: todayStr,
            studentAnswer: "Dinilai langsung melalui Daftar Nilai",
            score: value,
            status: "Selesai"
          };
          return [...prev, newSub];
        }
      });
    }
  };

  // 7. Update Submission Details (Student Answer & AI breakdown)
  const handleUpdateSubmission = (
    submissionId: string,
    updatedAnswer: string,
    newScore?: number,
    updatedItems?: any[],
    studentId?: string,
    assignmentId?: string
  ) => {
    let targetAssignmentId = assignmentId;
    let targetStudentId = studentId;

    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === submissionId);
      if (idx > -1) {
        targetAssignmentId = prev[idx].assignmentId;
        targetStudentId = prev[idx].studentId;
        const updated = [...prev];
        const prevAi = updated[idx].aiAnalysis || {};
        const newAiAnalysis = updatedItems 
          ? { ...prevAi, items: updatedItems }
          : (Object.keys(prevAi).length > 0 ? prevAi : undefined);

        updated[idx] = {
          ...updated[idx],
          studentAnswer: updatedAnswer,
          score: newScore !== undefined ? newScore : updated[idx].score,
          status: "Selesai",
          aiAnalysis: newAiAnalysis
        };
        return updated;
      } else if (studentId && assignmentId) {
        const studentObj = students.find(s => s.id === studentId);
        const newSub: Submission = {
          id: submissionId || `sub-${studentId}-${assignmentId}`,
          assignmentId,
          studentId,
          studentName: studentObj?.name || "Siswa",
          submittedDate: new Date().toISOString().split("T")[0],
          studentAnswer: updatedAnswer,
          score: newScore !== undefined ? newScore : null,
          status: "Selesai",
          aiAnalysis: updatedItems ? { items: updatedItems } : undefined
        };
        return [...prev, newSub];
      }
      return prev;
    });

    if (targetStudentId && targetAssignmentId && newScore !== undefined) {
      handleUpdateGradeCell(targetStudentId, targetAssignmentId, newScore);
    }
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
        headmasterName,
        headmasterNip,
        headmasterRank,
        documentCity,
        schoolNpsn,
        academicYear,
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

    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0, 5);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `eduasisten_backup_${datePart}_${timePart}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Restore Handler
  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessImportFile(file);
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
  // NAVIGATION MAPS & ROLE RESTRICTIONS
  // ----------------------------------------------------
  const isStudent = user?.role === 'siswa';

  useEffect(() => {
    if (isStudent && activeTab !== "dashboard" && activeTab !== "ruangbelajar") {
      setActiveTab("dashboard");
    }
  }, [isStudent, activeTab]);

  const navItems = isStudent
    ? [
        { id: "dashboard", label: "Dashboard Siswa", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay },
        { id: "evaluasi", label: "Evaluasi & Ujian (CBT)", icon: ShieldAlert }
      ]
    : [
        { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
        { id: "ruangbelajar", label: "Ruang Belajar", icon: MonitorPlay },
        { id: "evaluasi", label: "Evaluasi & Bank Soal (CBT)", icon: ShieldAlert },
        { id: "eduasisten", label: "EduAsisten AI", icon: Bot },
        { id: "walikelas", label: "Ruang Wali Kelas", icon: ShieldCheck },
        { id: "absensi", label: "Absensi Digital", icon: CheckSquare },
        { id: "penilaian", label: "Penilaian AI", icon: Cpu },
        { id: "jadwal", label: "Jadwal Kelas", icon: Calendar },
        { id: "tugas", label: "Kelola Tugas", icon: BookOpen },
        { id: "nilai", label: "Daftar Nilai", icon: FileSpreadsheet },
        { id: "jurnal", label: "Jurnal Harian", icon: BookOpenText },
        ...(user?.role === 'admin'
            ? [
                { id: "manajemen_data", label: "Manajemen Data", icon: Database },
                { id: "manajemen_pengguna", label: "Manajemen Pengguna", icon: Users }
              ] 
            : user?.role === 'guru'
            ? [{ id: "verifikasi", label: "Verifikasi Siswa", icon: Users }] 
            : [])
      ];

  return (
    <>
      {isAuthChecking ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-sm font-bold text-slate-500">Memeriksa sesi...</p>
          </div>
        </div>
      ) : !user ? (
        <Login onLoginSuccess={() => {}} />
      ) : user.status === 'pending' ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
              <Clock size={32} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 mb-2">Akun Menunggu Verifikasi</h2>
              <p className="text-sm text-slate-500 font-medium">
                Pendaftaran akun Anda sebagai <span className="font-bold text-indigo-700 uppercase">{user.role}</span> ({user.name}) berhasil tersimpan. Akun Anda sedang menunggu persetujuan dari <span className="font-bold text-slate-700">{user.role === 'guru' ? 'Admin' : 'Guru'}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw size={16} /> Cek Status Verifikasi
              </button>
              <button
                onClick={() => signOut()}
                className="w-full px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Keluar / Ganti Akun
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-800 font-sans theme-${appTheme}`}>
          <style dangerouslySetInnerHTML={{ __html: `
            /* Modern Teal Theme overrides */
            .theme-modern-teal .bg-indigo-700 { background-color: #0f766e !important; }
            .theme-modern-teal .bg-indigo-600 { background-color: #0d9488 !important; }
            .theme-modern-teal .bg-indigo-100 { background-color: #ccfbf1 !important; }
            .theme-modern-teal .bg-indigo-50 { background-color: #f0fdfa !important; }
            .theme-modern-teal .text-indigo-700 { color: #0f766e !important; }
            .theme-modern-teal .text-indigo-600 { color: #0d9488 !important; }
            .theme-modern-teal .text-indigo-200 { color: #99f6e4 !important; }
            .theme-modern-teal .text-indigo-100 { color: #ccfbf1 !important; }
            .theme-modern-teal .border-indigo-600 { border-color: #0d9488 !important; }
            .theme-modern-teal .border-indigo-100 { border-color: #ccfbf1 !important; }
            .theme-modern-teal .hover\\:bg-indigo-700:hover { background-color: #0f766e !important; }
            .theme-modern-teal .hover\\:bg-indigo-800:hover { background-color: #115e59 !important; }
            .theme-modern-teal .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.12) !important; }
            .theme-modern-teal .bg-indigo-800 { background-color: #115e59 !important; }
            .theme-modern-teal .border-indigo-600\\/30 { border-color: rgba(13, 148, 136, 0.3) !important; }

            /* Royal Slate Theme overrides */
            .theme-royal-slate .bg-indigo-700 { background-color: #0f172a !important; }
            .theme-royal-slate .bg-indigo-600 { background-color: #1e293b !important; }
            .theme-royal-slate .bg-indigo-100 { background-color: #f1f5f9 !important; }
            .theme-royal-slate .bg-indigo-50 { background-color: #f8fafc !important; }
            .theme-royal-slate .text-indigo-700 { color: #334155 !important; }
            .theme-royal-slate .text-indigo-600 { color: #475569 !important; }
            .theme-royal-slate .text-indigo-200 { color: #94a3b8 !important; }
            .theme-royal-slate .text-indigo-100 { color: #cbd5e1 !important; }
            .theme-royal-slate .border-indigo-600 { border-color: #334155 !important; }
            .theme-royal-slate .border-indigo-100 { border-color: #e2e8f0 !important; }
            .theme-royal-slate .hover\\:bg-indigo-700:hover { background-color: #1e293b !important; }
            .theme-royal-slate .hover\\:bg-indigo-800:hover { background-color: #0f172a !important; }
            .theme-royal-slate .bg-indigo-800 { background-color: #0f172a !important; }
            .theme-royal-slate .border-indigo-600\\/30 { border-color: rgba(71, 85, 105, 0.3) !important; }

            /* Aurora Emerald Theme overrides */
            .theme-aurora-emerald .bg-indigo-700 { background-color: #047857 !important; }
            .theme-aurora-emerald .bg-indigo-600 { background-color: #059669 !important; }
            .theme-aurora-emerald .bg-indigo-100 { background-color: #d1fae5 !important; }
            .theme-aurora-emerald .bg-indigo-50 { background-color: #ecfdf5 !important; }
            .theme-aurora-emerald .text-indigo-700 { color: #047857 !important; }
            .theme-aurora-emerald .text-indigo-600 { color: #059669 !important; }
            .theme-aurora-emerald .text-indigo-200 { color: #a7f3d0 !important; }
            .theme-aurora-emerald .text-indigo-100 { color: #d1fae5 !important; }
            .theme-aurora-emerald .border-indigo-600 { border-color: #059669 !important; }
            .theme-aurora-emerald .border-indigo-100 { border-color: #d1fae5 !important; }
            .theme-aurora-emerald .hover\\:bg-indigo-700:hover { background-color: #047857 !important; }
            .theme-aurora-emerald .hover\\:bg-indigo-800:hover { background-color: #065f46 !important; }
            .theme-aurora-emerald .bg-indigo-800 { background-color: #065f46 !important; }
            .theme-aurora-emerald .border-indigo-600\\/30 { border-color: rgba(5, 150, 105, 0.3) !important; }

            /* Cosmic Purple Theme overrides */
            .theme-cosmic-purple .bg-indigo-700 { background-color: #6d28d9 !important; }
            .theme-cosmic-purple .bg-indigo-600 { background-color: #7c3aed !important; }
            .theme-cosmic-purple .bg-indigo-100 { background-color: #ede9fe !important; }
            .theme-cosmic-purple .bg-indigo-50 { background-color: #f5f3ff !important; }
            .theme-cosmic-purple .text-indigo-700 { color: #6d28d9 !important; }
            .theme-cosmic-purple .text-indigo-600 { color: #7c3aed !important; }
            .theme-cosmic-purple .text-indigo-200 { color: #ddd6fe !important; }
            .theme-cosmic-purple .text-indigo-100 { color: #ede9fe !important; }
            .theme-cosmic-purple .border-indigo-600 { border-color: #7c3aed !important; }
            .theme-cosmic-purple .border-indigo-100 { border-color: #ede9fe !important; }
            .theme-cosmic-purple .hover\\:bg-indigo-700:hover { background-color: #6d28d9 !important; }
            .theme-cosmic-purple .hover\\:bg-indigo-800:hover { background-color: #5b21b6 !important; }
            .theme-cosmic-purple .bg-indigo-800 { background-color: #5b21b6 !important; }
            .theme-cosmic-purple .border-indigo-600\\/30 { border-color: rgba(124, 58, 237, 0.3) !important; }

            /* Rosewood Burgundy Theme overrides */
            .theme-rosewood-burgundy .bg-indigo-700 { background-color: #be123c !important; }
            .theme-rosewood-burgundy .bg-indigo-600 { background-color: #e11d48 !important; }
            .theme-rosewood-burgundy .bg-indigo-100 { background-color: #ffe4e6 !important; }
            .theme-rosewood-burgundy .bg-indigo-50 { background-color: #fff1f2 !important; }
            .theme-rosewood-burgundy .text-indigo-700 { color: #be123c !important; }
            .theme-rosewood-burgundy .text-indigo-600 { color: #e11d48 !important; }
            .theme-rosewood-burgundy .text-indigo-200 { color: #fecdd3 !important; }
            .theme-rosewood-burgundy .text-indigo-100 { color: #ffe4e6 !important; }
            .theme-rosewood-burgundy .border-indigo-600 { border-color: #e11d48 !important; }
            .theme-rosewood-burgundy .border-indigo-100 { border-color: #ffe4e6 !important; }
            .theme-rosewood-burgundy .hover\\:bg-indigo-700:hover { background-color: #be123c !important; }
            .theme-rosewood-burgundy .hover\\:bg-indigo-800:hover { background-color: #9f1239 !important; }
            .theme-rosewood-burgundy .bg-indigo-800 { background-color: #9f1239 !important; }
            .theme-rosewood-burgundy .border-indigo-600\\/30 { border-color: rgba(225, 29, 72, 0.3) !important; }
          ` }} />
          
          {/* SIDEBAR: Desktop Left Menu Shell */}
      <aside className="hidden md:flex md:w-64 bg-indigo-700 flex-col justify-between p-6 shrink-0 relative z-20 text-white">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3" id="brand-logo">
            {appLogo ? (
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden p-1.5 shrink-0">
                <img src={formatDriveImageUrl(appLogo)} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <div className="w-5 h-5 bg-indigo-600 rounded-sm rotate-45 flex items-center justify-center">
                  <GraduationCap size={12} className="text-white -rotate-45" />
                </div>
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight font-display text-white">
                {isStudent ? "RUANG BELAJAR SISWA" : "JANG GURU APP HUB"}
              </h1>
              <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                {isStudent ? "Portal Siswa Digital" : "Layanan Administrasi"}
              </span>
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

          {/* Dedicated Firestore Sync Button in Sidebar (Teachers/Admin Only) */}
          {!isStudent && (
            <div className="pt-2">
              <button
                onClick={() => setIsCloudSyncModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-indigo-900/60 hover:bg-indigo-900 text-white border border-indigo-500/30 transition-all cursor-pointer shadow-xs group"
                title="Klik untuk membuka Pengaturan Cadangan & Sinkronisasi Cloud"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    realtimeSyncStatus === "syncing" 
                      ? "bg-amber-400 animate-spin" 
                      : "bg-indigo-400"
                  }`} />
                  <div className="text-left truncate">
                    <div className="text-[11px] font-black text-white truncate">Cadangan Cloud</div>
                    <div className="text-[9px] text-indigo-300 font-medium truncate">
                      {lastSyncTime ? `Sync: ${lastSyncTime}` : "Firestore Active"}
                    </div>
                  </div>
                </div>
                <Cloud size={15} className="text-indigo-300 shrink-0 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* User Card footer */}
        <div 
          className="border-t border-indigo-600/30 pt-5 flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
          id="desktop-user-footer"
          onClick={() => {
            if (isStudent) {
              setIsStudentSettingsOpen(true);
            } else {
              setIsProfileModalOpen(true);
            }
          }}
          title={isStudent ? "Pengaturan Akun & Profil Siswa" : "Pengaturan Profil & Sekolah"}
        >
          <div className="w-10 h-10 bg-indigo-800 border border-indigo-600/30 text-white rounded-xl shadow-xs shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs">
            {user?.photoURL || (!isStudent && profilePhoto) ? (
              <img src={formatDriveImageUrl(user?.photoURL || profilePhoto)} alt={user?.name || teacherName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="font-extrabold text-xs text-white truncate" title={user?.name || teacherName}>
              {user?.name || (isStudent ? "Akun Siswa" : (teacherName || "Nama Guru"))}
            </p>
            <p className="text-[10px] text-indigo-200 font-medium truncate">
              {isStudent ? (user?.username ? `@${user.username}` : "Siswa") : (nip ? `NIP. ${nip}` : "Klik untuk atur NIP")}
            </p>
            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-white/20 text-white font-black text-[9px] rounded uppercase tracking-wider">
              {user?.role || "GURU"}
            </span>
          </div>
        </div>
      </aside>

      {/* MOBILE SHELL: Top Header & Bottom Navigation Bar */}
      <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs" id="mobile-header">
        <div className="flex items-center gap-2">
          {appLogo ? (
            <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img src={formatDriveImageUrl(appLogo)} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="p-1.5 bg-indigo-600 text-white rounded-xl">
              <GraduationCap size={16} />
            </div>
          )}
          <span className="text-xs font-black tracking-tight text-slate-800 font-display">
            {isStudent ? "RUANG BELAJAR SISWA" : "JANG GURU APP HUB"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile Background Grading Status Indicator (Teacher Only) */}
          {!isStudent && globalGradingStatus.isGrading && activeTab !== "penilaian" && (
            <button
              onClick={() => setActiveTab("penilaian")}
              className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-extrabold px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs animate-pulse"
              title="Koreksi AI Aktif di Latar Belakang"
            >
              <Cpu size={11} className="text-amber-600 animate-spin" />
              <span>AI</span>
            </button>
          )}

          {/* Mobile Firestore Sync Button (Teacher Only) */}
          {!isStudent && (
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
          )}

          {!isStudent && (
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-1 rounded-lg truncate max-w-[85px] cursor-pointer flex items-center gap-1"
              title="Buka Pengaturan Profil & Sekolah"
            >
              <Building2 size={11} className="shrink-0 text-indigo-600" />
              <span className="truncate">{institution ? institution.split('\n').pop() : teacherName}</span>
            </button>
          )}

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
                  {appLogo ? (
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img src={formatDriveImageUrl(appLogo)} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-white text-indigo-700 rounded-xl">
                      <GraduationCap size={16} />
                    </div>
                  )}
                  <span className="text-xs font-black tracking-tight text-white font-display">
                    {isStudent ? "RUANG BELAJAR SISWA" : "JANG GURU APP HUB"}
                  </span>
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

              {/* Mobile User Info Card */}
              <div 
                className="border-t border-indigo-600/30 pt-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isStudent) {
                    setIsStudentSettingsOpen(true);
                  } else {
                    setIsProfileModalOpen(true);
                  }
                }}
              >
                <div className="w-9 h-9 bg-indigo-800 text-white rounded-lg shrink-0 overflow-hidden flex items-center justify-center font-bold text-xs border border-indigo-600/30">
                  {user?.photoURL || (!isStudent && profilePhoto) ? (
                    <img src={formatDriveImageUrl(user?.photoURL || profilePhoto)} alt={user?.name || teacherName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-extrabold text-[11px] text-white truncate">{user?.name || (isStudent ? "Siswa" : (teacherName || "Guru"))}</p>
                  <p className="text-[9px] text-indigo-200 font-semibold truncate">{isStudent ? (user?.username ? `@${user.username}` : "Siswa") : (nip ? `NIP. ${nip}` : "Pengaturan")}</p>
                  <p className="text-[9px] text-indigo-300/80 font-semibold truncate">{user?.role?.toUpperCase() || "SISWA"}</p>
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
                {isStudent ? "Portal Ruang Belajar Digital Siswa" : (institution || "Pemerintah Provinsi Jawa Barat\nSMA Negeri 2 Tasikmalaya")}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {isStudent ? (
                  <span>Akses Materi, Modul, dan Media Pembelajaran Interaktif</span>
                ) : (
                  <>Mata Pelajaran: <strong className="text-indigo-600 font-bold">{subject || "EKONOMI"}</strong></>
                )}
              </p>
            </div>
          </div>

          {/* Clock, Firestore Sync & Profile Summary */}
          <div className="flex items-center gap-3">
            {/* Background Grading Status Pill (Teacher Only) */}
            {!isStudent && globalGradingStatus.isGrading && activeTab !== "penilaian" && (
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

            {/* Cloud Sync Status Button (Teacher/Admin only) */}
            {!isStudent && (
              <button
                onClick={() => setIsCloudSyncModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs group"
                title="Status Cadangan & Sinkronisasi Cloud"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${
                  realtimeSyncStatus === "syncing"
                    ? "bg-amber-500 animate-spin"
                    : "bg-indigo-600"
                }`} />
                <Cloud size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[11px] font-extrabold">
                    {realtimeSyncStatus === "syncing" ? "Menyinkronkan..." : "Cloud Sync"}
                  </span>
                  <span className="text-[9px] text-indigo-600 font-medium">
                    {lastSyncTime ? `Pukul ${lastSyncTime}` : "Cadangan HP/Laptop"}
                  </span>
                </div>
              </button>
            )}

            <div className="flex items-center">
              <button
                onClick={() => {
                  if (isStudent) {
                    setIsStudentSettingsOpen(true);
                  } else {
                    setIsProfileModalOpen(true);
                  }
                }}
                className="flex items-center gap-2.5 pl-4 border-l border-slate-200 text-left cursor-pointer hover:opacity-85 transition-opacity"
                title={isStudent ? "Pengaturan Akun & Profil Siswa" : "Klik untuk membuka Pengaturan Profil & Sekolah"}
              >
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800 flex items-center justify-end gap-2">
                    {user?.name || (isStudent ? "Akun Siswa" : (teacherName || "Nama Guru"))}
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded-md uppercase tracking-wider font-extrabold">{user?.role || "GURU"}</span>
                  </p>
                  <p className="text-[10px] text-indigo-600 font-bold font-mono">
                    {isStudent ? (user?.username ? `@${user.username}` : (user?.email || "Siswa")) : (user?.email || nip || "NIP belum diisi")}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0 overflow-hidden border border-indigo-200">
                  {user?.photoURL || (!isStudent && profilePhoto) ? (
                    <img src={formatDriveImageUrl(user?.photoURL || profilePhoto)} alt={user?.name || teacherName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user?.name ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("") : (isStudent ? "SW" : "GR")
                  )}
                </div>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    await signOut();
                  } catch(e) {
                    console.error(e);
                  }
                }}
                className="ml-4 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-100/50"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT CONTENT WRAPPER */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto" id="tab-viewport-body">
          
          {/* Quick 1-Click Restore Banner if Data is Empty (Teachers/Admin Only) */}
          {!isStudent && students.length === 0 && (
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
          {!isStudent && (
            <div className={activeTab === "penilaian" ? "block" : "hidden"}>
              <Penilaian
                students={filteredStudents}
                assignments={assignments}
                submissions={submissions}
                grades={grades}
                onApplyGrade={handleApplyGrade}
                onApplyBatchGrades={handleApplyBatchGrades}
                onCreateAssignment={handleQuickCreateAssignment}
                onNavigateToGradebook={() => {
                  setActiveTab("nilai");
                }}
                classList={filteredClassList}
                onGradingStateChange={handleGradingStateChange}
              />
            </div>
          )}

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
                  isStudent ? (
                    <StudentDashboard
                      user={user}
                      schedule={schedule}
                      assignments={assignments}
                      submissions={submissions}
                      grades={grades}
                      materials={materials}
                      classList={filteredClassList}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onOpenSettings={() => setIsStudentSettingsOpen(true)}
                    />
                  ) : (
                    <Dashboard
                      schedule={schedule}
                      students={user?.role === 'admin' ? students : filteredStudents}
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
                      classList={user?.role === 'admin' ? classList : filteredClassList}
                    />
                  )
                )}

                {activeTab === "ruangbelajar" && (
                  <RuangBelajar
                    materials={materials}
                    onAddMaterial={handleAddMaterial}
                    onEditMaterial={handleEditMaterial}
                    onDeleteMaterial={handleDeleteMaterial}
                    onAddMaterialNote={handleAddMaterialNote}
                    onRestoreMaterials={(newMaterials, mode) => {
                      if (mode === "replace") {
                        setMaterials(newMaterials);
                      } else {
                        setMaterials(prev => {
                          const existingIds = new Set(prev.map(p => p.id));
                          const newUnique = newMaterials.filter(it => !existingIds.has(it.id));
                          return [...prev, ...newUnique];
                        });
                      }
                    }}
                    classList={filteredClassList}
                    teacherName={teacherName}
                    currentUserRole={user?.role}
                  />
                )}

                {(activeTab === "evaluasi" || activeTab === "banksoal") && (
                  <EvaluasiSiswa
                    isStudent={isStudent}
                    currentUserRole={user?.role}
                    availableClasses={filteredClassList}
                    students={filteredStudents}
                    subject={subject}
                    teacherName={teacherName}
                    bankQuestions={bankQuestions}
                    onAddBankQuestion={(q) => setBankQuestions(prev => [q, ...prev])}
                    onEditBankQuestion={(q) => setBankQuestions(prev => prev.map(item => item.id === q.id ? q : item))}
                    onDeleteBankQuestion={(id) => setBankQuestions(prev => prev.filter(item => item.id !== id))}
                    onRestoreBankQuestions={(items, mode) => {
                      if (mode === "replace") {
                        setBankQuestions(items);
                      } else {
                        setBankQuestions(prev => {
                          const existingIds = new Set(prev.map(p => p.id));
                          const newUnique = items.filter(it => !existingIds.has(it.id));
                          return [...prev, ...newUnique];
                        });
                      }
                    }}
                    initialTab={activeTab === "banksoal" ? "bank_soal" : "daftar"}
                  />
                )}

                {activeTab === "eduasisten" && (
                  <EduAsisten />
                )}

                {activeTab === "walikelas" && (
                  <WaliKelas
                    homeroomClass={homeroomClass}
                    setHomeroomClass={setHomeroomClass}
                    classList={filteredClassList}
                    students={filteredStudents}
                    setStudents={setStudents}
                    attendanceList={attendanceList}
                    assignments={assignments}
                    grades={grades}
                    teacherName={teacherName}
                    nip={nip}
                    institution={institution}
                    headmasterName={headmasterName}
                    headmasterNip={headmasterNip}
                    headmasterRank={headmasterRank}
                    documentCity={documentCity}
                    schoolNpsn={schoolNpsn}
                    academicYear={academicYear}
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
                    students={filteredStudents}
                    attendanceList={attendanceList}
                    onSaveAttendance={handleSaveAttendance}
                    classList={filteredClassList}
                    schedule={schedule}
                    teacherName={teacherName}
                    nip={nip}
                    subject={subject}
                    institution={institution}
                    headmasterName={headmasterName}
                    headmasterNip={headmasterNip}
                    headmasterRank={headmasterRank}
                    documentCity={documentCity}
                    schoolNpsn={schoolNpsn}
                    academicYear={academicYear}
                    selectedDate={attendanceDate}
                    onDateChange={(newDate) => {
                      setAttendanceDate(newDate);
                      safeStorage.setItem("guru_attendance_date", newDate);
                    }}
                    selectedClass={attendanceClass}
                    onClassChange={(newClass) => {
                      setAttendanceClass(newClass);
                      safeStorage.setItem("guru_attendance_class", newClass);
                    }}
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
                  classList={filteredClassList}
                />
              )}

              {activeTab === "tugas" && (
                <ManajemenTugas
                  students={filteredStudents}
                  assignments={assignments}
                  submissions={submissions}
                  grades={grades}
                  onUpdateGradeCell={handleUpdateGradeCell}
                  onNavigateToGradebook={(cls) => {
                    if (cls) safeStorage.setItem("guru_active_class", cls);
                    setActiveTab("nilai");
                  }}
                  onAddAssignment={handleAddAssignment}
                  onEditAssignment={handleEditAssignment}
                  onDeleteAssignment={handleDeleteAssignment}
                  classList={filteredClassList}
                  teacherName={teacherName}
                  nip={nip}
                  subject={subject}
                  institution={institution}
                  headmasterName={headmasterName}
                  headmasterNip={headmasterNip}
                  headmasterRank={headmasterRank}
                  documentCity={documentCity}
                  schoolNpsn={schoolNpsn}
                  academicYear={academicYear}
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
                  students={filteredStudents}
                  assignments={assignments}
                  submissions={submissions}
                  grades={grades}
                  onUpdateGradeCell={handleUpdateGradeCell}
                  onUpdateSubmission={handleUpdateSubmission}
                  onAddAssignment={handleAddAssignment}
                  onRestoreGrades={(restoredData, mode) => {
                    if (mode === "replace") {
                      if (restoredData.grades && restoredData.grades.length > 0) setGrades(restoredData.grades);
                      if (restoredData.assignments && restoredData.assignments.length > 0) setAssignments(restoredData.assignments);
                      if (restoredData.submissions && restoredData.submissions.length > 0) setSubmissions(restoredData.submissions);
                    } else {
                      if (restoredData.grades && restoredData.grades.length > 0) {
                        setGrades(prev => {
                          const existingMap = new Map(prev.map(g => [g.studentId, g]));
                          restoredData.grades.forEach(g => {
                            if (existingMap.has(g.studentId)) {
                              const curr = existingMap.get(g.studentId)!;
                              existingMap.set(g.studentId, {
                                ...curr,
                                assignmentScores: { ...curr.assignmentScores, ...(g.assignmentScores || {}) },
                                examScore: g.examScore !== undefined ? g.examScore : curr.examScore,
                                midtermScore: g.midtermScore !== undefined ? g.midtermScore : curr.midtermScore,
                                characterScore: g.characterScore !== undefined ? g.characterScore : curr.characterScore
                              });
                            } else {
                              existingMap.set(g.studentId, g);
                            }
                          });
                          return Array.from(existingMap.values());
                        });
                      }
                      if (restoredData.assignments && restoredData.assignments.length > 0) {
                        setAssignments(prev => {
                          const ids = new Set(prev.map(a => a.id));
                          const newA = restoredData.assignments.filter(a => !ids.has(a.id));
                          return [...prev, ...newA];
                        });
                      }
                    }
                  }}
                  onNavigateToAssignments={(cls) => {
                    if (cls) safeStorage.setItem("guru_active_class", cls);
                    setActiveTab("tugas");
                  }}
                  classList={filteredClassList}
                  teacherName={teacherName}
                  nip={nip}
                  subject={subject}
                  institution={institution}
                  headmasterName={headmasterName}
                  headmasterNip={headmasterNip}
                  headmasterRank={headmasterRank}
                  documentCity={documentCity}
                  schoolNpsn={schoolNpsn}
                  academicYear={academicYear}
                />
              )}

              {activeTab === "jurnal" && (
                <JurnalHarian
                  journals={journals}
                  onAddJournal={handleAddJournal}
                  onEditJournal={handleEditJournal}
                  onDeleteJournal={handleDeleteJournal}
                  onRestoreJournals={(newJournals, mode) => {
                    if (mode === "replace") {
                      setJournals(newJournals);
                    } else {
                      setJournals(prev => {
                        const existingIds = new Set(prev.map(j => j.id));
                        const newEntries = newJournals.filter(j => !existingIds.has(j.id));
                        return [...newEntries, ...prev];
                      });
                    }
                  }}
                  classList={filteredClassList}
                  teacherProfile={teacherProfileObj}
                />
              )}

              {activeTab === "manajemen_data" && user?.role === "admin" && (
                <ManajemenDataSekolah
                  students={students}
                  classList={classList}
                  onAddStudent={handleAddStudentFromAdmin}
                  onEditStudent={handleSaveStudentEdit}
                  onDeleteStudent={handleExecuteDeleteStudent}
                  onBatchDeleteStudents={handleBatchDeleteStudents}
                  onBatchTransferClass={handleBatchTransferClass}
                  onImportStudents={handleImportStudents}
                  onAddClass={handleAddClass}
                  onRenameClass={handleRenameClass}
                  onDeleteClass={handleExecuteDeleteClass}
                  subjects={masterSubjects}
                  onAddSubject={handleAddSubject}
                  onEditSubject={handleEditSubject}
                  onDeleteSubject={handleDeleteSubject}
                  schoolProfile={schoolMasterProfile}
                  onUpdateSchoolProfile={handleUpdateSchoolProfile}
                  onRestoreMasterData={handleRestoreMasterData}
                  classMetadata={classMetadata}
                  onUpdateClassMeta={handleUpdateClassMeta}
                  onSwitchToUserManagement={() => setActiveTab("manajemen_pengguna")}
                  onSyncStudentsFromAdmin={handleSyncStudentsFromAdmin}
                  onSaveStudentsToMaster={handleSaveStudentsToMaster}
                  isSyncingStudents={isSyncingAdminStudents}
                  syncStudentsMsg={syncAdminStudentsMsg}
                />
              )}

              {(activeTab === "manajemen_pengguna" || activeTab === "verifikasi") && user && (
                <VerifikasiPengguna 
                  currentUserRole={user.role} 
                  currentUser={user}
                  classList={classList}
                  onNavigateToDataManagement={() => setActiveTab("manajemen_data")}
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
        {(isStudent ? [
          { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
          { id: "ruangbelajar", label: "Belajar", icon: MonitorPlay },
          { id: "profil", label: "Profil", icon: User }
        ] : user?.role === 'admin' ? [
          { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
          { id: "manajemen_data", label: "Data", icon: Database },
          { id: "manajemen_pengguna", label: "Pengguna", icon: Users },
          { id: "profil", label: "Profil", icon: User }
        ] : [
          { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
          { id: "ruangbelajar", label: "Belajar", icon: MonitorPlay },
          { id: "eduasisten", label: "Asisten", icon: Bot },
          { id: "absensi", label: "Absen", icon: CheckSquare },
          { id: "penilaian", label: "AI", icon: Cpu },
          { id: "nilai", label: "Nilai", icon: FileSpreadsheet },
          { id: "profil", label: "Profil", icon: User }
        ]).map((item) => {
          const isActive = item.id === "profil" 
            ? (isStudent ? isStudentSettingsOpen : isProfileModalOpen) 
            : activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "profil") {
                  if (isStudent) {
                    setIsStudentSettingsOpen(true);
                  } else {
                    setIsProfileModalOpen(true);
                  }
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex flex-col items-center gap-1 text-[9px] font-black cursor-pointer transition-transform active:scale-95 relative ${
                isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              }`}
              id={`mobile-bottom-item-${item.id}`}
            >
              {item.id === "profil" && (user?.photoURL || (!isStudent && profilePhoto)) ? (
                <div className={`w-4 h-4 rounded-full overflow-hidden border ${isActive ? "border-indigo-600 ring-1 ring-indigo-400" : "border-slate-300"}`}>
                  <img src={formatDriveImageUrl(user?.photoURL || profilePhoto)} alt="Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                  <Building2 size={14} /> Kelola Kelas ({filteredClassList.length})
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
                            <img src={formatDriveImageUrl(profilePhoto)} alt={teacherName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

                      <div className="space-y-1.5 text-center sm:text-left flex-1 w-full">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-sm font-extrabold text-slate-800">Foto Profil Guru</h3>
                          {profilePhoto && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                              Tersimpan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Unggah foto profil resmi atau tempel link Google Drive untuk ditampilkan di header aplikasi, sidebar, serta laporan administratif.
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

                        {/* Google Drive Link Input */}
                        <div className="pt-2 text-left">
                          <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                            Atau Tempel Link Foto (Google Drive / URL Gambar):
                          </label>
                          <input
                            type="text"
                            placeholder="https://drive.google.com/file/d/... atau URL foto"
                            value={profilePhoto}
                            onChange={(e) => setProfilePhoto(formatDriveImageUrl(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                          />
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

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pilih Kelas yang Diampu</label>
                        <button
                          type="button"
                          onClick={handleSyncAdminClasses}
                          disabled={isSyncingAdminClasses}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-indigo-200 shadow-2xs"
                          title="Ambil daftar kelas dari database administrator"
                        >
                          <RefreshCw size={11} className={isSyncingAdminClasses ? "animate-spin text-indigo-600" : "text-indigo-600"} />
                          <span>{isSyncingAdminClasses ? "Memuat..." : "Ambil Data Kelas Admin"}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Centang kelas mana saja yang Anda ajar. Ini akan menyaring tampilan data di dashboard.</p>
                      
                      {syncAdminClassesMsg && (
                        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                          {syncAdminClassesMsg}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        {classList.map(cls => (
                          <label key={cls} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={teachingClasses.includes(cls)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setTeachingClasses(prev => {
                                  const updated = checked ? [...prev, cls] : prev.filter(c => c !== cls);
                                  if (user) userUpdateSelfProfile(user.uid, { teachingClasses: updated });
                                  return updated;
                                });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span className="text-sm font-medium text-slate-700">{cls}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kelas Binaan (Tugas Wali Kelas)</label>
                      <select
                        value={homeroomClass}
                        onChange={(e) => {
                          setHomeroomClass(e.target.value);
                          if (user) userUpdateSelfProfile(user.uid, { homeroomClass: e.target.value });
                        }}
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

                    {/* SECTION: DATA KEPALA SEKOLAH (PENGESAHAN DOKUMEN CETAK) */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          🏛️
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Data Kepala Sekolah (Pimpinan & Pengesahan)</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Digunakan untuk tanda tangan mengetahui pada dokumen cetak PDF, Jurnal, Nilai, & Rekap</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Lengkap & Gelar Kepala Sekolah</label>
                        <input 
                          type="text" 
                          value={headmasterName} 
                          onChange={(e) => setHeadmasterName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-semibold"
                          placeholder="Contoh: Dr. Hj. Yanti Suryanti, M.Pd."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NIP Kepala Sekolah</label>
                          <input 
                            type="text" 
                            value={headmasterNip} 
                            onChange={(e) => setHeadmasterNip(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                            placeholder="Contoh: 197005121995122001"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pangkat / Golongan Ruang</label>
                          <input 
                            type="text" 
                            value={headmasterRank} 
                            onChange={(e) => setHeadmasterRank(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                            placeholder="Contoh: Pembina Utama Muda, IV/c"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION: DATA IDENTITAS DOKUMEN & PENGESAHAN */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          📍
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Identitas Administrasi Cetak Dokumen</h4>
                          <p className="text-[11px] text-slate-400 font-medium">Kota titimangsa, NPSN, dan Tahun Pelajaran resmi</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kota / Kab. Pengesahan</label>
                          <input 
                            type="text" 
                            value={documentCity} 
                            onChange={(e) => setDocumentCity(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                            placeholder="Contoh: Tasikmalaya"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">NPSN Sekolah</label>
                          <input 
                            type="text" 
                            value={schoolNpsn} 
                            onChange={(e) => setSchoolNpsn(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                            placeholder="Contoh: 20224510"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tahun Pelajaran & Smt</label>
                          <input 
                            type="text" 
                            value={academicYear} 
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                            placeholder="Contoh: 2025/2026 (Genap)"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                        <span className="text-base">✨</span>
                        <p className="leading-relaxed">
                          <strong>Integrasi Otomatis:</strong> Data Kepala Sekolah dan titimangsa kota di atas langsung diterapkan pada lembar cetak <em>Jurnal Harian</em>, <em>Daftar Nilai</em>, <em>Rekap Absensi</em>, <em>Laporan Wali Kelas</em>, dan dokumen administrasi Kurikulum Merdeka.
                        </p>
                      </div>

                      {/* SECTION: TAMPILAN & DESAIN APLIKASI (MODERN & MENARIK) */}
                      <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">
                            🎨
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Pilihan Tampilan & Tema Aplikasi</h4>
                            <p className="text-[11px] text-slate-400 font-medium">Ubah tema visual sistem menjadi lebih modern, menarik, dan ramah mata</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { id: "classic-indigo", label: "Classic Indigo", desc: "Profesional & Resmi", color: "bg-indigo-600" },
                            { id: "modern-teal", label: "Modern Teal", desc: "Segar & Energik", color: "bg-teal-600" },
                            { id: "royal-slate", label: "Royal Slate", desc: "Premium & Elegan", color: "bg-slate-800" },
                            { id: "aurora-emerald", label: "Aurora Emerald", desc: "Teduh & Edukatif", color: "bg-emerald-600" },
                            { id: "cosmic-purple", label: "Cosmic Purple", desc: "Kreatif & Estetik", color: "bg-purple-600" },
                            { id: "rosewood-burgundy", label: "Rosewood Burgundy", desc: "Mewah & Hangat", color: "bg-rose-600" },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setAppTheme(t.id)}
                              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                                appTheme === t.id
                                  ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600/20"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-3.5 h-3.5 rounded-full ${t.color} shrink-0`} />
                                <span className="text-xs font-bold text-slate-800 truncate">{t.label}</span>
                              </div>
                              <span className="block text-[10px] text-slate-400 mt-1">{t.desc}</span>
                              {appTheme === t.id && (
                                <div className="absolute right-2 top-2 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-bold">
                                  ✓
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SECTION: BRANDING LOGO APLIKASI (KHUSUS ADMIN) */}
                      {user?.role === 'admin' && (
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                👑
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Logo & Branding Aplikasi (Khusus Admin)</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Ubah logo utama sistem untuk seluruh pengguna aplikasi</p>
                              </div>
                            </div>
                            {appLogo && (
                              <button
                                type="button"
                                onClick={() => setAppLogo("")}
                                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                              >
                                Reset Logo
                              </button>
                            )}
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                            {appLogo ? (
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 p-2 shrink-0 flex items-center justify-center shadow-2xs overflow-hidden">
                                  <img
                                    src={formatDriveImageUrl(appLogo)}
                                    alt="Logo Aplikasi"
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    Logo Kustom Aktif
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-1">Logo ini menggantikan icon topi toga bawaan di sidebar desktop, header mobile, dan menu drawer.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-indigo-50 rounded-xl border border-indigo-100 shrink-0 flex items-center justify-center text-indigo-600">
                                  <GraduationCap size={28} />
                                </div>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                    Logo Default Bawaan
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-1">Menggunakan icon topi akademis default EduAsisten AI.</p>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                                📁 Unggah Berkas Logo Baru
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const compressed = await compressImage(file, 600, 0.85);
                                    setAppLogo(compressed);
                                  } catch (err) {
                                    console.error("Gagal memproses logo:", err);
                                  }
                                }}
                                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer border border-slate-200 rounded-xl bg-white p-1"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                                🔗 Atau Link Google Drive / URL Gambar Logo
                              </label>
                              <input
                                type="text"
                                placeholder="https://drive.google.com/file/d/... atau direct URL logo"
                                value={appLogo}
                                onChange={(e) => setAppLogo(formatDriveImageUrl(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECTION: CONFIGURATION KOP SURAT LAPORAN */}
                      <div className="pt-6 border-t border-slate-100 space-y-4 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            📝
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Konfigurasi Kop Surat Laporan</h4>
                            <p className="text-[11px] text-slate-400 font-medium font-display">Atur logo dan kop surat resmi sekolah untuk seluruh dokumen cetak & PDF</p>
                          </div>
                        </div>

                        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/60 space-y-4">
                          {/* Main Toggle Switch */}
                          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-700">Aktifkan Kop Surat Resmi</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Tampilkan kop resmi di lembar presensi, nilai, dan administrasi</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setUseKop(!useKop)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                useKop ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  useKop ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {useKop && (
                            <div className="space-y-4">
                              {/* Kop Type Tab Selection */}
                              <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
                                <button
                                  type="button"
                                  onClick={() => setKopType("manual")}
                                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    kopType === "manual"
                                      ? "bg-white text-indigo-600 shadow-sm"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  <FileText size={13} />
                                  Kop Teks Manual
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setKopType("image")}
                                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    kopType === "image"
                                      ? "bg-white text-indigo-600 shadow-sm"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  <ImageIcon size={13} />
                                  Impor Gambar Kop
                                </button>
                              </div>

                              {kopType === "manual" ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-100">
                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris 1: Pemerintah Daerah / Yayasan</label>
                                      <input
                                        type="text"
                                        value={kopManual.line1}
                                        onChange={(e) => setKopManual({ ...kopManual, line1: e.target.value })}
                                        placeholder="PEMERINTAH PROVINSI JAWA BARAT"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
                                      />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris 2: Dinas / Bidang Pendidikan</label>
                                      <input
                                        type="text"
                                        value={kopManual.line2}
                                        onChange={(e) => setKopManual({ ...kopManual, line2: e.target.value })}
                                        placeholder="DINAS PENDIDIKAN"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
                                      />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris 3: Nama Instansi Utama / Sekolah (Besar)</label>
                                      <input
                                        type="text"
                                        value={kopManual.line3}
                                        onChange={(e) => setKopManual({ ...kopManual, line3: e.target.value })}
                                        placeholder="SMA NEGERI 2 TASIKMALAYA"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris 4: Jalan & Nomor Telepon</label>
                                      <input
                                        type="text"
                                        value={kopManual.line4}
                                        onChange={(e) => setKopManual({ ...kopManual, line4: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baris 5: Website & Email Resmi</label>
                                      <input
                                        type="text"
                                        value={kopManual.line5}
                                        onChange={(e) => setKopManual({ ...kopManual, line5: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
                                      />
                                    </div>
                                  </div>

                                  {/* LOGO SETTINGS FOR MANUAL TEXT */}
                                  <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3.5 text-left">
                                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                      <span className="text-xs">🛡️</span>
                                      <h5 className="text-xs font-bold text-slate-700">Logo Kop Manual</h5>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {/* Logo Upload */}
                                      <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilih Gambar Logo</label>
                                        {kopLogo ? (
                                          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                            <div className="w-10 h-10 bg-white rounded border p-1 shrink-0 flex items-center justify-center">
                                              <img src={kopLogo} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => setKopLogo("")}
                                              className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded font-bold hover:bg-rose-100 cursor-pointer"
                                            >
                                              Hapus Logo
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-indigo-500 rounded-lg cursor-pointer bg-slate-50 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all justify-center">
                                            <Upload size={13} />
                                            Unggah Logo Sekolah
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const reader = new FileReader();
                                                  reader.onload = (ev) => setKopLogo(ev.target?.result as string);
                                                  reader.readAsDataURL(file);
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>

                                      {/* Logo Position */}
                                      <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Posisi Penempatan Logo</label>
                                        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg">
                                          {[
                                            { id: "left", label: "Kiri" },
                                            { id: "right", label: "Kanan" },
                                            { id: "both", label: "Kiri+Kanan" },
                                            { id: "none", label: "Tanpa" }
                                          ].map((pos) => (
                                            <button
                                              key={pos.id}
                                              type="button"
                                              onClick={() => setKopLogoPosition(pos.id as any)}
                                              className={`py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                                                kopLogoPosition === pos.id
                                                  ? "bg-white text-indigo-600 shadow-2xs"
                                                  : "text-slate-500 hover:text-slate-800"
                                              }`}
                                            >
                                              {pos.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {kopLogo && kopLogoPosition !== "none" && (
                                      <div className="space-y-1.5 pt-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                          <span>Ukuran Tinggi Logo</span>
                                          <span className="text-indigo-600">{kopLogoSize} px</span>
                                        </div>
                                        <input
                                          type="range"
                                          min="30"
                                          max="100"
                                          value={kopLogoSize}
                                          onChange={(e) => setKopLogoSize(parseInt(e.target.value, 10))}
                                          className="w-full accent-indigo-600 cursor-pointer"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 flex flex-col items-center">
                                  {kopImage ? (
                                    <div className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center gap-3">
                                      <div className="border border-slate-300 rounded bg-white p-2.5 shadow-2xs w-full flex justify-center">
                                        <img
                                          src={kopImage}
                                          alt="Preview Kop Sekolah"
                                          className="max-h-24 object-contain"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Gambar Terpasang</span>
                                        <button
                                          type="button"
                                          onClick={() => setKopImage("")}
                                          className="flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-800 font-bold bg-rose-50 px-2.5 py-1 rounded transition-all cursor-pointer"
                                        >
                                          <Trash2 size={12} /> Hapus Gambar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                                      <div className="flex flex-col items-center text-center">
                                        <Upload size={24} className="text-slate-400 mb-2" />
                                        <span className="text-xs font-bold text-slate-700">Unggah Gambar Kop Surat Utama</span>
                                        <span className="text-[10px] text-slate-400 mt-1">Disarankan berukuran landscape memanjang</span>
                                      </div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setKopImage(ev.target?.result as string);
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
                          Daftar Kelas Terdaftar ({filteredClassList.length})
                        </label>
                        {filteredClassList.length > 0 && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Klik ikon tempat sampah untuk menghapus kelas
                          </span>
                        )}
                      </div>

                      {filteredClassList.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                          <Building2 size={28} className="mx-auto text-slate-400" />
                          <p className="text-xs font-bold text-slate-700">Belum ada kelas terdaftar</p>
                          <p className="text-[11px] text-slate-400">Gunakan kolom di atas untuk menambahkan kelas baru.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {filteredClassList.map((cls) => {
                            const classStudentCount = filteredStudents.filter(s => s.className === cls).length;
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
                        value={selectedStudentClassFilter || filteredClassList[0] || ""}
                        onChange={(e) => setSelectedStudentClassFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
                      >
                        {filteredClassList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Add student box */}
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                        <Plus size={14} /> Tambah Siswa Ke Kelas {selectedStudentClassFilter || filteredClassList[0] || "-"}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || filteredClassList[0]);
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
                              handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || filteredClassList[0]);
                            }
                          }}
                          placeholder="NIS / NISN (Opsional)"
                          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStudent(newStudentName, newStudentNis, selectedStudentClassFilter || filteredClassList[0])}
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
                        Daftar Siswa Kelas {selectedStudentClassFilter || filteredClassList[0] || "-"} (
                        {filteredStudents.filter(s => s.className === (selectedStudentClassFilter || filteredClassList[0])).length} siswa)
                      </label>
                      
                      {filteredStudents.filter(s => s.className === (selectedStudentClassFilter || filteredClassList[0])).length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
                          Belum ada siswa di kelas ini. Tambahkan siswa secara manual atau melalui impor Excel.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {students
                            .filter(s => s.className === (selectedStudentClassFilter || filteredClassList[0]))
                            .map((student, sIdx) => {
                              const isEditing = editingStudent?.id === student.id;
                              const isDeleting = deletingStudentId === student.id;

                              return (
                                <div 
                                  key={`${student.id}_${sIdx}`}
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
                            Pencadangan Lengkap: Profil, Absensi, Wali Kelas, Nilai & Jurnal
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            Cloud & Google Drive
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-200 leading-relaxed font-medium">
                          Sistem mencadangkan seluruh data administrasi Anda: <strong>Profil Guru</strong>, <strong>Foto Profil</strong>, <strong>Data Absensi Kehadiran</strong>, <strong>Kegiatan Ruang Wali Kelas (Catatan & Home Visit)</strong>, <strong>Daftar Nilai</strong>, <strong>Tugas</strong>, <strong>Jadwal</strong>, dan <strong>Jurnal Mengajar</strong> ke Database Cloud Firestore secara otomatis, serta berkas unduhan untuk Google Drive.
                        </p>
                      </div>
                    </div>

                    {restoreSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-extrabold">{restoreSuccessMsg}</p>
                          <p className="text-[10.5px] text-emerald-700 mt-0.5">Semua data telah dimuat ke aplikasi dan otomatis disinkronkan ke Cloud.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRestoreSuccessMsg(null)}
                          className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {restoreErrorMsg && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                        <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-extrabold">{restoreErrorMsg}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRestoreErrorMsg(null)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
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

                    {driveBackupNotice && (
                      <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 border animate-in fade-in ${
                        driveBackupNotice.type === "success" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                          : "bg-rose-50 border-rose-200 text-rose-900"
                      }`}>
                        {driveBackupNotice.type === "success" ? (
                          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle size={18} className="shrink-0 text-rose-600" />
                        )}
                        <span>{driveBackupNotice.message}</span>
                      </div>
                    )}

                    {/* SECTION 1: Automatic Daily Cloud Database Backup */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">1</span>
                            <h5 className="text-xs font-extrabold text-slate-900">Cadangan Harian ke Database Cloud (Jadwal Jam 14:00 / 2 Siang)</h5>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                              ⚡ Kapasitas Ekstra Besar (Hingga 50 MB+)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-8">
                            Status pencadangan hari ini: {lastDailyBackupDate ? (
                              <strong className="text-emerald-700 font-bold">Terakhir disimpan: {lastDailyBackupDate}</strong>
                            ) : (
                              <span className="text-amber-600 font-bold">Belum ada cadangan tersimpan hari ini</span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                          <button
                            type="button"
                            onClick={() => triggerDailyBackup(true, "14:00 WIB (Jam 2 Siang)")}
                            disabled={isDailyBackupSaving || isDriveBackupSaving}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <Zap size={15} className="text-amber-300" />
                            {isDailyBackupSaving ? "Menyimpan..." : "Cadangkan Snapshot Jam 14:00"}
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerDailyBackup(true)}
                            disabled={isDailyBackupSaving || isDriveBackupSaving}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <UploadCloud size={16} className={isDailyBackupSaving ? "animate-bounce" : ""} />
                            {isDailyBackupSaving ? "Menyimpan..." : "Cadangkan Sekarang"}
                          </button>
                          <button
                            type="button"
                            onClick={() => loginForDriveBackup()}
                            disabled={isDailyBackupSaving || isDriveBackupSaving}
                            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <Database size={16} className={isDriveBackupSaving ? "animate-bounce" : ""} />
                            {isDriveBackupSaving ? "Menyimpan ke Drive..." : "Backup ke Google Drive"}
                          </button>
                        </div>
                      </div>

                      {/* Schedule settings row */}
                      <div className="pl-8 pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock size={14} className="text-indigo-600" />
                            Jadwal Otomatis Akhir Jam Mengajar:
                          </span>
                          <p className="text-[10.5px] text-slate-500">
                            Aplikasi secara otomatis mencadangkan data ke Cloud saat jam menunjukkan waktu ini setiap hari.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {["14:00", "15:00", "16:00"].map((timePreset) => (
                            <button
                              key={timePreset}
                              type="button"
                              onClick={() => {
                                setDailyBackupScheduleTime(timePreset);
                                safeStorage.setItem("guru_daily_backup_schedule_time", timePreset);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                dailyBackupScheduleTime === timePreset
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              {timePreset} {timePreset === "14:00" ? "(2 Siang)" : ""}
                            </button>
                          ))}
                          <input
                            type="time"
                            value={dailyBackupScheduleTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setDailyBackupScheduleTime(val);
                                safeStorage.setItem("guru_daily_backup_schedule_time", val);
                              }
                            }}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2.5">
                        <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Fitur Otomatis Jam 14:00 (2 Siang):</strong> Aplikasi secara otomatis mendeteksi pergantian hari dan jam kerja (default <strong>14:00 WIB</strong>) untuk menyimpan snapshot data ke Firestore Cloud agar data mengajar dan penilaian hari ini tersimpan aman.
                        </span>
                      </div>
                    </div>

                    {/* SECTION 2: Riwayat Cadangan Google Drive */}
                    <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">2</span>
                            <h5 className="text-xs font-extrabold text-slate-900">Riwayat Cadangan di Google Drive</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-8">
                            Daftar berkas cadangan yang tersimpan aman di akun Google Drive Anda.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => loginForDriveList()}
                          disabled={isFetchingDriveHistory}
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-extrabold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 shrink-0"
                        >
                          <Database size={14} className={isFetchingDriveHistory ? "animate-bounce" : ""} />
                          {isFetchingDriveHistory ? "Memuat..." : "Ambil Data Drive"}
                        </button>
                      </div>

                      <div className="pl-8">
                        {driveBackupHistory.length === 0 ? (
                          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-[11px] text-slate-400 italic">
                            {driveToken ? "Belum ada riwayat cadangan di Google Drive. Klik tombol Backup ke Google Drive di atas." : "Klik tombol 'Ambil Data Drive' di atas untuk melihat riwayat."}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {driveBackupHistory.map((item) => {
                              const createdDate = new Date(item.createdTime);
                              const formattedTime = createdDate.toLocaleString("id-ID", {
                                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                              });
                              const sizeKB = Math.round(Number(item.size) / 1024);
                              
                              return (
                                <div 
                                  key={item.id}
                                  className="p-3 bg-emerald-50/30 hover:bg-emerald-50/80 border border-emerald-100/60 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                                >
                                  <div className="space-y-0.5">
                                    <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-2">
                                      <Cloud size={14} className="text-emerald-600" />
                                      <span>{formattedTime}</span>
                                      <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                        {sizeKB} KB
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-700 truncate max-w-[200px] sm:max-w-full">
                                      {item.name}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setConfirmRestoreModal({
                                      isOpen: true,
                                      type: "drive",
                                      driveItem: item,
                                    })}
                                    className="px-3 py-2 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1.5 shrink-0"
                                  >
                                    <RotateCcw size={12} /> Pulihkan
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
                                <div className="font-extrabold text-xs text-indigo-950 flex flex-wrap items-center gap-2">
                                  <span>{item.formattedDate}</span>
                                  {item.teacherName && (
                                    <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                                      👤 {item.teacherName}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                    {item.deviceLabel}
                                  </span>
                                  {item.sizeKB !== undefined && (
                                    <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      📦 {item.sizeKB >= 1024 ? `${(item.sizeKB / 1024).toFixed(2)} MB` : `${item.sizeKB} KB`}
                                    </span>
                                  )}
                                  {item.isChunked && (
                                    <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                                      🧩 Multi-Chunk
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>👤 {item.studentCount} Siswa</span>
                                  <span>📅 {item.attendanceCount ?? 0} Absensi</span>
                                  <span>🛡️ {(item.homeroomCount ?? 0) + (item.homeVisitsCount ?? 0)} Wali Kelas</span>
                                  <span>📊 {item.gradeCount} Nilai</span>
                                  <span>📖 {item.journalCount} Jurnal</span>
                                  <span>🏫 {item.classCount} Kelas</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenCloudRestoreConfirm(item)}
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
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">4</span>
                            <h5 className="text-xs font-extrabold text-slate-900">Simpan & Pulihkan Data Berkas Lokal (.json)</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-8">Unduh cadangan ke file lokal, atau muat kembali dari berkas cadangan JSON yang Anda miliki.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0"
                        >
                          <Download size={16} /> Simpan Berkas (.json)
                        </button>
                      </div>

                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleProcessImportFile(file);
                        }}
                        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 transition-all rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
                      >
                        <label className="w-full flex flex-col items-center justify-center cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-1">
                            <FileUp size={20} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 block">Klik untuk pilih atau Seret (Drag & Drop) berkas (.json)</span>
                          <span className="text-[10px] text-slate-400">Pilih file .json cadangan EduAsisten Anda</span>
                          <input 
                            type="file"
                            accept=".json"
                            onChange={handleImportBackup}
                            className="hidden"
                          />
                        </label>
                      </div>
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

      {/* RESTORE DATA CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmRestoreModal && confirmRestoreModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <RotateCcw size={20} className={isRestoringData ? "animate-spin" : ""} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Konfirmasi Pemulihan Data (Restore)</h3>
                    <p className="text-[11px] text-slate-500">
                      {confirmRestoreModal.type === "cloud" 
                        ? `Sumber: Snapshot Cloud (${confirmRestoreModal.backupItem?.formattedDate})`
                        : confirmRestoreModal.type === "drive"
                        ? `Sumber: Google Drive (${confirmRestoreModal.driveItem?.name})`
                        : `Sumber: File Berkas (${confirmRestoreModal.fileName || "JSON"})`
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isRestoringData && setConfirmRestoreModal(null)}
                  disabled={isRestoringData}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Error Alert if any */}
              {restoreErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{restoreErrorMsg}</span>
                </div>
              )}

              {/* Summary Stats of Backup */}
              {confirmRestoreModal.type === "drive" ? (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center text-[11px] text-slate-500 italic">
                  Data ringkasan tidak tersedia sebelum pengunduhan selesai. Seluruh data akan dipulihkan secara penuh dari Google Drive.
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Ringkasan Data yang Akan Dimuat:
                  </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">👤 Jumlah Siswa:</span>
                    <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.studentCount || 0}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">📅 Rekap Absensi:</span>
                    <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.attendanceCount || 0}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">🛡️ Wali Kelas:</span>
                    <strong className="text-indigo-950 font-extrabold">
                      {(confirmRestoreModal.details?.homeroomCount || 0) + (confirmRestoreModal.details?.homeVisitsCount || 0)} Kegiatan
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">📊 Jumlah Nilai:</span>
                    <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.gradeCount || 0}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">📖 Jurnal Guru:</span>
                    <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.journalCount || 0}</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 font-medium">🏫 Kelas:</span>
                    <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.classCount || 0}</strong>
                  </div>
                  {(confirmRestoreModal.details?.scheduleCount || 0) > 0 && (
                    <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-medium">🗓️ Jadwal Pelajaran:</span>
                      <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.scheduleCount || 0}</strong>
                    </div>
                  )}
                  {(confirmRestoreModal.details?.assignmentCount || 0) > 0 && (
                    <div className="p-2.5 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between">
                      <span className="text-slate-500 font-medium">📝 Tugas & Ulangan:</span>
                      <strong className="text-indigo-950 font-extrabold">{confirmRestoreModal.details?.assignmentCount || 0}</strong>
                    </div>
                  )}
                </div>
                {confirmRestoreModal.details?.teacherName && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/50 flex items-center justify-between">
                    <span>Profil Pengajar & Sekolah:</span>
                    <span className="font-bold text-slate-800">{confirmRestoreModal.details.teacherName}</span>
                  </div>
                )}
              </div>
              )}

              {/* Warning Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Memulihkan data akan menggantikan data aktif di aplikasi saat ini dengan data dari cadangan yang dipilih dan otomatis menyinkronkannya kembali ke database Cloud.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreModal(null)}
                  disabled={isRestoringData}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoringData}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRestoringData ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" />
                      <span>Sedang Memulihkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Ya, Pulihkan Sekarang</span>
                    </>
                  )}
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
        onToggleRealtimeSync={handleToggleRealtimeSync}
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

      {/* INITIAL STARTUP PRE-SYNC FLOATING INDICATOR */}
      <AnimatePresence>
        {isInitialSyncing && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-2.5 backdrop-blur-md text-xs font-bold pointer-events-none"
          >
            <RefreshCw size={15} className="animate-spin text-indigo-400 shrink-0" />
            <span className="text-slate-200 text-xs">Menyinkronkan data dengan perangkat terakhir...</span>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="text-indigo-300 font-extrabold text-[11px] flex items-center gap-1.5">
                <Cloud size={12} className="text-indigo-400" />
                Notifikasi Sinkronisasi Cloud
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

      {/* STUDENT PROFILE & SETTINGS MODAL */}
      {isStudent && user && (
        <PengaturanSiswaModal
          isOpen={isStudentSettingsOpen}
          onClose={() => setIsStudentSettingsOpen(false)}
          user={user}
          classList={classList}
          onProfileUpdated={(updatedUser) => {
            setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
          }}
        />
      )}

    </div>
      )}
    </>
  );
}
