import { useState, useMemo, ChangeEvent, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  ShieldCheck, 
  Calendar, 
  Award, 
  ChevronRight, 
  Trash2, 
  CheckCircle2, 
  TrendingUp,
  Building2,
  HeartHandshake,
  Home,
  Camera,
  Image as ImageIcon,
  MapPin,
  X,
  FileSpreadsheet,
  Eye,
  Filter,
  Download,
  UserCircle,
  Phone,
  Mail,
  RotateCw,
  RotateCcw,
  Database
} from "lucide-react";
import { Student, Attendance, Assignment, StudentGrade, HomeroomNote, HomeVisitReport } from "../types";
import { compressImage } from "../lib/imageUtils";
import { formatDriveImageUrl } from "../lib/driveUtils";
import { safeStorage } from "../lib/safeStorage";
import ExportPreviewModal from "./ExportPreviewModal";
import MenuDataRestoreModal from "./MenuDataRestoreModal";
import { getStoredTteConfig, renderTteImageHtml, embedTteInJsPdf } from "../lib/tteUtils";
import { renderKopHeaderHtml } from "../lib/kopUtils";
import { utils, writeFile, read } from "xlsx";
import * as jspdfModule from "jspdf";
import autoTable from "jspdf-autotable";

export const HOME_VISIT_CATEGORIES = [
  {
    id: "kat1",
    code: "Kategori 1",
    title: "1. Siswa Alpa 3 Hari Berturut-turut atau 7 Kali Tidak Berturut-turut",
    shortLabel: "Alpa 3x Berturut / 7x Akumulasi",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    badgeSolid: "bg-rose-600 text-white",
    iconColor: "text-rose-600",
    description: "Siswa yang alpa 3 hari secara berturut-turut atau akumulasi 7 kali tidak berturut-turut.",
    template: "Kategori 1 (Alpa 3 Hari Berturut-turut / 7x Tidak Berturut-turut):\nSiswa tercatat tidak hadir tanpa keterangan (Alpa) secara beruntun / akumulasi melebihi batas toleransi."
  },
  {
    id: "kat2",
    code: "Kategori 2",
    title: "2. Siswa Sakit Lebih Dari 3 Hari Berturut-turut atau 15 Hari Tidak Berturut-turut",
    shortLabel: "Sakit > 3 Hari Berturut / 15x Akumulasi",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    badgeSolid: "bg-amber-600 text-white",
    iconColor: "text-amber-600",
    description: "Siswa yang sakit > 3 hari secara berturut-turut atau mencapai 15 hari secara tidak berturut-turut.",
    template: "Kategori 2 (Sakit > 3 Hari Berturut-turut / 15 Hari Tidak Berturut-turut):\nSiswa mengalami sakit beruntun lebih dari 3 hari atau telah akumulasi 15 hari. Diperlukan peninjauan kesehatan, simpati sekolah, dan kelengkapan surat izin."
  },
  {
    id: "kat3",
    code: "Kategori 3",
    title: "3. Siswa Yang Memiliki Tingkat Kehadiran Keseluruhan Kurang Dari 85%",
    shortLabel: "Kehadiran < 85%",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    badgeSolid: "bg-orange-600 text-white",
    iconColor: "text-orange-600",
    description: "Siswa dengan rekap persentase kehadiran akumulatif di bawah 85%.",
    template: "Kategori 3 (Tingkat Kehadiran < 85%):\nPersentase keikutsertaan siswa di kelas berada di bawah 85%. Kunjungan dilakukan untuk pencegahan risiko putus sekolah dan evaluasi kendala belajar."
  },
  {
    id: "kat4",
    code: "Kategori 4",
    title: "4. Catatan Kenakalan Remaja, Penyalahgunaan Narkoba, dan Geng Motor",
    shortLabel: "Pembinaan Khusus",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    badgeSolid: "bg-purple-600 text-white",
    iconColor: "text-purple-600",
    description: "Siswa yang dalam pembinaannya memiliki catatan kenakalan remaja, penyalahgunaan narkoba, atau geng motor.",
    template: "Kategori 4 (Pembinaan Khusus - Kenakalan Remaja / Narkoba / Geng Motor):\nSiswa dalam pembinaan khusus terkait kenakalan remaja, indikasi penyalahgunaan narkoba, atau keterlibatan geng motor. Memerlukan penanganan sinergis bersama orang tua."
  }
];

interface WaliKelasProps {
  homeroomClass: string;
  setHomeroomClass: (cls: string) => void;
  classList: string[];
  students: Student[];
  setStudents: (students: Student[]) => void;
  attendanceList: Attendance[];
  assignments: Assignment[];
  grades: StudentGrade[];
  teacherName: string;
  nip: string;
  institution: string;
  headmasterName?: string;
  headmasterNip?: string;
  headmasterRank?: string;
  documentCity?: string;
  schoolNpsn?: string;
  academicYear?: string;
  notes: HomeroomNote[];
  onAddNote: (note: Omit<HomeroomNote, "id">) => void;
  onDeleteNote: (id: string) => void;
  homeVisits: HomeVisitReport[];
  onAddHomeVisit: (visit: Omit<HomeVisitReport, "id">) => void;
  onDeleteHomeVisit: (id: string) => void;
  onRestoreHomeroom?: (data: { notes?: HomeroomNote[]; homeVisits?: HomeVisitReport[] }, mode: "merge" | "replace") => void;
  onOpenSettings: () => void;
}

