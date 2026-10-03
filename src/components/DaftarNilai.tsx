import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  FileSpreadsheet, 
  Download, 
  Edit, 
  Award, 
  TrendingUp, 
  Percent, 
  TrendingDown, 
  CheckCircle,
  Clock,
  AlertCircle,
  History,
  Edit3,
  Save,
  FileText,
  CheckCircle2,
  X,
  Search,
  Eye,
  BookOpen,
  Sparkles,
  Check,
  Plus,
  Filter,
  Smartphone,
  LayoutGrid,
  Clipboard,
  RotateCcw,
  Database,
  Info,
  CheckSquare,
  ChevronDown,
  SlidersHorizontal
} from "lucide-react";
import { Student, Assignment, StudentGrade, Submission } from "../types";
import { CLASSES } from "../data/presets";
import { safeStorage } from "../lib/safeStorage";
import { utils, writeFile } from "xlsx";
import * as jspdfModule from "jspdf";
import autoTable from "jspdf-autotable";
import ExportPreviewModal from "./ExportPreviewModal";
import MenuDataRestoreModal from "./MenuDataRestoreModal";
import ExportPendingTasksModal from "./ExportPendingTasksModal";
import { getStoredTteConfig, renderTteImageHtml, embedTteInJsPdf } from "../lib/tteUtils";
import { renderKopHeaderHtml } from "../lib/kopUtils";

interface DaftarNilaiProps {
  students: Student[];
  assignments: Assignment[];
  submissions?: Submission[];
  grades: StudentGrade[];
  onUpdateGradeCell: (studentId: string, assignmentId: string | "exam" | "midterm" | "character", value: number) => void;
  onRestoreGrades?: (data: { grades?: StudentGrade[]; assignments?: Assignment[]; submissions?: Submission[] }, mode: "merge" | "replace") => void;
  onUpdateSubmission?: (
    submissionId: string, 
    updatedAnswer: string, 
    newScore?: number, 
    updatedItems?: any[], 
    studentId?: string, 
    assignmentId?: string
  ) => void;
  onNavigateToAssignments?: (className?: string) => void;
  onAddAssignment?: (newAssignment: Omit<Assignment, "id">, applyToAll?: boolean) => void;
  classList?: string[];
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
}

export interface CalculatedStudentGradeResult {
  hasInputtedScores: boolean;
  activeWeightSum: number;
  assignmentAvg: number | null;
  enteredAssignmentsCount: number;
  midtermScore: number | null;
  examScore: number | null;
  characterScore: number | null;
  finalScore: number | null;
  isPass: boolean;
  componentsSummary: string;
}

export const calculateStudentScore = (
  student: Student,
  gradeObj: StudentGrade | undefined,
  classAssignments: Assignment[],
  weights: { assignment: number; midterm: number; exam: number; character: number },
  onlyInputted: boolean = true,
  treatZeroAsEmpty: boolean = true
): CalculatedStudentGradeResult => {
  // 1. Assignment component: Jika tugas belum masuk isikan dengan nilai 0
  const assignmentScores: number[] = [];
  let enteredAssignmentCount = 0;
  
  if (classAssignments.length > 0) {
    classAssignments.forEach(a => {
      const raw = gradeObj?.assignmentScores?.[a.id];
      if (raw !== undefined && raw !== null && !isNaN(raw)) {
        assignmentScores.push(raw);
        if (raw > 0) enteredAssignmentCount++;
      } else {
        // Aturan: Jika tugas belum masuk isikan dengan nilai 0
        assignmentScores.push(0);
      }
    });
  }

  const hasAssignmentScore = assignmentScores.length > 0;
  const assignmentAvg = hasAssignmentScore
    ? Math.round(assignmentScores.reduce((sum, v) => sum + v, 0) / assignmentScores.length)
    : (onlyInputted ? null : 0);

  // 2. Midterm (PTS / STS)
  const rawMidterm = gradeObj?.midtermScore;
  const isMidtermValid = rawMidterm !== undefined && rawMidterm !== null && !isNaN(rawMidterm) && 
    (onlyInputted && treatZeroAsEmpty ? rawMidterm > 0 : true);
  const midtermScore = isMidtermValid ? rawMidterm : (onlyInputted ? null : 0);

  // 3. Exam (PAS / SAS)
  const rawExam = gradeObj?.examScore;
  const isExamValid = rawExam !== undefined && rawExam !== null && !isNaN(rawExam) && 
    (onlyInputted && treatZeroAsEmpty ? rawExam > 0 : true);
  const examScore = isExamValid ? rawExam : (onlyInputted ? null : 0);

  // 4. Character (Sikap)
  const rawCharacter = gradeObj?.characterScore;
  const isCharacterValid = rawCharacter !== undefined && rawCharacter !== null && !isNaN(rawCharacter) && 
    (onlyInputted && treatZeroAsEmpty ? rawCharacter > 0 : true);
  const characterScore = isCharacterValid ? rawCharacter : (onlyInputted ? null : 0);

  if (onlyInputted) {
    let weightedSum = 0;
    let activeWeight = 0;
    const activeComponents: string[] = [];

    if (assignmentAvg !== null) {
      weightedSum += assignmentAvg * weights.assignment;
      activeWeight += weights.assignment;
      activeComponents.push(`Tugas (${assignmentScores.length})`);
    }
    if (midtermScore !== null) {
      weightedSum += midtermScore * weights.midterm;
      activeWeight += weights.midterm;
      activeComponents.push("PTS");
    }
    if (examScore !== null) {
      weightedSum += examScore * weights.exam;
      activeWeight += weights.exam;
      activeComponents.push("PAS");
    }
    if (characterScore !== null) {
      weightedSum += characterScore * weights.character;
      activeWeight += weights.character;
      activeComponents.push("Sikap");
    }

    if (activeWeight === 0) {
      return {
        hasInputtedScores: false,
        activeWeightSum: 0,
        assignmentAvg: null,
        enteredAssignmentsCount: 0,
        midtermScore: null,
        examScore: null,
        characterScore: null,
        finalScore: null,
        isPass: false,
        componentsSummary: "Belum ada nilai terinput",
      };
    }

    const finalScore = Math.round(weightedSum / activeWeight);
    return {
      hasInputtedScores: true,
      activeWeightSum: activeWeight,
      assignmentAvg,
      enteredAssignmentsCount: enteredAssignmentCount,
      midtermScore,
      examScore,
      characterScore,
      finalScore,
      isPass: finalScore >= 75,
      componentsSummary: activeComponents.join(" + "),
    };
  } else {
    // Standard fixed full 100% calculation
    const totalW = weights.assignment + weights.midterm + weights.exam + weights.character || 100;
    const weightedSum = 
      ((assignmentAvg || 0) * weights.assignment) +
      ((midtermScore || 0) * weights.midterm) +
      ((examScore || 0) * weights.exam) +
      ((characterScore || 0) * weights.character);
    const finalScoreRounded = Math.round(weightedSum / totalW);
    return {
      hasInputtedScores: true,
      activeWeightSum: totalW,
      assignmentAvg,
      enteredAssignmentsCount: assignmentScores.length,
      midtermScore,
      examScore,
      characterScore,
      finalScore: finalScoreRounded,
      isPass: finalScoreRounded >= 75,
      componentsSummary: "Semua Komponen (Termasuk 0)",
    };
  }
};

