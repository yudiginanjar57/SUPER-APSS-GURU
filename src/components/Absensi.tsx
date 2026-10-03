import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck, 
  Search, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Smile,
  FileCheck,
  Download,
  Settings,
  Image as ImageIcon,
  FileText,
  Upload,
  Trash2,
  ChevronDown,
  RotateCcw,
  Database
} from "lucide-react";
import { Student, Attendance, AttendanceStatus, ScheduleItem } from "../types";
import { CLASSES } from "../data/presets";
import { safeStorage } from "../lib/safeStorage";
import { getLocalDateString, getIndonesianDayName } from "../lib/dateUtils";
import { utils, writeFile } from "xlsx";
import * as jspdfModule from "jspdf";
const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
import autoTable from "jspdf-autotable";
import ExportPreviewModal from "./ExportPreviewModal";
import MenuDataRestoreModal from "./MenuDataRestoreModal";
import { getStoredTteConfig, renderTteImageHtml, embedTteInJsPdf } from "../lib/tteUtils";
import { renderKopHeaderHtml } from "../lib/kopUtils";

interface AbsensiProps {
  students: Student[];
  attendanceList: Attendance[];
  onSaveAttendance: (newAttendance: Attendance[]) => void;
  classList?: string[];
  schedule?: ScheduleItem[];
  teacherName?: string;
  nip?: string;
  subject?: string;
  institution?: string;
  headmasterName?: string;
  headmasterNip?: string;
  headmasterRank?: string;
  documentCity?: string;
  schoolNpsn?: string;
  academicYear?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  selectedClass?: string;
  onClassChange?: (className: string) => void;
}

