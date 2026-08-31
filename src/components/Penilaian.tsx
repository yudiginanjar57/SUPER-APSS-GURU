import { useState, useEffect, useMemo, useRef, ChangeEvent, Fragment } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Cpu, 
  HelpCircle, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  User, 
  Users,
  Copy, 
  Check, 
  FileUp, 
  Upload, 
  CheckSquare, 
  ListChecks, 
  AlertCircle, 
  Download, 
  FileCheck2, 
  RefreshCw,
  Search,
  Eye,
  Sliders,
  Layers,
  TrendingUp,
  X,
  ArrowRight,
  BookmarkCheck,
  Percent,
  Edit3,
  ChevronDown,
  ChevronUp,
  Camera
} from "lucide-react";
import { Student, Assignment, Submission } from "../types";
import { CLASSES } from "../data/presets";
import * as XLSX from "xlsx";

export interface BatchGradingResult {
  studentId: string;
  studentName: string;
  absenNo?: number;
  nis?: string;
  pageRange?: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  status: "Tuntas" | "Remidial" | "Gagal Dinilai" | string;
  summaryPerType: Array<{ type: string; score: number; maxScore: number; correctCount: string }>;
  items: Array<{ no: number; type: string; studentAnswer: string; answerKey: string; status: string; score: number; maxScore: number; note: string }>;
  analysis: string;
  feedback: string;
  suggestions: string;
  markdownReport?: string;
  success?: boolean;
  error?: string;
}

interface PenilaianProps {
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  onApplyGrade: (assignmentId: string, studentId: string, score: number, aiAnalysis?: any) => void;
  onApplyBatchGrades?: (
    assignmentId: string,
    gradesList: Array<{ studentId: string; studentName: string; score: number; aiAnalysis?: any }>,
    targetType?: "assignment" | "midterm" | "exam" | "character",
    newAssignmentTitle?: string,
    targetClass?: string
  ) => void;
  onNavigateToGradebook?: (className?: string) => void;
  classList?: string[];
  onGradingStateChange?: (isGrading: boolean, progressText: string) => void;
}