export default function DaftarNilai({
  students,
  assignments,
  submissions = [],
  grades,
  onUpdateGradeCell,
  onUpdateSubmission,
  onNavigateToAssignments,
  onAddAssignment,
  classList,
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
  onRestoreGrades
}: DaftarNilaiProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    const saved = safeStorage.getItem("guru_active_class");
    if (saved && availableClasses.includes(saved)) return saved;
    return availableClasses[0] || "X-MIPA-1";
  });

  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    safeStorage.setItem("guru_active_class", cls);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [activeTabMode, setActiveTabMode] = useState<"matrix" | "cards" | "history">("matrix");
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Export JSON Backup
  const handleExportGradesJson = () => {
    const backupPayload = {
      app: "EduAsisten",
      version: "2.5",
      category: "grades",
      exportedAt: new Date().toISOString(),
      gradesCount: grades.length,
      assignmentsCount: assignments.length,
      submissionsCount: submissions.length,
      grades: grades,
      assignments: assignments,
      submissions: submissions
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_Daftar_Nilai_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Grades Data Handler
  const handleRestoreGradesData = (importedData: any, mode: "merge" | "replace") => {
    let importedGrades: StudentGrade[] = [];
    let importedAssignments: Assignment[] = [];
    let importedSubmissions: Submission[] = [];

    if (Array.isArray(importedData)) {
      importedGrades = importedData;
    } else if (importedData && typeof importedData === "object") {
      importedGrades = importedData.grades || importedData.studentGrades || [];
      importedAssignments = importedData.assignments || [];
      importedSubmissions = importedData.submissions || [];
    }

    if (importedGrades.length === 0 && importedAssignments.length === 0 && importedSubmissions.length === 0) {
      return { success: false, message: "Tidak ditemukan data nilai atau tugas yang valid dalam berkas." };
    }

    if (onRestoreGrades) {
      onRestoreGrades({
        grades: importedGrades,
        assignments: importedAssignments,
        submissions: importedSubmissions
      }, mode);
    } else {
      // Fallback cell-by-cell restore
      importedGrades.forEach(g => {
        if (g.studentId) {
          const scores = g.assignmentScores || (g as any).assignments;
          if (scores && typeof scores === "object") {
            Object.entries(scores).forEach(([assignId, score]) => {
              if (typeof score === "number") onUpdateGradeCell(g.studentId, assignId, score);
            });
          }
          if (typeof g.examScore === "number") onUpdateGradeCell(g.studentId, "exam", g.examScore);
          if (typeof g.midtermScore === "number") onUpdateGradeCell(g.studentId, "midterm", g.midtermScore);
          if (typeof g.characterScore === "number") onUpdateGradeCell(g.studentId, "character", g.characterScore);
        }
      });
    }

    const totalCount = importedGrades.length + importedAssignments.length;
    return {
      success: true,
      count: totalCount,
      message: `Berhasil memulihkan data penilaian (${totalCount} item diproses dalam mode ${mode === "merge" ? "Gabung & Lengkapi" : "Ganti Total"})!`
    };
  };

  const activeSelectedClass = availableClasses.includes(selectedClass) 
    ? selectedClass 
    : availableClasses[0] || "X-MIPA-1";

  // Grid Cell Editing States
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    type: string; // assignmentId or "exam" | "midterm" | "character"
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Weight configuration
  const [assignmentWeight, setAssignmentWeight] = useState(40);
  const [midtermWeight, setMidtermWeight] = useState(20);
  const [examWeight, setExamWeight] = useState(30);
  const [characterWeight, setCharacterWeight] = useState(10);
  const totalWeight = assignmentWeight + midtermWeight + examWeight + characterWeight;

  // Calculation mode: only calculate inputted values (exclude empty/unheld tests from denominator)
  const [onlyCalculateInputted, setOnlyCalculateInputted] = useState<boolean>(true);
  const [treatZeroAsEmpty, setTreatZeroAsEmpty] = useState<boolean>(true);

  // Export State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPendingExportModalOpen, setIsPendingExportModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  // Multi-select state: can contain "all" or multiple specific IDs
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(["all"]);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Exam History Modal State for individual student
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // Submission Answer Editing State (used both in modal and history view)
  const [activeEditingSubId, setActiveEditingSubId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState<string>("");
  const [editingScoreVal, setEditingScoreVal] = useState<string>("");
  const [editingItemsList, setEditingItemsList] = useState<any[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // History Tab Filters
  const [historyStudentFilter, setHistoryStudentFilter] = useState<string>("all");
  const [historyAssignmentFilter, setHistoryAssignmentFilter] = useState<string>("all");

  // Filter assignments for chosen class
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.className === activeSelectedClass);
  }, [assignments, activeSelectedClass]);

  // Filter students for chosen class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === activeSelectedClass && 
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery))
    );
  }, [students, activeSelectedClass, searchQuery]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Exportable options list for multi-selection
  const exportOptions = useMemo(() => {
    const list: { id: string; label: string; category: "assignment" | "exam" | "result" }[] = [];
    classAssignments.forEach(a => {
      list.push({
        id: `assignment_${a.id}`,
        label: `Tugas: ${a.title}`,
        category: "assignment"
      });
    });
    list.push({ id: "pts", label: "Nilai PTS", category: "exam" });
    list.push({ id: "pas", label: "Nilai Ujian (PAS)", category: "exam" });
    list.push({ id: "sikap", label: "Nilai Sikap", category: "exam" });
    list.push({ id: "final_score", label: "Nilai Akhir", category: "result" });
    list.push({ id: "status", label: "Status Kelulusan", category: "result" });
    return list;
  }, [classAssignments]);

  const allOptionIds = useMemo(() => exportOptions.map(o => o.id), [exportOptions]);
  const isAllExportSelected = selectedExportColumns.includes("all") || (
    allOptionIds.length > 0 && allOptionIds.every(id => selectedExportColumns.includes(id))
  );

  const toggleExportColumn = (id: string) => {
    if (id === "all") {
      if (isAllExportSelected) {
        setSelectedExportColumns([]);
      } else {
        setSelectedExportColumns(["all"]);
      }
      return;
    }

    if (isAllExportSelected) {
      const newSelected = allOptionIds.filter(item => item !== id);
      setSelectedExportColumns(newSelected);
    } else {
      let newSelected: string[];
      if (selectedExportColumns.includes(id)) {
        newSelected = selectedExportColumns.filter(item => item !== id && item !== "all");
      } else {
        newSelected = [...selectedExportColumns.filter(item => item !== "all"), id];
        if (allOptionIds.length > 0 && allOptionIds.every(optId => newSelected.includes(optId))) {
          newSelected = ["all"];
        }
      }
      setSelectedExportColumns(newSelected);
    }
  };

  const selectAllAssignmentsOnly = () => {
    const assignmentIds = classAssignments.map(a => `assignment_${a.id}`);
    setSelectedExportColumns(assignmentIds);
  };

  const selectAllExamsOnly = () => {
    setSelectedExportColumns(["pts", "pas", "sikap"]);
  };

  const selectAllExport = () => {
    setSelectedExportColumns(["all"]);
  };

  const clearAllExport = () => {
    setSelectedExportColumns([]);
  };

  const getDropdownButtonLabel = () => {
    if (isAllExportSelected) {
      return "Semua Nilai (Lengkap)";
    }
    if (selectedExportColumns.length === 0) {
      return "Pilih Komponen Nilai...";
    }
    if (selectedExportColumns.length === 1) {
      const singleOpt = exportOptions.find(o => o.id === selectedExportColumns[0]);
      return singleOpt?.label || "1 Komponen Dipilih";
    }
    return `${selectedExportColumns.length} Komponen Dipilih`;
  };

  // Calculate stats for current class grades based on inputted values only or full formula
  const stats = useMemo(() => {
    // Evaluate calculated grade for each student in current class
    const studentGradesList = classStudents.map(student => {
      const gradeObj = grades.find(g => g.studentId === student.id);
      return calculateStudentScore(
        student,
        gradeObj,
        classAssignments,
        { assignment: assignmentWeight, midterm: midtermWeight, exam: examWeight, character: characterWeight },
        onlyCalculateInputted,
        treatZeroAsEmpty
      );
    });

    const scoredStudents = studentGradesList.filter(s => s.hasInputtedScores && s.finalScore !== null);

    if (scoredStudents.length === 0) {
      return { 
        average: 0, 
        highest: 0, 
        lowest: 0, 
        passingCount: 0, 
        passRate: 0,
        scoredStudentsCount: 0,
        totalStudentsCount: classStudents.length
      };
    }

    const totalScoreSum = scoredStudents.reduce((sum, s) => sum + (s.finalScore || 0), 0);
    const average = Math.round(totalScoreSum / scoredStudents.length);
    const passingCount = scoredStudents.filter(s => s.isPass).length;
    const passRate = Math.round((passingCount / scoredStudents.length) * 100);
    const highest = Math.max(...scoredStudents.map(s => s.finalScore || 0));
    const lowest = Math.min(...scoredStudents.map(s => s.finalScore || 0));

    return { 
      average, 
      highest, 
      lowest, 
      passingCount, 
      passRate,
      scoredStudentsCount: scoredStudents.length,
      totalStudentsCount: classStudents.length
    };
  }, [classStudents, grades, classAssignments, assignmentWeight, midtermWeight, examWeight, characterWeight, onlyCalculateInputted, treatZeroAsEmpty]);

  // Helper to start editing submission answers
  const startEditSubmission = (sub: Submission | null, defaultStudentId: string, defaultAssignmentId: string, defaultScore: number) => {
    const subId = sub?.id || `sub-${defaultStudentId}-${defaultAssignmentId}`;
    setActiveEditingSubId(subId);
    setEditingAnswerText(sub?.studentAnswer || "");
    setEditingScoreVal(sub?.score !== null && sub?.score !== undefined ? sub.score.toString() : defaultScore.toString());
    setEditingItemsList(sub?.aiAnalysis?.items ? JSON.parse(JSON.stringify(sub.aiAnalysis.items)) : []);
    setSaveSuccessMsg(null);
  };

  // Helper to save submission edits
  const handleSaveSubmission = (subId: string, studentId: string, assignmentId: string) => {
    const numScore = editingScoreVal !== "" ? Math.min(100, Math.max(0, parseFloat(editingScoreVal) || 0)) : undefined;
    
    if (onUpdateSubmission) {
      onUpdateSubmission(
        subId,
        editingAnswerText,
        numScore,
        editingItemsList.length > 0 ? editingItemsList : undefined,
        studentId,
        assignmentId
      );
    }

    setSaveSuccessMsg("Jawaban dan nilai berhasil diperbarui!");
    setTimeout(() => {
      setSaveSuccessMsg(null);
      setActiveEditingSubId(null);
    }, 1800);
  };

  // Handle cell edit trigger
  const triggerEdit = (studentId: string, type: string, currentValue: number | undefined | null) => {
    setEditingCell({ studentId, type });
    setEditValue(currentValue !== undefined && currentValue !== null && !isNaN(currentValue) ? currentValue.toString() : "");
  };

  // Handle saving cell edit
  const saveCellEdit = () => {
    if (!editingCell) return;
    const valueNum = editValue.trim() === "" ? 0 : Math.min(100, Math.max(0, parseFloat(editValue) || 0));
    onUpdateGradeCell(editingCell.studentId, editingCell.type as any, valueNum);
    
    // Feedback: Inform user of sync with Kelola Tugas
    const targetAssignment = classAssignments.find(a => a.id === editingCell.type);
    const targetStudent = classStudents.find(s => s.id === editingCell.studentId);
    let taskName = targetAssignment?.title;
    if (editingCell.type === "midterm") taskName = "Sumatif Tengah Semester (STS / PTS)";
    if (editingCell.type === "exam") taskName = "Sumatif Akhir Semester (SAS / PAS)";
    if (editingCell.type === "character") taskName = "Penilaian Sikap";

    if (taskName) {
      setSyncNotice(`Nilai ${targetStudent?.name || "siswa"} (${valueNum}) tersimpan & otomatis tersinkronisasi ke Menu Kelola Tugas ("${taskName}")!`);
      setTimeout(() => setSyncNotice(""), 4500);
    }
    
    setEditingCell(null);
  };

  // Mengisikan nilai 0 secara massal untuk seluruh tugas yang belum masuk di kelas aktif
  const handleFillZeroForMissingAssignments = () => {
    if (classAssignments.length === 0) {
      setSyncNotice("Belum ada tugas yang dibuat untuk kelas ini.");
      setTimeout(() => setSyncNotice(""), 3000);
      return;
    }

    let count = 0;
    classStudents.forEach(student => {
      const gradeObj = grades.find(g => g.studentId === student.id);
      classAssignments.forEach(a => {
        const raw = gradeObj?.assignmentScores?.[a.id];
        if (raw === undefined || raw === null || isNaN(raw)) {
          onUpdateGradeCell(student.id, a.id as any, 0);
          count++;
        }
      });
    });

    if (count > 0) {
      setSyncNotice(`Berhasil mengisikan nilai 0 untuk ${count} tugas siswa yang belum masuk di kelas ${activeSelectedClass}!`);
    } else {
      setSyncNotice(`Seluruh tugas siswa di kelas ${activeSelectedClass} sudah terisi nilai.`);
    }
    setTimeout(() => setSyncNotice(""), 4500);
  };

  // Export Logic
  const getExportData = () => {
    const isAll = isAllExportSelected;
    const activeCols = isAll ? allOptionIds : selectedExportColumns;

    return classStudents.map(student => {
      let gradeObj = grades.find(g => g.studentId === student.id);
      if (!gradeObj) {
        gradeObj = {
          studentId: student.id,
          studentName: student.name,
          className: selectedClass,
          assignmentScores: {},
          examScore: 0,
          midtermScore: 0,
          characterScore: 0
        };
      }

      const scoreResult = calculateStudentScore(
        student,
        gradeObj,
        classAssignments,
        { assignment: assignmentWeight, midterm: midtermWeight, exam: examWeight, character: characterWeight },
        onlyCalculateInputted,
        treatZeroAsEmpty
      );

      const record: any = {
        NIS: student.nis,
        Nama: student.name,
      };

      // Assignments
      classAssignments.forEach(a => {
        const aKey = `assignment_${a.id}`;
        if (isAll || activeCols.includes(aKey)) {
          const raw = gradeObj!.assignmentScores[a.id];
          // Aturan: Jika tugas belum masuk isikan dengan nilai 0
          record[a.title] = raw !== undefined && raw !== null ? raw : 0;
        }
      });

      // Exams & Attitude
      if (isAll || activeCols.includes("pts")) {
        record["Nilai PTS"] = gradeObj.midtermScore !== undefined && gradeObj.midtermScore > 0 ? gradeObj.midtermScore : (treatZeroAsEmpty ? "-" : 0);
      }
      if (isAll || activeCols.includes("pas")) {
        record["Nilai Ujian (PAS)"] = gradeObj.examScore !== undefined && gradeObj.examScore > 0 ? gradeObj.examScore : (treatZeroAsEmpty ? "-" : 0);
      }
      if (isAll || activeCols.includes("sikap")) {
        record["Nilai Sikap"] = gradeObj.characterScore !== undefined && gradeObj.characterScore > 0 ? gradeObj.characterScore : (treatZeroAsEmpty ? "-" : 0);
      }
      if (isAll || activeCols.includes("final_score")) {
        record["Nilai Akhir"] = scoreResult.finalScore !== null ? scoreResult.finalScore : "-";
      }
      if (isAll || activeCols.includes("status")) {
        record["Status"] = scoreResult.finalScore !== null ? (scoreResult.isPass ? "Lulus" : "Remedial") : "Belum Dinilai";
      }

      return record;
    });
  };

  const exportColumns = useMemo(() => {
    const cols = ["NIS", "Nama"];
    const isAll = isAllExportSelected;
    const activeCols = isAll ? allOptionIds : selectedExportColumns;

    classAssignments.forEach(a => {
      const aKey = `assignment_${a.id}`;
      if (isAll || activeCols.includes(aKey)) {
        cols.push(a.title);
      }
    });

    if (isAll || activeCols.includes("pts")) cols.push("Nilai PTS");
    if (isAll || activeCols.includes("pas")) cols.push("Nilai Ujian (PAS)");
    if (isAll || activeCols.includes("sikap")) cols.push("Nilai Sikap");
    if (isAll || activeCols.includes("final_score")) cols.push("Nilai Akhir");
    if (isAll || activeCols.includes("status")) cols.push("Status");

    return cols;
  }, [isAllExportSelected, allOptionIds, selectedExportColumns, classAssignments]);

  const handleExport = (type: "xlsx" | "pdf" | "print", includeSignatures: boolean = true) => {
    const data = getExportData();
    if (type === "xlsx") {
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Daftar Nilai");
      writeFile(workbook, `Daftar_Nilai_${activeSelectedClass}.xlsx`);
    } else if (type === "pdf") {
      try {
        const jsPDFConstructor = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;
        const doc = new jsPDFConstructor({ orientation: "landscape", unit: "mm", format: "a4" });
        const tableFn = typeof autoTable === 'function' ? autoTable : (autoTable as any).default;

        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(`DAFTAR NILAI DAN ASESMEN PESERTA DIDIK - ${activeSelectedClass}`, 14, 15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Mata Pelajaran: ${subject || "Umum"} | Tahun Ajaran: ${academicYear} | Tanggal Cetak: ${dateStr}`, 14, 21);
        doc.text(`Guru Pengampu: ${teacherName} (NIP. ${nip || "-"})`, 14, 26);

        const activeCols = exportColumns.filter(c => c !== "NIS" && c !== "Nama");
        const head = [["No", "NIS", "Nama Peserta Didik", ...activeCols]];
        const body = data.map((row, idx) => [
          idx + 1,
          row.NIS || "-",
          row.Nama || "-",
          ...activeCols.map(c => row[c] !== undefined ? row[c] : "-")
        ]);

        if (typeof tableFn === 'function') {
          tableFn(doc, {
            head: head,
            body: body,
            startY: 32,
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

        if (includeSignatures) {
          let lastY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 140;
          if (lastY > 165) {
            doc.addPage();
            lastY = 20;
          }

          const tteConfig = getStoredTteConfig();

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          
          doc.text("Mengetahui,", 30, lastY);
          doc.text("Kepala Sekolah", 30, lastY + 5);
          if (tteConfig.usePrincipalTte && tteConfig.principalTteImage) {
            embedTteInJsPdf(doc, tteConfig.principalTteImage, 30, lastY + 7, 30, 14);
          }
          doc.setFont("helvetica", "bold");
          doc.text(headmasterName || "( ................................................. )", 30, lastY + 24);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${headmasterNip || "-"}`, 30, lastY + 29);

          doc.text(`${documentCity}, ${dateStr}`, 200, lastY);
          doc.text("Guru Mata Pelajaran", 200, lastY + 5);
          if (tteConfig.useTeacherTte && tteConfig.teacherTteImage) {
            embedTteInJsPdf(doc, tteConfig.teacherTteImage, 200, lastY + 7, 30, 14);
          }
          doc.setFont("helvetica", "bold");
          doc.text(teacherName || "( ................................................. )", 200, lastY + 24);
          doc.setFont("helvetica", "normal");
          doc.text(`NIP. ${nip || "-"}`, 200, lastY + 29);
        }

        doc.save(`Daftar_Nilai_${activeSelectedClass}.pdf`);
      } catch (err) {
        console.error("PDF generation error:", err);
      }
    } else {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Gagal membuka jendela cetak. Izinkan pop-up di peramban Anda.");
        setIsPreviewOpen(false);
        return;
      }

      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const tteConfig = getStoredTteConfig();
      const headmasterTteSnippet = tteConfig.usePrincipalTte ? renderTteImageHtml(tteConfig.principalTteImage, "TTE Kepala Sekolah", 48, 120) : "";
      const teacherTteSnippet = tteConfig.useTeacherTte ? renderTteImageHtml(tteConfig.teacherTteImage, "TTE Guru", 48, 120) : "";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Daftar Nilai - ${activeSelectedClass} (${subject})</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
            .header h3 { margin: 4px 0 0 0; font-size: 14px; font-weight: 700; }
            .header p { margin: 2px 0 0 0; font-size: 11px; color: #475569; }
            .meta-box { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 15px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center; page-break-inside: avoid; }
            .sig-box { margin-top: 55px; font-weight: bold; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${renderKopHeaderHtml({
            documentTitle: "LEMBAR DAFTAR NILAI DAN ASESMEN PESERTA DIDIK",
            subtitle: `Mata Pelajaran: <strong>${subject}</strong> • NPSN: ${schoolNpsn || '-'} • Tahun Ajaran: ${academicYear}`,
            customConfig: {
              institution,
              schoolNpsn,
              academicYear,
              subject
            }
          })}

          <div class="meta-box">
            <div><strong>Kelas:</strong> ${activeSelectedClass}</div>
            <div><strong>Guru Pengampu:</strong> ${teacherName} (NIP. ${nip || '-'})</div>
            <div><strong>Tanggal Cetak:</strong> ${dateStr}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="4%">No</th>
                <th width="14%">NIS</th>
                <th width="28%">Nama Peserta Didik</th>
                ${exportColumns.filter(c => c !== "NIS" && c !== "Nama").map(c => `<th>${c}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map((row, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td>${row.NIS || '-'}</td>
                  <td><strong>${row.Nama || '-'}</strong></td>
                  ${exportColumns.filter(c => c !== "NIS" && c !== "Nama").map(c => {
                    const val = row[c] !== undefined ? row[c] : '-';
                    return `<td class="text-center font-semibold">${val}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${includeSignatures ? `
          <div class="signatures">
            <div>
              <p>Mengetahui,<br>Kepala Sekolah</p>
              ${headmasterTteSnippet ? headmasterTteSnippet : ''}
              <div class="sig-box" style="${headmasterTteSnippet ? 'margin-top: 0;' : ''}">
                ${headmasterName || '( ................................................. )'}
                <br><span style="font-weight: normal; font-size: 10px;">NIP. ${headmasterNip || '-'}</span>
                ${headmasterRank ? `<br><span style="font-weight: normal; font-size: 9px; color: #475569;">${headmasterRank}</span>` : ''}
              </div>
            </div>
            <div>
              <p>${documentCity}, ${dateStr}<br>Guru Mata Pelajaran</p>
              ${teacherTteSnippet ? teacherTteSnippet : ''}
              <div class="sig-box" style="${teacherTteSnippet ? 'margin-top: 0;' : ''}">
                ${teacherName}
                <br><span style="font-weight: normal; font-size: 10px;">NIP. ${nip || '-'}</span>
              </div>
            </div>
          </div>
          ` : ''}
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    }
    setIsPreviewOpen(false);
  };

  const initiateExport = () => {
    if (!isAllExportSelected && selectedExportColumns.length === 0) {
      setSyncNotice("Pilih minimal 1 komponen nilai untuk diekspor.");
      setTimeout(() => setSyncNotice(""), 3500);
      setIsExportDropdownOpen(true);
      return;
    }
    setPreviewData(getExportData());
    setIsPreviewOpen(true);
  };

  // Submissions filtered for history tab
  const filteredSubmissionsForHistoryTab = useMemo(() => {
    return submissions.filter(sub => {
      const student = students.find(s => s.id === sub.studentId);
      if (!student || student.className !== activeSelectedClass) return false;

      if (historyStudentFilter !== "all" && sub.studentId !== historyStudentFilter) return false;
      if (historyAssignmentFilter !== "all" && sub.assignmentId !== historyAssignmentFilter) return false;

      if (searchQuery) {
        const matchStudent = sub.studentName.toLowerCase().includes(searchQuery.toLowerCase());
        const assignObj = assignments.find(a => a.id === sub.assignmentId);
        const matchAssign = assignObj?.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchStudent || matchAssign;
      }
      return true;
    });
  }, [submissions, students, activeSelectedClass, historyStudentFilter, historyAssignmentFilter, searchQuery, assignments]);

  return (
    <div className="space-y-6" id="daftar-nilai-section">
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleExport}
        data={previewData}
        title={`Daftar Nilai - ${activeSelectedClass}`}
        columns={exportColumns}
      />

      {/* Modal Ekspor Siswa Belum Ulangan / Belum Ada Nilai Tugas */}
      <ExportPendingTasksModal
        isOpen={isPendingExportModalOpen}
        onClose={() => setIsPendingExportModalOpen(false)}
        students={students}
        assignments={assignments}
        submissions={submissions}
        grades={grades}
        initialClass={activeSelectedClass}
        classList={availableClasses}
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

      {/* Configuration & Filter Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4" id="nilai-header-bar">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Class Selectors */}
            <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => handleSelectClass(cls)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeSelectedClass === cls 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  id={`nilai-btn-select-class-${cls}`}
                >
                  {cls}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau tugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-700"
                id="nilai-search-input"
              />
            </div>

            {/* Weight Configuration */}
            <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-1.5 rounded-xl border border-indigo-100 overflow-x-auto">
               <div className="flex items-center gap-1.5">
                 <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Tugas</span>
                 <input 
                   type="number" min="0" max="100"
                   value={assignmentWeight}
                   onChange={(e) => setAssignmentWeight(Number(e.target.value))}
                   className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
                 />
               </div>
               <div className="flex items-center gap-1.5">
                 <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">PTS</span>
                 <input 
                   type="number" min="0" max="100"
                   value={midtermWeight}
                   onChange={(e) => setMidtermWeight(Number(e.target.value))}
                   className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
                 />
               </div>
               <div className="flex items-center gap-1.5">
                 <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">PAS</span>
                 <input 
                   type="number" min="0" max="100"
                   value={examWeight}
                   onChange={(e) => setExamWeight(Number(e.target.value))}
                   className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
                 />
               </div>
               <div className="flex items-center gap-1.5">
                 <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Sikap</span>
                 <input 
                   type="number" min="0" max="100"
                   value={characterWeight}
                   onChange={(e) => setCharacterWeight(Number(e.target.value))}
                   className="w-12 px-1.5 py-0.5 rounded-md text-xs font-bold text-center border border-indigo-200 focus:outline-none focus:border-indigo-500"
                 />
               </div>
               <div className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                 Total: {totalWeight}%
               </div>
            </div>
          </div>

          {/* Export Action & Navigation */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end items-center">
            {onNavigateToAssignments && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigateToAssignments(activeSelectedClass)}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                id="btn-goto-kelola-tugas"
                title="Buka menu Kelola Tugas & Ulangan untuk kelas ini"
              >
                <Clipboard size={14} className="text-indigo-600" />
                <span>Kelola Tugas & Ulangan</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsRestoreModalOpen(true)}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              id="btn-restore-grades"
              title="Cadangkan atau Pulihkan Nilai & Tugas"
            >
              <RotateCcw size={14} className="text-indigo-600" />
              <span>Cadangkan / Pulihkan</span>
            </motion.button>

            {/* Tombol Ekspor Belum Ulangan / Tugas */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsPendingExportModalOpen(true)}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              id="btn-export-pending-grades"
              title="Ekspor daftar siswa yang belum ulangan atau belum menyampaikan tugas/belum mendapat nilai (Excel/PDF)"
            >
              <AlertCircle size={14} className="text-amber-600" />
              <span>Rekap Belum Ulangan / Tugas</span>
            </motion.button>

            {/* Tombol Isi Nilai 0 Tugas Belum Masuk */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleFillZeroForMissingAssignments}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/80 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              id="btn-fill-zero-missing-assignments"
              title="Isikan nilai 0 secara massal untuk semua tugas siswa yang belum masuk di kelas ini"
            >
              <CheckSquare size={14} className="text-rose-600" />
              <span>Isi 0 Tugas Belum Masuk</span>
            </motion.button>

            {/* Multi-Select Dropdown Komponen Ekspor */}
            <div className="relative" ref={exportDropdownRef} id="export-column-multiselect-container">
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 flex items-center justify-between gap-2 min-w-[200px] max-w-[280px] cursor-pointer shadow-2xs transition-colors"
                id="btn-export-column-selector"
                title="Pilih satu atau lebih komponen nilai untuk diekspor"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal size={13} className="text-indigo-600 shrink-0" />
                  <span className="truncate">{getDropdownButtonLabel()}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isAllExportSelected && selectedExportColumns.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                      {selectedExportColumns.length}
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExportDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Dropdown Menu Panel */}
              <AnimatePresence>
                {isExportDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-[330px] sm:w-[360px] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[420px]"
                    id="export-column-dropdown-panel"
                  >
                    {/* Header */}
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-800 block">Pilih Komponen Nilai</span>
                        <span className="text-[10px] text-slate-500 font-medium">Bisa pilih lebih dari satu komponen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={selectAllExport}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                            isAllExportSelected ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={clearAllExport}
                          className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Quick presets buttons */}
                    <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 text-[11px] overflow-x-auto">
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Pintasan:</span>
                      <button
                        type="button"
                        onClick={selectAllAssignmentsOnly}
                        className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-md text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                      >
                        Hanya Tugas ({classAssignments.length})
                      </button>
                      <button
                        type="button"
                        onClick={selectAllExamsOnly}
                        className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-md text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                      >
                        Hanya Ulangan & Sikap
                      </button>
                    </div>

                    {/* Special Rekap Siswa Belum Ulangan Link */}
                    <div className="p-2 border-b border-slate-100 bg-amber-50/60">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDropdownOpen(false);
                          setIsPendingExportModalOpen(true);
                        }}
                        className="w-full px-2.5 py-1.5 bg-amber-100/70 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-black flex items-center justify-between cursor-pointer transition-colors text-left"
                        id="dropdown-open-pending-recap"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span className="truncate">Rekap Siswa Belum Ulangan / Tugas</span>
                        </div>
                        <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono shrink-0">PDF/Excel</span>
                      </button>
                    </div>

                    {/* Scrollable list of checkboxes */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
                      {/* Opsi Semua Nilai */}
                      <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50/60 cursor-pointer transition-colors border border-transparent hover:border-indigo-100 select-none">
                        <input
                          type="checkbox"
                          checked={isAllExportSelected}
                          onChange={() => toggleExportColumn("all")}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-black text-slate-800 block">Semua Nilai (Lengkap)</span>
                          <span className="text-[10px] text-slate-400">Ekspor seluruh tugas, PTS, PAS, sikap, dan nilai akhir</span>
                        </div>
                      </label>

                      {/* Kelompok Tugas */}
                      {classAssignments.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-2 pt-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              Tugas & Aktivitas ({classAssignments.length})
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {classAssignments.map(a => {
                              const optId = `assignment_${a.id}`;
                              const isChecked = isAllExportSelected || selectedExportColumns.includes(optId);
                              return (
                                <label
                                  key={a.id}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors select-none ${
                                    isChecked ? "bg-indigo-50/40 text-slate-900 font-semibold" : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleExportColumn(optId)}
                                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span className="text-xs truncate flex-1" title={a.title}>
                                    Tugas: {a.title}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Kelompok Ulangan & Sikap */}
                      <div className="space-y-1">
                        <div className="px-2 pt-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Penilaian Ulangan & Sikap
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {[
                            { id: "pts", label: "Nilai PTS (STS)" },
                            { id: "pas", label: "Nilai Ujian (PAS / SAS)" },
                            { id: "sikap", label: "Nilai Sikap" },
                          ].map(opt => {
                            const isChecked = isAllExportSelected || selectedExportColumns.includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors select-none ${
                                  isChecked ? "bg-indigo-50/40 text-slate-900 font-semibold" : "hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleExportColumn(opt.id)}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="text-xs flex-1">
                                  {opt.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kelompok Hasil Akhir */}
                      <div className="space-y-1">
                        <div className="px-2 pt-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Hasil Akhir & Status
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {[
                            { id: "final_score", label: "Nilai Akhir" },
                            { id: "status", label: "Status Kelulusan (Lulus/Remedial)" },
                          ].map(opt => {
                            const isChecked = isAllExportSelected || selectedExportColumns.includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors select-none ${
                                  isChecked ? "bg-indigo-50/40 text-slate-900 font-semibold" : "hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleExportColumn(opt.id)}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="text-xs flex-1">
                                  {opt.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        {isAllExportSelected ? "Semua kolom aktif" : `${selectedExportColumns.length} kolom dipilih`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsExportDropdownOpen(false)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        Selesai
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={initiateExport}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              id="btn-export-grades-csv"
            >
              <Download size={14} /> Ekspor Nilai (Preview)
            </motion.button>
          </div>
        </div>

        {/* Sync Notice Alert */}
        <AnimatePresence>
          {syncNotice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 font-bold shadow-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{syncNotice}</span>
              </div>
              <div className="flex items-center gap-2">
                {onNavigateToAssignments && (
                  <button
                    onClick={() => onNavigateToAssignments(activeSelectedClass)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Lihat di Kelola Tugas</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                )}
                <button 
                  onClick={() => setSyncNotice("")} 
                  className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary View Mode Switcher Tab */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveTabMode("matrix")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "matrix"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            id="tab-btn-matrix"
          >
            <FileSpreadsheet size={15} />
            <span>Buku Nilai Utama (Spreadsheet)</span>
          </button>

          <button
            onClick={() => setActiveTabMode("cards")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "cards"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            id="tab-btn-cards"
          >
            <LayoutGrid size={15} />
            <span>Kartu Ringkas Nilai (Mode HP)</span>
          </button>

          <button
            onClick={() => setActiveTabMode("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "history"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            id="tab-btn-history"
          >
            <History size={15} />
            <span>Riwayat Ujian & Edit Jawaban</span>
            {submissions.filter(s => {
              const st = students.find(std => std.id === s.studentId);
              return st?.className === activeSelectedClass;
            }).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-500 text-white font-mono">
                {submissions.filter(s => {
                  const st = students.find(std => std.id === s.studentId);
                  return st?.className === activeSelectedClass;
                }).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Calculation Mode Bar */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs" id="calc-mode-bar">
        <div className="flex items-center gap-2.5 text-indigo-950 font-medium">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0">
            <Info size={15} />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">
              {onlyCalculateInputted 
                ? "Mode Aktif: Variabel & Rata-rata Hanya dari Nilai yang Terinput" 
                : "Mode Standar: Menghitung Seluruh Komponen (Nilai Kosong Dianggap 0)"}
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              {onlyCalculateInputted
                ? "Komponen nilai kosong & ulangan yang belum diadakan dikecualikan dari pembagi rata-rata, persentase kelulusan, nilai tertinggi & terendah."
                : "Semua bobot komponen dihitung secara statis (nilai belum ada dianggap 0)."}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-slate-700 hover:bg-indigo-50/50 transition-colors">
            <input
              type="checkbox"
              checked={onlyCalculateInputted}
              onChange={(e) => setOnlyCalculateInputted(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              id="checkbox-only-inputted"
            />
            <span className="font-bold text-xs">Hanya Nilai Terinput</span>
          </label>

          {onlyCalculateInputted && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-slate-700 hover:bg-indigo-50/50 transition-colors">
              <input
                type="checkbox"
                checked={treatZeroAsEmpty}
                onChange={(e) => setTreatZeroAsEmpty(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                id="checkbox-treat-zero-empty"
              />
              <span className="font-bold text-xs">Abaikan Nilai 0 (Belum Ujian)</span>
            </label>
          )}
        </div>
      </div>

      {/* Class Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="nilai-stats-row">
        {[
          { 
            label: "Rata-rata Kelas", 
            value: stats.average, 
            desc: stats.scoredStudentsCount > 0 
              ? `KKM: 75 • Dari ${stats.scoredStudentsCount} siswa terinput` 
              : "Belum ada nilai terinput", 
            color: "text-indigo-600", 
            bg: "bg-indigo-50 border-indigo-100", 
            icon: TrendingUp 
          },
          { 
            label: "Kelulusan Kelas", 
            value: `${stats.passRate}%`, 
            desc: stats.scoredStudentsCount > 0 
              ? `${stats.passingCount} dari ${stats.scoredStudentsCount} siswa dinilai lulus` 
              : "0 siswa lulus", 
            color: "text-violet-600", 
            bg: "bg-violet-50 border-violet-100", 
            icon: Percent 
          },
          { 
            label: "Nilai Tertinggi", 
            value: stats.highest, 
            desc: stats.scoredStudentsCount > 0 ? "Prestasi puncak (terinput)" : "Belum ada nilai", 
            color: "text-amber-600", 
            bg: "bg-amber-50 border-amber-100", 
            icon: Award 
          },
          { 
            label: "Nilai Terendah", 
            value: stats.lowest, 
            desc: stats.scoredStudentsCount > 0 ? "Perlu bimbingan (terinput)" : "Belum ada nilai", 
            color: "text-rose-600", 
            bg: "bg-rose-50 border-rose-100", 
            icon: TrendingDown 
          }
        ].map((st, idx) => (
          <motion.div
            key={st.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 rounded-2xl border ${st.bg} flex justify-between items-center`}
            id={`nilai-stat-card-${idx}`}
          >
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{st.label}</span>
              <span className={`text-2xl font-black font-display ${st.color}`}>{st.value}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">{st.desc}</span>
            </div>
            <div className={`p-2.5 rounded-xl bg-white/80 shadow-xs ${st.color}`}>
              <st.icon size={18} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* VIEW 1: SPREADSHEET MATRIX VIEW */}
      {activeTabMode === "matrix" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="grade-spreadsheet-card">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600" size={18} />
              <h3 className="text-sm font-bold text-slate-800 font-display">Buku Nilai Utama Kelas {selectedClass}</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold bg-white px-2.5 py-1 border border-slate-200/80 rounded-lg shadow-2xs">
              <Clock size={11} className="text-indigo-500" /> Click / Ketuk sel untuk edit langsung
            </div>
          </div>

          {/* Mobile Scroll Notification Banner */}
          <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-900 sm:hidden">
            <div className="flex items-center gap-1.5 font-bold">
              <Smartphone size={14} className="text-indigo-600 shrink-0" />
              <span>Geser tabel ke kanan <span className="font-mono text-indigo-700">← →</span> untuk melihat & edit nilai</span>
            </div>
            <button 
              onClick={() => setActiveTabMode("cards")}
              className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-lg shadow-2xs hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0 ml-2"
            >
              <LayoutGrid size={11} />
              <span>Kartu HP</span>
            </button>
          </div>

          {/* Spreadsheet Responsive Wrapper */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600" id="gradebook-table">
              <thead className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-1.5 sm:px-4 w-[36px] sm:w-[50px] min-w-[36px] sm:min-w-[50px] max-w-[36px] sm:max-w-[50px] sticky left-0 z-20 bg-slate-50 border-r border-slate-100 text-center">No</th>
                  <th className="py-3 px-2 sm:px-4 w-[115px] sm:w-[220px] min-w-[115px] sm:min-w-[220px] max-w-[115px] sm:max-w-[220px] sticky left-[36px] sm:left-[50px] z-20 bg-slate-50 border-r border-slate-100 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] sm:shadow-none truncate">Nama Siswa</th>
                  <th className="py-3 px-2 sm:px-4 w-[90px] sm:w-[110px] min-w-[90px] sm:min-w-[110px] max-w-[90px] sm:max-w-[110px] static sm:sticky sm:left-[270px] z-10 sm:z-20 bg-slate-50 border-r border-slate-100 sm:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)]">NIS</th>
                  {classAssignments.map(a => (
                    <th 
                      key={a.id} 
                      className="py-3 px-3 min-w-[110px] text-center group cursor-pointer hover:bg-indigo-50/60 transition-colors" 
                      title={`${a.title} (${a.category || 'Tugas'}) - Klik untuk buka di Kelola Tugas`}
                      onClick={() => onNavigateToAssignments && onNavigateToAssignments(activeSelectedClass)}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="truncate max-w-[115px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{a.title}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {a.category || "Tugas"}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 min-w-[90px] text-center">PTS</th>
                  <th className="py-3 px-4 min-w-[90px] text-center">PAS (Ujian)</th>
                  <th className="py-3 px-4 min-w-[90px] text-center">Sikap</th>
                  <th className="py-3 px-4 min-w-[110px] text-center font-bold text-slate-800 bg-slate-100/40">Nilai Akhir</th>
                  <th className="py-3 px-4 min-w-[85px] text-center">Status</th>
                  <th className="py-3 px-4 min-w-[130px] text-center">Riwayat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((student, sIdx) => {
                  let gradeObj = grades.find(g => g.studentId === student.id);
                  if (!gradeObj) {
                    gradeObj = {
                      studentId: student.id,
                      studentName: student.name,
                      className: selectedClass,
                      assignmentScores: {},
                      examScore: 0,
                      midtermScore: 0,
                      characterScore: 0
                    };
                  }

                  const scoreResult = calculateStudentScore(
                    student,
                    gradeObj,
                    classAssignments,
                    { assignment: assignmentWeight, midterm: midtermWeight, exam: examWeight, character: characterWeight },
                    onlyCalculateInputted,
                    treatZeroAsEmpty
                  );

                  const studentSubmissionsCount = submissions.filter(s => s.studentId === student.id).length;

                  return (
                    <tr key={`${student.id}_${sIdx}`} className="hover:bg-slate-50/50 transition-colors group" id={`gradebook-row-${student.id}`}>
                      <td className="py-3 px-1.5 sm:px-4 w-[36px] sm:w-[50px] min-w-[36px] sm:min-w-[50px] max-w-[36px] sm:max-w-[50px] font-semibold text-slate-400 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100 text-center text-[10px] sm:text-xs">{sIdx + 1}</td>
                      <td className="py-3 px-2 sm:px-4 w-[115px] sm:w-[220px] min-w-[115px] sm:min-w-[220px] max-w-[115px] sm:max-w-[220px] font-bold text-slate-800 sticky left-[36px] sm:left-[50px] z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)] sm:shadow-none truncate text-xs cursor-pointer" title={student.name}>{student.name}</td>
                      <td className="py-3 px-2 sm:px-4 w-[90px] sm:w-[110px] min-w-[90px] sm:min-w-[110px] max-w-[90px] sm:max-w-[110px] text-slate-400 font-mono text-[10px] sm:text-[11px] static sm:sticky sm:left-[270px] z-0 sm:z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-100 sm:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)]">{student.nis}</td>
                      
                      {/* Assignment cells */}
                      {classAssignments.map(a => {
                        const rawScore = gradeObj!.assignmentScores[a.id];
                        const hasScore = rawScore !== undefined && rawScore !== null;
                        // Aturan: Jika tugas belum masuk isikan dengan nilai 0
                        const effectiveScore = hasScore ? rawScore : 0;
                        const isEditing = editingCell?.studentId === student.id && editingCell?.type === a.id;
                        
                        return (
                          <td 
                            key={a.id} 
                            className="py-3 px-3 text-center cursor-pointer relative group/cell hover:bg-indigo-50/50 transition-colors"
                            onClick={() => triggerEdit(student.id, a.id, effectiveScore)}
                            onDoubleClick={() => triggerEdit(student.id, a.id, effectiveScore)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                                className="w-14 bg-white border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-bold text-slate-800 focus:outline-none text-center shadow-sm"
                                autoFocus
                                id={`cell-input-${student.id}-${a.id}`}
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-xs ${
                                  hasScore 
                                    ? (rawScore === 0 ? "font-bold text-rose-600" : "font-semibold text-slate-700") 
                                    : "font-bold text-rose-500 bg-rose-50/80 px-1.5 py-0.5 rounded shadow-2xs"
                                }`} title={!hasScore ? "Tugas belum masuk (nilai 0)" : `Nilai: ${rawScore}`}>
                                  {effectiveScore}
                                </span>
                                <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Midterm (PTS) cell */}
                      {(() => {
                        const rawMidterm = gradeObj?.midtermScore;
                        const hasMidterm = rawMidterm !== undefined && rawMidterm !== null && (!treatZeroAsEmpty || rawMidterm > 0);
                        const displayMidterm = hasMidterm ? rawMidterm : "-";
                        return (
                          <td 
                            className="py-3 px-3 text-center cursor-pointer relative group/cell hover:bg-indigo-50/50 transition-colors"
                            onClick={() => triggerEdit(student.id, "midterm", hasMidterm ? rawMidterm : undefined)}
                            onDoubleClick={() => triggerEdit(student.id, "midterm", hasMidterm ? rawMidterm : undefined)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.type === "midterm" ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                                className="w-14 bg-white border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-bold text-slate-800 focus:outline-none text-center shadow-sm"
                                autoFocus
                                id={`cell-input-${student.id}-midterm`}
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-semibold ${displayMidterm !== "-" ? "text-slate-700" : "text-slate-300 font-normal"}`}>{displayMidterm}</span>
                                <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* Exam cell */}
                      {(() => {
                        const rawExam = gradeObj?.examScore;
                        const hasExam = rawExam !== undefined && rawExam !== null && (!treatZeroAsEmpty || rawExam > 0);
                        const displayExam = hasExam ? rawExam : "-";
                        return (
                          <td 
                            className="py-3 px-3 text-center cursor-pointer relative group/cell hover:bg-indigo-50/50 transition-colors"
                            onClick={() => triggerEdit(student.id, "exam", hasExam ? rawExam : undefined)}
                            onDoubleClick={() => triggerEdit(student.id, "exam", hasExam ? rawExam : undefined)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.type === "exam" ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                                className="w-14 bg-white border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-bold text-slate-800 focus:outline-none text-center shadow-sm"
                                autoFocus
                                id={`cell-input-${student.id}-exam`}
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-semibold ${displayExam !== "-" ? "text-slate-700" : "text-slate-300 font-normal"}`}>{displayExam}</span>
                                <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* Character (Sikap) cell */}
                      {(() => {
                        const rawChar = gradeObj?.characterScore;
                        const hasChar = rawChar !== undefined && rawChar !== null && (!treatZeroAsEmpty || rawChar > 0);
                        const displayChar = hasChar ? rawChar : "-";
                        return (
                          <td 
                            className="py-3 px-3 text-center cursor-pointer relative group/cell hover:bg-indigo-50/50 transition-colors"
                            onClick={() => triggerEdit(student.id, "character", hasChar ? rawChar : undefined)}
                            onDoubleClick={() => triggerEdit(student.id, "character", hasChar ? rawChar : undefined)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.type === "character" ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                                className="w-14 bg-white border-2 border-indigo-500 rounded-lg px-1 py-0.5 font-bold text-slate-800 focus:outline-none text-center shadow-sm"
                                autoFocus
                                id={`cell-input-${student.id}-character`}
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-semibold ${displayChar !== "-" ? "text-slate-700" : "text-slate-300 font-normal"}`}>{displayChar}</span>
                                <Edit size={10} className="text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* Final grade display */}
                      <td className="py-3 px-4 text-center font-black text-sm text-slate-800 bg-slate-100/10" title={scoreResult.componentsSummary}>
                        {scoreResult.finalScore !== null ? (
                          <div className="flex flex-col items-center">
                            <span>{scoreResult.finalScore}</span>
                            {onlyCalculateInputted && scoreResult.activeWeightSum < 100 && (
                              <span className="text-[9px] font-normal text-indigo-600">
                                (bobot {scoreResult.activeWeightSum}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 text-center">
                        {scoreResult.finalScore !== null ? (
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                            scoreResult.isPass 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {scoreResult.isPass ? "Lulus" : "Remedial"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-medium rounded-full bg-slate-100 text-slate-400">
                            Belum Dinilai
                          </span>
                        )}
                      </td>

                      {/* Action to view history / edit answer */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedStudentForHistory(student)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                          title="Lihat riwayat lembar ujian dan edit jawaban siswa"
                        >
                          <History size={12} />
                          <span>Riwayat ({studentSubmissionsCount})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty records notice */}
          {classStudents.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Tidak ada data siswa terpilih.
            </div>
          )}

          {/* Spreadsheet footer informational */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle size={14} className="text-indigo-600" />
            <span>Rumus kelulusan: Rata-rata Tugas ({assignmentWeight}%) + PTS ({midtermWeight}%) + PAS ({examWeight}%) + Sikap ({characterWeight}%) ≥ 75. Perubahan data nilai atau edit jawaban langsung tersimpan otomatis.</span>
          </div>
        </div>
      )}

      {/* VIEW 2: MOBILE FRIENDLY STUDENT CARDS VIEW */}
      {activeTabMode === "cards" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Cari nama siswa atau NIS..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {cardSearchQuery && (
                <button 
                  onClick={() => setCardSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium px-1">
              Menampilkan <strong>{classStudents.filter(s => s.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) || s.nis.includes(cardSearchQuery)).length}</strong> siswa
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classStudents
              .filter(s => s.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) || s.nis.includes(cardSearchQuery))
              .map((student, idx) => {
                let gradeObj = grades.find(g => g.studentId === student.id);
                if (!gradeObj) {
                  gradeObj = {
                    studentId: student.id,
                    studentName: student.name,
                    className: selectedClass,
                    assignmentScores: {},
                    examScore: 0,
                    midtermScore: 0,
                    characterScore: 0
                  };
                }

                const scoreResult = calculateStudentScore(
                  student,
                  gradeObj,
                  classAssignments,
                  { assignment: assignmentWeight, midterm: midtermWeight, exam: examWeight, character: characterWeight },
                  onlyCalculateInputted,
                  treatZeroAsEmpty
                );
                const finalGrade = scoreResult.finalScore;
                const isPass = scoreResult.isPass;
                const studentSubmissionsCount = submissions.filter(s => s.studentId === student.id).length;

                return (
                  <div key={`${student.id}_${idx}`} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-shadow space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">#{idx + 1} • NIS: {student.nis}</span>
                        <h4 className="font-bold text-slate-800 text-sm">{student.name}</h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Nilai Akhir</span>
                        <div className="flex items-center gap-1.5 justify-end">
                          {finalGrade !== null ? (
                            <>
                              <span className="font-black text-lg text-slate-900">{finalGrade}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${
                                isPass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                {isPass ? "Lulus" : "Remedial"}
                              </span>
                            </>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-400">
                              Belum Dinilai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Edit Grid for Scores */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Input Nilai HP:</span>
                      
                      {/* Assignments Grid */}
                      {classAssignments.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {classAssignments.map(a => {
                            const val = gradeObj!.assignmentScores[a.id] || 0;
                            return (
                              <div key={a.id} className="flex items-center justify-between gap-1 bg-white p-1.5 rounded-lg border border-slate-200/60 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]" title={a.title}>{a.title}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={val}
                                  onChange={(e) => {
                                    const num = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                    onUpdateGradeCell(student.id, a.id as any, num);
                                  }}
                                  className="w-12 text-center text-xs font-bold bg-slate-100 border border-slate-300 rounded-md py-0.5 focus:bg-white focus:border-indigo-500 focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* PTS, PAS, Sikap Inputs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">PTS</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeObj.midtermScore || 0}
                            onChange={(e) => {
                              const num = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              onUpdateGradeCell(student.id, "midterm", num);
                            }}
                            className="w-full text-center text-xs font-bold bg-white border border-slate-300 rounded-lg py-1 focus:border-indigo-500 focus:outline-none shadow-2xs"
                          />
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">PAS (Ujian)</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeObj.examScore || 0}
                            onChange={(e) => {
                              const num = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              onUpdateGradeCell(student.id, "exam", num);
                            }}
                            className="w-full text-center text-xs font-bold bg-white border border-slate-300 rounded-lg py-1 focus:border-indigo-500 focus:outline-none shadow-2xs"
                          />
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">Sikap</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeObj.characterScore || 0}
                            onChange={(e) => {
                              const num = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              onUpdateGradeCell(student.id, "character", num);
                            }}
                            className="w-full text-center text-xs font-bold bg-white border border-slate-300 rounded-lg py-1 focus:border-indigo-500 focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
                      <button
                        onClick={() => setSelectedStudentForHistory(student)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center gap-1 py-1"
                      >
                        <History size={12} />
                        <span>Riwayat Jawaban ({studentSubmissionsCount})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED EXAM HISTORY & ANSWER EDITOR VIEW */}
      {activeTabMode === "history" && (
        <div className="space-y-4">
          {/* Filter Toolbar for History */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Filter Riwayat:</span>
              </div>

              {/* Student Filter dropdown */}
              <select
                value={historyStudentFilter}
                onChange={(e) => setHistoryStudentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="all">Semua Siswa Kelas {activeSelectedClass}</option>
                {classStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                ))}
              </select>

              {/* Assignment Filter dropdown */}
              <select
                value={historyAssignmentFilter}
                onChange={(e) => setHistoryAssignmentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="all">Semua Ujian / Tugas ({classAssignments.length})</option>
                {classAssignments.map(a => (
                  <option key={a.id} value={a.id}>{a.title} ({a.category || "Tugas"})</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <strong>{filteredSubmissionsForHistoryTab.length}</strong> riwayat lembar ujian
            </div>
          </div>

          {/* Submissions Grid */}
          {filteredSubmissionsForHistoryTab.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubmissionsForHistoryTab.map((sub, subIdx) => {
                const assignObj = assignments.find(a => a.id === sub.assignmentId);
                const isEditingThis = activeEditingSubId === sub.id;

                return (
                  <div 
                    key={`${sub.id}_${subIdx}`} 
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md uppercase tracking-wider">
                            {assignObj?.category || "Ujian / Tugas"}
                          </span>
                          <h4 className="text-sm font-black text-slate-800 mt-1">
                            {assignObj?.title || "Ujian Evaluasi"}
                          </h4>
                          <p className="text-xs font-bold text-indigo-600 mt-0.5">
                            Siswa: {sub.studentName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-indigo-700">
                            {sub.score !== null ? sub.score : "-"} <span className="text-xs text-slate-400 font-normal">/ {assignObj?.maxScore || 100}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.status === "Selesai" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : sub.status === "Perlu Dinilai" 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      {/* Submitted Date */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-3">
                        <Clock size={12} />
                        <span>Tanggal Pengumpulan: {sub.submittedDate || "Tersimpan"}</span>
                      </div>

                      {/* Display or Edit Student Answer */}
                      {!isEditingThis ? (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <FileText size={12} className="text-indigo-600" /> Jawaban Siswa:
                            </span>
                            <button
                              onClick={() => startEditSubmission(sub, sub.studentId, sub.assignmentId, sub.score || 0)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={12} /> Edit Jawaban
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap italic bg-white p-2.5 rounded-lg border border-slate-200/80 font-mono leading-relaxed">
                            {sub.studentAnswer || "(Belum ada jawaban tertulis)"}
                          </p>

                          {/* AI Itemized breakdown summary if available */}
                          {sub.aiAnalysis?.items && sub.aiAnalysis.items.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                                Rincian Per Soal ({sub.aiAnalysis.items.length} Soal):
                              </span>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {sub.aiAnalysis.items.map((it: any, i: number) => (
                                  <div key={i} className="text-[11px] bg-white p-2 rounded-md border border-slate-100 flex items-start justify-between gap-2">
                                    <div>
                                      <span className="font-bold text-slate-700">No. {it.no || i + 1} ({it.type || "Soal"}):</span>
                                      <p className="text-slate-600 text-[11px] font-mono mt-0.5">Jawaban: "{it.studentAnswer || "-"}"</p>
                                    </div>
                                    <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded shrink-0 ${
                                      it.status === "Benar" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                    }`}>
                                      {it.status}: {it.score}/{it.maxScore}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* INLINE EDITOR */
                        <div className="bg-indigo-50/40 rounded-xl p-3.5 border border-indigo-200 mb-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                              <Edit3 size={14} className="text-indigo-600" /> Edit Jawaban & Nilai Siswa
                            </span>
                            <button
                              onClick={() => setActiveEditingSubId(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Textarea for student answer */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Teks Jawaban Siswa:
                            </label>
                            <textarea
                              rows={4}
                              value={editingAnswerText}
                              onChange={(e) => setEditingAnswerText(e.target.value)}
                              placeholder="Ketik atau edit teks jawaban siswa..."
                              className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Score input */}
                          <div className="flex items-center gap-3">
                            <label className="text-[11px] font-bold text-slate-700">
                              Nilai Total:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editingScoreVal}
                              onChange={(e) => setEditingScoreVal(e.target.value)}
                              className="w-20 px-2.5 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">/ 100</span>
                          </div>

                          {/* Itemized questions editor if items exist */}
                          {editingItemsList.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-indigo-100">
                              <label className="text-[11px] font-extrabold text-slate-700 block">
                                Edit Rincian Jawaban Per Soal:
                              </label>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {editingItemsList.map((item, idx) => (
                                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800">Soal No. {item.no || idx + 1} ({item.type})</span>
                                      <select
                                        value={item.status}
                                        onChange={(e) => {
                                          const newArr = [...editingItemsList];
                                          newArr[idx].status = e.target.value;
                                          if (e.target.value === "Benar") newArr[idx].score = newArr[idx].maxScore || 10;
                                          else newArr[idx].score = 0;
                                          setEditingItemsList(newArr);
                                        }}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50"
                                      >
                                        <option value="Benar">Benar</option>
                                        <option value="Salah">Salah</option>
                                        <option value="Parsial">Parsial</option>
                                      </select>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.studentAnswer || ""}
                                      onChange={(e) => {
                                        const newArr = [...editingItemsList];
                                        newArr[idx].studentAnswer = e.target.value;
                                        setEditingItemsList(newArr);
                                      }}
                                      placeholder="Jawaban siswa untuk nomor ini..."
                                      className="w-full text-[11px] font-mono p-1 bg-slate-50 border border-slate-200 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Save message */}
                          {saveSuccessMsg && (
                            <div className="p-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg flex items-center gap-1.5">
                              <CheckCircle2 size={14} />
                              <span>{saveSuccessMsg}</span>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => setActiveEditingSubId(null)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleSaveSubmission(sub.id, sub.studentId, sub.assignmentId)}
                              className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <Save size={13} /> Simpan Jawaban
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-3">
              <History size={36} className="mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Ujian</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Riwayat ujian akan otomatis tercatat di sini ketika siswa mengumpulkan jawaban melalui menu Penilaian atau ketika guru memasukkan koreksi lembar ujian.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: STUDENT EXAM HISTORY & ANSWER EDITOR */}
      <AnimatePresence>
        {selectedStudentForHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedStudentForHistory(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {selectedStudentForHistory.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Riwayat Ujian & Lembar Jawaban: {selectedStudentForHistory.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      NIS: <strong className="text-slate-700 font-mono">{selectedStudentForHistory.nis}</strong> • Kelas: <strong>{selectedStudentForHistory.className}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentForHistory(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {classAssignments.length > 0 ? (
                  classAssignments.map((assign) => {
                    const studentSub = submissions.find(s => s.studentId === selectedStudentForHistory.id && s.assignmentId === assign.id);
                    const isEditingThis = activeEditingSubId === (studentSub?.id || `sub-${selectedStudentForHistory.id}-${assign.id}`);
                    
                    // Gradebook score fallback
                    const gradeObj = grades.find(g => g.studentId === selectedStudentForHistory.id);
                    const currentScore = studentSub?.score !== null && studentSub?.score !== undefined 
                      ? studentSub.score 
                      : (gradeObj?.assignmentScores[assign.id] || 0);

                    return (
                      <div key={assign.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                              {assign.category || "Ulangan"}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-800 mt-1">{assign.title}</h4>
                            <p className="text-[11px] text-slate-500">Batas Waktu / Tanggal: {assign.dueDate || "-"}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs text-slate-400 font-bold block">Nilai:</span>
                              <span className="text-lg font-black text-indigo-700">{currentScore} / {assign.maxScore}</span>
                            </div>

                            {!isEditingThis && (
                              <button
                                onClick={() => startEditSubmission(studentSub || null, selectedStudentForHistory.id, assign.id, currentScore)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Edit3 size={13} />
                                <span>Edit Jawaban</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* View vs Edit Answer Section */}
                        {!isEditingThis ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-500 block mb-1">
                              Jawaban Siswa Ter catat:
                            </span>
                            <p className="text-xs text-slate-700 font-mono whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                              {studentSub?.studentAnswer || "(Belum ada lembar jawaban siswa yang diunggah/diketik)"}
                            </p>

                            {/* Question items preview */}
                            {studentSub?.aiAnalysis?.items && studentSub.aiAnalysis.items.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Breakdown Evaluasi AI per Nomor:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {studentSub.aiAnalysis.items.map((it: any, i: number) => (
                                    <div key={i} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                                      <span>No. {it.no || i + 1}: "{it.studentAnswer || "-"}"</span>
                                      <span className={`text-[10px] font-bold px-1 rounded ${it.status === "Benar" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                        {it.status} ({it.score} pt)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* INLINE MODAL EDITOR */
                          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                                <Edit3 size={14} className="text-indigo-600" /> Editor Jawaban & Nilai Siswa
                              </span>
                              <button onClick={() => setActiveEditingSubId(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                              </button>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Teks Jawaban Lengkap Siswa:
                              </label>
                              <textarea
                                rows={3}
                                value={editingAnswerText}
                                onChange={(e) => setEditingAnswerText(e.target.value)}
                                placeholder="Ketik atau koreksi teks jawaban siswa..."
                                className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="text-[11px] font-bold text-slate-700">
                                Update Nilai Akhir:
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editingScoreVal}
                                onChange={(e) => setEditingScoreVal(e.target.value)}
                                className="w-20 px-2.5 py-1 text-xs font-bold text-center bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">/ {assign.maxScore}</span>
                            </div>

                            {saveSuccessMsg && (
                              <div className="p-2 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg flex items-center gap-1.5">
                                <CheckCircle2 size={14} />
                                <span>{saveSuccessMsg}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setActiveEditingSubId(null)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleSaveSubmission(
                                  studentSub?.id || `sub-${selectedStudentForHistory.id}-${assign.id}`,
                                  selectedStudentForHistory.id,
                                  assign.id
                                )}
                                className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs"
                              >
                                <Save size={13} /> Simpan Ke Buku Nilai
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Belum ada tugas atau ujian yang dibuat untuk kelas ini.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedStudentForHistory(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore & Backup Penilaian Modal */}
      <MenuDataRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        menuTitle="Daftar Nilai & Penilaian"
        menuKey="grades"
        currentDataCount={grades.length}
        currentDataSummary={`Mencakup ${grades.length} rekaman nilai siswa, ${assignments.length} tugas & ulangan, dan ${(submissions || []).length} riwayat penyerahan.`}
        onExportBackup={handleExportGradesJson}
        onRestoreData={handleRestoreGradesData}
      />
    </div>
  );
}