export default function WaliKelas({
  homeroomClass,
  setHomeroomClass,
  classList,
  students,
  setStudents,
  attendanceList,
  assignments,
  grades,
  teacherName,
  nip,
  institution,
  headmasterName = "Dr. Hj. Yanti Suryanti, M.Pd.",
  headmasterNip = "197005121995122001",
  headmasterRank = "Pembina Utama Muda, IV/c",
  documentCity = "Tasikmalaya",
  schoolNpsn = "20224510",
  academicYear = "2025/2026",
  notes,
  onAddNote,
  onDeleteNote,
  homeVisits,
  onAddHomeVisit,
  onDeleteHomeVisit,
  onRestoreHomeroom,
  onOpenSettings
}: WaliKelasProps) {
  const [activeSubTab, setActiveSubTab] = useState<"siswa" | "profil-siswa" | "rekap-kehadiran" | "home-visit" | "rapor" | "pembinaan" | "perhatian">("siswa");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedStudentIdsForProfile, setSelectedStudentIdsForProfile] = useState<string[]>([]);
  const [selectedStudentIdsForSiswaTab, setSelectedStudentIdsForSiswaTab] = useState<string[]>([]);
  const [deleteStudentConfirmModal, setDeleteStudentConfirmModal] = useState<{
    isOpen: boolean;
    ids: string[];
    names: string[];
    title: string;
  } | null>(null);

  const handleExecuteDeleteStudents = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setStudents(students.filter(s => !ids.includes(s.id)));
    setSelectedStudentIdsForProfile(prev => prev.filter(id => !ids.includes(id)));
    setSelectedStudentIdsForSiswaTab(prev => prev.filter(id => !ids.includes(id)));
    if (selectedStudentId && ids.includes(selectedStudentId)) {
      setSelectedStudentId(null);
    }
    setDeleteStudentConfirmModal(null);
  };

  // Export Homeroom JSON Backup (Notes & Home Visits)
  const handleExportHomeroomJson = () => {
    const backupPayload = {
      app: "EduAsisten",
      version: "2.5",
      category: "homeroom",
      exportedAt: new Date().toISOString(),
      homeroomClass,
      notesCount: notes.length,
      homeVisitsCount: homeVisits.length,
      notes: notes,
      homeVisits: homeVisits
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_Layanan_WaliKelas_${homeroomClass}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Homeroom Data Handler
  const handleRestoreHomeroomData = (importedData: any, mode: "merge" | "replace") => {
    let importedNotes: HomeroomNote[] = [];
    let importedHomeVisits: HomeVisitReport[] = [];

    if (importedData && typeof importedData === "object") {
      importedNotes = importedData.notes || importedData.homeroomNotes || [];
      importedHomeVisits = importedData.homeVisits || importedData.homeVisitReports || [];
    }

    if (importedNotes.length === 0 && importedHomeVisits.length === 0) {
      return { success: false, message: "Tidak ditemukan catatan pembinaan atau laporan home visit yang valid." };
    }

    if (onRestoreHomeroom) {
      onRestoreHomeroom({ notes: importedNotes, homeVisits: importedHomeVisits }, mode);
    } else {
      importedNotes.forEach(n => onAddNote(n));
      importedHomeVisits.forEach(hv => onAddHomeVisit(hv));
    }

    const totalCount = importedNotes.length + importedHomeVisits.length;
    return {
      success: true,
      count: totalCount,
      message: `Berhasil memulihkan data wali kelas (${totalCount} item diproses dalam mode ${mode === "merge" ? "Gabung & Lengkapi" : "Ganti Total"})!`
    };
  };

  // Month filter for Attendance Recap
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => {
    const saved = safeStorage.getItem("guru_attendance_semester");
    if (saved === "1" || saved === "2") return parseInt(saved) as 1 | 2;
    const m = new Date().getMonth() + 1;
    return (m >= 7 && m <= 12) ? 1 : 2;
  });

  // Keep selected semester synchronized with local storage
  useEffect(() => {
    const saved = safeStorage.getItem("guru_attendance_semester");
    if (saved === "1" || saved === "2") {
      const val = parseInt(saved) as 1 | 2;
      if (val !== selectedSemester) {
        setSelectedSemester(val);
      }
    }
  }, [activeSubTab]);

  // Form states for new homeroom note
  const [isOpenAddNoteModal, setIsOpenAddNoteModal] = useState(false);
  const [noteStudentId, setNoteStudentId] = useState("");
  const [noteCategory, setNoteCategory] = useState<HomeroomNote["category"]>("Kedisiplinan");
  const [noteContent, setNoteContent] = useState("");
  const [noteAction, setNoteAction] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states for Home Visit Report
  const [isOpenHomeVisitModal, setIsOpenHomeVisitModal] = useState(false);
  const [hvStudentId, setHvStudentId] = useState("");
  const [hvCategory, setHvCategory] = useState<string>("kat1");
  const [hvDate, setHvDate] = useState(new Date().toISOString().split("T")[0]);
  const [hvParentName, setHvParentName] = useState("");
  const [hvAddress, setHvAddress] = useState("");
  const [hvReason, setHvReason] = useState("");
  const [hvResult, setHvResult] = useState("");
  const [hvPhotos, setHvPhotos] = useState<string[]>([]);

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
          console.error("Failed to parse saved kop manual:", e);
        }
      }
      
      setKopImage(safeStorage.getItem("guru_kop_image") || "");
      setKopLogo(safeStorage.getItem("guru_kop_logo") || "");
      setKopLogoPosition((safeStorage.getItem("guru_kop_logo_position") as any) || "left");
      
      const logoSize = safeStorage.getItem("guru_kop_logo_size");
      setKopLogoSize(logoSize ? parseInt(logoSize, 10) : 55);
    };

    window.addEventListener("storage", syncKopSettings);
    // Custom event dispatch trigger
    window.addEventListener("guru_kop_updated", syncKopSettings);
    return () => {
      window.removeEventListener("storage", syncKopSettings);
      window.removeEventListener("guru_kop_updated", syncKopSettings);
    };
  }, []);

  // Preview Image Lightbox Modal State
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Filter students for homeroom class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === homeroomClass);
  }, [students, homeroomClass]);

  // Attendance for homeroom class filtered by month if selected
  // Dates where ALL students are "Tidak Mengajar" (tanpa intervensi) are excluded from the recap
  const classAttendance = useMemo(() => {
    const rawFiltered = attendanceList.filter(a => {
      if (a.className !== homeroomClass) return false;

      // Semester filter
      const m = parseInt(a.date.slice(5, 7));
      const inSemester = selectedSemester === 1 ? (m >= 7 && m <= 12) : (m >= 1 && m <= 6);
      if (!inSemester) return false;

      if (selectedMonth !== "all") {
        return a.date.slice(5, 7) === selectedMonth;
      }
      return true;
    });

    // Identify dates with at least one active attendance mark (Hadir, Sakit, Izin, Alpa)
    const activeKbmDates = new Set<string>();
    rawFiltered.forEach(a => {
      if (a.status && a.status !== "Tidak Mengajar") {
        activeKbmDates.add(a.date);
      }
    });

    return rawFiltered.filter(a => activeKbmDates.has(a.date));
  }, [attendanceList, homeroomClass, selectedMonth, selectedSemester]);

  // Student Attendance Summary
  const studentAttendanceSummary = useMemo(() => {
    const map: Record<string, { hadir: number; sakit: number; izin: number; alpa: number; tidakMengajar: number; total: number; logs: Attendance[] }> = {};
    classStudents.forEach(s => {
      map[s.id] = { hadir: 0, sakit: 0, izin: 0, alpa: 0, tidakMengajar: 0, total: 0, logs: [] };
    });

    classAttendance.forEach(a => {
      if (map[a.studentId]) {
        map[a.studentId].total += 1;
        map[a.studentId].logs.push(a);
        if (a.status === "Hadir") map[a.studentId].hadir += 1;
        else if (a.status === "Sakit") map[a.studentId].sakit += 1;
        else if (a.status === "Izin") map[a.studentId].izin += 1;
        else if (a.status === "Alpa") map[a.studentId].alpa += 1;
        else if (a.status === "Tidak Mengajar") map[a.studentId].tidakMengajar += 1;
      }
    });

    return map;
  }, [classStudents, classAttendance]);

  // Student Academic Scores Summary
  const studentAcademicSummary = useMemo(() => {
    const map: Record<string, { avgAssignment: number; examScore: number; finalAvg: number }> = {};

    classStudents.forEach(s => {
      const studentGradeObj = grades.find(g => g.studentId === s.id);
      let assignmentAvg = 0;
      let examScore = 0;

      if (studentGradeObj) {
        examScore = studentGradeObj.examScore || 0;
        const scores = Object.values(studentGradeObj.assignmentScores || {});
        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          assignmentAvg = Math.round(sum / scores.length);
        }
      }

      const finalAvg = Math.round((assignmentAvg * 0.6) + (examScore * 0.4));
      map[s.id] = {
        avgAssignment: assignmentAvg,
        examScore,
        finalAvg: finalAvg || (assignmentAvg || examScore)
      };
    });

    return map;
  }, [classStudents, assignments, grades, homeroomClass]);

  // Class Overview Stats
  const classStats = useMemo(() => {
    const totalSiswa = classStudents.length;
    let totalHadir = 0;
    let totalRecords = 0;

    (Object.values(studentAttendanceSummary) as Array<{ hadir: number; sakit: number; izin: number; alpa: number; total: number }>).forEach(s => {
      totalHadir += s.hadir;
      totalRecords += s.total;
    });

    const attendanceRate = totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 100;

    const academicScores = (Object.values(studentAcademicSummary) as Array<{ avgAssignment: number; examScore: number; finalAvg: number }>).map(s => s.finalAvg).filter(s => s > 0);
    const avgClassScore = academicScores.length > 0 
      ? Math.round(academicScores.reduce((a, b) => a + b, 0) / academicScores.length)
      : 0;

    // Students needing special attention (Alpa >= 2, attendance < 85%, sakit > 3 consecutive or sakit >= 15 accumulative, or has notes)
    const alertStudents = classStudents.filter(s => {
      const att = studentAttendanceSummary[s.id];
      const hasNote = notes.some(n => n.studentId === s.id);
      const lowAttendance = att && att.total > 0 && Math.round((att.hadir / att.total) * 100) < 85;

      const sortedLogs = [...((att && att.logs) || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let maxConsSakit = 0;
      let currConsSakit = 0;
      sortedLogs.forEach(l => {
        if (l.status === 'Sakit') {
          currConsSakit += 1;
          if (currConsSakit > maxConsSakit) maxConsSakit = currConsSakit;
        } else {
          currConsSakit = 0;
        }
      });
      const highSakit = maxConsSakit > 3 || (att && att.sakit >= 15);

      return (att && att.alpa >= 2) || lowAttendance || highSakit || hasNote;
    });

    return {
      totalSiswa,
      attendanceRate,
      avgClassScore,
      alertCount: alertStudents.length,
      alertStudents
    };
  }, [classStudents, studentAttendanceSummary, studentAcademicSummary, notes]);

  // Helper to build Kop Sekolah HTML block for printable reports
  const getKopHeaderHtml = () => {
    return renderKopHeaderHtml({
      customConfig: {
        institution,
        schoolNpsn,
        academicYear,
        useKop,
        kopType,
        kopManual,
        kopImage,
        kopLogo,
        kopLogoPosition,
        kopLogoSize
      }
    });
  };

  // Automatic Detection of Students Meeting 4 Home Visit Criteria
  const flaggedHomeVisitStudents = useMemo(() => {
    return classStudents.map(student => {
      const att = studentAttendanceSummary[student.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, logs: [] };
      const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;

      const sortedLogs = [...(att.logs || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let maxConsAlpa = 0;
      let currConsAlpa = 0;
      let maxConsSakit = 0;
      let currConsSakit = 0;

      sortedLogs.forEach(l => {
        if (l.status === 'Alpa') {
          currConsAlpa += 1;
          if (currConsAlpa > maxConsAlpa) maxConsAlpa = currConsAlpa;
        } else {
          currConsAlpa = 0;
        }

        if (l.status === 'Sakit') {
          currConsSakit += 1;
          if (currConsSakit > maxConsSakit) maxConsSakit = currConsSakit;
        } else {
          currConsSakit = 0;
        }
      });

      const matchedCats: Array<{ id: string; code: string; title: string; shortLabel: string; badge: string; detail: string }> = [];

      // Kategori 1: Alpa 3 hari berturut-turut ATAU 7 kali tidak berturut-turut
      if (maxConsAlpa >= 3 || att.alpa >= 7) {
        matchedCats.push({
          id: "kat1",
          code: "Kategori 1",
          title: "Siswa alpa 3 hari berturut-turut atau 7 kali tidak berturut-turut",
          shortLabel: "Alpa 3x Berturut / 7x Akumulasi",
          badge: "bg-rose-50 text-rose-700 border border-rose-200 font-extrabold",
          detail: maxConsAlpa >= 3 ? `Terdeteksi Alpa berturut-turut ${maxConsAlpa} hari.` : `Terhitung akumulasi Alpa ${att.alpa} kali.`
        });
      }

      // Kategori 2: Sakit lebih dari 3 hari secara berturut-turut ATAU 15 hari tidak berturut-turut (akumulasi)
      if (maxConsSakit > 3 || att.sakit >= 15) {
        matchedCats.push({
          id: "kat2",
          code: "Kategori 2",
          title: "Siswa sakit lebih dari 3 hari secara berturut-turut atau 15 hari tidak berturut-turut",
          shortLabel: maxConsSakit > 3 ? "Sakit > 3 Hari Berturut" : "Sakit 15x Akumulasi",
          badge: "bg-amber-50 text-amber-700 border border-amber-200 font-extrabold",
          detail: maxConsSakit > 3
            ? `Terdeteksi Sakit berturut-turut ${maxConsSakit} hari (> 3 hari).`
            : `Terhitung akumulasi Sakit ${att.sakit} hari (mencapai batas 15 hari).`
        });
      }

      // Kategori 3: Kehadiran keseluruhan < 85%
      if (att.total > 0 && rate < 85) {
        matchedCats.push({
          id: "kat3",
          code: "Kategori 3",
          title: "Siswa yang memiliki tingkat kehadiran keseluruhan kurang dari 85%",
          shortLabel: `Kehadiran ${rate}% (< 85%)`,
          badge: "bg-orange-50 text-orange-700 border border-orange-200 font-extrabold",
          detail: `Persentase kehadiran saat ini ${rate}% (di bawah ambang batas minimal 85%).`
        });
      }

      // Kategori 4: Pembinaan khusus (catatan kenakalan remaja, penyalahgunaan narkoba, geng motor)
      const stNotes = notes.filter(n => n.studentId === student.id);
      const riskNotes = stNotes.filter(n => {
        const text = (n.note + " " + n.category + " " + (n.actionTaken || "")).toLowerCase();
        return text.includes("narkoba") || text.includes("geng") || text.includes("motor") || 
               text.includes("kenakalan") || text.includes("tawuran") || text.includes("miras") || 
               text.includes("rokok") || text.includes("sajam") || text.includes("kriminal");
      });

      if (riskNotes.length > 0) {
        matchedCats.push({
          id: "kat4",
          code: "Kategori 4",
          title: "Siswa yang dalam pembinaannya memiliki catatan kenakalan remaja, penyalahgunaan narkoba dan geng motor",
          shortLabel: "Pembinaan Khusus",
          badge: "bg-purple-50 text-purple-700 border border-purple-200 font-extrabold",
          detail: `Memiliki ${riskNotes.length} catatan pembinaan khusus (kenakalan/narkoba/geng motor).`
        });
      }

      return {
        student,
        matchedCats,
        hasExistingVisit: homeVisits.some(hv => hv.studentId === student.id)
      };
    }).filter(item => item.matchedCats.length > 0);
  }, [classStudents, studentAttendanceSummary, notes, homeVisits]);

  // Trigger Home Visit modal with pre-filled category & student
  const handleStartHomeVisitForStudent = (studentId: string, categoryId?: string, customReason?: string) => {
    setHvStudentId(studentId);
    const catId = categoryId || "kat1";
    setHvCategory(catId);
    
    const catObj = HOME_VISIT_CATEGORIES.find(c => c.id === catId);
    if (customReason) {
      setHvReason(customReason);
    } else if (catObj) {
      setHvReason(catObj.template);
    }
    const st = classStudents.find(s => s.id === studentId);
    if (st) {
      setHvAddress(`Alamat tempat tinggal ${st.name}`);
    }
    setIsOpenHomeVisitModal(true);
  };

  // Handle Photo Upload for Home Visit with Auto-compression
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      try {
        const compressed = await compressImage(file);
        setHvPhotos(prev => [...prev, compressed]);
      } catch (err) {
        console.warn("Gagal mengompres foto kunjungan rumah:", err);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setHvPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Home Visit Submission
  const handleSaveHomeVisit = () => {
    if (!hvStudentId || !hvParentName.trim() || !hvReason.trim() || !hvResult.trim()) {
      alert("Silakan lengkapi data siswa, orang tua, alasan, dan hasil kunjungan rumah.");
      return;
    }

    const st = classStudents.find(s => s.id === hvStudentId);
    if (!st) return;

    onAddHomeVisit({
      studentId: st.id,
      studentName: st.name,
      className: homeroomClass,
      date: hvDate,
      parentName: hvParentName.trim(),
      address: hvAddress.trim() || "Alamat Tempat Tinggal Siswa",
      category: hvCategory,
      reason: hvReason.trim(),
      result: hvResult.trim(),
      photos: hvPhotos,
      teacherName,
      nip
    });

    setIsOpenHomeVisitModal(false);
    setHvStudentId("");
    setHvParentName("");
    setHvAddress("");
    setHvReason("");
    setHvResult("");
    setHvPhotos([]);
    setHvCategory("kat1");
  };

  // Handle Note Submission
  const handleSaveNote = () => {
    if (!noteStudentId || !noteContent.trim()) {
      alert("Silakan pilih siswa dan isi catatan pembinaan.");
      return;
    }

    const st = classStudents.find(s => s.id === noteStudentId);
    if (!st) return;

    onAddNote({
      studentId: st.id,
      studentName: st.name,
      className: homeroomClass,
      date: noteDate,
      category: noteCategory,
      note: noteContent.trim(),
      actionTaken: noteAction.trim() || "Bimbingan Wali Kelas"
    });

    setIsOpenAddNoteModal(false);
    setNoteContent("");
    setNoteAction("");
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.nis.includes(searchQuery)
    );
  }, [classStudents, searchQuery]);

  // Selected Student for Report Detail
  const reportStudent = useMemo(() => {
    if (!selectedStudentId) return classStudents[0] || null;
    return classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;
  }, [classStudents, selectedStudentId]);

  // Filtered Home Visits for current homeroom class
  const classHomeVisits = useMemo(() => {
    return homeVisits.filter(hv => hv.className === homeroomClass);
  }, [homeVisits, homeroomClass]);

  // Export Preview Modal States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);

  // Detailed Export Logic for Wali Kelas (Daily Matrix + Total Summary)
  const getExportDetails = () => {
    // classAttendance is already filtered to only active KBM / intervention dates
    const uniqueDates = Array.from(new Set(classAttendance.map(a => a.date))).sort();

    const studentRows = classStudents.map(student => {
      const studentAttendance = classAttendance.filter(a => a.studentId === student.id);

      const record: {
        id: string;
        nis: string;
        name: string;
        daily: Record<string, string>;
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
        const entry = studentAttendance.find(a => a.date === date);
        const st = entry ? entry.status : "-";
        record.daily[date] = st;

        if (st === "Hadir") record.hadir++;
        else if (st === "Sakit") record.sakit++;
        else if (st === "Izin") record.izin++;
        else if (st === "Alpa") record.alpa++;
        else if (st === "Tidak Mengajar") record.tidakMengajar++;
      });

      record.totalKbm = record.hadir + record.sakit + record.izin + record.alpa;
      const rate = record.totalKbm > 0 
        ? Math.round((record.hadir / record.totalKbm) * 100) 
        : 100;
      record.percentage = `${rate}%`;

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

  // PRINT REKAP KEHADIRAN (Attendance Summary Printable)
  const handlePrintAttendanceRecap = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const monthLabel = selectedMonth === "all" ? "Keseluruhan Semester" : `Bulan ${selectedMonth}`;
    const { uniqueDates, studentRows } = getExportDetails();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Wali Kelas", 48, 120) : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rekapitulasi Presensi Detail & Total Kelas ${homeroomClass}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; line-height: 1.3; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; }
          .header h3 { margin: 3px 0 0 0; font-size: 13px; font-weight: 700; }
          .header p { margin: 2px 0 0 0; font-size: 10px; color: #475569; }
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
        ${getKopHeaderHtml()}

        <div style="text-align: center; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #1e293b;">REKAPITULASI PRESENSI KEHADIRAN SISWA</h2>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: #475569; font-weight: 500;">Periode: ${monthLabel} • Tahun Ajaran 2025/2026</p>
        </div>

        <div class="meta-box">
          <div><strong>Kelas:</strong> Wali Kelas ${homeroomClass}</div>
          <div><strong>Wali Kelas:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
          <div><strong>Tanggal Cetak:</strong> ${dateStr}</div>
        </div>

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

        <!-- BAGIAN 2: REKAPITULASI KESELURUHNA -->
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
            <p>${documentCity}, ${dateStr}<br>Wali Kelas ${homeroomClass}</p>
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

  const handlePrintFullReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const { studentRows } = getExportDetails();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const monthLabel = selectedMonth === "all" ? "Keseluruhan Semester" : `Bulan ${selectedMonth}`;
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Wali Kelas", 48, 120) : "";
    
    // 1. Catatan Pembinaan
    const stNotes = notes.filter(n => {
      if (n.className !== homeroomClass) return false;
      if (selectedMonth !== "all") {
        const m = n.date.split("-")[1];
        if (m !== selectedMonth) return false;
      }
      return true;
    });

    // 2. Home Visit
    const stVisits = classHomeVisits.filter(hv => {
      if (selectedMonth !== "all") {
        const m = hv.date.split("-")[1];
        if (m !== selectedMonth) return false;
      }
      return true;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Lengkap Wali Kelas - ${homeroomClass} (${monthLabel})</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
          .header h3 { margin: 4px 0 0 0; font-size: 14px; font-weight: 700; }
          .header p { margin: 4px 0 0 0; font-size: 11px; color: #475569; }
          
          .meta-box { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 20px; background: #f8fafc; padding: 10px 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
          
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 25px; margin-bottom: 10px; color: #1e293b; border-left: 4px solid #4f46e5; padding-left: 10px; background: #f1f5f9; padding-top: 4px; padding-bottom: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 10px; text-align: center; }
          .text-center { text-align: center; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center; page-break-inside: avoid; }
          .sig-box { margin-top: 60px; font-weight: bold; }
          
          .empty-state { text-align: center; font-style: italic; color: #64748b; padding: 15px; border: 1px dashed #cbd5e1; font-size: 11px; }

          @media print { 
            body { padding: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        ${getKopHeaderHtml()}

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; color: #1e293b;">LAPORAN PELAKSANAAN TUGAS WALI KELAS</h2>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569; font-weight: 500;">Periode: <strong>${monthLabel}</strong></p>
        </div>

        <div class="meta-box">
          <div><strong>Kelas Binaan:</strong> ${homeroomClass}</div>
          <div><strong>Wali Kelas:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
          <div><strong>Tanggal Cetak:</strong> ${dateStr}</div>
        </div>

        <!-- BAGIAN 1: REKAPITULASI PRESENSI -->
        <div class="section-title">Bagian 1: Rekapitulasi Presensi Kehadiran Siswa</div>
        <table>
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="12%">NIS</th>
              <th width="33%">Nama Siswa</th>
              <th width="8%">Hadir</th>
              <th width="8%">Sakit</th>
              <th width="8%">Izin</th>
              <th width="8%">Alpa</th>
              <th width="8%">Total</th>
              <th width="10%">Persentase</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows.map((s, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center">${s.nis || '-'}</td>
                <td><strong>${s.name || '-'}</strong></td>
                <td class="text-center">${s.hadir}</td>
                <td class="text-center">${s.sakit}</td>
                <td class="text-center">${s.izin}</td>
                <td class="text-center">${s.alpa}</td>
                <td class="text-center">${s.totalKbm}</td>
                <td class="text-center font-bold">${s.percentage}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- BAGIAN 2: CATATAN PEMBINAAN -->
        <div class="section-title">Bagian 2: Catatan Pembinaan & Penanganan Siswa</div>
        ${stNotes.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th width="12%">Tanggal</th>
                <th width="20%">Nama Siswa</th>
                <th width="15%">Kategori</th>
                <th width="28%">Permasalahan / Catatan</th>
                <th width="25%">Tindak Lanjut / Solusi</th>
              </tr>
            </thead>
            <tbody>
              ${stNotes.map(n => `
                <tr>
                  <td class="text-center">${n.date}</td>
                  <td><strong>${n.studentName}</strong></td>
                  <td class="text-center">${n.category}</td>
                  <td>${n.note}</td>
                  <td>${n.actionTaken}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state">Tidak ada catatan pembinaan siswa pada periode ini.</div>'}

        <!-- BAGIAN 3: HOME VISIT -->
        <div class="section-title">Bagian 3: Pelaksanaan Kunjungan Rumah (Home Visit)</div>
        ${stVisits.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th width="12%">Tanggal</th>
                <th width="20%">Nama Siswa</th>
                <th width="30%">Tujuan / Latar Belakang</th>
                <th width="38%">Hasil Kunjungan & Kesepakatan</th>
              </tr>
            </thead>
            <tbody>
              ${stVisits.map(hv => `
                <tr>
                  <td class="text-center">${hv.date}</td>
                  <td><strong>${hv.studentName}</strong></td>
                  <td>${hv.reason}</td>
                  <td>${hv.result}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="empty-state">Tidak ada pelaksanaan Home Visit pada periode ini.</div>'}

        <div class="signatures">
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : ''}
            <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">
              ${headmasterName || '( ................................................. )'}
              <br><span style="font-weight: normal; font-size: 10px;">NIP. ${headmasterNip || '-'}</span>
            </div>
          </div>
          <div>
            <p>${documentCity}, ${dateStr}<br>Wali Kelas ${homeroomClass}</p>
            ${teacherTteSnippet ? teacherTteSnippet : ''}
            <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">
              ${teacherName}
              <br><span style="font-weight: normal; font-size: 10px;">NIP. ${nip || '-'}</span>
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
    }, 500);
  };

  const handleExport = (type: "xlsx" | "pdf" | "print") => {
    const { uniqueDates, studentRows } = getExportDetails();

    if (type === "xlsx") {
      const workbook = utils.book_new();

      // Sheet 1: Detail Harian
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

      // Sheet 2: Rekap Keseluruhan
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

      writeFile(workbook, `Rekap_Presensi_WaliKelas_${homeroomClass}_${selectedMonth === "all" ? "Keseluruhan" : selectedMonth}.xlsx`);
    } else if (type === "pdf") {
      try {
        const jsPDFConstructor = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
        const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
        const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;

        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        // Header
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(`REKAPITULASI PRESENSI WALI KELAS - KELAS ${homeroomClass}`, 14, 15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Periode: ${selectedMonth === "all" ? "Keseluruhan Semester" : `Bulan ${selectedMonth}`} | Tanggal Cetak: ${dateStr}`, 14, 21);
        doc.text(`Wali Kelas: ${teacherName} (NIP. ${nip || "-"})`, 14, 26);

        // Section 1: Detail Harian
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("BAGIAN 1: DETAIL KEHADIRAN PER HARI / PERTEMUAN", 14, 33);

        const dateHeaders = uniqueDates.map(d => {
          const parts = d.split("-");
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        });

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
            startY: 36,
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
        doc.text(`Wali Kelas ${homeroomClass}`, 200, lastY2 + 5);
        if (tteConfig.useTeacherTte && tteConfig.teacherTteImage) {
          embedTteInJsPdf(doc, tteConfig.teacherTteImage, 200, lastY2 + 7, 30, 14);
        }
        doc.setFont("helvetica", "bold");
        doc.text(teacherName || "( ................................................. )", 200, lastY2 + 24);
        doc.setFont("helvetica", "normal");
        doc.text(`NIP. ${nip || "-"}`, 200, lastY2 + 29);

        doc.save(`Rekap_Presensi_WaliKelas_${homeroomClass}.pdf`);
      } catch (err) {
        console.error("PDF generation error:", err);
        handlePrintAttendanceRecap();
      }
    } else {
      handlePrintAttendanceRecap();
    }
    setIsPreviewOpen(false);
  };

  const initiateExport = () => {
    const { uniqueDates } = getExportDetails();
    const dateCols = uniqueDates.map(d => {
      const parts = d.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });
    setPreviewColumns(["NIS", "Nama", ...dateCols, "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "% Kehadiran"]);
    setPreviewData(getExportData());
    setIsPreviewOpen(true);
  };

  // PRINT HOME VISIT REPORT
  const handlePrintHomeVisit = (visit: HomeVisitReport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Wali Kelas", 48, 120) : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Kunjungan Rumah (Home Visit) - ${visit.studentName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .header h3 { margin: 4px 0 0 0; font-size: 15px; color: #1e293b; }
          .header p { margin: 2px 0 0 0; font-size: 11px; color: #475569; }
          .title-tag { text-align: center; font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; font-size: 12px; }
          .item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .full-item { grid-column: span 2; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 13px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 3px; margin-top: 18px; margin-bottom: 8px; color: #4f46e5; text-transform: uppercase; }
          .content-text { font-size: 12px; background: #fff; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; white-space: pre-line; }
          .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
          .photo-card { border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; background: #f8fafc; text-align: center; }
          .photo-card img { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; font-size: 11px; text-align: center; }
          .sig-box { margin-top: 50px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${getKopHeaderHtml()}

        <div class="title-tag">LAPORAN KUNJUNGAN RUMAH (HOME VISIT)</div>

        <div class="grid">
          <div class="item"><strong>Nama Siswa:</strong> ${visit.studentName}</div>
          <div class="item"><strong>Kelas:</strong> ${visit.className}</div>
          <div class="item"><strong>Hari / Tanggal:</strong> ${visit.date}</div>
          <div class="item"><strong>Nama Orang Tua / Wali:</strong> ${visit.parentName}</div>
          <div class="full-item"><strong>Alamat Kunjungan:</strong> ${visit.address}</div>
        </div>

        <div class="section-title">I. Alasan & Tujuan Kunjungan Rumah</div>
        <div class="content-text">${visit.reason}</div>

        <div class="section-title">II. Hasil Diskusi & Kesepakatan Bersama</div>
        <div class="content-text">${visit.result}</div>

        ${visit.photos && visit.photos.length > 0 ? `
          <div class="section-title">III. DOKUMENTASI FOTO KUNJUNGAN RUMAH</div>
          <div class="photo-grid">
            ${visit.photos.map((p, i) => `
              <div class="photo-card">
                <img src="${p}" alt="Dokumentasi ${i+1}" />
                <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Dokumentasi Foto #${i+1}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="signatures">
          <div>
            <p>Orang Tua / Wali Siswa</p>
            <div class="sig-box">${visit.parentName}</div>
          </div>
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : ''}
            <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">${headmasterName || '( ........................................ )'}<br><span style="font-weight: normal; font-size: 10px;">NIP. ${headmasterNip || '-'}</span></div>
          </div>
          <div>
            <p>${documentCity}, ${visit.date}<br>Wali Kelas ${visit.className}</p>
            ${teacherTteSnippet ? teacherTteSnippet : ''}
            <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">${teacherName}<br><span style="font-weight: normal; font-size: 10px;">NIP. ${nip || '-'}</span></div>
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

  // Print Individual Rapor
  const handlePrintReport = (student: Student) => {
    const att = studentAttendanceSummary[student.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
    const acad = studentAcademicSummary[student.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
    const stNotes = notes.filter(n => n.studentId === student.id);
    const tteConfig = getStoredTteConfig();
    const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
    const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Wali Kelas", 48, 120) : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapor Ringkas - ${student.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header h3 { margin: 5px 0 0 0; font-size: 16px; color: #334155; }
          .header p { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
          .meta-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .text-center { text-align: center; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 12px; text-align: center; }
          .sig-box { margin-top: 60px; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${getKopHeaderHtml()}

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; color: #1e293b;">RAPOR RINGKAS & PERKEMBANGAN SISWA</h2>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569; font-weight: 500;">Tahun Ajaran 2025/2026 • Semester Genap</p>
        </div>

        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px;">
          <div style="width: 85px; height: 110px; flex-shrink: 0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px; background: #f8fafc; text-align: center; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            ${student.photo ? `
              <img src="${formatDriveImageUrl(student.photo)}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; ${student.photoRotation ? `transform: rotate(${student.photoRotation}deg);` : ''}" />
            ` : `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-weight: bold; line-height: 1.2;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 4px; color: #cbd5e1;">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                FOTO 3x4
              </div>
            `}
          </div>
          <div class="meta-grid" style="flex: 1; margin-bottom: 0;">
            <div class="meta-item"><strong>Nama Siswa:</strong> ${student.name}</div>
            <div class="meta-item"><strong>NIS / NISN:</strong> ${student.nis}</div>
            <div class="meta-item"><strong>Kelas:</strong> ${student.className}</div>
            <div class="meta-item"><strong>Wali Kelas:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
          </div>
        </div>

        <div class="section-title">I. REKAPITULASI KEHADIRAN SISWA</div>
        <table>
          <thead>
            <tr>
              <th class="text-center">Hadir (H)</th>
              <th class="text-center">Sakit (S)</th>
              <th class="text-center">Izin (I)</th>
              <th class="text-center">Alpa (A)</th>
              <th class="text-center">Persentase Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">${att.hadir} Hari</td>
              <td class="text-center">${att.sakit} Hari</td>
              <td class="text-center">${att.izin} Hari</td>
              <td class="text-center" style="color: ${att.alpa > 0 ? '#e11d48' : '#000'}; font-weight: ${att.alpa > 0 ? 'bold' : 'normal'};">${att.alpa} Hari</td>
              <td class="text-center" style="font-weight: bold;">${att.total > 0 ? Math.round((att.hadir / att.total)*100) : 100}%</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">II. RINGKASAN CAPAIAN AKADEMIK</div>
        <table>
          <thead>
            <tr>
              <th>Komponen Akademik</th>
              <th class="text-center">Nilai Rata-Rata</th>
              <th class="text-center">Kategori / Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rata-Rata Tugas & Penugasan Harian</td>
              <td class="text-center font-bold">${acad.avgAssignment}</td>
              <td class="text-center">${acad.avgAssignment >= 75 ? 'Tuntas KKM' : 'Perlu Perbaikan'}</td>
            </tr>
            <tr>
              <td>Nilai Ujian / Evaluasi Akhir</td>
              <td class="text-center font-bold">${acad.examScore}</td>
              <td class="text-center">${acad.examScore >= 75 ? 'Tuntas KKM' : 'Perlu Perbaikan'}</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>NILAI RATA-RATA AKHIR KELAS</td>
              <td class="text-center" style="font-size: 14px; color: #4f46e5;">${acad.finalAvg}</td>
              <td class="text-center">${acad.finalAvg >= 85 ? 'SANGAT BAIK' : acad.finalAvg >= 75 ? 'BAIK' : 'CUKUP / PEMBINAAN'}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">III. CATATAN & PEMBINAAN WALI KELAS</div>
        ${stNotes.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th width="12%">Tanggal</th>
                <th width="15%">Kategori</th>
                <th>Catatan Wali Kelas</th>
                <th>Tindak Lanjut / Solusi</th>
              </tr>
            </thead>
            <tbody>
              ${stNotes.map(n => `
                <tr>
                  <td>${n.date}</td>
                  <td><strong>${n.category}</strong></td>
                  <td>${n.note}</td>
                  <td>${n.actionTaken}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="font-style: italic; color: #64748b; font-size: 12px;">Siswa berperilaku baik dan tidak memiliki catatan pembinaan khusus.</p>'}

        <div class="signatures" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
          <div>
            <p>Orang Tua / Wali Murid</p>
            <div class="sig-box">( ................................................. )</div>
          </div>
          <div>
            <p>Mengetahui,<br>Kepala Sekolah</p>
            ${headmasterTteSnippet ? headmasterTteSnippet : ''}
            <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">${headmasterName || '( ................................................. )'}<br><span style="font-weight: normal; font-size: 11px;">NIP. ${headmasterNip || '-'}</span></div>
          </div>
          <div>
            <p>${documentCity}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>Wali Kelas ${student.className}</p>
            ${teacherTteSnippet ? teacherTteSnippet : ''}
            <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">${teacherName}<br><span style="font-weight: normal; font-size: 11px;">NIP. ${nip || '-'}</span></div>
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

  const handleDownloadProfileTemplate = () => {
    const templateData = [
      {
        "NIS": "12345",
        "Nama": "Budi Santoso",
        "Jenis Kelamin": "L",
        "Tempat Lahir": "Jakarta",
        "Tanggal Lahir": "12 Januari 2008",
        "Agama": "Islam",
        "Alamat": "Jl. Pendidikan No. 1",
        "No HP Siswa": "081234567890",
        "Nama Orang Tua": "Sutrisno",
        "No Telepon Orang Tua": "089876543210",
        "Link Foto": "https://drive.google.com/file/d/xxxxx/view"
      }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template_Profil");
    writeFile(wb, `Template_Profil_Siswa_${homeroomClass}.xlsx`);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws);
        
        let updatedStudents = [...students];
        let changesMade = 0;

        data.forEach((row: any) => {
          // Identify student by NIS or Name
          const nis = row['NIS'] || row['nis'] || '';
          const nama = row['Nama'] || row['nama'] || row['Nama Siswa'] || '';
          
          let studentIndex = -1;
          if (nis) studentIndex = updatedStudents.findIndex(s => s.nis === String(nis));
          if (studentIndex === -1 && nama) studentIndex = updatedStudents.findIndex(s => s.name.toLowerCase() === String(nama).toLowerCase());
          
          if (studentIndex !== -1) {
            const st = updatedStudents[studentIndex];
            
            // Extract Drive Link to Photo URL
            const photoLink = row['Link Foto'] || row['link foto'] || row['Link Foto Drive'] || row['Foto'] || row['foto'] || row['URL Foto'] || row['url foto'] || row['Foto Profil'];
            let finalPhoto = st.photo;
            if (photoLink && typeof photoLink === 'string' && photoLink.trim()) {
              finalPhoto = formatDriveImageUrl(photoLink.trim());
            }
            
            let parsedDateOfBirth = row['Tanggal Lahir'] || st.dateOfBirth;
            if (typeof parsedDateOfBirth === 'number') {
              const dateObj = new Date(Math.round((parsedDateOfBirth - 25569) * 86400 * 1000));
              const y = dateObj.getUTCFullYear();
              const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
              const d = String(dateObj.getUTCDate()).padStart(2, '0');
              parsedDateOfBirth = `${y}-${m}-${d}`;
            } else if (typeof parsedDateOfBirth === 'string' && parsedDateOfBirth.includes('/')) {
               const parts = parsedDateOfBirth.split('/');
               if (parts.length === 3) {
                 let year = parts[2];
                 if (year.length === 2) {
                   // Handle yy format (assume 20xx for students, or 19xx if > 50)
                   year = parseInt(year) > 50 ? '19' + year : '20' + year;
                 }
                 if (year.length === 4) {
                   parsedDateOfBirth = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                 }
               }
            }

            updatedStudents[studentIndex] = {
              ...st,
              gender: row['Jenis Kelamin'] || row['L/P'] || row['Laki-laki / Perempuan'] || st.gender,
              placeOfBirth: row['Tempat Lahir'] || st.placeOfBirth,
              dateOfBirth: parsedDateOfBirth,
              religion: row['Agama'] || "Islam", // Default all empty or invalid to Islam per request
              address: row['Alamat'] || row['Domisili'] || st.address,
              studentPhone: row['No HP Siswa'] || row['No WA Siswa'] || row['No Telepon Siswa'] || st.studentPhone,
              parentName: row['Nama Orang Tua'] || row['Nama Wali'] || st.parentName,
              parentPhone: row['No Telepon Orang Tua'] || row['No Telepon'] || row['No WhatsApp'] || row['HP Orang Tua'] || st.parentPhone,
              photo: finalPhoto
            };
            changesMade++;
          }
        });

        if (changesMade > 0) {
          setStudents(updatedStudents);
          alert(`Berhasil memperbarui data profil ${changesMade} siswa.`);
        } else {
          alert('Tidak ada data siswa yang cocok dengan NIS atau Nama di dalam file Excel.');
        }
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format sudah benar.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER FOR WALI KELAS */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 border border-white/10 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Ruang Layanan Wali Kelas
              </span>
              <span className="text-xs text-indigo-300">•</span>
              <span className="text-xs font-semibold text-indigo-200">{institution.split('\n').pop()}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
              Kelas Binaan: <span className="text-amber-300 underline decoration-amber-400/50 underline-offset-4">{homeroomClass}</span>
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium leading-relaxed">
              Layanan lengkap wali kelas: rekap kehadiran presensi, laporan Home Visit dengan dokumentasi foto, rapor ringkas, dan catatan pembinaan siswa.
            </p>
          </div>

          {/* Homeroom Class Switcher */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3 w-full md:w-auto shrink-0">
            <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1">
              <Building2 size={13} /> Pilih Kelas Wali:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={homeroomClass}
                onChange={(e) => setHomeroomClass(e.target.value)}
                className="bg-indigo-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer flex-1"
              >
                {classList.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                title="Atur Pengaturan Wali Kelas & Profil"
              >
                Atur
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-white/20"
                title="Cadangkan atau Pulihkan Data Layanan Wali Kelas"
                id="btn-restore-homeroom"
              >
                <RotateCcw size={13} /> Cadangkan / Pulihkan
              </button>

              <button
                onClick={handlePrintFullReport}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-indigo-400/30"
                title="Cetak Laporan Layanan Wali Kelas Lengkap (Presensi, Catatan, Home Visit)"
              >
                <Printer size={13} /> Cetak Laporan
              </button>
            </div>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Total Siswa</p>
            <p className="text-2xl font-black text-white mt-1">{classStats.totalSiswa} <span className="text-xs font-normal text-indigo-200">Siswa</span></p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Kehadiran Rata-Rata</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{classStats.attendanceRate}%</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Laporan Home Visit</p>
            <p className="text-2xl font-black text-cyan-300 mt-1">{classHomeVisits.length} <span className="text-xs font-normal text-indigo-200">Kali</span></p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Nilai Rata-Rata Kelas</p>
            <p className="text-2xl font-black text-amber-300 mt-1">{classStats.avgClassScore || "-"}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Perhatian Khusus</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{classStats.alertCount} <span className="text-xs font-normal text-indigo-200">Siswa</span></p>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto gap-1" id="walikelas-subtabs">
        <button
          onClick={() => setActiveSubTab("siswa")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "siswa"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={15} /> Siswa ({classStudents.length})
        </button>

        <button
          onClick={() => setActiveSubTab("profil-siswa")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "profil-siswa"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCircle size={15} /> Profil Siswa
        </button>

        <button
          onClick={() => setActiveSubTab("rekap-kehadiran")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "rekap-kehadiran"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet size={15} /> Rekap Kehadiran
        </button>

        <button
          onClick={() => setActiveSubTab("home-visit")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "home-visit"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home size={15} /> Home Visit ({classHomeVisits.length})
        </button>

        <button
          onClick={() => setActiveSubTab("rapor")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "rapor"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={15} /> Rapor Ringkas
        </button>

        <button
          onClick={() => setActiveSubTab("pembinaan")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "pembinaan"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <HeartHandshake size={15} /> Pembinaan ({notes.filter(n => n.className === homeroomClass).length})
        </button>

        <button
          onClick={() => setActiveSubTab("perhatian")}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "perhatian"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-500 hover:text-rose-600"
          }`}
        >
          <AlertTriangle size={15} /> Perhatian Khusus ({classStats.alertCount})
        </button>
      </div>

      {/* SUB-TAB 1: DAFTAR SISWA BINAAN */}
      {activeSubTab === "siswa" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {selectedStudentIdsForSiswaTab.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedStudents = filteredStudents.filter(s => selectedStudentIdsForSiswaTab.includes(s.id));
                    setDeleteStudentConfirmModal({
                      isOpen: true,
                      ids: selectedStudentIdsForSiswaTab,
                      names: selectedStudents.map(s => s.name),
                      title: `Hapus ${selectedStudentIdsForSiswaTab.length} Siswa Terpilih?`
                    });
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 size={14} /> Hapus Terpilih ({selectedStudentIdsForSiswaTab.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpenAddNoteModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Plus size={15} /> Catatan Pembinaan Siswa
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIdsForSiswaTab.includes(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIdsForSiswaTab(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedStudentIdsForSiswaTab([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Pilih Semua Siswa"
                      />
                    </th>
                    <th className="py-3.5 px-3">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Kehadiran (H/S/I/A)</th>
                    <th className="py-3.5 px-4 text-center">Persentase</th>
                    <th className="py-3.5 px-4 text-center">Rata-Rata Nilai</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">
                        Tidak ada siswa terdaftar di kelas {homeroomClass}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, index) => {
                      const att = studentAttendanceSummary[s.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, logs: [] };
                      const acad = studentAcademicSummary[s.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
                      const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;
                      const sortedLogs = [...(att.logs || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      let maxConsSakit = 0;
                      let currConsSakit = 0;
                      sortedLogs.forEach(l => {
                        if (l.status === 'Sakit') {
                          currConsSakit += 1;
                          if (currConsSakit > maxConsSakit) maxConsSakit = currConsSakit;
                        } else {
                          currConsSakit = 0;
                        }
                      });
                      const hasSakitAlert = maxConsSakit > 3 || att.sakit >= 15;
                      const hasAlert = att.alpa >= 2 || (att.total > 0 && rate < 85) || hasSakitAlert || notes.some(n => n.studentId === s.id);
                      const isSelected = selectedStudentIdsForSiswaTab.includes(s.id);

                      return (
                        <tr key={`${s.id}_${index}`} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIdsForSiswaTab(prev => [...prev, s.id]);
                                } else {
                                  setSelectedStudentIdsForSiswaTab(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-3 font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{s.name}</span>
                              {hasAlert && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[9px] font-bold">
                                  Perhatian
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{s.nis}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-emerald-600">{att.hadir}H</span> /{" "}
                            <span className="text-amber-600">{att.sakit}S</span> /{" "}
                            <span className="text-blue-600">{att.izin}I</span> /{" "}
                            <span className={`font-bold ${att.alpa > 0 ? "text-rose-600" : "text-slate-400"}`}>{att.alpa}A</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              rate >= 90 ? "bg-emerald-50 text-emerald-700" :
                              rate >= 75 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-extrabold text-indigo-600 text-sm">{acad.finalAvg || "-"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(s.id);
                                  setActiveSubTab("rapor");
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                Rapor <ChevronRight size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintReport(s)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Cetak Rapor Ringkas"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteStudentConfirmModal({
                                    isOpen: true,
                                    ids: [s.id],
                                    names: [s.name],
                                    title: `Hapus Siswa "${s.name}"?`
                                  });
                                }}
                                className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data Siswa"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: PROFIL SISWA */}
      {activeSubTab === "profil-siswa" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="w-full sm:w-80">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pilih Siswa Profil:</label>
                <div className="relative mt-1.5">
                  <select
                    value={selectedStudentId || ""}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                  >
                    <option value="">-- Tampilkan Seluruh Siswa Kelas ({classStudents.length}) --</option>
                    {classStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.nis})
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                </div>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {selectedStudentIdsForProfile.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const selectedStudents = classStudents.filter(s => selectedStudentIdsForProfile.includes(s.id));
                          setDeleteStudentConfirmModal({
                            isOpen: true,
                            ids: selectedStudentIdsForProfile,
                            names: selectedStudents.map(s => s.name),
                            title: `Hapus ${selectedStudentIdsForProfile.length} Siswa Terpilih?`
                          });
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Hapus semua data siswa yang dicentang"
                      >
                        <Trash2 size={14} />
                        <span>Hapus Siswa Terpilih ({selectedStudentIdsForProfile.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIdsForProfile([])}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadProfileTemplate}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    title="Unduh Format Template Profil (XLSX)"
                  >
                    <Download size={14} /> Template
                  </button>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200 shadow-sm"
                    title="Impor profil & foto dari file Excel. Kolom 'Link Foto' dapat berisi Link Foto Google Drive."
                  >
                    <FileSpreadsheet size={16} />
                    Impor (XLSX)
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 text-center sm:text-right w-full sm:max-w-[280px] leading-tight">
                  Pilih lebih dari 1 siswa dengan centang di tabel untuk hapus massal atau mutasi.
                </p>
              </div>
            </div>

            {selectedStudentId && (() => {
              const student = classStudents.find(s => s.id === selectedStudentId);
              if (!student) return null;
              return (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detail Profil Siswa Aktif</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteStudentConfirmModal({
                            isOpen: true,
                            ids: [student.id],
                            names: [student.name],
                            title: `Hapus Data Siswa "${student.name}"?`
                          });
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Siswa Ini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Tutup Detail
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 space-y-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-indigo-600/10" />
                        {student.photo ? (
                          <div className="relative inline-block z-10 mb-4">
                            <img 
                              src={formatDriveImageUrl(student.photo)} 
                              alt={student.name} 
                              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md transition-transform duration-300" 
                              style={{ transform: `rotate(${student.photoRotation || 0}deg)` }}
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                const currentRot = student.photoRotation || 0;
                                setStudents(students.map(s => s.id === student.id ? { ...s, photoRotation: currentRot + 90 } : s));
                              }}
                              className="absolute bottom-0 right-0 p-1.5 bg-white shadow-lg text-indigo-600 rounded-full hover:bg-indigo-50 border border-slate-200"
                              title="Putar Foto (Rotate)"
                            >
                              <RotateCw size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-full bg-white text-slate-300 flex items-center justify-center border-4 border-white shadow-md mb-4 relative z-10">
                            <UserCircle size={64} strokeWidth={1} />
                          </div>
                        )}
                        <h4 className="text-base font-black text-slate-800 relative z-10">{student.name}</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1 relative z-10">NIS: {student.nis}</p>
                        <span className="mt-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg uppercase tracking-wider relative z-10">
                          Kelas {student.className}
                        </span>

                        <div className="mt-4 w-full relative z-10 bg-white/80 p-3 rounded-2xl border border-slate-200 text-left">
                          <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                            Link Foto / Google Drive Siswa:
                          </label>
                          <input
                            type="text"
                            placeholder="https://drive.google.com/file/d/..."
                            value={student.photo || ""}
                            onChange={(e) => {
                              const newUrl = formatDriveImageUrl(e.target.value);
                              setStudents(students.map(s => s.id === student.id ? { ...s, photo: newUrl } : s));
                            }}
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-mono"
                          />
                          <p className="text-[9px] text-slate-400 mt-1">
                            Otomatis memproses & menampilkan foto dari link Google Drive.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full md:w-2/3">
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <FileText size={14} className="text-indigo-500" /> Data Pribadi
                          </h5>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Jenis Kelamin</p>
                            <p className="text-sm font-semibold text-slate-700">{student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tempat Lahir</p>
                            <p className="text-sm font-semibold text-slate-700 uppercase">{student.placeOfBirth || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal Lahir</p>
                            <p className="text-sm font-semibold text-slate-700">
                              {student.dateOfBirth ? (
                                new Date(student.dateOfBirth).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })
                              ) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Agama</p>
                            <p className="text-sm font-semibold text-slate-700">{student.religion || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. HP/WA Siswa</p>
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-slate-700">{student.studentPhone || '-'}</p>
                              {student.studentPhone && (
                                <a 
                                  href={`https://wa.me/${student.studentPhone.replace(/\D/g, '').replace(/^0/, '62')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Alamat Domisili</p>
                            <input 
                              type="text"
                              value={student.address || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, address: e.target.value } : s))}
                              placeholder="Ketik alamat lengkap..."
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-y border-slate-100">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                            <Users size={14} className="text-indigo-500" /> Data Orang Tua / Wali
                          </h5>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nama Orang Tua</p>
                            <input 
                              type="text"
                              value={student.parentName || ""}
                              onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, parentName: e.target.value } : s))}
                              placeholder="Nama ayah / ibu..."
                              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={12} /> No. Telepon / WhatsApp</p>
                            <div className="flex items-center gap-3">
                              <input 
                                type="tel"
                                value={student.parentPhone || ""}
                                onChange={(e) => setStudents(students.map(s => s.id === student.id ? { ...s, parentPhone: e.target.value } : s))}
                                placeholder="08..."
                                className="text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 w-full py-0.5 transition-colors"
                              />
                              {student.parentPhone && (
                                <a 
                                  href={`https://wa.me/${student.parentPhone.replace(/\D/g, '').replace(/^0/, '62')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-[10px] font-bold transition-colors border border-green-200 flex items-center gap-1 shrink-0"
                                >
                                  Chat WA
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DAFTAR SISWA & MANAJEMEN DATA PROFIL MASSAL */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={15} className="text-indigo-600" />
                    Daftar Profil Siswa Kelas {homeroomClass} ({classStudents.length} Siswa)
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Centang satu atau lebih siswa di bawah untuk melakukan penghapusan data secara bersamaan.
                  </p>
                </div>
                {classStudents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedStudentIdsForProfile.length === classStudents.length) {
                          setSelectedStudentIdsForProfile([]);
                        } else {
                          setSelectedStudentIdsForProfile(classStudents.map(s => s.id));
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {selectedStudentIdsForProfile.length === classStudents.length ? 'Batal Pilih Semua' : `Pilih Semua (${classStudents.length})`}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                        <th className="py-3 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={classStudents.length > 0 && classStudents.every(s => selectedStudentIdsForProfile.includes(s.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIdsForProfile(classStudents.map(s => s.id));
                              } else {
                                setSelectedStudentIdsForProfile([]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Pilih Semua Siswa"
                          />
                        </th>
                        <th className="py-3 px-3 text-center w-12">Foto</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">NIS</th>
                        <th className="py-3 px-4 text-center">L/P</th>
                        <th className="py-3 px-4">Kontak Siswa</th>
                        <th className="py-3 px-4">Orang Tua</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400 font-semibold">
                            Tidak ada siswa di kelas {homeroomClass}. Silakan gunakan tombol Impor XLSX atau tambah siswa di Manajemen Data.
                          </td>
                        </tr>
                      ) : (
                        classStudents.map((s) => {
                          const isSelected = selectedStudentIdsForProfile.includes(s.id);
                          const isActiveProfile = selectedStudentId === s.id;

                          return (
                            <tr
                              key={s.id}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isSelected ? 'bg-indigo-50/40' : isActiveProfile ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentIdsForProfile(prev => [...prev, s.id]);
                                    } else {
                                      setSelectedStudentIdsForProfile(prev => prev.filter(id => id !== s.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {s.photo ? (
                                  <img
                                    src={formatDriveImageUrl(s.photo)}
                                    alt={s.name}
                                    className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <UserCircle size={18} />
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-bold text-slate-800">{s.name}</span>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-500">{s.nis}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-600">{s.gender || '-'}</td>
                              <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{s.studentPhone || '-'}</td>
                              <td className="py-2.5 px-4 text-slate-600">{s.parentName || '-'}</td>
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentId(s.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                      isActiveProfile
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                    }`}
                                  >
                                    {isActiveProfile ? 'Sedang Dibuka' : 'Detail'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteStudentConfirmModal({
                                        isOpen: true,
                                        ids: [s.id],
                                        names: [s.name],
                                        title: `Hapus Siswa "${s.name}"?`
                                      });
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Data Siswa"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP KEHADIRAN PRESENSI LENGKAP */}
      {activeSubTab === "rekap-kehadiran" && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" /> Rekap Presensi & Kehadiran Siswa
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Rekapitualisasi kehadiran siswa kelas {homeroomClass} berdasarkan pencatatan digital
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Semester Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemester(1);
                    safeStorage.setItem("guru_attendance_semester", "1");
                    setSelectedMonth("all");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedSemester === 1 
                      ? "bg-white text-indigo-600 shadow-xs font-black" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Smtr 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSemester(2);
                    safeStorage.setItem("guru_attendance_semester", "2");
                    setSelectedMonth("all");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedSemester === 2 
                      ? "bg-white text-indigo-600 shadow-xs font-black" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Smtr 2
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Semua Bulan (Semester {selectedSemester})</option>
                  {selectedSemester === 1 ? (
                    <>
                      <option value="07">Juli</option>
                      <option value="08">Agustus</option>
                      <option value="09">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </>
                  ) : (
                    <>
                      <option value="01">Januari</option>
                      <option value="02">Februari</option>
                      <option value="03">Maret</option>
                      <option value="04">April</option>
                      <option value="05">Mei</option>
                      <option value="06">Juni</option>
                    </>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={initiateExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Download size={15} /> Pratinjau & Ekspor (.XLSX / .PDF)
              </button>

              <button
                type="button"
                onClick={handlePrintAttendanceRecap}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Printer size={15} /> Cetak Rekap (.PDF)
              </button>
            </div>
          </div>

          {/* Attendance Recap Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-4">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Hadir (H)</th>
                    <th className="py-3.5 px-4 text-center">Sakit (S)</th>
                    <th className="py-3.5 px-4 text-center">Izin (I)</th>
                    <th className="py-3.5 px-4 text-center">Alpa (A)</th>
                    <th className="py-3.5 px-4 text-center">Total Pertemuan</th>
                    <th className="py-3.5 px-4 text-center">Persentase</th>
                    <th className="py-3.5 px-4 text-center">Status Kelayakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-semibold">
                        Tidak ada siswa terdaftar di kelas {homeroomClass}
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((s, idx) => {
                      const att = studentAttendanceSummary[s.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, logs: [] };
                      const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;

                      return (
                        <tr key={`${s.id}_${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{s.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{s.nis}</td>
                          <td className="py-3.5 px-4 text-center text-emerald-700 font-extrabold">{att.hadir}</td>
                          <td className="py-3.5 px-4 text-center text-amber-700 font-extrabold">{att.sakit}</td>
                          <td className="py-3.5 px-4 text-center text-blue-700 font-extrabold">{att.izin}</td>
                          <td className={`py-3.5 px-4 text-center font-extrabold ${att.alpa > 0 ? "text-rose-600" : "text-slate-400"}`}>
                            {att.alpa}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-semibold">{att.total} Hari</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              rate >= 90 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              rate >= 80 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {rate >= 90 ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Sangat Baik
                              </span>
                            ) : rate >= 80 ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                Baik / Normal
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                Perlu Perhatian
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LAPORAN HOME VISIT + DOKUMENTASI FOTO */}
      {activeSubTab === "home-visit" && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Home size={16} className="text-indigo-600" /> Laporan & Sistem Kategorisasi Home Visit (Kunjungan Rumah)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Pencatatan resmi kunjungan wali kelas berdasarkan 4 Kriteria Utama serta dokumentasi foto & kesepakatan orang tua
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setHvCategory("kat1");
                setHvReason(HOME_VISIT_CATEGORIES[0].template);
                setIsOpenHomeVisitModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Plus size={15} /> Buat Laporan Home Visit
            </button>
          </div>

          {/* PEDOMAN 4 KATEGORI SISWA WAJIB HOME VISIT */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/30 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wider uppercase">
                  Standar Operasional Prosedur (SOP)
                </span>
                <h4 className="text-sm font-extrabold text-white mt-1 flex items-center gap-2">
                  <AlertTriangle size={17} className="text-amber-400" />
                  4 Kategori Siswa Wajib Home Visit (Kunjungan Rumah)
                </h4>
              </div>
              <p className="text-[11px] text-indigo-200/80">
                Diidentifikasi secara langsung dari rekap presensi harian & catatan pembinaan wali kelas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {HOME_VISIT_CATEGORIES.map(cat => (
                <div key={cat.id} className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${cat.badge}`}>
                        {cat.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Kriteria Resmi</span>
                    </div>
                    <h5 className="text-xs font-extrabold text-slate-100 leading-snug">
                      {cat.title}
                    </h5>
                    <p className="text-[11px] text-slate-300/80 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHvCategory(cat.id);
                      setHvReason(cat.template);
                      setIsOpenHomeVisitModal(true);
                    }}
                    className="w-full py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer mt-1"
                  >
                    <Plus size={13} /> Pilih {cat.code}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* REKOMENDASI DETEKSI OTOMATIS SISWA PERLU HOME VISIT */}
          {flaggedHomeVisitStudents.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-600 text-white rounded-xl">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-rose-950">
                      Rekomendasi Kunjungan Rumah Terdeteksi Sistem ({flaggedHomeVisitStudents.length} Siswa)
                    </h4>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Siswa berikut memenuhi 1 atau lebih kriteria dari 4 Kategori Wajib Home Visit
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flaggedHomeVisitStudents.map(({ student, matchedCats, hasExistingVisit }, fIdx) => (
                  <div key={`${student.id}_${fIdx}`} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-900">{student.name}</h5>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis} • Kelas {student.className}</p>
                        </div>
                        {hasExistingVisit ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Sudah Ada Laporan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0 animate-pulse">
                            Perlu Home Visit
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {matchedCats.map(m => (
                          <span key={m.id} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${m.badge}`} title={m.detail}>
                            {m.code}: {m.shortLabel}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl space-y-1">
                        {matchedCats.map(m => (
                          <div key={m.id} className="flex items-start gap-1">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{m.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartHomeVisitForStudent(student.id, matchedCats[0]?.id)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer mt-1"
                    >
                      <Home size={14} /> Buat Laporan Home Visit untuk {student.name.split(" ")[0]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Home Visit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classHomeVisits.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-3">
                <Home size={36} className="mx-auto text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-800">Belum Ada Laporan Home Visit</h4>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Klik tombol "Buat Laporan Home Visit" di atas untuk mencatat agenda kunjungan rumah ke siswa kelas {homeroomClass}.
                </p>
              </div>
            ) : (
              classHomeVisits.map(visit => {
                const categoryObj = HOME_VISIT_CATEGORIES.find(c => c.id === visit.category);
                return (
                  <div key={visit.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-extrabold text-xs text-slate-800">{visit.studentName}</h4>
                            {categoryObj && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${categoryObj.badge}`}>
                                {categoryObj.code}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar size={12} className="text-indigo-500" /> {visit.date}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteHomeVisit(visit.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Laporan Home Visit"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Parent & Address */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Users size={13} className="text-indigo-600 shrink-0" />
                          <span>Orang Tua: <strong className="text-slate-800">{visit.parentName}</strong></span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                          <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                          <span>{visit.address}</span>
                        </div>
                      </div>

                      {/* Reason & Result */}
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Alasan & Kategori Kunjungan</span>
                          <p className="text-slate-700 font-medium leading-relaxed">{visit.reason}</p>
                        </div>

                        <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">Hasil & Kesepakatan</span>
                          <p className="text-emerald-950 font-medium leading-relaxed">{visit.result}</p>
                        </div>
                      </div>

                      {/* Photo Documentation Thumbnails */}
                      {visit.photos && visit.photos.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Camera size={12} className="text-indigo-600" /> Dokumentasi Foto ({visit.photos.length})
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {visit.photos.map((p, pIdx) => (
                              <img
                                key={pIdx}
                                src={p}
                                alt="Dokumentasi Home Visit"
                                onClick={() => setLightboxImg(p)}
                                className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Print Button */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handlePrintHomeVisit(visit)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer size={13} /> Cetak Laporan Home Visit (.PDF)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: RAPOR RINGKAS */}
      {activeSubTab === "rapor" && reportStudent && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pilih Siswa Rapor:</label>
                <select
                  value={reportStudent.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 block w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handlePrintReport(reportStudent)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer size={16} /> Cetak Rapor Ringkas (.PDF)
              </button>
            </div>

            <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6 max-w-4xl mx-auto">
              <div className="text-center pb-4 border-b-2 border-indigo-600">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">{institution.split('\n').join(' - ')}</h3>
                <h2 className="text-lg font-black text-indigo-900 mt-1">RAPOR RINGKAS & PERKEMBANGAN SISWA</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Tahun Ajaran 2025/2026 • Semester Genap</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-32 shrink-0 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                  {reportStudent.photo ? (
                    <img
                      src={formatDriveImageUrl(reportStudent.photo)}
                      alt={reportStudent.name}
                      className="w-full h-full object-cover rounded-xl"
                      style={{ transform: `rotate(${reportStudent.photoRotation || 0}deg)` }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <UserCircle size={40} strokeWidth={1.5} />
                      <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Foto 3x4</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs w-full flex-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-semibold block text-[10px]">NAMA LENGKAP SISWA</span>
                    <span className="font-extrabold text-slate-800 text-sm">{reportStudent.name}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-semibold block text-[10px]">NIS / NISN</span>
                    <span className="font-mono font-extrabold text-slate-800 text-sm">{reportStudent.nis}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-semibold block text-[10px]">KELAS BINAAN</span>
                    <span className="font-extrabold text-slate-800 text-sm">{reportStudent.className}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-semibold block text-[10px]">WALI KELAS</span>
                    <span className="font-extrabold text-indigo-600 text-sm">{teacherName} (NIP. {nip || "-"})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" /> Rekapitulasi Kehadiran
                </h4>
                {(() => {
                  const att = studentAttendanceSummary[reportStudent.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
                  const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-emerald-700 font-bold block">HADIR</span>
                        <span className="text-base font-black text-emerald-800">{att.hadir} Hari</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-amber-700 font-bold block">SAKIT</span>
                        <span className="text-base font-black text-amber-800">{att.sakit} Hari</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-blue-700 font-bold block">IZIN</span>
                        <span className="text-base font-black text-blue-800">{att.izin} Hari</span>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                        <span className="text-[10px] text-rose-700 font-bold block">ALPA</span>
                        <span className="text-base font-black text-rose-800">{att.alpa} Hari</span>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-indigo-700 font-bold block">PERSENTASE</span>
                        <span className="text-base font-black text-indigo-900">{rate}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={14} className="text-indigo-600" /> Capaian Nilai Akademik
                </h4>
                {(() => {
                  const acad = studentAcademicSummary[reportStudent.id] || { avgAssignment: 0, examScore: 0, finalAvg: 0 };
                  return (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Rata-Rata Tugas & Harian</span>
                        <span className="font-extrabold text-slate-800">{acad.avgAssignment}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Nilai Evaluasi / Ujian Akhir</span>
                        <span className="font-extrabold text-slate-800">{acad.examScore}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 font-bold">
                        <span className="text-indigo-900 text-sm">NILAI AKHIR RATA-RATA</span>
                        <span className="text-lg font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-xl">{acad.finalAvg}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartHandshake size={14} className="text-indigo-600" /> Catatan Pembinaan Wali Kelas
                </h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  {notes.filter(n => n.studentId === reportStudent.id).length > 0 ? (
                    notes.filter(n => n.studentId === reportStudent.id).map(n => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-700 text-[11px]">{n.category} ({n.date})</span>
                        </div>
                        <p className="text-slate-700 font-medium">{n.note}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Tindak Lanjut: {n.actionTaken}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 font-medium italic">Belum ada catatan khusus. Siswa berperilaku baik dan tuntas secara umum.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CATATAN PEMBINAAN */}
      {activeSubTab === "pembinaan" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Catatan Pembinaan Wali Kelas ({notes.filter(n => n.className === homeroomClass).length})</h3>
              <p className="text-[11px] text-slate-500 font-medium">Rekam jejak bimbingan kedisiplinan dan perkembangan siswa</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenAddNoteModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> Tambah Catatan Pembinaan
            </button>
          </div>

          <div className="space-y-3">
            {notes.filter(n => n.className === homeroomClass).length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-700">Belum Ada Catatan Pembinaan</h4>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Siswa kelas {homeroomClass} saat ini berada dalam kondisi aman. Klik tombol di atas untuk menambah catatan khusus.
                </p>
              </div>
            ) : (
              notes.filter(n => n.className === homeroomClass).map(note => (
                <div key={note.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">{note.studentName}</span>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                        {note.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold">{note.date}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{note.note}</p>
                  
                  {note.actionTaken && (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-semibold border border-slate-100 flex items-start gap-1.5">
                      <TrendingUp size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Tindak Lanjut / Solusi:</strong> {note.actionTaken}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: PERHATIAN KHUSUS */}
      {activeSubTab === "perhatian" && (
        <div className="space-y-4">
          <div className="bg-rose-50/80 p-4 rounded-3xl border border-rose-100 flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-sm">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-900">Perhatian Khusus Siswa Kelas Bimbingan</h3>
              <p className="text-[11px] text-rose-700 font-medium">Siswa dengan persentase Alpa tinggi, tingkat kehadiran &lt; 85%, atau catatan pembinaan khusus</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classStats.alertStudents.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-800">Semua Siswa Terpantau Aman!</h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tidak ada siswa dengan masalah kehadiran serius atau catatan pembinaan khusus di kelas {homeroomClass}.
                </p>
              </div>
            ) : (
              classStats.alertStudents.map((student, aIdx) => {
                const att = studentAttendanceSummary[student.id] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
                const rate = att.total > 0 ? Math.round((att.hadir / att.total) * 100) : 100;
                const stNotes = notes.filter(n => n.studentId === student.id);

                return (
                  <div key={`${student.id}_${aIdx}`} className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{student.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold">
                        Perlu Pendampingan
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">JUMLAH ALPA</span>
                        <span className={`font-black text-sm ${att.alpa >= 2 ? "text-rose-600" : "text-slate-700"}`}>
                          {att.alpa} Hari
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">PERSENTASE KEHADIRAN</span>
                        <span className={`font-black text-sm ${rate < 85 ? "text-rose-600" : "text-emerald-600"}`}>
                          {rate}%
                        </span>
                      </div>
                    </div>

                    {stNotes.length > 0 && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] space-y-1">
                        <span className="text-amber-800 font-bold block text-[10px]">Catatan Terakhir:</span>
                        <p className="text-slate-700 font-medium">{stNotes[stNotes.length - 1].note}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setHvStudentId(student.id);
                          setIsOpenHomeVisitModal(true);
                        }}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        + Home Visit
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintReport(student)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cetak Rapor
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: BUAT LAPORAN HOME VISIT + DOKUMENTASI FOTO */}
      {isOpenHomeVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Home size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Laporan Home Visit (Kunjungan Rumah)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Dokumentasikan bimbingan dan koordinasi bersama orang tua</p>
                </div>
              </div>
              <button onClick={() => setIsOpenHomeVisitModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Siswa</label>
                <select
                  value={hvStudentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setHvStudentId(sid);
                    const st = classStudents.find(s => s.id === sid);
                    if (st && (!hvAddress || hvAddress.startsWith("Alamat tempat tinggal"))) {
                      setHvAddress(`Alamat tempat tinggal ${st.name}`);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Pilih Siswa Kelas {homeroomClass} --</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Kategori Kunjungan Rumah (Sesuai Kriteria Resmi)
                </label>
                <select
                  value={hvCategory}
                  onChange={(e) => {
                    const selectedCat = e.target.value;
                    setHvCategory(selectedCat);
                    const catObj = HOME_VISIT_CATEGORIES.find(c => c.id === selectedCat);
                    if (catObj && (!hvReason || HOME_VISIT_CATEGORIES.some(c => c.template === hvReason))) {
                      setHvReason(catObj.template);
                    }
                  }}
                  className="w-full bg-slate-50 border border-indigo-300 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {HOME_VISIT_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
                {HOME_VISIT_CATEGORIES.find(c => c.id === hvCategory) && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                    ℹ️ {HOME_VISIT_CATEGORIES.find(c => c.id === hvCategory)?.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal Kunjungan</label>
                  <input
                    type="date"
                    value={hvDate}
                    onChange={(e) => setHvDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={hvParentName}
                    onChange={(e) => setHvParentName(e.target.value)}
                    placeholder="Contoh: Bpk. Hendra Fauzi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alamat Rumah Siswa</label>
                <input
                  type="text"
                  value={hvAddress}
                  onChange={(e) => setHvAddress(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No. 14, Rt 02/05, Tasikmalaya"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alasan / Permasalahan Kunjungan</label>
                <textarea
                  rows={2}
                  value={hvReason}
                  onChange={(e) => setHvReason(e.target.value)}
                  placeholder="Contoh: Siswa sering Alpa berturut-turut dan penurunan motivasi belajar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hasil Diskusi & Kesepakatan Bersama</label>
                <textarea
                  rows={3}
                  value={hvResult}
                  onChange={(e) => setHvResult(e.target.value)}
                  placeholder="Contoh: Orang tua menyetujui pendampingan ketat di rumah, membatasi gawai, dan siap melaporkan jam belajar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Foto Dokumentasi */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dokumentasi Foto Kunjungan</label>
                <label className="flex items-center justify-center gap-2 w-full p-3 bg-slate-50 hover:bg-indigo-50/50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl text-slate-600 font-bold cursor-pointer transition-all">
                  <Camera size={16} className="text-indigo-600" /> Upload Foto Dokumentasi (.jpg, .png)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {hvPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {hvPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-200">
                        <img src={photo} alt="Upload" className="w-full h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(pIdx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-700 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpenHomeVisitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveHomeVisit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Simpan Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH CATATAN PEMBINAAN */}
      {isOpenAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">Catatan Pembinaan Wali Kelas</h3>
              <button onClick={() => setIsOpenAddNoteModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Siswa</label>
                <select
                  value={noteStudentId}
                  onChange={(e) => setNoteStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Pilih Siswa Kelas {homeroomClass} --</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (NIS: {s.nis})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kategori Pembinaan</label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as HomeroomNote["category"])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Kedisiplinan">Kedisiplinan / Keterlambatan</option>
                  <option value="Akademik">Akademik / Tugas</option>
                  <option value="Prestasi">Prestasi / Penghargaan</option>
                  <option value="Konseling">Konseling Bimbingan</option>
                  <option value="Kesehatan">Kesehatan / Absensi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Isi Catatan Pembinaan</label>
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Contoh: Siswa sering terlambat masuk jam pertama dan alpa 2 kali..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tindak Lanjut / Solusi</label>
                <input
                  type="text"
                  value={noteAction}
                  onChange={(e) => setNoteAction(e.target.value)}
                  placeholder="Contoh: Pemanggilan orang tua & bimbingan konseling..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpenAddNoteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 bg-rose-600 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <img src={lightboxImg} alt="Dokumentasi Zoom" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* EXPORT PREVIEW MODAL FOR WALI KELAS REKAP */}
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleExport}
        data={previewData}
        title={`Rekap Presensi Wali Kelas (Detail & Total) - ${homeroomClass}`}
        columns={previewColumns.length > 0 ? previewColumns : ["NIS", "Nama", "Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "Tdk Mengajar (TM)", "Total KBM", "% Kehadiran"]}
      />

      {/* Restore & Backup Layanan Wali Kelas Modal */}
      <MenuDataRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        menuTitle={`Layanan Wali Kelas (${homeroomClass})`}
        menuKey="homeroom"
        currentDataCount={notes.length + homeVisits.length}
        currentDataSummary={`Mencakup ${notes.length} catatan pembinaan & penanganan siswa, serta ${homeVisits.length} laporan kunjungan rumah (home visit) berfoto.`}
        onExportBackup={handleExportHomeroomJson}
        onRestoreData={handleRestoreHomeroomData}
      />

      {/* MODAL KONFIRMASI HAPUS SISWA (TUNGGAL & MASSAL) */}
      {deleteStudentConfirmModal && deleteStudentConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100/80 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">{deleteStudentConfirmModal.title}</h3>
                <p className="text-xs text-slate-500 font-medium">Tindakan ini akan menghapus data siswa dari sistem</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-800 space-y-2">
              <p className="font-semibold">
                Apakah Anda yakin ingin menghapus <strong>{deleteStudentConfirmModal.ids.length} data siswa</strong> ini?
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {deleteStudentConfirmModal.names.map((name, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] bg-white/80 px-2.5 py-1 rounded-lg border border-rose-100">
                    <span className="font-bold text-slate-800 truncate">{idx + 1}. {name}</span>
                    <span className="text-slate-500 font-mono text-[10px] shrink-0">Kelas {homeroomClass}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteStudentConfirmModal(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDeleteStudents(deleteStudentConfirmModal.ids)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus {deleteStudentConfirmModal.ids.length > 1 ? `(${deleteStudentConfirmModal.ids.length})` : ''} Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