export default function Penilaian({
  students,
  assignments,
  submissions,
  onApplyGrade,
  onApplyBatchGrades,
  onNavigateToGradebook,
  classList,
  onGradingStateChange
}: PenilaianProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;

  // Main Assessment Mode: "single" vs "batch"
  const [assessmentMode, setAssessmentMode] = useState<"single" | "batch">("batch");

  // Single Mode: Method Selection
  const [method, setMethod] = useState<"manual" | "scan_pdf">("scan_pdf");

  // Question Types Selection
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([
    "Pilihan Ganda (PG)",
    "PG Kompleks",
    "PG Benar / Salah",
    "Isian Singkat",
    "Uraian / Esai"
  ]);

  // Common Selection States
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || "X-MIPA-1");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [subject, setSubject] = useState("Ekonomi");

  // Detailed Answer Keys for 5 Question Types
  const [kunciPG, setKunciPG] = useState("1. A, 2. C, 3. B, 4. D, 5. E");
  const [kunciPGKompleks, setKunciPGKompleks] = useState("1. A, C, D | 2. B, D");
  const [kunciBenarSalah, setKunciBenarSalah] = useState("1. Benar, 2. Salah, 3. Benar");
  const [kunciIsian, setKunciIsian] = useState("1. Inflasi, 2. Kebutuhan Primer");
  const [kunciUraian, setKunciUraian] = useState("1. Jelaskan hukum permintaan... (Kunci: Jika harga naik, jumlah barang yang diminta berkurang).");

  // Single Mode Specific States
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>("");
  const [studentName, setStudentName] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileMimeType, setFileMimeType] = useState<string>("");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [activeStudentName, setActiveStudentName] = useState("");
  const [editableScore, setEditableScore] = useState<string>("");
  const [singleResult, setSingleResult] = useState<BatchGradingResult | null>(null);

  // Batch Mode Specific States
  const [batchInputMethod, setBatchInputMethod] = useState<"bundle_pdf" | "class_list" | "multi_file" | "quick_text">("bundle_pdf");
  const [bundlePdfFile, setBundlePdfFile] = useState<File | null>(null);
  const [bundlePdfBase64, setBundlePdfBase64] = useState<string>("");
  const [bundlePdfMimeType, setBundlePdfMimeType] = useState<string>("application/pdf");
  const [detectedSheetCount, setDetectedSheetCount] = useState<number | null>(null);
  const [bundleSummary, setBundleSummary] = useState<string>("");
  const [batchStudentAnswers, setBatchStudentAnswers] = useState<Record<string, string>>({});
  const [batchUploadedFiles, setBatchUploadedFiles] = useState<Array<{ studentId: string; studentName: string; file: File; base64: string; mimeType: string }>>([]);
  const [quickTextContent, setQuickTextContent] = useState("");
  const [selectedStudentsForBatch, setSelectedStudentsForBatch] = useState<string[]>([]);
  
  // Batch Review States
  const [batchResults, setBatchResults] = useState<BatchGradingResult[]>([]);
  const [reviewedScores, setReviewedScores] = useState<Record<string, number>>({});
  const [batchSelectedForIntegration, setBatchSelectedForIntegration] = useState<string[]>([]);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<"all" | "passed" | "remedial">("all");
  const [detailModalStudent, setDetailModalStudent] = useState<BatchGradingResult | null>(null);
  const [expandedStudentIds, setExpandedStudentIds] = useState<string[]>([]);

  // Editing Student Answers in Modal State
  const [isEditingStudentAnswers, setIsEditingStudentAnswers] = useState(false);
  const [editedItems, setEditedItems] = useState<Array<{ no: number; type: string; studentAnswer: string; answerKey: string; status: string; score: number; maxScore: number; note: string }>>([]);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Per-Student Answer Sheet Files in Class List State
  const [studentUploadedFiles, setStudentUploadedFiles] = useState<Record<string, { file: File; base64: string; mimeType: string; name: string }>>({});
  const [ocrLoadingStudentId, setOcrLoadingStudentId] = useState<string | null>(null);

  // Integration Target Configuration
  const [integrationTarget, setIntegrationTarget] = useState<"selected_assignment" | "new_assignment" | "midterm" | "exam">("selected_assignment");
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [integrationSuccessModal, setIntegrationSuccessModal] = useState<{ count: number; target: string } | null>(null);

  // Loading & Progress States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState("");
  const [isImportingKey, setIsImportingKey] = useState(false);
  const [importKeySuccess, setImportKeySuccess] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const onGradingStateChangeRef = useRef(onGradingStateChange);
  useEffect(() => {
    onGradingStateChangeRef.current = onGradingStateChange;
  }, [onGradingStateChange]);

  // Sync grading status with parent component for background tracking
  useEffect(() => {
    if (onGradingStateChangeRef.current) {
      let progressText = "";
      if (loading) {
        if (batchProgress.total > 0) {
          progressText = `${batchProgress.current}/${batchProgress.total} (${batchProgress.currentName})`;
        } else {
          progressText = "Menganalisis dengan AI...";
        }
      }
      onGradingStateChangeRef.current(loading, progressText);
    }
  }, [loading, batchProgress.current, batchProgress.total, batchProgress.currentName]);

  // Filtered Students & Assignments for selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === selectedClass);
  }, [students, selectedClass]);

  // Class Students Roster for Absen-based OCR matching
  const studentsRoster = useMemo(() => {
    return classStudents.map((s, idx) => ({
      absenNo: idx + 1,
      id: s.id,
      name: s.name,
      nis: s.nis || ""
    }));
  }, [classStudents]);

  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.className === selectedClass);
  }, [assignments, selectedClass]);

  // Sync selected assignment
  useEffect(() => {
    if (classAssignments.length > 0) {
      const firstAssignment = classAssignments[0];
      setSelectedAssignmentId(prev => {
        if (prev && classAssignments.some(a => a.id === prev)) {
          return prev;
        }
        return firstAssignment.id;
      });
      setSubject(prev => {
        const title = firstAssignment.title || "Ekonomi";
        return prev === title ? prev : title;
      });
    } else {
      setSelectedAssignmentId(prev => prev === "" ? prev : "");
    }
  }, [selectedClass, classAssignments]);

  // Auto-populate batch selection when class changes
  useEffect(() => {
    const studentIds = classStudents.map(s => s.id);
    setSelectedStudentsForBatch(prev => {
      if (prev.length === studentIds.length && prev.every((id, idx) => id === studentIds[idx])) {
        return prev;
      }
      return studentIds;
    });
    
    // Populate default answers from existing submissions if available
    const initialAnswers: Record<string, string> = {};
    classStudents.forEach(s => {
      const existingSub = submissions.find(sub => sub.assignmentId === selectedAssignmentId && sub.studentId === s.id);
      if (existingSub && existingSub.studentAnswer) {
        initialAnswers[s.id] = existingSub.studentAnswer;
      } else {
        initialAnswers[s.id] = `1. A, 2. C, 3. B, 4. D, 5. E\nPG Kompleks: 1. A, C, D\nBenar/Salah: 1. Benar, 2. Salah\nIsian: 1. Inflasi\nUraian: Menurut saya, hukum permintaan adalah jika harga naik maka jumlah barang diminta berkurang.`;
      }
    });
    setBatchStudentAnswers(prev => {
      const keysPrev = Object.keys(prev);
      const keysNext = Object.keys(initialAnswers);
      if (keysPrev.length === keysNext.length && keysNext.every(k => prev[k] === initialAnswers[k])) {
        return prev;
      }
      return initialAnswers;
    });
  }, [selectedClass, classStudents, selectedAssignmentId, submissions]);

  const assignmentSubmissions = submissions.filter(
    s => s.assignmentId === selectedAssignmentId
  );

  // Single Submission Selection Handler
  const handleSubmissionSelect = (subId: string) => {
    setSelectedSubmissionId(subId);
    if (subId === "custom" || !subId) {
      setStudentAnswer("");
      setActiveStudentId("");
      setActiveStudentName("");
      setSingleResult(null);
      return;
    }

    const sub = submissions.find(s => s.id === subId);
    const assign = assignments.find(a => a.id === selectedAssignmentId);
    
    if (sub && assign) {
      setSubject(assign.title || "Ekonomi");
      setStudentName(sub.studentName);
      setStudentAnswer(sub.studentAnswer || "1. A, 2. C, 3. B, 4. D, 5. E");
      setActiveStudentId(sub.studentId);
      setActiveStudentName(sub.studentName);
    }
  };

  // Toggle question type checkboxes
  const toggleQuestionType = (type: string) => {
    if (selectedQuestionTypes.includes(type)) {
      if (selectedQuestionTypes.length === 1) return; // Keep at least one
      setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type));
    } else {
      setSelectedQuestionTypes([...selectedQuestionTypes, type]);
    }
  };

  // Single File Upload for PDF / Image
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError("Ukuran file maksimal 20 MB.");
      return;
    }

    setUploadedFile(file);
    let mime = file.type;
    if (!mime || mime === 'application/octet-stream') {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf') mime = 'application/pdf';
      else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'heic') mime = 'image/heic';
      else mime = 'image/jpeg';
    }
    setFileMimeType(mime);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Single Bundle PDF / Image Upload containing multiple students' sheets
  const handleBundlePdfUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setError("Ukuran file bundel (PDF/Gambar) maksimal 30 MB.");
      return;
    }

    setBundlePdfFile(file);
    let mime = file.type;
    if (!mime || mime === 'application/octet-stream') {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf') mime = 'application/pdf';
      else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'heic') mime = 'image/heic';
      else mime = 'image/jpeg';
    }
    setBundlePdfMimeType(mime);
    setDetectedSheetCount(null);
    setBundleSummary("");

    const reader = new FileReader();
    reader.onloadend = () => {
      setBundlePdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Multi-File Upload for Batch Mode (PDF / Image)
  const handleMultiFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newBatchFiles: Array<{ studentId: string; studentName: string; file: File; base64: string; mimeType: string }> = [];

    fileList.forEach((file, index) => {
      // Try to match student by file name
      const matchedStudent = classStudents.find(s => 
        file.name.toLowerCase().includes(s.name.toLowerCase()) || 
        (s.nis && file.name.toLowerCase().includes(s.nis))
      );

      let mime = file.type;
      if (!mime || mime === 'application/octet-stream') {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext === 'pdf') mime = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'png') mime = 'image/png';
        else if (ext === 'webp') mime = 'image/webp';
        else if (ext === 'heic') mime = 'image/heic';
        else mime = 'image/jpeg';
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newBatchFiles.push({
          studentId: matchedStudent ? matchedStudent.id : `student-${index}`,
          studentName: matchedStudent ? matchedStudent.name : file.name.replace(/\.[^/.]+$/, ""),
          file,
          base64: reader.result as string,
          mimeType: mime
        });

        if (newBatchFiles.length === fileList.length) {
          setBatchUploadedFiles(prev => [...prev, ...newBatchFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Export Answer Key
  const handleExportAnswerKey = () => {
    const data = {
      subject,
      kunciPG,
      kunciPGKompleks,
      kunciBenarSalah,
      kunciIsian,
      kunciUraian,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunci_jawaban_${subject.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Answer Key
  const handleImportAnswerKey = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    setIsImportingKey(true);
    setImportKeySuccess(false);

    try {
      if (fileName.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            if (json.kunciPG !== undefined) setKunciPG(json.kunciPG);
            if (json.kunciPGKompleks !== undefined) setKunciPGKompleks(json.kunciPGKompleks);
            if (json.kunciBenarSalah !== undefined) setKunciBenarSalah(json.kunciBenarSalah);
            if (json.kunciIsian !== undefined) setKunciIsian(json.kunciIsian);
            if (json.kunciUraian !== undefined) setKunciUraian(json.kunciUraian);
            if (json.subject) setSubject(json.subject);
            setImportKeySuccess(true);
            setTimeout(() => setImportKeySuccess(false), 3000);
          } catch (err) {
            alert("Format JSON kunci jawaban tidak valid.");
          } finally {
            setIsImportingKey(false);
          }
        };
        reader.readAsText(file);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const csvText = XLSX.utils.sheet_to_csv(firstSheet);

            const res = await fetch("/api/parse-answer-key", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ textContent: csvText })
            });
            const resText = await res.text();
            let resData: any = {};
            try {
              resData = JSON.parse(resText);
            } catch {
              throw new Error("Server sibuk atau timeout saat memproses Excel.");
            }
            if (!res.ok) throw new Error(resData.error || "Gagal memproses file Excel.");

            if (resData.kunciPG) setKunciPG(resData.kunciPG);
            if (resData.kunciPGKompleks) setKunciPGKompleks(resData.kunciPGKompleks);
            if (resData.kunciBenarSalah) setKunciBenarSalah(resData.kunciBenarSalah);
            if (resData.kunciIsian) setKunciIsian(resData.kunciIsian);
            if (resData.kunciUraian) setKunciUraian(resData.kunciUraian);

            setImportKeySuccess(true);
            setTimeout(() => setImportKeySuccess(false), 3000);
          } catch (err: any) {
            alert(err.message || "Gagal membaca file Excel.");
          } finally {
            setIsImportingKey(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (fileName.endsWith(".pdf") || file.type.includes("pdf") || file.type.includes("image")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64 = event.target?.result as string;
            const res = await fetch("/api/parse-answer-key", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileBase64: base64,
                fileMimeType: file.type || "application/pdf"
              })
            });
            const resText = await res.text();
            let resData: any = {};
            try {
              resData = JSON.parse(resText);
            } catch {
              throw new Error("Server sibuk atau timeout saat memproses dokumen.");
            }
            if (!res.ok) throw new Error(resData.error || "Gagal memproses dokumen PDF.");

            if (resData.kunciPG) setKunciPG(resData.kunciPG);
            if (resData.kunciPGKompleks) setKunciPGKompleks(resData.kunciPGKompleks);
            if (resData.kunciBenarSalah) setKunciBenarSalah(resData.kunciBenarSalah);
            if (resData.kunciIsian) setKunciIsian(resData.kunciIsian);
            if (resData.kunciUraian) setKunciUraian(resData.kunciUraian);

            setImportKeySuccess(true);
            setTimeout(() => setImportKeySuccess(false), 3000);
          } catch (err: any) {
            alert(err.message || "Gagal membaca file PDF.");
          } finally {
            setIsImportingKey(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const res = await fetch("/api/parse-answer-key", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ textContent: content })
            });
            const resText = await res.text();
            let resData: any = {};
            try {
              resData = JSON.parse(resText);
            } catch {
              throw new Error("Server sibuk atau timeout saat memproses file teks.");
            }
            if (!res.ok) throw new Error(resData.error || "Gagal memproses file teks.");

            if (resData.kunciPG) setKunciPG(resData.kunciPG);
            if (resData.kunciPGKompleks) setKunciPGKompleks(resData.kunciPGKompleks);
            if (resData.kunciBenarSalah) setKunciBenarSalah(resData.kunciBenarSalah);
            if (resData.kunciIsian) setKunciIsian(resData.kunciIsian);
            if (resData.kunciUraian) setKunciUraian(resData.kunciUraian);

            setImportKeySuccess(true);
            setTimeout(() => setImportKeySuccess(false), 3000);
          } catch (err: any) {
            setKunciPG(event.target?.result as string);
            setImportKeySuccess(true);
            setTimeout(() => setImportKeySuccess(false), 3000);
          } finally {
            setIsImportingKey(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      alert("Gagal mengimpor file.");
      setIsImportingKey(false);
    }
    e.target.value = "";
  };

  // Open student detail modal with initialized editable state
  const handleOpenStudentDetailModal = (r: BatchGradingResult) => {
    setDetailModalStudent(r);
    setIsEditingStudentAnswers(false);
    setEditSuccessMsg("");
    setEditedItems(r.items ? JSON.parse(JSON.stringify(r.items)) : []);
  };

  // Upload Answer Sheet File for Individual Student in Class List
  const handleStudentFileUpload = (studentId: string, studentName: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setStudentUploadedFiles(prev => ({
        ...prev,
        [studentId]: {
          file,
          base64,
          mimeType: file.type || "application/pdf",
          name: file.name
        }
      }));
      // Auto-check this student in batch list if not already checked
      setSelectedStudentsForBatch(prev => prev.includes(studentId) ? prev : [...prev, studentId]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Run instant AI OCR scan for uploaded student answer sheet
  const handleRunOCRForStudent = async (studentId: string, studentName: string) => {
    const fileObj = studentUploadedFiles[studentId];
    if (!fileObj) return;

    setOcrLoadingStudentId(studentId);
    try {
      const res = await fetch("/api/penilaian-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "scan_pdf",
          mapel: subject,
          kelas: selectedClass,
          namaSiswa: studentName,
          kunciJawaban: {
            pg: kunciPG,
            pgKompleks: kunciPGKompleks,
            benarSalah: kunciBenarSalah,
            isianSingkat: kunciIsian,
            uraian: kunciUraian
          },
          fileBase64: fileObj.base64,
          fileMimeType: fileObj.mimeType,
          questionTypes: selectedQuestionTypes,
          studentsRoster
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText.toLowerCase().includes("<html") || responseText.toLowerCase().includes("<!doctype html>")) {
          throw new Error("Server sibuk atau mengalami timeout. Silakan coba beberapa saat lagi.");
        }
        throw new Error(`Server error: ${responseText.slice(0, 100)}`);
      }

      if (res.ok && data) {
        let answerText = "";
        if (Array.isArray(data.items) && data.items.length > 0) {
          answerText = data.items.map((it: any) => `${it.no || ''}. ${it.studentAnswer || ''}`).join("\n");
        } else {
          answerText = data.markdownReport || data.analysis || "Hasil OCR Lembar Jawaban";
        }
        setBatchStudentAnswers(prev => ({
          ...prev,
          [studentId]: answerText
        }));
      } else {
        alert(data.error || "Gagal melakukan OCR lembar jawaban.");
      }
    } catch (err: any) {
      console.error("OCR scan error:", err);
      alert("Terjadi kesalahan saat pemindaian OCR.");
    } finally {
      setOcrLoadingStudentId(null);
    }
  };

  // Recalculate and Save Edited Student Answers in Detail Modal
  const handleRecalculateEditedAnswers = () => {
    if (!detailModalStudent) return;

    const itemsToUse = editedItems.length > 0 ? editedItems : (detailModalStudent.items || []);

    let totalEarned = 0;
    let totalMax = 0;

    const updatedItems = itemsToUse.map(item => {
      const ansKey = (item.answerKey || "").trim();
      const studAns = (item.studentAnswer || "").trim();
      const maxSc = item.maxScore || 5;

      let newStatus = item.status;
      let newScore = item.score;
      let newNote = item.note || "";

      const itemTypeUpper = (item.type || "").toUpperCase();

      if (itemTypeUpper.includes("PG") || itemTypeUpper.includes("PILIHAN GANDA") || itemTypeUpper.includes("BENAR")) {
        if (studAns && ansKey && studAns.toUpperCase() === ansKey.toUpperCase()) {
          newStatus = "Benar";
          newScore = maxSc;
          newNote = "Benar (Jawaban diperbarui guru)";
        } else if (!studAns) {
          newStatus = "Kosong";
          newScore = 0;
          newNote = "Jawaban kosong (diperbarui guru)";
        } else {
          newStatus = "Salah";
          newScore = 0;
          newNote = "Salah (Jawaban diperbarui guru)";
        }
      } else {
        if (studAns && ansKey && studAns.toLowerCase() === ansKey.toLowerCase()) {
          newStatus = "Benar";
          newScore = maxSc;
          newNote = "Benar (Sesuai Kunci)";
        }
      }

      totalEarned += newScore;
      totalMax += maxSc;

      return {
        ...item,
        studentAnswer: studAns,
        status: newStatus,
        score: newScore,
        maxScore: maxSc,
        note: newNote
      };
    });

    const scaledTotal = totalMax > 0 ? Math.min(100, Math.round((totalEarned / totalMax) * 100)) : totalEarned;
    const newGrade = scaledTotal >= 90 ? "A" : scaledTotal >= 80 ? "B" : scaledTotal >= 75 ? "C" : scaledTotal >= 60 ? "D" : "E";
    const newStatus = scaledTotal >= 75 ? "Tuntas" : "Remidial";

    // Re-group summaryPerType
    const typeMap: Record<string, { score: number; maxScore: number; correctCount: number; totalCount: number }> = {};
    updatedItems.forEach(it => {
      const t = it.type || "Umum";
      if (!typeMap[t]) {
        typeMap[t] = { score: 0, maxScore: 0, correctCount: 0, totalCount: 0 };
      }
      typeMap[t].score += it.score;
      typeMap[t].maxScore += it.maxScore;
      typeMap[t].totalCount += 1;
      if (it.status?.toLowerCase().includes("benar") && !it.status?.toLowerCase().includes("sebagian")) {
        typeMap[t].correctCount += 1;
      }
    });

    const updatedSummary = Object.keys(typeMap).map(t => ({
      type: t,
      score: typeMap[t].score,
      maxScore: typeMap[t].maxScore,
      correctCount: `${typeMap[t].correctCount}/${typeMap[t].totalCount}`
    }));

    const updatedStudentObj: BatchGradingResult = {
      ...detailModalStudent,
      totalScore: scaledTotal,
      grade: newGrade,
      status: newStatus,
      items: updatedItems,
      summaryPerType: updatedSummary
    };

    setDetailModalStudent(updatedStudentObj);
    setReviewedScores(prev => ({ ...prev, [detailModalStudent.studentId]: scaledTotal }));

    // Update batchResults array
    setBatchResults(prev => prev.map(r => r.studentId === detailModalStudent.studentId ? updatedStudentObj : r));

    // Update batchStudentAnswers text
    const concatenatedAnswers = updatedItems.map(it => `${it.no || ''}. ${it.studentAnswer}`).join("\n");
    setBatchStudentAnswers(prev => ({ ...prev, [detailModalStudent.studentId]: concatenatedAnswers }));

    setIsEditingStudentAnswers(false);
    setEditSuccessMsg("Jawaban & nilai siswa berhasil diperbarui!");
    setTimeout(() => setEditSuccessMsg(""), 3000);
  };

  // Single AI Assessment Execution
  const handleSingleAIEvaluation = async () => {
    setError(null);
    if (!subject.trim()) {
      setError("Mata pelajaran wajib diisi.");
      return;
    }

    if (method === "scan_pdf" && !fileBase64) {
      setError("Silakan unggah file PDF atau Gambar Lembar Jawaban Siswa terlebih dahulu.");
      return;
    }

    if (method === "manual" && !studentAnswer.trim()) {
      setError("Silakan masukkan jawaban siswa pada kolom teks.");
      return;
    }

    setLoading(true);
    setSingleResult(null);

    try {
      const response = await fetch("/api/penilaian-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          mapel: subject,
          kelas: selectedClass,
          namaSiswa: studentName || activeStudentName || "Siswa",
          kunciJawaban: {
            pg: kunciPG,
            pgKompleks: kunciPGKompleks,
            benarSalah: kunciBenarSalah,
            isianSingkat: kunciIsian,
            uraian: kunciUraian
          },
          jawabanSiswaText: studentAnswer,
          fileBase64: method === "scan_pdf" ? fileBase64 : undefined,
          fileMimeType: method === "scan_pdf" ? fileMimeType : undefined,
          questionTypes: selectedQuestionTypes,
          studentsRoster
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (responseText.toLowerCase().includes("<!doctype html>") || responseText.toLowerCase().includes("<html")) {
          throw new Error("Koneksi server sedang diperbarui atau timeout. Silakan coba sekali lagi.");
        }
        throw new Error(`Server error (${response.status}): ${responseText.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || "Gagal menghubungi asisten Penilaian AI.");
      }

      const matchedStudentId = data.studentId || activeStudentId || `single-${Date.now()}`;
      const matchedStudentName = data.studentName || data.namaSiswa || studentName || activeStudentName || "Siswa";
      const matchedAbsen = data.absenNo || (activeStudentId ? (classStudents.findIndex(s => s.id === activeStudentId) + 1) : undefined);
      const matchedNis = data.nis || (classStudents.find(s => s.id === activeStudentId)?.nis);

      if (data.studentId && data.studentId !== activeStudentId) {
        setActiveStudentId(data.studentId);
        setActiveStudentName(matchedStudentName);
        setStudentName(matchedStudentName);
      }

      const formatted: BatchGradingResult = {
        studentId: matchedStudentId,
        studentName: matchedStudentName,
        absenNo: matchedAbsen,
        nis: matchedNis,
        totalScore: data.totalScore ?? 0,
        maxScore: data.maxScore ?? 100,
        grade: data.grade || "B",
        status: (data.totalScore ?? 0) >= 75 ? "Tuntas" : "Remidial",
        summaryPerType: data.summaryPerType || [],
        items: data.items || [],
        analysis: data.analysis || "",
        feedback: data.feedback || "",
        suggestions: data.suggestions || "",
        markdownReport: data.markdownReport,
        success: true
      };

      setSingleResult(formatted);
      setEditableScore(formatted.totalScore.toString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan koneksi ke server AI.");
    } finally {
      setLoading(false);
    }
  };

  // BATCH AI Assessment Execution
  const handleBatchAIEvaluation = async () => {
    setError(null);
    if (!subject.trim()) {
      setError("Mata pelajaran wajib diisi.");
      return;
    }

    // If batch input is single bundle PDF containing multiple students
    if (batchInputMethod === "bundle_pdf") {
      if (!bundlePdfBase64) {
        setError("Silakan pilih dan unggah berkas PDF Lembar Jawaban Bundel (Multi-Siswa) terlebih dahulu.");
        return;
      }

      setLoading(true);
      setDetectedSheetCount(null);
      setBundleSummary("");
      setBatchProgress({ current: 1, total: 1, currentName: bundlePdfFile?.name || "Dokumen PDF Bundel" });

      try {
        let responseText = "";
        let responseOk = false;
        let responseStatus = 200;

        for (let attempt = 1; attempt <= 2; attempt++) {
          const response = await fetch("/api/penilaian-bundle-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64: bundlePdfBase64,
              fileMimeType: bundlePdfMimeType,
              mapel: subject,
              kelas: selectedClass,
              kunciJawaban: {
                pg: kunciPG,
                pgKompleks: kunciPGKompleks,
                benarSalah: kunciBenarSalah,
                isianSingkat: kunciIsian,
                uraian: kunciUraian
              },
              questionTypes: selectedQuestionTypes,
              studentsRoster
            })
          });

          responseOk = response.ok;
          responseStatus = response.status;
          responseText = await response.text();

          if (responseText.includes("<!doctype html>") || responseText.includes("<html")) {
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
          }
          break;
        }

        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          if (responseText.includes("<!doctype html>") || responseText.includes("<html")) {
            throw new Error("Koneksi server sedang diperbarui. Silakan tekan tombol 'Pindai & Koreksi' sekali lagi.");
          }
          throw new Error(`Server error (${responseStatus}): ${responseText.slice(0, 150)}`);
        }

        if (!responseOk) {
          throw new Error(data.error || data.details || "Gagal memproses berkas PDF bundel.");
        }

        const results: BatchGradingResult[] = data.results || [];
        setBatchResults(results);
        setDetectedSheetCount(data.totalDetectedSheets || results.length);
        setBundleSummary(data.bundleOverview || `Terdeteksi ${results.length} lembar jawaban siswa dalam berkas PDF.`);

        // Initialize review scores state & selection
        const initialReviewed: Record<string, number> = {};
        const allResultIds: string[] = [];

        results.forEach(r => {
          initialReviewed[r.studentId] = r.totalScore;
          if (r.success) {
            allResultIds.push(r.studentId);
          }
        });

        setReviewedScores(initialReviewed);
        setBatchSelectedForIntegration(allResultIds);

        // Scroll smoothly down to review section
        setTimeout(() => {
          const reviewEl = document.getElementById("batch-review-section");
          if (reviewEl) {
            reviewEl.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);

        return;
      } catch (err: any) {
        console.error("Bundle PDF grading error:", err);
        setError(err.message || "Terjadi kesalahan saat memproses berkas PDF bundel.");
        return;
      } finally {
        setLoading(false);
      }
    }

    // Build the list of students to grade based on other batch input methods
    let studentsToGrade: Array<{
      studentId: string;
      studentName: string;
      answerText?: string;
      fileBase64?: string;
      fileMimeType?: string;
    }> = [];

    if (batchInputMethod === "class_list") {
      const selected = classStudents.filter(s => selectedStudentsForBatch.includes(s.id));
      if (selected.length === 0) {
        setError("Pilih minimal satu siswa dari daftar kelas untuk dinilai.");
        return;
      }

      studentsToGrade = selected.map(s => {
        const uploaded = studentUploadedFiles[s.id];
        return {
          studentId: s.id,
          studentName: s.name,
          answerText: batchStudentAnswers[s.id] || (uploaded ? "Tersedia berkas lembar jawaban terunggah" : "Jawaban belum diisi"),
          fileBase64: uploaded?.base64,
          fileMimeType: uploaded?.mimeType
        };
      });
    } else if (batchInputMethod === "multi_file") {
      if (batchUploadedFiles.length === 0) {
        setError("Silakan unggah setidaknya satu berkas lembar jawaban PDF/Gambar.");
        return;
      }

      studentsToGrade = batchUploadedFiles.map(f => ({
        studentId: f.studentId,
        studentName: f.studentName,
        fileBase64: f.base64,
        fileMimeType: f.mimeType
      }));
    } else if (batchInputMethod === "quick_text") {
      if (!quickTextContent.trim()) {
        setError("Silakan masukkan teks jawaban siswa format cepat.");
        return;
      }

      // Parse lines: e.g. "Ahmad Dani: 1.A, 2.B, 3.C" or "20241001 \t Budi \t 1.A, 2.B"
      const lines = quickTextContent.split("\n").filter(l => l.trim().length > 0);
      studentsToGrade = lines.map((line, idx) => {
        let name = `Siswa ${idx + 1}`;
        let answer = line;

        if (line.includes(":") || line.includes(" - ")) {
          const delimiter = line.includes(":") ? ":" : " - ";
          const parts = line.split(delimiter);
          name = parts[0].trim();
          answer = parts.slice(1).join(delimiter).trim();
        } else if (line.includes("\t")) {
          const parts = line.split("\t");
          name = parts[0].trim();
          answer = parts.slice(1).join(" ").trim();
        }

        const matched = classStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
        return {
          studentId: matched ? matched.id : `quick-student-${idx + 1}`,
          studentName: matched ? matched.name : name,
          answerText: answer
        };
      });
    }

    if (studentsToGrade.length === 0) {
      setError("Tidak ada data siswa atau jawaban untuk dinilai.");
      return;
    }

    setLoading(true);

    const CHUNK_SIZE = 2;
    const allResults: BatchGradingResult[] = [];

    try {
      for (let i = 0; i < studentsToGrade.length; i += CHUNK_SIZE) {
        const chunk = studentsToGrade.slice(i, i + CHUNK_SIZE);
        const currentName = chunk.map(c => c.studentName).join(", ");
        
        setBatchProgress({
          current: Math.min(i + chunk.length, studentsToGrade.length),
          total: studentsToGrade.length,
          currentName
        });

        let chunkResults: BatchGradingResult[] = [];
        let chunkError: string | null = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const response = await fetch("/api/penilaian-ai-batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mapel: subject,
                kelas: selectedClass,
                kunciJawaban: {
                  pg: kunciPG,
                  pgKompleks: kunciPGKompleks,
                  benarSalah: kunciBenarSalah,
                  isianSingkat: kunciIsian,
                  uraian: kunciUraian
                },
                questionTypes: selectedQuestionTypes,
                studentsList: chunk,
                studentsRoster
              })
            });

            const responseText = await response.text();
            let data: any = {};
            try {
              data = JSON.parse(responseText);
            } catch (e) {
              if (responseText.toLowerCase().includes("<!doctype html>") || responseText.toLowerCase().includes("<html")) {
                throw new Error("Koneksi server sedang sibuk. Mencoba ulang...");
              }
              throw new Error(`Server error (${response.status}): ${responseText.slice(0, 150)}`);
            }

            if (!response.ok) {
              throw new Error(data.error || data.details || "Gagal memproses kelompok penilaian.");
            }

            chunkResults = data.results || [];
            chunkError = null;
            break;
          } catch (err: any) {
            chunkError = err.message || String(err);
            if (attempt < 2) {
              await new Promise(res => setTimeout(res, 1200));
            }
          }
        }

        if (chunkError && chunkResults.length === 0) {
          chunk.forEach(student => {
            allResults.push({
              studentId: student.studentId,
              studentName: student.studentName,
              totalScore: 0,
              maxScore: 100,
              grade: "E",
              status: "Gagal Dinilai",
              summaryPerType: [],
              items: [],
              analysis: `Gagal dinilai otomatis: ${chunkError}`,
              feedback: "Perlu penilaian manual.",
              suggestions: "Silakan periksa jawaban siswa.",
              success: false,
              error: chunkError || undefined
            });
          });
        } else {
          allResults.push(...chunkResults);
        }
      }

      setBatchResults(allResults);

      // Initialize review scores state & selection
      const initialReviewed: Record<string, number> = {};
      const allResultIds: string[] = [];

      allResults.forEach(r => {
        initialReviewed[r.studentId] = r.totalScore;
        if (r.success) {
          allResultIds.push(r.studentId);
        }
      });

      setReviewedScores(initialReviewed);
      setBatchSelectedForIntegration(allResultIds);

      // Scroll smoothly down to review section
      setTimeout(() => {
        const reviewEl = document.getElementById("batch-review-section");
        if (reviewEl) {
          reviewEl.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);

    } catch (err: any) {
      console.error("Batch grading error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses penilaian massal.");
    } finally {
      setLoading(false);
    }
  };

  // Update reviewed score inline
  const handleScoreChange = (studentId: string, value: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setReviewedScores(prev => ({
      ...prev,
      [studentId]: num
    }));
  };

  // Toggle selection for integration
  const toggleSelectStudentForIntegration = (studentId: string) => {
    setBatchSelectedForIntegration(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllForIntegration = (select: boolean) => {
    if (select) {
      setBatchSelectedForIntegration(batchResults.filter(r => r.success).map(r => r.studentId));
    } else {
      setBatchSelectedForIntegration([]);
    }
  };

  // Filtered Review Results
  const filteredReviewResults = useMemo(() => {
    return batchResults.filter(r => {
      const matchesSearch = r.studentName.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.absenNo && r.absenNo.toString().includes(reviewSearch)) ||
        (r.nis && r.nis.toLowerCase().includes(reviewSearch.toLowerCase()));
      const currentScore = reviewedScores[r.studentId] ?? r.totalScore;
      const isPassed = currentScore >= 75;

      if (!matchesSearch) return false;
      if (reviewFilter === "passed") return isPassed;
      if (reviewFilter === "remedial") return !isPassed;
      return true;
    });
  }, [batchResults, reviewSearch, reviewFilter, reviewedScores]);

  // Summary Metrics for Batch
  const batchStats = useMemo(() => {
    if (batchResults.length === 0) return { avg: 0, highest: 0, lowest: 0, passRate: 0, passedCount: 0 };
    
    let sum = 0;
    let highest = 0;
    let lowest = 100;
    let passedCount = 0;

    batchResults.forEach(r => {
      const score = reviewedScores[r.studentId] ?? r.totalScore;
      sum += score;
      if (score > highest) highest = score;
      if (score < lowest) lowest = score;
      if (score >= 75) passedCount++;
    });

    const avg = Math.round(sum / batchResults.length);
    const passRate = Math.round((passedCount / batchResults.length) * 100);

    return { avg, highest, lowest: lowest === 100 && batchResults.length === 0 ? 0 : lowest, passRate, passedCount };
  }, [batchResults, reviewedScores]);

  // Integrate Batch Results to Gradebook (Daftar Nilai)
  const handleExecuteBatchIntegration = () => {
    if (batchSelectedForIntegration.length === 0) {
      alert("Pilih minimal satu siswa yang akan diintegrasikan ke Daftar Nilai.");
      return;
    }

    const payload = batchSelectedForIntegration.map(studentId => {
      const resultObj = batchResults.find(r => r.studentId === studentId);
      const finalScore = reviewedScores[studentId] ?? resultObj?.totalScore ?? 80;
      return {
        studentId,
        studentName: resultObj?.studentName || "Siswa",
        score: finalScore,
        aiAnalysis: resultObj
      };
    });

    let targetType: "assignment" | "midterm" | "exam" = "assignment";
    if (integrationTarget === "midterm") targetType = "midterm";
    if (integrationTarget === "exam") targetType = "exam";

    const customTitle = integrationTarget === "new_assignment" 
      ? (newAssignmentTitle || `${subject} - Penilaian AI (${new Date().toLocaleDateString("id-ID")})`)
      : undefined;

    if (onApplyBatchGrades) {
      onApplyBatchGrades(
        selectedAssignmentId,
        payload,
        targetType,
        customTitle,
        selectedClass
      );
    } else {
      // Fallback single apply in loop
      payload.forEach(item => {
        onApplyGrade(selectedAssignmentId, item.studentId, item.score, item.aiAnalysis);
      });
    }

    setIntegrationSuccessModal({
      count: payload.length,
      target: integrationTarget === "midterm" ? "PTS (Tengah Semester)" : integrationTarget === "exam" ? "PAS (Ujian Akhir)" : (customTitle || "Tugas / Ulangan Terpilih")
    });
  };

  // Single Apply Grade
  const handleApplySingleGrade = () => {
    if (!singleResult || !selectedAssignmentId || !activeStudentId) return;
    
    const finalScore = parseFloat(editableScore) || singleResult.totalScore;
    onApplyGrade(selectedAssignmentId, activeStudentId, finalScore, singleResult);
    setApplySuccess(true);
    setTimeout(() => setApplySuccess(false), 3000);
  };

  // Export Review Results to Excel
  const handleExportBatchToExcel = () => {
    if (batchResults.length === 0) return;

    const dataRows = batchResults.map((r, i) => {
      const score = reviewedScores[r.studentId] ?? r.totalScore;
      return {
        "No. Absen": r.absenNo || (i + 1),
        "NIS": r.nis || "-",
        "Nama Siswa": r.studentName,
        "Kelas": selectedClass,
        "Mata Pelajaran": subject,
        "Nilai Akhir": score,
        "Predikat": score >= 90 ? "A" : score >= 80 ? "B" : score >= 75 ? "C" : score >= 60 ? "D" : "E",
        "Ketuntasan": score >= 75 ? "Tuntas" : "Remidial",
        "Umpan Balik AI": r.feedback,
        "Saran Perbaikan": r.suggestions
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 25 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 40 },
      { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Penilaian AI");
    XLSX.writeFile(workbook, `Hasil_Penilaian_AI_${selectedClass}_${subject.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(""), 2000);
  };

  return (
    <div className="space-y-6" id="penilaian-ai-section">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-xl md:text-2xl font-black font-display flex items-center gap-2.5">
              <Cpu className="animate-pulse text-amber-300" size={26} /> Penilaian & Koreksi AI (5 Bentuk Soal)
            </h2>
            <p className="text-indigo-100 text-xs md:text-sm font-medium max-w-2xl">
              Koreksi otomatis <b>Pilihan Ganda, PG Kompleks, Benar/Salah, Isian Singkat, & Uraian</b> dengan dukungan <b>Penilaian Massal Satu Kelas</b>, Review Nilai Interaktif, dan <b>Integrasi Langsung ke Daftar Nilai</b>.
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 shrink-0">
            <Sparkles size={14} className="text-amber-300" />
            <span>Gemini 3.1 Pro (Kecepatan Tinggi)</span>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Bar: Penilaian Massal vs Mandiri */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setAssessmentMode("batch")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              assessmentMode === "batch"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={16} />
            <span>Penilaian Massal (Satu Kelas)</span>
            <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setAssessmentMode("single")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              assessmentMode === "single"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User size={16} />
            <span>Koreksi Mandiri (Per Siswa)</span>
          </button>
        </div>

        {/* Quick Help & Status */}
        <div className="text-xs text-slate-500 font-semibold flex items-center gap-2 px-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Siap Mengoreksi 5 Tipe Soal Terintegrasi</span>
        </div>
      </div>

      {/* Main Form & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Question Types & Answer Keys (Shared for Both Modes) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Class & Subject Selector */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User size={16} className="text-indigo-600" /> Data Kelas & Penugasan
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Mata Pelajaran</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ekonomi / Matematika"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Assignment Selection */}
            {classAssignments.length > 0 && (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hubungkan dengan Tugas / Ulangan</label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => {
                    setSelectedAssignmentId(e.target.value);
                    const found = assignments.find(a => a.id === e.target.value);
                    if (found) setSubject(found.title);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {classAssignments.map(assign => (
                    <option key={assign.id} value={assign.id}>
                      {assign.title} ({assign.category || "Tugas"} - {assign.className})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Question Types Selection */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListChecks size={16} className="text-indigo-600" /> Bentuk Soal yang Dikoreksi
              </label>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">5 Bentuk Soal</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: "Pilihan Ganda (PG)", label: "PG (Pilihan Ganda)", icon: "🔘" },
                { id: "PG Kompleks", label: "PG Kompleks", icon: "🔲" },
                { id: "PG Benar / Salah", label: "Benar / Salah", icon: "🌗" },
                { id: "Isian Singkat", label: "Isian Singkat", icon: "✏️" },
                { id: "Uraian / Esai", label: "Uraian / Esai", icon: "📝" }
              ].map(q => {
                const isSelected = selectedQuestionTypes.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggleQuestionType(q.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-extrabold"
                        : "bg-slate-50 border-slate-200 text-slate-500 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span>{q.icon}</span>
                    <span className="truncate">{q.label}</span>
                    {isSelected && <Check size={14} className="ml-auto text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kunci Jawaban Guru Accordion */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={16} className="text-emerald-600" /> Kunci Jawaban & Rubrik Guru
              </h3>
              <div className="flex items-center gap-1.5">
                <label className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold cursor-pointer flex items-center gap-1 transition-all" title="Impor Kunci Jawaban (PDF, Excel, JSON, TXT)">
                  <FileUp size={12} /> {isImportingKey ? "Membaca..." : "Impor"}
                  <input type="file" accept=".json,.txt,.xlsx,.xls,.csv,.pdf,application/pdf" onChange={handleImportAnswerKey} className="hidden" disabled={isImportingKey} />
                </label>
                <button
                  type="button"
                  onClick={handleExportAnswerKey}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                  title="Unduh Kunci Jawaban"
                >
                  <Download size={12} /> Ekspor
                </button>
              </div>
            </div>

            {isImportingKey && (
              <div className="p-2 bg-indigo-50 text-indigo-800 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-pulse">
                <RefreshCw size={14} className="animate-spin text-indigo-600" /> Memproses file (PDF / Excel / AI) ...
              </div>
            )}

            {importKeySuccess && (
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Kunci jawaban berhasil diimpor!
              </div>
            )}

            {selectedQuestionTypes.includes("Pilihan Ganda (PG)") && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <span>🔘 Kunci PG</span>
                  <span className="text-[9px] text-slate-400 font-normal">(cth: 1. A, 2. B, 3. C, 4. D)</span>
                </label>
                <input
                  type="text"
                  value={kunciPG}
                  onChange={(e) => setKunciPG(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            )}

            {selectedQuestionTypes.includes("PG Kompleks") && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <span>🔲 Kunci PG Kompleks</span>
                  <span className="text-[9px] text-slate-400 font-normal">(cth: 1. A,C,D; 2. B,D)</span>
                </label>
                <input
                  type="text"
                  value={kunciPGKompleks}
                  onChange={(e) => setKunciPGKompleks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            )}

            {selectedQuestionTypes.includes("PG Benar / Salah") && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <span>🌗 Kunci Benar / Salah</span>
                  <span className="text-[9px] text-slate-400 font-normal">(cth: 1. Benar, 2. Salah)</span>
                </label>
                <input
                  type="text"
                  value={kunciBenarSalah}
                  onChange={(e) => setKunciBenarSalah(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            )}

            {selectedQuestionTypes.includes("Isian Singkat") && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <span>✏️ Kunci Isian Singkat</span>
                  <span className="text-[9px] text-slate-400 font-normal">(cth: 1. Inflasi, 2. Demand)</span>
                </label>
                <input
                  type="text"
                  value={kunciIsian}
                  onChange={(e) => setKunciIsian(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            )}

            {selectedQuestionTypes.includes("Uraian / Esai") && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  <span>📝 Kunci Uraian & Rubrik</span>
                </label>
                <textarea
                  rows={2}
                  value={kunciUraian}
                  onChange={(e) => setKunciUraian(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Input Controls depending on Mode */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* BATCH MODE INPUT PANEL */}
          {assessmentMode === "batch" ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-indigo-600" />
                    Penilaian Massal Siswa ({classStudents.length} Siswa di Kelas {selectedClass})
                  </h3>
                  <p className="text-xs text-slate-500">Pilih sumber masukan jawaban siswa untuk dinilai secara serempak oleh AI.</p>
                </div>
              </div>

              {/* Batch Input Method Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBatchInputMethod("bundle_pdf")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchInputMethod === "bundle_pdf"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles size={14} className={batchInputMethod === "bundle_pdf" ? "text-amber-300" : "text-indigo-500"} />
                  <span className="truncate">1 Berkas Bundel (PDF/Foto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchInputMethod("class_list")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchInputMethod === "class_list"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ListChecks size={14} />
                  <span className="truncate">Daftar Kelas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchInputMethod("multi_file")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchInputMethod === "multi_file"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload size={14} />
                  <span className="truncate">Banyak File (PDF/Foto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchInputMethod("quick_text")}
                  className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    batchInputMethod === "quick_text"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={14} />
                  <span className="truncate">Teks / Tabel Cepat</span>
                </button>
              </div>

              {/* Tab 0: Single Bundle PDF / Image (Multi-Siswa + Kunci Jawaban) */}
              {batchInputMethod === "bundle_pdf" && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-extrabold text-indigo-900">
                      <Sparkles size={16} className="text-indigo-600 shrink-0" />
                      <span>Pemindaian Bundel PDF / Foto Otomatis (Multi-Siswa & Kunci Jawaban)</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Unggah <b>satu file PDF atau foto/gambar</b> (JPG, PNG, WEBP, HEIC) yang berisi scan/foto lembar jawaban banyak anak sekaligus (dan kunci jawaban jika ada di dalam berkas). AI akan secara cerdas <b>mendeteksi dan menghitung jumlah lembar jawaban anak</b>, mengelompokkan per siswa, serta mengoreksi seluruh siswa secara otomatis.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30 rounded-3xl p-6 transition-all text-center relative group cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.heic"
                      onChange={handleBundlePdfUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                        <FileUp size={28} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          {bundlePdfFile ? bundlePdfFile.name : "Klik atau seret File PDF / Foto Gambar Bundel Lembar Jawaban Siswa ke sini"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {bundlePdfFile
                            ? `${(bundlePdfFile.size / (1024 * 1024)).toFixed(2)} MB • Format ${bundlePdfMimeType.includes('pdf') ? 'PDF' : 'Gambar'} Siap dipindai & dihitung oleh AI`
                            : "Mendukung 1 file PDF atau Foto/Gambar (JPG, PNG, WEBP, HEIC) berisi multi-siswa sekaligus (Maks. 30 MB)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {bundlePdfFile && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold truncate">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <span className="truncate">File terpilih: <b>{bundlePdfFile.name}</b></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBundlePdfFile(null);
                          setBundlePdfBase64("");
                          setDetectedSheetCount(null);
                          setBundleSummary("");
                        }}
                        className="text-xs text-rose-600 hover:underline font-bold ml-2 shrink-0 cursor-pointer"
                      >
                        Ganti File
                      </button>
                    </div>
                  )}

                  {detectedSheetCount !== null && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-900">
                        <CheckSquare size={16} className="text-indigo-600" />
                        <span>Hasil Deteksi Bundel: Ditemukan {detectedSheetCount} Lembar Jawaban Siswa</span>
                      </div>
                      {bundleSummary && (
                        <p className="text-xs text-slate-600">{bundleSummary}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 1: Class List Student by Student */}
              {batchInputMethod === "class_list" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="select-all-batch"
                        checked={selectedStudentsForBatch.length === classStudents.length && classStudents.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentsForBatch(classStudents.map(s => s.id));
                          } else {
                            setSelectedStudentsForBatch([]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="select-all-batch" className="font-bold text-slate-700 cursor-pointer">
                        Pilih Semua Siswa ({selectedStudentsForBatch.length}/{classStudents.length})
                      </label>
                    </div>
                    <span className="text-[11px] text-slate-400">Klik siswa untuk melihat/mengubah jawaban</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                    {classStudents.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">Tidak ada data siswa di kelas ini.</div>
                    ) : (
                      classStudents.map((student, idx) => {
                        const isChecked = selectedStudentsForBatch.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            className={`p-3 rounded-xl border transition-all ${
                              isChecked
                                ? "bg-white border-indigo-200 shadow-xs"
                                : "bg-slate-100/60 border-slate-200 opacity-60"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedStudentsForBatch(prev =>
                                      prev.includes(student.id)
                                        ? prev.filter(id => id !== student.id)
                                        : [...prev, student.id]
                                    );
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-800">{idx + 1}. {student.name}</span>
                                  <span className="text-[10px] text-slate-400 ml-2 font-mono">NIS: {student.nis}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <label className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0">
                                  <Upload size={12} />
                                  <span className="hidden sm:inline">Upload</span> Berkas
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.heic"
                                    onChange={(e) => handleStudentFileUpload(student.id, student.name, e)}
                                    className="hidden"
                                  />
                                </label>
                                
                                <label className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0">
                                  <Camera size={12} />
                                  <span className="hidden sm:inline">Ambil</span> Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleStudentFileUpload(student.id, student.name, e)}
                                    className="hidden"
                                  />
                                </label>

                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                                  {batchStudentAnswers[student.id]?.length || 0} karakter
                                </span>
                              </div>
                            </div>

                            {studentUploadedFiles[student.id] && (
                              <div className="mt-2 flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-xs text-emerald-900">
                                <div className="flex items-center gap-1.5 truncate">
                                  <FileCheck2 size={14} className="text-emerald-600 shrink-0" />
                                  <span className="font-bold truncate max-w-[180px]">{studentUploadedFiles[student.id].name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleRunOCRForStudent(student.id, student.name)}
                                    disabled={ocrLoadingStudentId === student.id}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Pindai Teks Jawaban dengan AI Vision"
                                  >
                                    <Sparkles size={11} className={ocrLoadingStudentId === student.id ? "animate-spin" : ""} />
                                    <span>{ocrLoadingStudentId === student.id ? "Memindai..." : "Pindai OCR AI"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStudentUploadedFiles(prev => {
                                        const next = { ...prev };
                                        delete next[student.id];
                                        return next;
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Hapus berkas"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {isChecked && (
                              <textarea
                                rows={2}
                                value={batchStudentAnswers[student.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchStudentAnswers(prev => ({ ...prev, [student.id]: val }));
                                }}
                                placeholder={`Jawaban ${student.name} (PG, PG Komp, Benar/Salah, Isian, Uraian)...`}
                                className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-mono focus:bg-white resize-none text-slate-700"
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Multi-File / Image / PDF Upload */}
              {batchInputMethod === "multi_file" && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-6 transition-all text-center relative group cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.heic"
                      onChange={handleMultiFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-700">
                          Klik untuk memilih Banyak Berkas PDF / Foto Gambar Sekaligus (Multi-Select)
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mendukung PDF, JPG, PNG, WEBP, HEIC. Sistem memetakan otomatis ke siswa di kelas {selectedClass}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {batchUploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Berkas Terlampir ({batchUploadedFiles.length} file)</span>
                        <button
                          type="button"
                          onClick={() => setBatchUploadedFiles([])}
                          className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                        {batchUploadedFiles.map((bf, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <FileCheck2 size={14} className="text-indigo-600 shrink-0" />
                              <span className="font-bold text-slate-800 truncate">{bf.studentName}</span>
                              <span className="text-[10px] text-slate-400 truncate">({bf.file.name})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBatchUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Quick Text Input */}
              {batchInputMethod === "quick_text" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Tempelkan Daftar Jawaban Siswa</span>
                    <span className="text-[10px] text-slate-400">Format: Nama Siswa: Jawaban</span>
                  </div>
                  <textarea
                    rows={6}
                    value={quickTextContent}
                    onChange={(e) => setQuickTextContent(e.target.value)}
                    placeholder={`Contoh:\nAhmad Fauzi : 1.A, 2.C, 3.B, 4.D, 5.E | Uraian: Inflasi adalah kenaikan harga secara umum.\nBudi Santoso : 1.A, 2.B, 3.B, 4.D, 5.E | Uraian: Inflasi terjadi akibat uang berlebih.\nCitra Dewi : 1.A, 2.C, 3.B, 4.A, 5.E`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 leading-relaxed"
                  />
                </div>
              )}

              {/* Batch Action Buttons & Trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {error ? (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                ) : <div />}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBatchAIEvaluation}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:opacity-95 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Cpu size={18} className={loading ? "animate-spin" : ""} />
                  {loading 
                    ? "Memproses Penilaian AI..." 
                    : batchInputMethod === "bundle_pdf" 
                    ? (bundlePdfFile ? `Pindai & Koreksi PDF Bundel (${bundlePdfFile.name})` : "Pindai & Koreksi 1 PDF Bundel Multi-Siswa")
                    : batchInputMethod === "multi_file"
                    ? `Mulai Koreksi (${batchUploadedFiles.length} Berkas)`
                    : `Mulai Koreksi Massal (${selectedStudentsForBatch.length} Siswa)`}
                </motion.button>
              </div>
            </div>
          ) : (
            /* SINGLE MODE INPUT PANEL */
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMethod("scan_pdf")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === "scan_pdf"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileUp size={15} />
                  Pindai PDF / Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("manual")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    method === "manual"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={15} />
                  Input Teks Manual
                </button>
              </div>

              {/* Single Mode: Submission Selection from App state */}
              {classAssignments.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Siswa Terdaftar</label>
                  <select
                    value={selectedSubmissionId}
                    onChange={(e) => handleSubmissionSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Mode Bebas / Nama Manual --</option>
                    {assignmentSubmissions.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.studentName} ({sub.status === "Selesai" ? "Nilai: " + sub.score : "Belum Dinilai"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Siswa</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Ahmad Dani"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {method === "scan_pdf" ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-6 transition-all text-center relative group cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.heic"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileUp size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-700">
                          {uploadedFile ? uploadedFile.name : "Klik atau seret file Lembar Jawaban PDF / Foto Gambar ke sini"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {uploadedFile 
                            ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB - Siap dipindai AI` 
                            : "Mendukung format PDF, PNG, JPG, WEBP, HEIC (Maks. 20 MB)"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {uploadedFile && (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span>File terlampir: {uploadedFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setFileBase64("");
                        }}
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Jawaban Siswa (Teks)</label>
                  <textarea
                    rows={5}
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Tempelkan atau ketik jawaban siswa di sini..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 leading-relaxed"
                  />
                </div>
              )}

              {/* Single Trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {error ? (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                ) : <div />}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSingleAIEvaluation}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:opacity-95 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Cpu size={18} className={loading ? "animate-spin" : ""} />
                  {loading ? "Memproses Koreksi AI..." : "Mulai Koreksi Siswa Ini"}
                </motion.button>
              </div>
            </div>
          )}

          {/* Loading Animation Panel */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <Sparkles className="absolute text-indigo-600 animate-pulse" size={24} />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm font-display">
                  {assessmentMode === "batch" ? "EduAsisten AI Sedang Mengoreksi Seluruh Kelas" : "EduAsisten AI Sedang Mengoreksi Lembar Jawaban"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Menerapkan pembobotan adil untuk PG, PG Kompleks, Benar/Salah, Isian Singkat & Uraian.
                </p>
              </div>
              
              <div className="text-xs text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full animate-pulse">
                Menilai presisi & cepat dengan model Gemini 3.1 Pro...
              </div>
            </motion.div>
          )}

          {/* SINGLE MODE RESULT VIEW */}
          {assessmentMode === "single" && singleResult && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score Header Card */}
              <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-white/10 px-2.5 py-1 rounded-md">
                      Hasil Koreksi AI
                    </span>
                    {singleResult.absenNo && (
                      <span className="text-[10px] font-black text-white bg-indigo-500/50 px-2.5 py-1 rounded-md font-mono">
                        No. Absen #{String(singleResult.absenNo).padStart(2, '0')}
                      </span>
                    )}
                    {singleResult.nis && (
                      <span className="text-[10px] font-medium text-indigo-200 bg-white/10 px-2.5 py-1 rounded-md font-mono">
                        NIS: {singleResult.nis}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black font-display">{singleResult.studentName}</h3>
                  <p className="text-xs text-indigo-100 font-medium">
                    Mapel: <b>{subject}</b> ({selectedClass})
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0">
                  <div className="text-center">
                    <span className="text-xs font-bold text-indigo-100 block">Skor Total</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black font-display text-amber-300">{singleResult.totalScore}</span>
                      <span className="text-xs text-indigo-200">/ 100</span>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="text-center">
                    <span className="text-xs font-bold text-indigo-100 block">Predikat</span>
                    <span className="text-2xl font-black font-display text-white">{singleResult.grade || "A"}</span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              {singleResult.items && singleResult.items.length > 0 && (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3 overflow-hidden">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Detail Koreksi per Nomor Soal
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="p-2.5 text-center">No</th>
                          <th className="p-2.5">Bentuk Soal</th>
                          <th className="p-2.5">Jawaban Siswa</th>
                          <th className="p-2.5">Kunci Jawaban</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-center">Skor</th>
                          <th className="p-2.5">Catatan Koreksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {singleResult.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-center font-bold text-slate-500">{item.no || idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">{item.type}</td>
                            <td className="p-2.5 font-mono text-[11px]">{item.studentAnswer}</td>
                            <td className="p-2.5 font-mono text-[11px] text-emerald-700">{item.answerKey}</td>
                            <td className="p-2.5 text-center font-bold">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                                item.status?.toLowerCase().includes("benar") && !item.status?.toLowerCase().includes("sebagian")
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status?.toLowerCase().includes("sebagian")
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold">{item.score}/{item.maxScore}</td>
                            <td className="p-2.5 text-[11px] text-slate-600">{item.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Single Mode Apply to Gradebook */}
              {activeStudentId && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <CheckCircle size={16} className="text-indigo-600" />
                    <span>Terapkan nilai {singleResult.totalScore} ke buku nilai {activeStudentName}?</span>
                  </div>
                  <button
                    onClick={handleApplySingleGrade}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Simpan ke Buku Nilai
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION REVIEW & INTEGRASI HASIL PENILAIAN MASSAL                        */}
      {/* ========================================================================= */}
      {assessmentMode === "batch" && batchResults.length > 0 && (
        <motion.div
          id="batch-review-section"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-6 border-t border-slate-200"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Rata-Rata Nilai</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700 font-display">{batchStats.avg}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Kelas {selectedClass}</span>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Ketuntasan (KKTP 75)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600 font-display">{batchStats.passRate}%</span>
                <span className="text-xs text-slate-400">({batchStats.passedCount} siswa)</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Tuntas Belajar</span>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Nilai Tertinggi</span>
              <div className="mt-2">
                <span className="text-3xl font-black text-amber-600 font-display">{batchStats.highest}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Skor Maksimal</span>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Nilai Terendah</span>
              <div className="mt-2">
                <span className="text-3xl font-black text-rose-600 font-display">{batchStats.lowest}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Perlu Perhatian</span>
            </div>
          </div>

          {/* Interactive Review Table Container */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            
            {/* Table Header & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BookmarkCheck size={20} className="text-indigo-600" />
                  Review & Verifikasi Hasil Penilaian AI
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa hasil koreksi AI per siswa. Nama dan identitas siswa dicocokkan otomatis berdasarkan <b>No. Absen</b> pada lembar jawaban. Anda dapat mengubah nilai secara manual di kolom <b>Nilai Akhir</b> sebelum mengintegrasikannya ke Buku Nilai.
                </p>
              </div>

              {/* Action Tools */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Cari nama, absen, NIS..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setReviewFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      reviewFilter === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Semua ({batchResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("passed")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      reviewFilter === "passed" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Tuntas
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("remedial")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      reviewFilter === "remedial" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Remedial
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportBatchToExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Download size={13} />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>

            {/* OCR Info Banner */}
            <div className="flex items-center gap-2 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900">
              <Sparkles size={15} className="text-indigo-600 shrink-0" />
              <span>
                <b>Parameter OCR Presensi Aktif:</b> AI membaca nomor absen pada lembar jawaban untuk mengambil data nama lengkap & NIS siswa secara presisi dari daftar presensi kelas <b>{selectedClass}</b>.
              </span>
            </div>

            {/* Review Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={batchSelectedForIntegration.length === batchResults.length && batchResults.length > 0}
                        onChange={(e) => handleSelectAllForIntegration(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-center w-10">Review</th>
                    <th className="p-3 text-center w-20">No. Absen</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center">Skor PG</th>
                    <th className="p-3 text-center">PG Komp</th>
                    <th className="p-3 text-center">B / S</th>
                    <th className="p-3 text-center">Isian</th>
                    <th className="p-3 text-center">Uraian</th>
                    <th className="p-3 text-center w-28 bg-indigo-50/50 text-indigo-900">Nilai Akhir (Edit)</th>
                    <th className="p-3 text-center">Predikat</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Rincian AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReviewResults.map((r, idx) => {
                    const isSelected = batchSelectedForIntegration.includes(r.studentId);
                    const isExpanded = expandedStudentIds.includes(r.studentId);
                    const currentScore = reviewedScores[r.studentId] ?? r.totalScore;
                    const isPassed = currentScore >= 75;

                    // Breakdown sub-scores
                    const pgScore = r.summaryPerType?.find(s => s.type.toLowerCase().includes("pg") && !s.type.toLowerCase().includes("kompleks"))?.score ?? "-";
                    const pgKompScore = r.summaryPerType?.find(s => s.type.toLowerCase().includes("kompleks"))?.score ?? "-";
                    const bsScore = r.summaryPerType?.find(s => s.type.toLowerCase().includes("benar"))?.score ?? "-";
                    const isianScore = r.summaryPerType?.find(s => s.type.toLowerCase().includes("isian"))?.score ?? "-";
                    const uraianScore = r.summaryPerType?.find(s => s.type.toLowerCase().includes("uraian"))?.score ?? "-";

                    const displayAbsen = r.absenNo ? String(r.absenNo).padStart(2, '0') : String(idx + 1).padStart(2, '0');

                    return (
                      <Fragment key={r.studentId}>
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? "bg-indigo-50/30" : ""
                          } ${isExpanded ? "bg-indigo-50/10 border-b-0" : ""}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudentForIntegration(r.studentId)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedStudentIds(prev =>
                                  prev.includes(r.studentId)
                                    ? prev.filter(id => id !== r.studentId)
                                    : [...prev, r.studentId]
                                );
                              }}
                              title="Tampilkan perbandingan jawaban dan kunci jawaban"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer flex items-center justify-center mx-auto"
                            >
                              {isExpanded ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-mono text-[11px] font-black">
                              #{displayAbsen}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900">{r.studentName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{selectedClass}</span>
                              {r.nis && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">NIS: {r.nis}</span>
                                </>
                              )}
                              {r.pageRange && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 font-semibold">{r.pageRange}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold text-slate-600">{pgScore}</td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold text-slate-600">{pgKompScore}</td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold text-slate-600">{bsScore}</td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold text-slate-600">{isianScore}</td>
                          <td className="p-3 text-center font-mono text-[11px] font-bold text-slate-600">{uraianScore}</td>
                          
                          {/* Editable Final Score Cell */}
                          <td className="p-2 text-center bg-indigo-50/30">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentScore}
                                onChange={(e) => handleScoreChange(r.studentId, e.target.value)}
                                className="w-16 text-center font-black text-indigo-800 bg-white border border-indigo-200 rounded-lg py-1 px-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <Edit3 size={11} className="text-indigo-400" />
                            </div>
                          </td>

                          {/* Grade Letter */}
                          <td className="p-3 text-center font-black text-slate-800">
                            {currentScore >= 90 ? "A" : currentScore >= 80 ? "B" : currentScore >= 75 ? "C" : currentScore >= 60 ? "D" : "E"}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isPassed
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {isPassed ? "Tuntas" : "Remidial"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenStudentDetailModal(r)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Eye size={12} /> Detail Koreksi
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Per-Item Comparison View */}
                        {isExpanded && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={13} className="p-4 bg-indigo-50/10">
                              <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                      Analisis Jawaban & Kunci Jawaban: {r.studentName}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                    NILAI: {currentScore} / {r.maxScore} ({r.grade})
                                  </span>
                                </div>

                                {r.items && r.items.length > 0 ? (
                                  <div className="overflow-hidden border border-slate-200 rounded-xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                                          <th className="p-2.5 text-center w-12">No</th>
                                          <th className="p-2.5 w-32">Bentuk Soal</th>
                                          <th className="p-2.5">Jawaban Siswa (Hasil OCR)</th>
                                          <th className="p-2.5">Kunci Jawaban Patokan</th>
                                          <th className="p-2.5 text-center w-24">Status</th>
                                          <th className="p-2.5 text-center w-16">Skor</th>
                                          <th className="p-2.5">Uraian/Catatan</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-600">
                                        {r.items.map((item, itemIdx) => {
                                          const isItemCorrect = item.status?.toLowerCase().includes("benar") && !item.status?.toLowerCase().includes("sebagian");
                                          const isItemPartial = item.status?.toLowerCase().includes("sebagian") || item.status?.toLowerCase().includes("kurang");
                                          
                                          return (
                                            <tr key={itemIdx} className="hover:bg-slate-50/50">
                                              <td className="p-2.5 text-center font-bold text-slate-400">{item.no || itemIdx + 1}</td>
                                              <td className="p-2.5 font-bold text-slate-700 text-[11px]">{item.type}</td>
                                              <td className="p-2.5 font-mono text-[11px] bg-slate-50/50 text-slate-800 break-words max-w-[200px]">
                                                {item.studentAnswer || <span className="text-slate-400 italic">Kosong/tidak terbaca</span>}
                                              </td>
                                              <td className="p-2.5 font-mono text-[11px] text-emerald-800 bg-emerald-50/10 break-words max-w-[200px]">
                                                {item.answerKey || "-"}
                                              </td>
                                              <td className="p-2.5 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                                                  isItemCorrect
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : isItemPartial
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-rose-100 text-rose-800"
                                                }`}>
                                                  {item.status || "Salah"}
                                                </span>
                                              </td>
                                              <td className="p-2.5 text-center font-bold text-slate-700">
                                                {item.score} / {item.maxScore}
                                              </td>
                                              <td className="p-2.5 text-[11px] text-slate-500 max-w-[250px] truncate" title={item.note}>
                                                {item.note || "-"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                                    Detail per butir soal tidak ditemukan atau tidak berhasil diekstraksi.
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                  <div className="bg-indigo-50/30 border border-indigo-100/70 rounded-xl p-3.5 space-y-1">
                                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">Umpan Balik AI</span>
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      {r.feedback || "Tidak ada umpan balik tersedia."}
                                    </p>
                                  </div>
                                  <div className="bg-amber-50/30 border border-amber-100/70 rounded-xl p-3.5 space-y-1">
                                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Rekomendasi Tindak Lanjut</span>
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      {r.suggestions || "Tidak ada rekomendasi tersedia."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ========================================================================= */}
            {/* INTEGRATION ACTION BAR                                                   */}
            {/* ========================================================================= */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Layers size={18} className="text-amber-300" />
                    Integrasikan Nilai Terverifikasi ke Daftar Nilai (Buku Nilai)
                  </h4>
                  <p className="text-xs text-indigo-200">
                    Nilai dari <b>{batchSelectedForIntegration.length} siswa terpilih</b> akan langsung dicatat ke Buku Nilai, disimpan di penyimpanan offline & disinkronkan ke Cloud Firestore.
                  </p>
                </div>

                {/* Target Selection in Gradebook */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-indigo-200 pl-2">Tujuan Kolom:</span>
                    <select
                      value={integrationTarget}
                      onChange={(e: any) => setIntegrationTarget(e.target.value)}
                      className="bg-white text-slate-900 font-extrabold rounded-xl px-3 py-1.5 text-xs cursor-pointer focus:outline-hidden"
                    >
                      {classAssignments.length > 0 && (
                        <option value="selected_assignment">📌 Tugas Terpilih ({classAssignments.find(a => a.id === selectedAssignmentId)?.title || "Tugas"})</option>
                      )}
                      <option value="new_assignment">➕ Buat Kolom Tugas / Ulangan Baru</option>
                      <option value="midterm">📊 Nilai Tengah Semester (PTS)</option>
                      <option value="exam">🏆 Nilai Ujian Akhir (PAS)</option>
                    </select>
                  </div>

                  {integrationTarget === "new_assignment" && (
                    <input
                      type="text"
                      value={newAssignmentTitle}
                      onChange={(e) => setNewAssignmentTitle(e.target.value)}
                      placeholder="Nama Ulangan / Tugas Baru..."
                      className="bg-white text-slate-900 font-bold rounded-xl px-3 py-1.5 text-xs placeholder:text-slate-400 focus:outline-hidden"
                    />
                  )}

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExecuteBatchIntegration}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <CheckCircle size={15} />
                    <span>Terapkan ke Daftar Nilai Sekarang ({batchSelectedForIntegration.length} Siswa)</span>
                  </motion.button>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT DETAIL MODAL (REVIEW PER BUTIR SOAL & FEEDBACK)                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {detailModalStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-indigo-700 to-violet-800 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-white/10 px-2 py-0.5 rounded-md">
                      Rincian Koreksi Siswa
                    </span>
                    {detailModalStudent.absenNo && (
                      <span className="text-[10px] font-black text-white bg-indigo-500/50 px-2 py-0.5 rounded-md font-mono">
                        No. Absen #{String(detailModalStudent.absenNo).padStart(2, '0')}
                      </span>
                    )}
                    {detailModalStudent.nis && (
                      <span className="text-[10px] font-medium text-indigo-200 bg-white/10 px-2 py-0.5 rounded-md font-mono">
                        NIS: {detailModalStudent.nis}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black font-display mt-1">{detailModalStudent.studentName}</h3>
                  <p className="text-xs text-indigo-100">
                    Kelas: <b>{selectedClass}</b> • Mata Pelajaran: <b>{subject}</b>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!isEditingStudentAnswers) {
                        setEditedItems(detailModalStudent.items ? JSON.parse(JSON.stringify(detailModalStudent.items)) : []);
                      }
                      setIsEditingStudentAnswers(!isEditingStudentAnswers);
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Edit3 size={14} />
                    <span>{isEditingStudentAnswers ? "Batal Edit" : "Ubah Jawaban Siswa"}</span>
                  </button>
                  <div className="text-right bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                    <span className="text-[10px] block text-indigo-200">Skor Total</span>
                    <span className="text-xl font-black text-amber-300 font-display">
                      {reviewedScores[detailModalStudent.studentId] ?? detailModalStudent.totalScore}
                    </span>
                  </div>
                  <button
                    onClick={() => setDetailModalStudent(null)}
                    className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Edit Mode Alert Banner */}
                {isEditingStudentAnswers && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 font-bold">
                      <Edit3 size={16} className="text-amber-600 shrink-0" />
                      <span>Mode Edit Jawaban Siswa: Ubah jawaban per nomor pada tabel di bawah, lalu klik "Simpan & Hitung Ulang Nilai".</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecalculateEditedAnswers}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                    >
                      <Check size={14} /> Simpan & Hitung Ulang Nilai
                    </button>
                  </div>
                )}

                {editSuccessMsg && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-700" />
                    <span>{editSuccessMsg}</span>
                  </div>
                )}

                {/* Summary per Question Type */}
                {detailModalStudent.summaryPerType && detailModalStudent.summaryPerType.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Ringkasan Skor per Bentuk Soal
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {detailModalStudent.summaryPerType.map((sum, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600 block truncate">{sum.type}</span>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-sm font-black text-indigo-700">{sum.score} / {sum.maxScore}</span>
                            <span className="text-[9px] text-slate-400">{sum.correctCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Breakdown Table */}
                {detailModalStudent.items && detailModalStudent.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Tabel Koreksi per Nomor Soal {isEditingStudentAnswers && "(Mode Edit Aktif)"}
                      </h4>
                      {isEditingStudentAnswers && (
                        <button
                          type="button"
                          onClick={handleRecalculateEditedAnswers}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Check size={12} /> Simpan & Hitung Ulang Nilai
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                            <th className="p-2 text-center">No</th>
                            <th className="p-2">Bentuk Soal</th>
                            <th className="p-2">Jawaban Siswa</th>
                            <th className="p-2">Kunci Jawaban</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-center">Skor</th>
                            <th className="p-2">Catatan Koreksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {(isEditingStudentAnswers ? editedItems : detailModalStudent.items).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="p-2 text-center font-bold text-slate-500">{item.no || idx + 1}</td>
                              <td className="p-2 font-bold text-slate-800">{item.type}</td>
                              <td className="p-2 font-mono text-[11px]">
                                {isEditingStudentAnswers ? (
                                  <input
                                    type="text"
                                    value={item.studentAnswer}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditedItems(prev => prev.map((it, i) => i === idx ? { ...it, studentAnswer: val } : it));
                                    }}
                                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 font-mono text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30"
                                    placeholder="Jawaban..."
                                  />
                                ) : (
                                  item.studentAnswer
                                )}
                              </td>
                              <td className="p-2 font-mono text-[11px] text-emerald-700">{item.answerKey}</td>
                              <td className="p-2 text-center font-bold">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] ${
                                  item.status?.toLowerCase().includes("benar") && !item.status?.toLowerCase().includes("sebagian")
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.status?.toLowerCase().includes("sebagian")
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-2 text-center font-bold">{item.score}/{item.maxScore}</td>
                              <td className="p-2 text-[11px] text-slate-600">{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Feedback & Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">Umpan Balik AI untuk Siswa</span>
                      <button
                        onClick={() => handleCopyToClipboard(detailModalStudent.feedback, "modal-feedback")}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                      >
                        {copiedText === "modal-feedback" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{detailModalStudent.feedback}"
                    </p>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Rekomendasi Tindak Lanjut</span>
                      <button
                        onClick={() => handleCopyToClipboard(detailModalStudent.suggestions, "modal-suggestions")}
                        className="p-1 text-slate-400 hover:text-amber-600"
                      >
                        {copiedText === "modal-suggestions" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {detailModalStudent.suggestions}
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Sesuaikan Nilai Siswa Ini:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reviewedScores[detailModalStudent.studentId] ?? detailModalStudent.totalScore}
                    onChange={(e) => handleScoreChange(detailModalStudent.studentId, e.target.value)}
                    className="w-20 bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-black text-indigo-800 text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModalStudent(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Selesai Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* INTEGRATION SUCCESS DIALOG                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {integrationSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">Integrasi Nilai Berhasil!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Sebanyak <b>{integrationSuccessModal.count} nilai siswa</b> telah berhasil diterapkan ke Buku Nilai kolom <b>{integrationSuccessModal.target}</b> (Kelas {selectedClass}).
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Data telah disinkronkan secara realtime ke Cloud Firestore dan dapat diakses dari HP & Laptop.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIntegrationSuccessModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                {onNavigateToGradebook && (
                  <button
                    type="button"
                    onClick={() => {
                      setIntegrationSuccessModal(null);
                      onNavigateToGradebook(selectedClass);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Daftar Nilai Sekarang</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