export default function Absensi({
  students,
  attendanceList,
  onSaveAttendance,
  classList,
  schedule = [],
  teacherName = "YUDI GINANJAR, S.Pd",
  nip = "199605242024211008",
  subject = "EKONOMI",
  institution = "PEMERINTAH DAERAH PROVINSI JAWA BARAT\nDINAS PENDIDIKAN\nSMAN 1 KOTA TASIKMALAYA",
  headmasterName = "Dr. Hj. Yanti Suryanti, M.Pd.",
  headmasterNip = "197005121995122001",
  headmasterRank = "Pembina Utama Muda, IV/c",
  documentCity = "Tasikmalaya",
  schoolNpsn = "20224510",
  academicYear = "2025/2026 (Genap)",
  selectedDate: propDate,
  onDateChange,
  selectedClass: propClass,
  onClassChange
}: AbsensiProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;

  // Selected Class with persistence: fallback to saved or first available class
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    const saved = safeStorage.getItem("guru_attendance_class");
    if (saved && availableClasses.includes(saved)) return saved;
    return propClass || availableClasses[0] || "X-MIPA-1";
  });

  // Selected Date with persistence: NEVER resets when switching classes or navigating tabs
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return propDate || getLocalDateString();
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Sync props if parent updates them
  useEffect(() => {
    if (propDate && propDate !== selectedDate) {
      setSelectedDate(propDate);
    }
  }, [propDate]);

  // Automatically synchronize active semester tab with selectedDate month changes
  useEffect(() => {
    if (selectedDate) {
      const m = parseInt(selectedDate.slice(5, 7));
      const autoSem = (m >= 7 && m <= 12) ? 1 : 2;
      setSelectedSemester(autoSem as 1 | 2);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (propClass && propClass !== selectedClass && availableClasses.includes(propClass)) {
      setSelectedClass(propClass);
    }
  }, [propClass]);

  // Export State
  const [exportMode, setExportMode] = useState<"monthly" | "all">("monthly");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => {
    // Dynamically check current selectedDate month (July-December is Semester 1, January-June is Semester 2)
    const m = parseInt((selectedDate || getLocalDateString()).slice(5, 7));
    return (m >= 7 && m <= 12) ? 1 : 2;
  });

  // Whenever selectedSemester changes, save it to safeStorage
  useEffect(() => {
    safeStorage.setItem("guru_attendance_semester", selectedSemester.toString());
  }, [selectedSemester]);

  const isDateInActiveSemester = (dateStr: string) => {
    if (!dateStr) return false;
    const m = parseInt(dateStr.slice(5, 7));
    return selectedSemester === 1 ? (m >= 7 && m <= 12) : (m >= 1 && m <= 6);
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return selectedDate ? selectedDate.slice(0, 7) : getLocalDateString().slice(0, 7);
  });

  // Selected Classes for Multi-Class Export
  const [selectedExportClasses, setSelectedExportClasses] = useState<string[]>(() => {
    const available = classList && classList.length > 0 ? classList : CLASSES;
    return [...available]; // select all by default
  });
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // Close class selector dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Kop Sekolah (School Letterhead) States synced with Profile settings
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
      line3: institution || "SMA NEGERI 2 TASIKMALAYA",
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

  // Listen to profile configuration changes
  useEffect(() => {
    const syncKopSettings = () => {
      const enabled = safeStorage.getItem("guru_kop_enabled");
      setUseKop(enabled === null ? true : enabled === "true");
      
      const type = safeStorage.getItem("guru_kop_type");
      setKopType((type === "manual" || type === "image") ? type : "manual");
      
      const manual = safeStorage.getItem("guru_kop_manual");
      if (manual) {
        try {
          setKopManual(JSON.parse(manual));
        } catch (e) {
          console.error(e);
        }
      }
      
      setKopImage(safeStorage.getItem("guru_kop_image") || "");
      setKopLogo(safeStorage.getItem("guru_kop_logo") || "");
      setKopLogoPosition((safeStorage.getItem("guru_kop_logo_position") as any) || "left");
      
      const size = safeStorage.getItem("guru_kop_logo_size");
      setKopLogoSize(size ? parseInt(size, 10) : 55);
    };

    window.addEventListener("guru_kop_settings_changed", syncKopSettings);
    return () => window.removeEventListener("guru_kop_settings_changed", syncKopSettings);
  }, []);

  const renderPdfKop = (doc: any): number => {
    if (!useKop) return 15;

    if (kopType === "image" && kopImage) {
      try {
        let imgWidth = 269;
        let imgHeight = 23;
        
        const tempImg = new Image();
        tempImg.src = kopImage;
        if (tempImg.width && tempImg.height) {
          const ratio = tempImg.width / tempImg.height;
          // Max height is 24, max width is 269
          imgHeight = 24;
          imgWidth = imgHeight * ratio;
          if (imgWidth > 269) {
            imgWidth = 269;
            imgHeight = imgWidth / ratio;
          }
        }
        
        const xOffset = 14 + (269 - imgWidth) / 2;
        doc.addImage(kopImage, "PNG", xOffset, 8, imgWidth, imgHeight);
        
        const lineY = 8 + imgHeight + 2;
        doc.setLineWidth(0.8);
        doc.line(14, lineY, 283, lineY);
        doc.setLineWidth(0.2);
        doc.line(14, lineY + 1.2, 283, lineY + 1.2);
        return lineY + 7;
      } catch (err) {
        console.error("Error adding PDF Kop image:", err);
        return 15;
      }
    } else if (kopType === "manual") {
      let logoWidth = 14;
      let logoHeight = 14;
      let logoActive = kopLogo && kopLogoPosition !== "none";
      
      if (logoActive) {
        try {
          const logoImg = new Image();
          logoImg.src = kopLogo;
          if (logoImg.width && logoImg.height) {
            const ratio = logoImg.width / logoImg.height;
            // Scale based on kopLogoSize
            logoHeight = (kopLogoSize / 55) * 15;
            logoWidth = logoHeight * ratio;
            if (logoWidth > 20) {
              logoWidth = 20;
              logoHeight = logoWidth / ratio;
            }
          }
        } catch (e) {
          console.error("Error measuring logo:", e);
        }
      }

      if (logoActive) {
        if (kopLogoPosition === "left" || kopLogoPosition === "both") {
          try {
            doc.addImage(kopLogo, "PNG", 14, 8, logoWidth, logoHeight);
          } catch (e) {
            console.error("Error drawing left logo:", e);
          }
        }
        if (kopLogoPosition === "right" || kopLogoPosition === "both") {
          try {
            doc.addImage(kopLogo, "PNG", 283 - 14 - logoWidth, 8, logoWidth, logoHeight);
          } catch (e) {
            console.error("Error drawing right logo:", e);
          }
        }
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(kopManual.line1, 148.5, 11, { align: "center" });
      doc.text(kopManual.line2, 148.5, 15, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138); // 1e3a8a
      doc.text(kopManual.line3, 148.5, 21, { align: "center" });
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(kopManual.line4, 148.5, 26, { align: "center" });
      doc.text(kopManual.line5, 148.5, 30, { align: "center" });
      
      doc.setLineWidth(0.8);
      doc.line(14, 33, 283, 33);
      doc.setLineWidth(0.2);
      doc.line(14, 34.2, 283, 34.2);
      return 40;
    }
    
    return 15;
  };
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Export Attendance JSON Backup
  const handleExportAttendanceJson = () => {
    const backupPayload = {
      app: "EduAsisten",
      version: "2.5",
      category: "attendance",
      exportedAt: new Date().toISOString(),
      attendanceCount: attendanceList.length,
      attendanceList: attendanceList
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_Presensi_EduAsisten_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Attendance Data Handler
  const handleRestoreAttendanceData = (importedData: any, mode: "merge" | "replace") => {
    let list: Attendance[] = [];
    if (Array.isArray(importedData)) {
      list = importedData;
    } else if (importedData && Array.isArray(importedData.attendanceList)) {
      list = importedData.attendanceList;
    } else if (importedData && Array.isArray(importedData.attendance)) {
      list = importedData.attendance;
    }

    if (!Array.isArray(list) || list.length === 0) {
      return { success: false, message: "Tidak ada data presensi yang valid ditemukan dalam berkas." };
    }

    // Clean and validate attendance records
    const validList: Attendance[] = list
      .filter(item => item && item.studentId && item.date && item.status)
      .map(item => ({
        id: item.id || `${item.studentId}-${item.date}`,
        studentId: item.studentId,
        date: item.date,
        status: item.status,
        className: item.className || activeSelectedClass
      }));

    if (validList.length === 0) {
      return { success: false, message: "Format rekaman presensi tidak sesuai dengan standar sistem." };
    }

    if (mode === "replace") {
      onSaveAttendance(validList);
    } else {
      // Smart merge: keep existing non-conflicting, overwrite or add imported
      const map = new Map<string, Attendance>();
      attendanceList.forEach(item => map.set(`${item.studentId}_${item.date}`, item));
      validList.forEach(item => map.set(`${item.studentId}_${item.date}`, item));
      onSaveAttendance(Array.from(map.values()));
    }

    return { 
      success: true, 
      count: validList.length, 
      message: `Berhasil memulihkan ${validList.length} rekaman presensi (${mode === "merge" ? "Gabung & Lengkapi" : "Ganti Keseluruhan"})!` 
    };
  };

  // Ensure selectedClass remains valid if classList changes
  const activeSelectedClass = availableClasses.includes(selectedClass) 
    ? selectedClass 
    : availableClasses[0] || "X-MIPA-1";

  // Temporary local state for manual edits during the current view
  const [localAttendance, setLocalAttendance] = useState<Record<string, AttendanceStatus>>({});

  // Robust day and class normalization helpers
  const normalizeDay = (dayStr: string) => {
    if (!dayStr) return "";
    const d = dayStr.trim().toLowerCase().replace(/['`]/g, '');
    if (d.startsWith("sen") || d.startsWith("mon")) return "senin";
    if (d.startsWith("sel") || d.startsWith("tue")) return "selasa";
    if (d.startsWith("rab") || d.startsWith("wed")) return "rabu";
    if (d.startsWith("kam") || d.startsWith("thu")) return "kamis";
    if (d.startsWith("jum") || d.startsWith("fri")) return "jumat";
    if (d.startsWith("sab") || d.startsWith("sat")) return "sabtu";
    if (d.startsWith("min") || d.startsWith("aha") || d.startsWith("sun")) return "minggu";
    return d;
  };

  const normalizeClass = (clsStr: string) => {
    return (clsStr || "").toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Compute Day Name in Indonesian accurately from selectedDate
  const selectedDayName = useMemo(() => {
    return getIndonesianDayName(selectedDate);
  }, [selectedDate]);

  // Check if selected class has a scheduled session on selectedDate's day of week
  const classScheduleToday = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];
    const targetDay = normalizeDay(selectedDayName);
    const targetClass = normalizeClass(activeSelectedClass);

    return schedule.filter(s => {
      const sDay = normalizeDay(s.day || "");
      const matchesDay = sDay === targetDay;
      if (!matchesDay) return false;

      const rawClass = s.className || "";
      const tokens = rawClass.split(/[,/|]/).map(normalizeClass).filter(Boolean);
      const matchesClass = tokens.includes(targetClass) || normalizeClass(rawClass) === targetClass;
      return matchesClass;
    });
  }, [schedule, activeSelectedClass, selectedDayName]);

  // If there's an active schedule list, check if this class teaches today
  const isScheduledDay = useMemo(() => {
    if (!schedule || schedule.length === 0) return true; // Default true if schedule is empty
    return classScheduleToday.length > 0;
  }, [schedule, classScheduleToday]);

  // Memoized students for the selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === activeSelectedClass);
  }, [students, activeSelectedClass]);

  // Sync existing database/state attendance into our local editor when Class/Date changes
  // Core Rule:
  // 1. If local session edit exists -> use local edit
  // 2. If saved database record exists -> ALWAYS respect the saved record (whether Hadir, Sakit, Izin, Alpa, or Tidak Mengajar)
  // 3. If no record exists yet:
  //    - If scheduled day -> default to "Hadir"
  //    - If non-scheduled day -> default to "Tidak Mengajar"
  const activeAttendance = useMemo(() => {
    const records = attendanceList.filter(
      a => a.className === activeSelectedClass && a.date === selectedDate
    );
    
    const recordMap: Record<string, AttendanceStatus> = {};
    records.forEach(r => {
      recordMap[r.studentId] = r.status;
    });

    const result: Record<string, AttendanceStatus> = {};

    classStudents.forEach(student => {
      // 1. If explicitly edited in this active session
      if (localAttendance[student.id]) {
        result[student.id] = localAttendance[student.id];
        return;
      }

      // 2. If saved in database, respect the saved status (allowing teacher intervention on any day)
      if (recordMap[student.id]) {
        result[student.id] = recordMap[student.id];
        return;
      }

      // 3. If no record exists yet:
      if (isScheduledDay) {
        result[student.id] = "Hadir";
      } else {
        result[student.id] = "Tidak Mengajar";
      }
    });

    return result;
  }, [attendanceList, activeSelectedClass, selectedDate, classStudents, localAttendance, isScheduledDay]);

  // Initial Auto-Seeding for new date/class views (never overwrites existing saved interventions)
  const autoSyncedKeyRef = useRef<string>("");
  useEffect(() => {
    if (!classStudents || classStudents.length === 0) return;
    const syncKey = `${activeSelectedClass}_${selectedDate}_${classStudents.length}`;
    if (autoSyncedKeyRef.current === syncKey) return;

    const existingRecords = attendanceList.filter(
      a => a.className === activeSelectedClass && a.date === selectedDate
    );

    const defaultStatus: AttendanceStatus = isScheduledDay ? "Hadir" : "Tidak Mengajar";

    // If completely no records exist for this class & date, seed the default
    if (existingRecords.length === 0) {
      const initialPayload: Attendance[] = classStudents.map(student => ({
        id: `${student.id}-${selectedDate}`,
        studentId: student.id,
        date: selectedDate,
        status: defaultStatus,
        className: activeSelectedClass
      }));
      autoSyncedKeyRef.current = syncKey;
      onSaveAttendance(initialPayload);
    } else {
      // If some students are missing records, seed only the missing ones
      const missingStudents = classStudents.filter(
        s => !existingRecords.some(r => r.studentId === s.id)
      );
      if (missingStudents.length > 0) {
        const missingPayload: Attendance[] = missingStudents.map(student => ({
          id: `${student.id}-${selectedDate}`,
          studentId: student.id,
          date: selectedDate,
          status: defaultStatus,
          className: activeSelectedClass
        }));
        autoSyncedKeyRef.current = syncKey;
        onSaveAttendance(missingPayload);
      }
    }
  }, [activeSelectedClass, selectedDate, classStudents, isScheduledDay, attendanceList, onSaveAttendance]);

  // Date selection change handler (persists and notifies parent)
  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    safeStorage.setItem("guru_attendance_date", newDate);
    onDateChange?.(newDate);
    setLocalAttendance({});
  };

  // Class selection change handler (preserves selectedDate completely!)
  const handleSelectClass = (cls: string) => {
    // If there were local edits in the previous class, save them before switching
    if (Object.keys(localAttendance).length > 0) {
      const attendancePayload: Attendance[] = classStudents.map(student => {
        const status = localAttendance[student.id] || activeAttendance[student.id] || (isScheduledDay ? "Hadir" : "Tidak Mengajar");
        return {
          id: `${student.id}-${selectedDate}`,
          studentId: student.id,
          date: selectedDate,
          status,
          className: activeSelectedClass
        };
      });
      onSaveAttendance(attendancePayload);
    }

    setSelectedClass(cls);
    safeStorage.setItem("guru_attendance_class", cls);
    onClassChange?.(cls);
    setLocalAttendance({});
    setSearchQuery("");
    // CRITICAL: selectedDate remains completely unchanged!
  };

  // Update local attendance record state & persist immediately
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));

    const attendancePayload: Attendance[] = classStudents.map(student => {
      const currentStatus = student.id === studentId 
        ? status 
        : (localAttendance[student.id] || activeAttendance[student.id] || (isScheduledDay ? "Hadir" : "Tidak Mengajar"));
      return {
        id: `${student.id}-${selectedDate}`,
        studentId: student.id,
        date: selectedDate,
        status: currentStatus,
        className: activeSelectedClass
      };
    });
    onSaveAttendance(attendancePayload);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Mark all as Present helper (immediately saves & updates)
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    const attendancePayload: Attendance[] = classStudents.map(s => {
      updated[s.id] = "Hadir";
      return {
        id: `${s.id}-${selectedDate}`,
        studentId: s.id,
        date: selectedDate,
        status: "Hadir" as AttendanceStatus,
        className: activeSelectedClass
      };
    });
    setLocalAttendance(updated);
    onSaveAttendance(attendancePayload);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Mark all as Tidak Mengajar / Libur KBM helper (immediately saves & updates)
  const handleMarkAllNoClass = () => {
    const updated: Record<string, AttendanceStatus> = {};
    const attendancePayload: Attendance[] = classStudents.map(s => {
      updated[s.id] = "Tidak Mengajar";
      return {
        id: `${s.id}-${selectedDate}`,
        studentId: s.id,
        date: selectedDate,
        status: "Tidak Mengajar" as AttendanceStatus,
        className: activeSelectedClass
      };
    });
    setLocalAttendance(updated);
    onSaveAttendance(attendancePayload);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Save changes to Parent / LocalStorage
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = () => {
    const attendancePayload: Attendance[] = classStudents.map(student => {
      const status = localAttendance[student.id] || activeAttendance[student.id] || "Hadir";
      return {
        id: `${student.id}-${selectedDate}`,
        studentId: student.id,
        date: selectedDate,
        status,
        className: activeSelectedClass
      };
    });

    onSaveAttendance(attendancePayload);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Compute stats for current class & date selection
  const stats = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0, tidakMengajar = 0;
    classStudents.forEach(s => {
      const status = localAttendance[s.id] || activeAttendance[s.id] || "Hadir";
      if (status === "Hadir") hadir++;
      else if (status === "Sakit") sakit++;
      else if (status === "Izin") izin++;
      else if (status === "Alpa") alpa++;
      else if (status === "Tidak Mengajar") tidakMengajar++;
    });

    const effectiveTotal = classStudents.length - tidakMengajar;
    const rate = effectiveTotal > 0 ? Math.round((hadir / effectiveTotal) * 100) : (tidakMengajar > 0 ? 100 : 0);
    return { hadir, sakit, izin, alpa, tidakMengajar, rate, effectiveTotal };
  }, [classStudents, localAttendance, activeAttendance]);

  // Export Logic with Daily Detail Matrix and Final Overall Summary
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewType, setPreviewType] = useState<"single" | "multi">("single");

  const getExportDetails = () => {
    const filteredAttendance = attendanceList.filter(a => {
      if (activeSelectedClass && a.className !== activeSelectedClass) return false;
      if (!isDateInActiveSemester(a.date)) return false;
      if (exportMode === "monthly") {
        return a.date.startsWith(selectedMonth);
      }
      return true;
    });

    // All candidate dates in the selected scope
    const allCandidateDates = Array.from(
      new Set([
        ...filteredAttendance.map(a => a.date),
        selectedDate
      ])
    ).filter(d => {
      if (!isDateInActiveSemester(d)) return false;
      if (exportMode === "monthly") {
        return d.startsWith(selectedMonth);
      }
      return true;
    }).sort();

    // Filter candidate dates:
    // Core Rule: "Apabila ada jadwal yang tidak mengajar (tanpa intervensi) tidak dimasukan kedalam rekap bulanan atau keseluruhan"
    // A date is ONLY included in the recap if there is at least one active KBM/intervention record (e.g. Hadir, Sakit, Izin, Alpa, etc.)
    // If on a given date ALL students are "Tidak Mengajar", that date is completely EXCLUDED from the recap.
    const uniqueDates = allCandidateDates.filter(date => {
      let hasActiveKbmOrIntervention = false;
      for (const student of classStudents) {
        let status: AttendanceStatus | undefined;
        if (date === selectedDate) {
          status = localAttendance[student.id] || activeAttendance[student.id];
        } else {
          status = filteredAttendance.find(a => a.studentId === student.id && a.date === date)?.status;
        }

        if (status && status !== "Tidak Mengajar") {
          hasActiveKbmOrIntervention = true;
          break;
        }
      }
      return hasActiveKbmOrIntervention;
    });

    const studentRows = classStudents.map(student => {
      const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);

      const record: {
        id: string;
        nis: string;
        name: string;
        daily: Record<string, AttendanceStatus | "-">;
        hadir: number;
        sakit: number;
        izin: number;
        alpa: number;
        tidakMengajar: number;
        totalKbm: number;
        percentage: string;
      } = {
        id: student.id,
        nis: student.nis,
        name: student.name,
        daily: {},
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        tidakMengajar: 0,
        totalKbm: 0,
        percentage: "0%"
      };

      uniqueDates.forEach(date => {
        let status: AttendanceStatus | undefined = studentAttendance.find(a => a.date === date)?.status;
        if (!status && date === selectedDate) {
          status = localAttendance[student.id] || activeAttendance[student.id];
        }
        const finalStatus = status || "Hadir";
        record.daily[date] = finalStatus;

        if (finalStatus === "Hadir") record.hadir++;
        else if (finalStatus === "Sakit") record.sakit++;
        else if (finalStatus === "Izin") record.izin++;
        else if (finalStatus === "Alpa") record.alpa++;
        else if (finalStatus === "Tidak Mengajar") record.tidakMengajar++;
      });

      record.totalKbm = record.hadir + record.sakit + record.izin + record.alpa;
      const effPct = record.totalKbm > 0 
        ? Math.round((record.hadir / record.totalKbm) * 100) 
        : 100;
      record.percentage = `${effPct}%`;

      return record;
    });

    return { uniqueDates, studentRows };
  };

  const getExportData = () => {
    const { uniqueDates, studentRows } = getExportDetails();

    return studentRows.map(s => {
      const row: Record<string, any> = {
        NIS: s.nis || "-",
        Nama: s.name || "-",
      };

      uniqueDates.forEach(d => {
        const parts = d.split("-");
        const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        const st = s.daily[d];
        let symbol = "-";
        if (st === "Hadir") symbol = "H";
        else if (st === "Sakit") symbol = "S";
        else if (st === "Izin") symbol = "I";
        else if (st === "Alpa") symbol = "A";
        else if (st === "Tidak Mengajar") symbol = "TM";
        row[shortDate] = symbol;
      });

      row["Hadir (H)"] = s.hadir;
      row["Sakit (S)"] = s.sakit;
      row["Izin (I)"] = s.izin;
      row["Alpa (A)"] = s.alpa;
      row["Tdk Mengajar (TM)"] = s.tidakMengajar;
      row["Total KBM"] = s.totalKbm;
      row["% Kehadiran"] = s.percentage;

      return row;
    });
  };

  const handlePrintAttendanceRecap = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const { uniqueDates, studentRows } = getExportDetails();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Guru", 48, 120) : "";

    const headerHtml = renderKopHeaderHtml({
      documentTitle: "REKAPITULASI PRESENSI KEHADIRAN SISWA",
      subtitle: `Mata Pelajaran: <strong>${subject || "Umum"}</strong> • NPSN: ${schoolNpsn || "-" } • Tahun Ajaran: ${academicYear || "-"}`,
      customConfig: {
        institution,
        schoolNpsn,
        academicYear,
        subject,
        useKop,
        kopType,
        kopManual,
        kopImage,
        kopLogo,
        kopLogoPosition,
        kopLogoSize
      }
    });
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekap Presensi Detail & Total - ${activeSelectedClass}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; line-height: 1.3; }
          .header { padding-bottom: 10px; margin-bottom: 12px; }
          .meta-box { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          
          .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; color: #1e293b; border-left: 3px solid #4f46e5; padding-left: 8px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 9px; text-align: center; }
          .text-center { text-align: center; }
          
          .badge-h { color: #059669; font-weight: bold; }
          .badge-s { color: #d97706; font-weight: bold; }
          .badge-i { color: #2563eb; font-weight: bold; }
          .badge-a { color: #dc2626; font-weight: bold; }
          .badge-tm { color: #64748b; font-weight: bold; }

          .legend { font-size: 9px; color: #64748b; margin-top: 6px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; gap: 12px; }

          .signatures { display: flex; justify-content: space-between; margin-top: 35px; font-size: 10px; text-align: center; page-break-inside: avoid; }
          .sig-box { margin-top: 50px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="meta-box">
          <div><strong>Kelas:</strong> ${activeSelectedClass}</div>
          <div><strong>Mata Pelajaran:</strong> ${subject}</div>
          <div><strong>Guru Pengampu:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
          <div><strong>Periode:</strong> ${exportMode === 'monthly' ? selectedMonth : 'Keseluruhan'} (Sem. ${selectedSemester})</div>
          <div><strong>Tanggal Cetak:</strong> ${dateStr}</div>
        </div>

        <!-- BAGIAN REKAPITULASI PRESENSI -->
        ${exportMode === "monthly" ? `
        <div class="section-title">Absensi Harian & Rekapitulasi Kehadiran Bulan Ini</div>
        <table>
          <thead>
            <tr>
              <th width="3%">No</th>
              <th width="8%">NIS</th>
              <th width="15%">Nama Siswa</th>
              ${uniqueDates.map(d => {
                const parts = d.split("-");
                const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                return `<th>${shortDate}</th>`;
              }).join('')}
              <th width="5%">H (Hadir)</th>
              <th width="5%">S (Sakit)</th>
              <th width="5%">I (Izin)</th>
              <th width="5%">A (Alpa)</th>
              <th width="6%">TM (Tdk Mengajar)</th>
              <th width="6%">Total KBM</th>
              <th width="7%">% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows.map((s, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${s.nis || '-'}</td>
                <td><strong>${s.name || '-'}</strong></td>
                ${uniqueDates.map(d => {
                  const st = s.daily[d];
                  if (st === "Hadir") return `<td class="text-center badge-h">H</td>`;
                  if (st === "Sakit") return `<td class="text-center badge-s">S</td>`;
                  if (st === "Izin") return `<td class="text-center badge-i">I</td>`;
                  if (st === "Alpa") return `<td class="text-center badge-a">A</td>`;
                  if (st === "Tidak Mengajar") return `<td class="text-center badge-tm">TM</td>`;
                  return `<td class="text-center" style="color:#94a3b8;">-</td>`;
                }).join('')}
                <td class="text-center badge-h">${s.hadir}</td>
                <td class="text-center badge-s">${s.sakit}</td>
                <td class="text-center badge-i">${s.izin}</td>
                <td class="text-center badge-a">${s.alpa}</td>
                <td class="text-center badge-tm">${s.tidakMengajar}</td>
                <td class="text-center font-bold">${s.totalKbm}</td>
                <td class="text-center font-bold">${s.percentage}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="legend">
          <div><strong>Keterangan Kode Status:</strong></div>
          <div><span class="badge-h">H</span> = Hadir</div>
          <div><span class="badge-s">S</span> = Sakit</div>
          <div><span class="badge-i">I</span> = Izin</div>
          <div><span class="badge-a">A</span> = Alpa</div>
          <div><span class="badge-tm">TM</span> = Tidak Mengajar / Libur KBM</div>
        </div>
        ` : `
        <!-- BAGIAN 1: DETAIL TANGGAL PERTEMUAN -->
        <div class="section-title">Bagian 1: Detail Kehadiran Per Hari / Pertemuan</div>
        <table>
          <thead>
            <tr>
              <th width="4%">No</th>
              <th width="10%">NIS</th>
              <th width="24%">Nama Siswa</th>
              ${uniqueDates.map(d => {
                const parts = d.split("-");
                const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
                return `<th>${shortDate}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${studentRows.map((s, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${s.nis || '-'}</td>
                <td><strong>${s.name || '-'}</strong></td>
                ${uniqueDates.map(d => {
                  const st = s.daily[d];
                  if (st === "Hadir") return `<td class="text-center badge-h">H</td>`;
                  if (st === "Sakit") return `<td class="text-center badge-s">S</td>`;
                  if (st === "Izin") return `<td class="text-center badge-i">I</td>`;
                  if (st === "Alpa") return `<td class="text-center badge-a">A</td>`;
                  if (st === "Tidak Mengajar") return `<td class="text-center badge-tm">TM</td>`;
                  return `<td class="text-center" style="color:#94a3b8;">-</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="legend">
          <div><strong>Keterangan Kode Status:</strong></div>
          <div><span class="badge-h">H</span> = Hadir</div>
          <div><span class="badge-s">S</span> = Sakit</div>
          <div><span class="badge-i">I</span> = Izin</div>
          <div><span class="badge-a">A</span> = Alpa</div>
          <div><span class="badge-tm">TM</span> = Tidak Mengajar / Libur KBM</div>
        </div>

        <!-- BAGIAN 2: REKAPITULASI KESELURUHAN -->
        <div class="section-title">Bagian 2: Rekapitulasi Keseluruhan (Ringkasan Akhir)</div>
        <table>
          <thead>
            <tr>
              <th width="4%">No</th>
              <th width="12%">NIS</th>
              <th width="28%">Nama Siswa</th>
              <th width="8%">Hadir (H)</th>
              <th width="8%">Sakit (S)</th>
              <th width="8%">Izin (I)</th>
              <th width="8%">Alpa (A)</th>
              <th width="10%">Tdk Mengajar</th>
              <th width="10%">Total KBM</th>
              <th width="12%">% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows.map((s, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${s.nis || '-'}</td>
                <td><strong>${s.name || '-'}</strong></td>
                <td class="text-center badge-h">${s.hadir}</td>
                <td class="text-center badge-s">${s.sakit}</td>
                <td class="text-center badge-i">${s.izin}</td>
                <td class="text-center badge-a">${s.alpa}</td>
                <td class="text-center badge-tm">${s.tidakMengajar}</td>
                <td class="text-center font-bold">${s.totalKbm}</td>
                <td class="text-center font-bold">${s.percentage}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}

        <div class="signatures">
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : ''}
            <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">
              ${headmasterName || '( ................................................. )'}
              <br><span style="font-weight: normal; font-size: 9px;">NIP. ${headmasterNip || '-'}</span>
              ${headmasterRank ? `<br><span style="font-weight: normal; font-size: 8px; color: #475569;">${headmasterRank}</span>` : ''}
            </div>
          </div>
          <div>
            <p>${documentCity}, ${dateStr}<br>Guru Mata Pelajaran</p>
            ${teacherTteSnippet ? teacherTteSnippet : ''}
            <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">
              ${teacherName}
              <br><span style="font-weight: normal; font-size: 9px;">NIP. ${nip || '-'}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleExport = (type: "xlsx" | "pdf" | "print") => {
    const { uniqueDates, studentRows } = getExportDetails();

    if (type === "xlsx") {
      const workbook = utils.book_new();

      // Sheet 1: Matrix Detail Harian
      const detailSheetData = studentRows.map((s, idx) => {
        const rowObj: Record<string, any> = {
          "No": idx + 1,
          "NIS": s.nis || "-",
          "Nama Siswa": s.name || "-",
        };
        uniqueDates.forEach(d => {
          const parts = d.split("-");
          const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
          const st = s.daily[d];
          let symbol = "-";
          if (st === "Hadir") symbol = "H";
          else if (st === "Sakit") symbol = "S";
          else if (st === "Izin") symbol = "I";
          else if (st === "Alpa") symbol = "A";
          else if (st === "Tidak Mengajar") symbol = "TM";
          rowObj[shortDate] = symbol;
        });
        return rowObj;
      });
      const wsDetail = utils.json_to_sheet(detailSheetData);
      utils.book_append_sheet(workbook, wsDetail, "Detail Harian");

      // Sheet 2: Rekapitulasi Keseluruhan
      const summarySheetData = studentRows.map((s, idx) => ({
        "No": idx + 1,
        "NIS": s.nis || "-",
        "Nama Siswa": s.name || "-",
        "Hadir (H)": s.hadir,
        "Sakit (S)": s.sakit,
        "Izin (I)": s.izin,
        "Alpa (A)": s.alpa,
        "Tidak Mengajar (TM)": s.tidakMengajar,
        "Total KBM": s.totalKbm,
        "Persentase Kehadiran": s.percentage
      }));
      const wsSummary = utils.json_to_sheet(summarySheetData);
      utils.book_append_sheet(workbook, wsSummary, "Rekap Keseluruhan");

      writeFile(workbook, `Rekap_Presensi_Detail_${activeSelectedClass}_${exportMode === "monthly" ? selectedMonth : "Keseluruhan"}.xlsx`);
    } else if (type === "pdf") {
      try {
        const jsPDFConstructor = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
        const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
        const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;

        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        let currentY = renderPdfKop(doc);

        doc.setTextColor(15, 23, 42);

        // Header Title
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`REKAPITULASI PRESENSI SISWA - KELAS ${activeSelectedClass}`, 14, currentY);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Mata Pelajaran: ${subject || "Umum"} | Periode: ${exportMode === "monthly" ? selectedMonth : "Keseluruhan"} | Tanggal Cetak: ${dateStr}`, 14, currentY + 5);
        doc.text(`Guru Mata Pelajaran: ${teacherName} (NIP. ${nip || "-"})`, 14, currentY + 9);

        const dateHeaders = uniqueDates.map(d => {
          const parts = d.split("-");
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        });

        if (exportMode === "monthly") {
          // One single unified table combining Harian + Rekapitulasi
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          doc.text("ABSENSI HARIAN & REKAPITULASI BULAN INI", 14, currentY + 16);

          const combinedHead = [["No", "NIS", "Nama Siswa", ...dateHeaders, "H", "S", "I", "A", "TM", "Total", "%"]];
          const combinedBody = studentRows.map((s, idx) => {
            const rowVals = uniqueDates.map(d => {
              const st = s.daily[d];
              if (st === "Hadir") return "H";
              if (st === "Sakit") return "S";
              if (st === "Izin") return "I";
              if (st === "Alpa") return "A";
              if (st === "Tidak Mengajar") return "TM";
              return "-";
            });
            return [
              idx + 1,
              s.nis || "-",
              s.name || "-",
              ...rowVals,
              s.hadir,
              s.sakit,
              s.izin,
              s.alpa,
              s.tidakMengajar,
              s.totalKbm,
              s.percentage
            ];
          });

          if (typeof tableFn === 'function') {
            tableFn(doc, {
              head: combinedHead,
              body: combinedBody,
              startY: currentY + 19,
              styles: { fontSize: 7.5, cellPadding: 1.2, halign: 'center' },
              headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
              columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 20, halign: 'left' },
                2: { cellWidth: 40, halign: 'left' },
              },
              theme: 'grid'
            });
          }

          let lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : 90;
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(71, 85, 105);
          doc.text("Keterangan Kode: H = Hadir, S = Sakit, I = Izin, A = Alpa, TM = Tidak Mengajar / Libur KBM", 14, lastY);

          let lastYSignatures = lastY + 12;
          if (lastYSignatures > 165) {
            doc.addPage();
            lastYSignatures = 20;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          
          // Left signature
          doc.text("Mengetahui,", 30, lastYSignatures);
          doc.text("Kepala Sekolah", 30, lastYSignatures + 5);
          doc.setFont("helvetica", "bold");
          doc.text(headmasterName || "( ................................................. )", 30, lastYSignatures + 22);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${headmasterNip || "-"}`, 30, lastYSignatures + 27);

          // Right signature
          doc.text(`${documentCity}, ${dateStr}`, 200, lastYSignatures);
          doc.text("Guru Mata Pelajaran", 200, lastYSignatures + 5);
          doc.setFont("helvetica", "bold");
          doc.text(teacherName || "( ................................................. )", 200, lastYSignatures + 22);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${nip || "-"}`, 200, lastYSignatures + 27);

          doc.save(`Rekap_Presensi_${activeSelectedClass}_${selectedMonth}.pdf`);
        } else {
          // Keseluruhan Mode: Two separate sections
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
          doc.text("BAGIAN 1: DETAIL KEHADIRAN PER HARI / PERTEMUAN", 14, currentY + 16);

          const detailHead = [["No", "NIS", "Nama Siswa", ...dateHeaders]];
          const detailBody = studentRows.map((s, idx) => {
            const rowVals = uniqueDates.map(d => {
              const st = s.daily[d];
              if (st === "Hadir") return "H";
              if (st === "Sakit") return "S";
              if (st === "Izin") return "I";
              if (st === "Alpa") return "A";
              if (st === "Tidak Mengajar") return "TM";
              return "-";
            });
            return [idx + 1, s.nis || "-", s.name || "-", ...rowVals];
          });

          if (typeof tableFn === 'function') {
            tableFn(doc, {
              head: detailHead,
              body: detailBody,
              startY: currentY + 19,
              styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
              headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 22, halign: 'left' },
                2: { cellWidth: 45, halign: 'left' },
              },
              theme: 'grid'
            });
          }

          let lastY1 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : 90;
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("Keterangan Kode: H = Hadir, S = Sakit, I = Izin, A = Alpa, TM = Tidak Mengajar / Libur KBM", 14, lastY1);

          // Section 2: Rekapitulasi Keseluruhan
          let startY2 = lastY1 + 8;
          if (startY2 > 150) {
            doc.addPage();
            startY2 = 15;
          }

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("BAGIAN 2: REKAPITULASI KESELURUHAN (RINGKASAN AKHIR)", 14, startY2);

          const summaryHead = [["No", "NIS", "Nama Siswa", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "% Kehadiran"]];
          const summaryBody = studentRows.map((s, idx) => [
            idx + 1,
            s.nis || "-",
            s.name || "-",
            s.hadir,
            s.sakit,
            s.izin,
            s.alpa,
            s.tidakMengajar,
            s.totalKbm,
            s.percentage
          ]);

          if (typeof tableFn === 'function') {
            tableFn(doc, {
              head: summaryHead,
              body: summaryBody,
              startY: startY2 + 3,
              styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
              headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 25, halign: 'left' },
                2: { cellWidth: 55, halign: 'left' },
              },
              theme: 'grid'
            });
          }

          let lastY2 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 140;
          if (lastY2 > 165) {
            doc.addPage();
            lastY2 = 20;
          }

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          
          // Left signature
          doc.text("Mengetahui,", 30, lastY2);
          doc.text("Kepala Sekolah", 30, lastY2 + 5);
          doc.setFont("helvetica", "bold");
          doc.text(headmasterName || "( ................................................. )", 30, lastY2 + 22);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${headmasterNip || "-"}`, 30, lastY2 + 27);

          // Right signature
          doc.text(`${documentCity}, ${dateStr}`, 200, lastY2);
          doc.text("Guru Mata Pelajaran", 200, lastY2 + 5);
          doc.setFont("helvetica", "bold");
          doc.text(teacherName || "( ................................................. )", 200, lastY2 + 22);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${nip || "-"}`, 200, lastY2 + 27);

          doc.save(`Rekap_Presensi_${activeSelectedClass}_Keseluruhan.pdf`);
        }
      } catch (err) {
        console.error("PDF generation error:", err);
        handlePrintAttendanceRecap();
      }
    } else {
      handlePrintAttendanceRecap();
    }
    setIsPreviewOpen(false);
  };

  const handleConfirmExport = (type: "xlsx" | "pdf" | "print") => {
    if (previewType === "multi") {
      if (type === "xlsx") {
        handleExportAllClasses();
      } else if (type === "pdf") {
        handleExportAllClassesPdf();
      } else {
        handlePrintAllClassesRecap();
      }
      setIsPreviewOpen(false);
    } else {
      handleExport(type);
    }
  };

  const initiateExport = () => {
    const { uniqueDates } = getExportDetails();
    const dateCols = uniqueDates.map(d => {
      const parts = d.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });
    setPreviewColumns(["NIS", "Nama", ...dateCols, "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "% Kehadiran"]);
    setPreviewData(getExportData());
    setPreviewType("single");
    setIsPreviewOpen(true);
  };

  const handlePrintAllClassesRecap = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Guru", 48, 120) : "";

    const headerHtml = renderKopHeaderHtml({
      documentTitle: "RINGKASAN PRESENSI SISWA",
      subtitle: `Mata Pelajaran: <strong>${subject || "Umum"}</strong> • NPSN: ${schoolNpsn || "-" } • Tahun Ajaran: ${academicYear || "-"}`,
      customConfig: {
        institution,
        schoolNpsn,
        academicYear,
        subject,
        useKop,
        kopType,
        kopManual,
        kopImage,
        kopLogo,
        kopLogoPosition,
        kopLogoSize
      }
    });
    const available = classList && classList.length > 0 ? classList : CLASSES;
    const isAllSelected = selectedExportClasses.length === available.length;
    const titleText = isAllSelected ? "Ringkasan Presensi Siswa - Semua Kelas" : "Ringkasan Presensi Siswa - Kelas Terpilih";

    const summaryRowsData: any[] = [];

    selectedExportClasses.forEach((cls, classIdx) => {
      const classStudents = students.filter(s => s.className === cls);
      if (classStudents.length === 0) return;

      const filteredAttendance = attendanceList.filter(a => {
        if (a.className !== cls) return false;
        if (!isDateInActiveSemester(a.date)) return false;
        if (exportMode === "monthly") {
          return a.date.startsWith(selectedMonth);
        }
        return true;
      });

      const allCandidateDates = Array.from(
        new Set([
          ...filteredAttendance.map(a => a.date),
          selectedDate
        ])
      ).filter(d => {
        if (!isDateInActiveSemester(d)) return false;
        if (exportMode === "monthly") {
          return d.startsWith(selectedMonth);
        }
        return true;
      }).sort();

      const uniqueDates = allCandidateDates.filter(date => {
        let hasActiveKbmOrIntervention = false;
        for (const student of classStudents) {
          let status: AttendanceStatus | undefined;
          if (date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          } else {
            status = filteredAttendance.find(a => a.studentId === student.id && a.date === date)?.status;
          }

          if (status && status !== "Tidak Mengajar") {
            hasActiveKbmOrIntervention = true;
            break;
          }
        }
        return hasActiveKbmOrIntervention;
      });

      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpa = 0;
      let totalTidakMengajar = 0;
      let totalKbmSum = 0;

      classStudents.forEach(student => {
        const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
        let h = 0, s = 0, i = 0, a = 0, tm = 0;

        uniqueDates.forEach(date => {
          let status: AttendanceStatus | undefined = studentAttendance.find(a => a.date === date)?.status;
          if (!status && date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          }
          const finalStatus = status || "Hadir";

          if (finalStatus === "Hadir") h++;
          else if (finalStatus === "Sakit") s++;
          else if (finalStatus === "Izin") i++;
          else if (finalStatus === "Alpa") a++;
          else if (finalStatus === "Tidak Mengajar") tm++;
        });

        totalHadir += h;
        totalSakit += s;
        totalIzin += i;
        totalAlpa += a;
        totalTidakMengajar += tm;
        totalKbmSum += (h + s + i + a);
      });

      const classAvgPct = totalKbmSum > 0 ? Math.round((totalHadir / totalKbmSum) * 100) : 100;

      summaryRowsData.push({
        no: classIdx + 1,
        className: `Kelas ${cls}`,
        studentCount: classStudents.length,
        hadir: totalHadir,
        sakit: totalSakit,
        izin: totalIzin,
        alpa: totalAlpa,
        tidakMengajar: totalTidakMengajar,
        totalKbm: totalKbmSum,
        percentage: `${classAvgPct}%`
      });
    });

    const html = `
      <html>
      <head>
        <title>${titleText}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 20px;
            font-size: 10px;
            line-height: 1.4;
          }
          .title-section {
            text-align: center;
            margin-bottom: 12px;
          }
          .title-main {
            font-size: 14px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
            color: #1e293b;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 8.5px;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 8.5px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            font-size: 8px;
          }
          .text-center {
            text-align: center;
          }
          .font-bold {
            font-weight: bold;
          }
          .signatures {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signatures > div {
            width: 40%;
            text-align: center;
          }
          .sig-box {
            margin-top: 55px;
            font-weight: bold;
            line-height: 1.3;
          }
          @media print {
            body { margin: 15px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        
        <div class="title-section">
          <h1 class="title-main">${titleText}</h1>
        </div>

        <div class="meta-info">
          <div>
            <div><strong>Mata Pelajaran:</strong> ${subject || "Umum"}</div>
            <div><strong>Guru Mata Pelajaran:</strong> ${teacherName} (NIP. ${nip || "-"})</div>
          </div>
          <div>
            <div><strong>Periode:</strong> ${exportMode === "monthly" ? selectedMonth : "Keseluruhan"}</div>
            <div><strong>Tanggal Cetak:</strong> ${dateStr}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="20%">Nama Kelas</th>
              <th width="10%">Jml Siswa</th>
              <th width="10%">Hadir (H)</th>
              <th width="10%">Sakit (S)</th>
              <th width="10%">Izin (I)</th>
              <th width="10%">Alpa (A)</th>
              <th width="10%">Tdk Mengajar (TM)</th>
              <th width="10%">Total KBM</th>
              <th width="10%">Rata-Rata %</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRowsData.map(row => `
              <tr>
                <td class="text-center">${row.no}</td>
                <td><strong>${row.className}</strong></td>
                <td class="text-center">${row.studentCount}</td>
                <td class="text-center" style="color: #059669; font-weight: bold;">${row.hadir}</td>
                <td class="text-center" style="color: #d97706; font-weight: bold;">${row.sakit}</td>
                <td class="text-center" style="color: #2563eb; font-weight: bold;">${row.izin}</td>
                <td class="text-center" style="color: #dc2626; font-weight: bold;">${row.alpa}</td>
                <td class="text-center" style="color: #64748b;">${row.tidakMengajar}</td>
                <td class="text-center font-bold">${row.totalKbm}</td>
                <td class="text-center font-bold" style="color: #1e3a8a;">${row.percentage}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : ''}
            <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">
              ${headmasterName || '( ................................................. )'}
              <br><span style="font-weight: normal; font-size: 9px;">NIP. ${headmasterNip || '-'}</span>
              ${headmasterRank ? `<br><span style="font-weight: normal; font-size: 8px; color: #475569;">${headmasterRank}</span>` : ''}
            </div>
          </div>
          <div>
            <p>${documentCity}, ${dateStr}<br>Guru Mata Pelajaran</p>
            ${teacherTteSnippet ? teacherTteSnippet : ''}
            <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">
              ${teacherName}
              <br><span style="font-weight: normal; font-size: 9px;">NIP. ${nip || '-'}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const initiateMultiExport = () => {
    if (selectedExportClasses.length === 0) {
      alert("Harap pilih minimal satu kelas untuk diekspor.");
      return;
    }

    const cols = [
      "Nama Kelas", 
      "Jml Siswa", 
      "Hadir (H)", 
      "Sakit (S)", 
      "Izin (I)", 
      "Alpa (A)", 
      "Tdk Mengajar (TM)", 
      "Total KBM", 
      "Rata-Rata %"
    ];

    const summaryRowsData: any[] = [];

    selectedExportClasses.forEach((cls) => {
      const classStudents = students.filter(s => s.className === cls);
      if (classStudents.length === 0) return;

      const filteredAttendance = attendanceList.filter(a => {
        if (a.className !== cls) return false;
        if (!isDateInActiveSemester(a.date)) return false;
        if (exportMode === "monthly") {
          return a.date.startsWith(selectedMonth);
        }
        return true;
      });

      const allCandidateDates = Array.from(
        new Set([
          ...filteredAttendance.map(a => a.date),
          selectedDate
        ])
      ).filter(d => {
        if (!isDateInActiveSemester(d)) return false;
        if (exportMode === "monthly") {
          return d.startsWith(selectedMonth);
        }
        return true;
      }).sort();

      const uniqueDates = allCandidateDates.filter(date => {
        let hasActiveKbmOrIntervention = false;
        for (const student of classStudents) {
          let status: AttendanceStatus | undefined;
          if (date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          } else {
            status = filteredAttendance.find(a => a.studentId === student.id && a.date === date)?.status;
          }

          if (status && status !== "Tidak Mengajar") {
            hasActiveKbmOrIntervention = true;
            break;
          }
        }
        return hasActiveKbmOrIntervention;
      });

      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpa = 0;
      let totalTidakMengajar = 0;
      let totalKbmSum = 0;

      classStudents.forEach(student => {
        const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
        let h = 0, s = 0, i = 0, a = 0, tm = 0;

        uniqueDates.forEach(date => {
          let status: AttendanceStatus | undefined = studentAttendance.find(a => a.date === date)?.status;
          if (!status && date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          }
          const finalStatus = status || "Hadir";

          if (finalStatus === "Hadir") h++;
          else if (finalStatus === "Sakit") s++;
          else if (finalStatus === "Izin") i++;
          else if (finalStatus === "Alpa") a++;
          else if (finalStatus === "Tidak Mengajar") tm++;
        });

        totalHadir += h;
        totalSakit += s;
        totalIzin += i;
        totalAlpa += a;
        totalTidakMengajar += tm;
        totalKbmSum += (h + s + i + a);
      });

      const classAvgPct = totalKbmSum > 0 ? Math.round((totalHadir / totalKbmSum) * 100) : 100;

      summaryRowsData.push({
        "Nama Kelas": `Kelas ${cls}`,
        "Jml Siswa": classStudents.length,
        "Hadir (H)": totalHadir,
        "Sakit (S)": totalSakit,
        "Izin (I)": totalIzin,
        "Alpa (A)": totalAlpa,
        "Tdk Mengajar (TM)": totalTidakMengajar,
        "Total KBM": totalKbmSum,
        "Rata-Rata %": `${classAvgPct}%`
      });
    });

    setPreviewColumns(cols);
    setPreviewData(summaryRowsData);
    setPreviewType("multi");
    setIsPreviewOpen(true);
  };

  const handleExportAllClasses = () => {
    if (selectedExportClasses.length === 0) {
      alert("Harap pilih minimal satu kelas untuk diekspor.");
      return;
    }

    const workbook = utils.book_new();
    const summaryRows: any[] = [];
    const available = classList && classList.length > 0 ? classList : CLASSES;

    selectedExportClasses.forEach((cls, classIdx) => {
      const classStudents = students.filter(s => s.className === cls);
      if (classStudents.length === 0) return;

      const filteredAttendance = attendanceList.filter(a => {
        if (a.className !== cls) return false;
        if (!isDateInActiveSemester(a.date)) return false;
        if (exportMode === "monthly") {
          return a.date.startsWith(selectedMonth);
        }
        return true;
      });

      const allCandidateDates = Array.from(
        new Set([
          ...filteredAttendance.map(a => a.date),
          selectedDate
        ])
      ).filter(d => {
        if (!isDateInActiveSemester(d)) return false;
        if (exportMode === "monthly") {
          return d.startsWith(selectedMonth);
        }
        return true;
      }).sort();

      const uniqueDates = allCandidateDates.filter(date => {
        let hasActiveKbmOrIntervention = false;
        for (const student of classStudents) {
          let status: AttendanceStatus | undefined;
          if (date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          } else {
            status = filteredAttendance.find(a => a.studentId === student.id && a.date === date)?.status;
          }

          if (status && status !== "Tidak Mengajar") {
            hasActiveKbmOrIntervention = true;
            break;
          }
        }
        return hasActiveKbmOrIntervention;
      });

      let totalHadir = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpa = 0;
      let totalTidakMengajar = 0;
      let totalKbmSum = 0;

      const studentRows = classStudents.map((student, idx) => {
        const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);

        const record = {
          "No": idx + 1,
          "NIS": student.nis || "-",
          "Nama Siswa": student.name || "-",
          "Hadir (H)": 0,
          "Sakit (S)": 0,
          "Izin (I)": 0,
          "Alpa (A)": 0,
          "Tidak Mengajar (TM)": 0,
          "Total KBM": 0,
          "Persentase Kehadiran": "100%"
        };

        uniqueDates.forEach(date => {
          let status: AttendanceStatus | undefined = studentAttendance.find(a => a.date === date)?.status;
          if (!status && date === selectedDate && cls === activeSelectedClass) {
            status = localAttendance[student.id] || activeAttendance[student.id];
          }
          const finalStatus = status || "Hadir";

          if (finalStatus === "Hadir") record["Hadir (H)"]++;
          else if (finalStatus === "Sakit") record["Sakit (S)"]++;
          else if (finalStatus === "Izin") record["Izin (I)"]++;
          else if (finalStatus === "Alpa") record["Alpa (A)"]++;
          else if (finalStatus === "Tidak Mengajar") record["Tidak Mengajar (TM)"]++;
        });

        const kbm = record["Hadir (H)"] + record["Sakit (S)"] + record["Izin (I)"] + record["Alpa (A)"];
        record["Total KBM"] = kbm;
        const pct = kbm > 0 ? Math.round((record["Hadir (H)"] / kbm) * 100) : 100;
        record["Persentase Kehadiran"] = `${pct}%`;

        totalHadir += record["Hadir (H)"];
        totalSakit += record["Sakit (S)"];
        totalIzin += record["Izin (I)"];
        totalAlpa += record["Alpa (A)"];
        totalTidakMengajar += record["Tidak Mengajar (TM)"];
        totalKbmSum += kbm;

        return record;
      });

      const classAvgPct = totalKbmSum > 0 ? Math.round((totalHadir / totalKbmSum) * 100) : 100;

      summaryRows.push({
        "No": classIdx + 1,
        "Kelas": cls,
        "Jumlah Siswa": classStudents.length,
        "Total Hadir (H)": totalHadir,
        "Total Sakit (S)": totalSakit,
        "Total Izin (I)": totalIzin,
        "Total Alpa (A)": totalAlpa,
        "Total Tidak Mengajar (TM)": totalTidakMengajar,
        "Total KBM": totalKbmSum,
        "Rata-Rata Kehadiran": `${classAvgPct}%`
      });

      const wsClass = utils.json_to_sheet(studentRows);
      utils.book_append_sheet(workbook, wsClass, `Rekap ${cls}`);
    });

    const wsSummaryMaster = utils.json_to_sheet(summaryRows);
    utils.book_append_sheet(workbook, wsSummaryMaster, "Ringkasan Sekolah");

    const sheetOrder = ["Ringkasan Sekolah", ...workbook.SheetNames.filter(name => name !== "Ringkasan Sekolah")];
    workbook.SheetNames = sheetOrder;

    const filePeriod = exportMode === "monthly" ? selectedMonth : "Keseluruhan";
    const fileLabel = selectedExportClasses.length === available.length ? "Semua_Kelas" : "Kelas_Terpilih";
    writeFile(workbook, `Rekap_Presensi_${fileLabel}_${filePeriod}.xlsx`);
  };

  const handleExportAllClassesPdf = () => {
    if (selectedExportClasses.length === 0) {
      alert("Harap pilih minimal satu kelas untuk diekspor.");
      return;
    }

    try {
      const jsPDFConstructor = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
      const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
      const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;

      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let currentY = renderPdfKop(doc);

      doc.setTextColor(15, 23, 42);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const available = classList && classList.length > 0 ? classList : CLASSES;
      const isAllSelected = selectedExportClasses.length === available.length;
      doc.text(isAllSelected ? "RINGKASAN PRESENSI SISWA - SEMUA KELAS" : "RINGKASAN PRESENSI SISWA - KELAS TERPILIH", 14, currentY);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Mata Pelajaran: ${subject || "Umum"} | Periode: ${exportMode === "monthly" ? selectedMonth : "Keseluruhan"} | Tanggal Cetak: ${dateStr}`, 14, currentY + 5);
      doc.text(`Guru Mata Pelajaran: ${teacherName} (NIP. ${nip || "-"})`, 14, currentY + 9);

      const summaryRows: any[] = [];

      selectedExportClasses.forEach((cls, classIdx) => {
        const classStudents = students.filter(s => s.className === cls);
        if (classStudents.length === 0) return;

        const filteredAttendance = attendanceList.filter(a => {
          if (a.className !== cls) return false;
          if (!isDateInActiveSemester(a.date)) return false;
          if (exportMode === "monthly") {
            return a.date.startsWith(selectedMonth);
          }
          return true;
        });

        const allCandidateDates = Array.from(
          new Set([
            ...filteredAttendance.map(a => a.date),
            selectedDate
          ])
        ).filter(d => {
          if (!isDateInActiveSemester(d)) return false;
          if (exportMode === "monthly") {
            return d.startsWith(selectedMonth);
          }
          return true;
        }).sort();

        const uniqueDates = allCandidateDates.filter(date => {
          let hasActiveKbmOrIntervention = false;
          for (const student of classStudents) {
            let status: AttendanceStatus | undefined;
            if (date === selectedDate && cls === activeSelectedClass) {
              status = localAttendance[student.id] || activeAttendance[student.id];
            } else {
              status = filteredAttendance.find(a => a.studentId === student.id && a.date === date)?.status;
            }

            if (status && status !== "Tidak Mengajar") {
              hasActiveKbmOrIntervention = true;
              break;
            }
          }
          return hasActiveKbmOrIntervention;
        });

        let totalHadir = 0;
        let totalSakit = 0;
        let totalIzin = 0;
        let totalAlpa = 0;
        let totalTidakMengajar = 0;
        let totalKbmSum = 0;

        classStudents.forEach(student => {
          const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
          let h = 0, s = 0, i = 0, a = 0, tm = 0;

          uniqueDates.forEach(date => {
            let status: AttendanceStatus | undefined = studentAttendance.find(a => a.date === date)?.status;
            if (!status && date === selectedDate && cls === activeSelectedClass) {
              status = localAttendance[student.id] || activeAttendance[student.id];
            }
            const finalStatus = status || "Hadir";

            if (finalStatus === "Hadir") h++;
            else if (finalStatus === "Sakit") s++;
            else if (finalStatus === "Izin") i++;
            else if (finalStatus === "Alpa") a++;
            else if (finalStatus === "Tidak Mengajar") tm++;
          });

          totalHadir += h;
          totalSakit += s;
          totalIzin += i;
          totalAlpa += a;
          totalTidakMengajar += tm;
          totalKbmSum += (h + s + i + a);
        });

        const classAvgPct = totalKbmSum > 0 ? Math.round((totalHadir / totalKbmSum) * 100) : 100;

        summaryRows.push([
          classIdx + 1,
          cls,
          classStudents.length,
          totalHadir,
          totalSakit,
          totalIzin,
          totalAlpa,
          totalTidakMengajar,
          totalKbmSum,
          `${classAvgPct}%`
        ]);
      });

      const summaryHead = [["No", "Nama Kelas", "Jml Siswa", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "Rata-Rata %"]];

      if (typeof tableFn === 'function') {
        tableFn(doc, {
          head: summaryHead,
          body: summaryRows,
          startY: currentY + 14,
          styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 40, halign: 'left' },
          },
          theme: 'grid'
        });
      }

      let lastY2 = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 140;
      if (lastY2 > 165) {
        doc.addPage();
        lastY2 = 20;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      const tteConfig = getStoredTteConfig();

      // Left signature
      doc.text("Mengetahui,", 30, lastY2);
      doc.text("Kepala Sekolah", 30, lastY2 + 5);
      if (tteConfig.usePrincipalTte && tteConfig.principalTteImage) {
        embedTteInJsPdf(doc, tteConfig.principalTteImage, 30, lastY2 + 7, 30, 14);
      }
      doc.setFont("helvetica", "bold");
      doc.text(headmasterName || "( ................................................. )", 30, lastY2 + 24);
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${headmasterNip || "-"}`, 30, lastY2 + 29);

      // Right signature
      doc.text(`${documentCity}, ${dateStr}`, 200, lastY2);
      doc.text("Guru Mata Pelajaran", 200, lastY2 + 5);
      if (tteConfig.useTeacherTte && tteConfig.teacherTteImage) {
        embedTteInJsPdf(doc, tteConfig.teacherTteImage, 200, lastY2 + 7, 30, 14);
      }
      doc.setFont("helvetica", "bold");
      doc.text(teacherName || "( ................................................. )", 200, lastY2 + 24);
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${nip || "-"}`, 200, lastY2 + 29);

      const filePeriod = exportMode === "monthly" ? selectedMonth : "Keseluruhan";
      const fileLabel = isAllSelected ? "Semua_Kelas" : "Kelas_Terpilih";
      doc.save(`Ringkasan_Presensi_${fileLabel}_${filePeriod}.pdf`);
    } catch (err) {
      console.error("PDF generation error for all classes:", err);
    }
  };

  return (
    <div className="space-y-6" id="absensi-container">
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmExport}
        data={previewData}
        title={previewType === "multi" ? "Ringkasan Presensi Multi Kelas" : `Rekap Presensi (Detail & Total) - ${activeSelectedClass}`}
        columns={previewColumns.length > 0 ? previewColumns : ["NIS", "Nama", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "% Kehadiran"]}
      />

      {/* Configuration Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between" id="absensi-config-bar">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Selectors */}
          <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
            {availableClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => handleSelectClass(cls)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSelectedClass === cls 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id={`btn-select-class-${cls}`}
              >
                {cls}
              </button>
            ))}
          </div>

          {/* Semester Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                setSelectedSemester(1);
                // Switch selected month if it's out of range
                const currentMonthPart = selectedMonth.slice(5, 7);
                const mInt = parseInt(currentMonthPart);
                if (mInt < 7 || mInt > 12) {
                  setSelectedMonth(`${selectedMonth.slice(0, 4)}-07`);
                }
                // Automatically update selectedDate if it's not in Semester 1
                const dateM = parseInt(selectedDate.slice(5, 7));
                if (dateM < 7 || dateM > 12) {
                  const today = getLocalDateString();
                  const todayM = parseInt(today.slice(5, 7));
                  const targetDate = (todayM >= 7 && todayM <= 12) ? today : `${selectedDate.slice(0, 4)}-07-01`;
                  handleDateChange(targetDate);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSemester === 1 
                  ? "bg-white text-indigo-600 shadow-sm font-black" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="btn-semester-1"
            >
              Smtr 1 (Juli-Des)
            </button>
            <button
              onClick={() => {
                setSelectedSemester(2);
                // Switch selected month if it's out of range
                const currentMonthPart = selectedMonth.slice(5, 7);
                const mInt = parseInt(currentMonthPart);
                if (mInt < 1 || mInt > 6) {
                  setSelectedMonth(`${selectedMonth.slice(0, 4)}-01`);
                }
                // Automatically update selectedDate if it's not in Semester 2
                const dateM = parseInt(selectedDate.slice(5, 7));
                if (dateM < 1 || dateM > 6) {
                  const today = getLocalDateString();
                  const todayM = parseInt(today.slice(5, 7));
                  const targetDate = (todayM >= 1 && todayM <= 6) ? today : `${selectedDate.slice(0, 4)}-01-01`;
                  handleDateChange(targetDate);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSemester === 2 
                  ? "bg-white text-indigo-600 shadow-sm font-black" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="btn-semester-2"
            >
              Smtr 2 (Jan-Jun)
            </button>
          </div>

          {/* Date Picker (Preserves chosen date across classes and tab switches) */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700">
            <CalendarIcon size={14} className="text-indigo-500 mr-2 shrink-0" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-700 cursor-pointer font-bold"
              id="absensi-date-picker"
            />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end items-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRestoreModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            id="btn-restore-attendance"
            title="Cadangkan atau Pulihkan Rekaman Presensi"
          >
            <RotateCcw size={14} className="text-indigo-600" /> Cadangkan / Pulihkan
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold transition-colors hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            id="btn-mark-all-present"
          >
            <CheckCircle size={14} /> Tandai Hadir Semua
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMarkAllNoClass}
            className="px-3.5 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-colors hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            id="btn-mark-all-noclass"
          >
            <XCircle size={14} /> Tandai Tidak Mengajar
          </motion.button>
        </div>
      </div>

      {/* Semester Mismatch Warning Banner */}
      {!isDateInActiveSemester(selectedDate) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-200 text-rose-950 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <XCircle className="text-rose-600 shrink-0" size={18} />
            <div>
              <p className="font-bold text-rose-900">
                Peringatan: Tanggal Terpilih ({selectedDate}) Berada di Luar Semester {selectedSemester}
              </p>
              <p className="text-rose-700/80 mt-0.5">
                Bulan ini tidak aktif pada Semester {selectedSemester} ({selectedSemester === 1 ? "Juli - Desember" : "Januari - Juni"}). Presensi pada tanggal ini tidak dihitung dan tidak terakumulasi ke dalam rekapitulasi kehadiran.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedSemester(selectedSemester === 1 ? 2 : 1)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            Aktifkan Semester {selectedSemester === 1 ? "2 (Genap)" : "1 (Ganjil)"}
          </button>
        </motion.div>
      )}

      {/* Schedule & Attendance Status Notice Banner */}
      {!isScheduledDay ? (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="text-amber-600 shrink-0" size={18} />
            <div>
              <p className="font-bold text-amber-900">
                {stats.tidakMengajar < classStudents.length ? (
                  <span>Intervensi Presensi Aktif: Kelas {activeSelectedClass} ({selectedDayName}, {selectedDate})</span>
                ) : (
                  <span>Info Jadwal: Hari {selectedDayName} tidak ada jadwal {subject} untuk kelas {activeSelectedClass}.</span>
                )}
              </p>
              <p className="text-amber-700/80 mt-0.5">
                {stats.tidakMengajar < classStudents.length ? (
                  <span>Tercatat {classStudents.length - stats.tidakMengajar} siswa memiliki presensi aktif ({stats.hadir} Hadir, {stats.sakit} Sakit, {stats.izin} Izin, {stats.alpa} Alpa). Data tersimpan aman.</span>
                ) : (
                  <span>Status awal "Tidak Mengajar". Anda dapat langsung mengubah/mengintervensi status siswa di bawah atau klik "Ubah ke Ada KBM".</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stats.tidakMengajar === classStudents.length ? (
              <span className="px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
                <CheckCircle size={13} /> Default Tidak Mengajar
              </span>
            ) : (
              <button
                onClick={handleMarkAllNoClass}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <XCircle size={13} /> Set Tidak Mengajar
              </button>
            )}
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl font-bold hover:bg-amber-100 transition-colors text-[11px] cursor-pointer shadow-xs"
            >
              Ubah ke Ada KBM (Hadir Semua)
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="text-emerald-600 shrink-0" size={18} />
            <div>
              <p className="font-bold text-emerald-900">
                Jadwal KBM: Hari {selectedDayName} ada jadwal {subject} untuk kelas {activeSelectedClass}
                {classScheduleToday.length > 0 && classScheduleToday[0].startTime && (
                  <span className="font-normal text-emerald-800"> ({classScheduleToday[0].startTime} - {classScheduleToday[0].endTime})</span>
                )}.
              </p>
              <p className="text-emerald-700/80 mt-0.5">
                Siswa otomatis diset "Hadir Semua" terlebih dahulu. Sesuaikan status siswa jika ada yang Sakit, Izin, atau Alpa.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-[11px] cursor-pointer shadow-xs"
            >
              Set Hadir Semua
            </button>
            <button
              onClick={handleMarkAllNoClass}
              className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-[11px] cursor-pointer shadow-xs"
            >
              Tandai Tidak Mengajar
            </button>
          </div>
        </motion.div>
      )}

      {stats.tidakMengajar > 0 && isScheduledDay && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <Smile size={16} className="text-slate-500 shrink-0" />
            <span className="font-semibold">Siswa ditandai <strong>TIDAK MENGAJAR / LIBUR KBM</strong>. Tanggal ini tidak dihitung sebagai Alpa/Sakit.</span>
          </div>
          <button
            onClick={handleMarkAllPresent}
            className="px-3 py-1 bg-white border border-slate-300 text-slate-800 rounded-xl font-bold hover:bg-slate-50 transition-colors text-[11px]"
          >
            Ubah ke Ada KBM
          </button>
        </motion.div>
      )}

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="absensi-analytics">
        {/* Attendance Percentage Chart Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 md:col-span-1 flex flex-col justify-between items-center text-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Persentase Kehadiran</span>
          
          {/* Custom SVG Circular Progress */}
          <div className="relative w-28 h-28 my-3 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="56" cy="56" r="48" 
                className="stroke-slate-100 fill-none" 
                strokeWidth="8"
              />
              <motion.circle 
                cx="56" cy="56" r="48" 
                className="stroke-indigo-600 fill-none" 
                strokeWidth="8"
                strokeDasharray="301.6"
                initial={{ strokeDashoffset: 301.6 }}
                animate={{ strokeDashoffset: 301.6 - (301.6 * stats.rate) / 100 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800 font-display">{stats.rate}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Hadir</span>
            </div>
          </div>

          <p className="text-slate-500 text-xs font-medium">
            {stats.effectiveTotal === 0 ? "Hari Ini Tidak Ada KBM" : `Siswa Efektif KBM: ${stats.effectiveTotal}`}
          </p>
        </div>

        {/* Detailed Stats Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 md:col-span-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Daftar Ringkasan Hari Ini</h3>
            <p className="text-slate-400 text-xs font-medium mt-0.5">Statistik absensi kelas {activeSelectedClass} ({selectedDayName}, {selectedDate})</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-4">
            {[
              { label: "Hadir", count: stats.hadir, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
              { label: "Sakit", count: stats.sakit, color: "bg-amber-50 text-amber-700 border-amber-100" },
              { label: "Izin", count: stats.izin, color: "bg-blue-50 text-blue-700 border-blue-100" },
              { label: "Alpa", count: stats.alpa, color: "bg-rose-50 text-rose-700 border-rose-100" },
              { label: "Tdk Mengajar", count: stats.tidakMengajar, color: "bg-slate-100 text-slate-700 border-slate-200" }
            ].map((st) => (
              <div key={st.label} className={`p-3 rounded-2xl border ${st.color} text-center`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{st.label}</p>
                <p className="text-xl font-black font-display mt-0.5">{st.count}</p>
                <p className="text-[9px] opacity-75">Siswa</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <span>Pastikan semua status absensi sudah sesuai sebelum mengklik tombol Simpan di bawah.</span>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100" id="absensi-export-section">
        <h3 className="text-sm font-bold text-slate-800 font-display mb-4">Ekspor Rekap Kehadiran</h3>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Periode Rekap:</span>
            <select 
              value={exportMode} 
              onChange={(e) => setExportMode(e.target.value as "monthly" | "all")}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="monthly">Per Bulan</option>
              <option value="all">Keseluruhan</option>
            </select>
            {exportMode === "monthly" && (
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Kelas Ini */}
            <div className="flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded-2xl border border-indigo-100/30">
              <span className="text-[10px] font-black text-indigo-700 px-2 uppercase tracking-wide">Kelas {activeSelectedClass}:</span>
              <button
                onClick={initiateExport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Download size={13} /> Preview & Cetak
              </button>
            </div>

            {/* Beberapa/Semua Kelas */}
            <div className="flex items-center gap-3 bg-emerald-50/50 p-1.5 rounded-2xl border border-emerald-100/30 relative" ref={classDropdownRef}>
              <div className="flex items-center gap-1.5 pl-2">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Multi Kelas:</span>
                <button
                  type="button"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{selectedExportClasses.length} Kelas</span>
                  <ChevronDown size={10} className={`text-slate-500 transition-transform duration-200 ${isClassDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Class Dropdown Popover */}
              <AnimatePresence>
                {isClassDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full mb-2 left-0 w-52 bg-white border border-slate-200 shadow-xl rounded-2xl p-3 z-50 max-h-60 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pilih Kelas</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const available = classList && classList.length > 0 ? classList : CLASSES;
                            setSelectedExportClasses([...available]);
                          }}
                          className="text-[9px] text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          Semua
                        </button>
                        <span className="text-slate-200 text-[9px]">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExportClasses([])}
                          className="text-[9px] text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {(classList && classList.length > 0 ? classList : CLASSES).map((cls) => {
                        const isChecked = selectedExportClasses.includes(cls);
                        return (
                          <label
                            key={cls}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-[11px] font-semibold text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedExportClasses(selectedExportClasses.filter(c => c !== cls));
                                } else {
                                  setSelectedExportClasses([...selectedExportClasses, cls]);
                                }
                              }}
                              className="accent-emerald-600 rounded border-slate-300"
                            />
                            <span>Kelas {cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={initiateMultiExport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                title="Tampilkan preview ringkasan kehadiran beberapa kelas dan pilih metode ekspor"
              >
                <Download size={13} /> Preview & Cetak
              </button>
            </div>
          </div>
        </div>

        {/* Settings Kop Surat Link Section */}
        <div 
          onClick={() => window.dispatchEvent(new CustomEvent("open_profile_settings"))}
          className="bg-indigo-50/40 hover:bg-indigo-50/70 border border-indigo-100/50 rounded-2xl p-4 mt-4 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              📝
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Kop Surat Laporan Resmi
                <span className={`w-1.5 h-1.5 rounded-full ${useKop ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {useKop 
                  ? `Aktif • Menggunakan ${kopType === 'manual' ? 'Kop Teks Manual' : 'Kop Gambar Impor'}. Klik di sini untuk memodifikasi.`
                  : "Nonaktif • Kop resmi tidak dicetak. Klik di sini untuk mengaktifkan & mengatur Kop Surat sekolah."
                }
              </p>
            </div>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold group-hover:underline self-start sm:self-center">
            Atur Kop Surat di Profil & Sekolah →
          </span>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="absensi-student-list-section">
        {/* Table Header / Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-600" /> Siswa Kelas {selectedClass} ({classStudents.length} siswa)
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:border-indigo-400 transition-all text-slate-700"
              id="student-search-input"
            />
          </div>
        </div>

        {/* Student Rows */}
        <div className="divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Siswa tidak ditemukan atau data kosong.
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const status = localAttendance[student.id] || activeAttendance[student.id] || "Hadir";
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                  key={`${student.id}_${idx}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  id={`student-attendance-row-${student.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-display">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-800">{student.name}</h4>
                      <p className="text-slate-400 text-[11px] font-semibold">NIS: {student.nis} • {student.className}</p>
                    </div>
                  </div>

                  {/* Toggle Status Controls */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl self-end sm:self-auto">
                    {[
                      { status: "Hadir", label: "Hadir", color: "bg-emerald-500 text-white shadow-sm" },
                      { status: "Sakit", label: "Sakit", color: "bg-amber-500 text-white shadow-sm" },
                      { status: "Izin", label: "Izin", color: "bg-blue-500 text-white shadow-sm" },
                      { status: "Alpa", label: "Alpa", color: "bg-rose-500 text-white shadow-sm" },
                      { status: "Tidak Mengajar", label: "Tidak Mengajar", color: "bg-slate-700 text-white shadow-sm" }
                    ].map((btn) => {
                      const isActive = status === btn.status;
                      return (
                        <button
                          key={btn.status}
                          onClick={() => handleStatusChange(student.id, btn.status as AttendanceStatus)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                            isActive 
                              ? btn.color 
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          id={`btn-status-${student.id}-${btn.status}`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Save Footer Bar */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between" id="absensi-save-footer">
          <div className="text-xs text-slate-500 font-semibold">
            {Object.keys(localAttendance).length > 0 ? (
              <span className="text-indigo-600">Terdeteksi {Object.keys(localAttendance).length} perubahan absensi belum disimpan.</span>
            ) : (
              <span>Absensi untuk tanggal terpilih siap disimpan.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {isSaved && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-emerald-600 font-bold flex items-center gap-1"
                  id="absensi-save-success-msg"
                >
                  <FileCheck size={14} /> Berhasil disimpan!
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-md transition-colors cursor-pointer"
              id="btn-save-attendance"
            >
              Simpan Absensi
            </motion.button>
          </div>
        </div>
      </div>

      {/* Restore & Backup Presensi Modal */}
      <MenuDataRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        menuTitle="Presensi Kehadiran"
        menuKey="attendance"
        currentDataCount={attendanceList.length}
        currentDataSummary={`Mencakup presensi kelas ${availableClasses.join(", ")} per tanggal.`}
        onExportBackup={handleExportAttendanceJson}
        onRestoreData={handleRestoreAttendanceData}
      />
    </div>
  );
}
