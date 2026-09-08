import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Clock, 
  CheckCircle2, 
  AlertOctagon, 
  HelpCircle, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  RotateCcw, 
  Flag, 
  Check, 
  X, 
  Key, 
  Award, 
  FileText, FileSpreadsheet, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  UserCheck, 
  Trash2, 
  Send, 
  ChevronRight, 
  ChevronLeft, 
  Columns, 
  Layers, 
  Zap, 
  Sparkles,
  BookOpen,
  ListOrdered,
  Database,
} from "lucide-react";
import { 
  EvaluationExam, 
  EvaluationQuestion, 
  EvaluationSubmission, 
  ViolationLog, 
  Student,
  QuestionBankItem 
} from "../types";
import { PRESET_EVALUATIONS } from "../data/evaluationsPreset";
import { safeStorage } from "../lib/safeStorage";
import BankSoal from "./BankSoal";

interface EvaluasiSiswaProps {
  isStudent?: boolean;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
  availableClasses?: string[];
  students?: Student[];
  subject?: string;
  teacherName?: string;
  bankQuestions?: QuestionBankItem[];
  onAddBankQuestion?: (q: QuestionBankItem) => void;
  onEditBankQuestion?: (q: QuestionBankItem) => void;
  onDeleteBankQuestion?: (id: string) => void;
  initialTab?: 'daftar' | 'bank_soal' | 'rekap_guru';
}

export default function EvaluasiSiswa({
  isStudent = false,
  currentUserRole = 'siswa',
  availableClasses = ['XII-C2', 'XII-C3', 'XII-C4', 'XII-D4'],
  students = [],
  subject = "EKONOMI",
  teacherName = "YUDI GINANJAR",
  bankQuestions = [],
  onAddBankQuestion,
  onEditBankQuestion,
  onDeleteBankQuestion,
  initialTab = 'daftar'
}: EvaluasiSiswaProps) {
  // 1. Storage State for Evaluations & Submissions
  const [evaluations, setEvaluations] = useState<EvaluationExam[]>(() => {
    const saved = safeStorage.getItem("guru_evaluations_list");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse evaluations list", e);
      }
    }
    return PRESET_EVALUATIONS;
  });

  const [submissions, setSubmissions] = useState<EvaluationSubmission[]>(() => {
    const saved = safeStorage.getItem("guru_evaluations_submissions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse submissions", e);
      }
    }
    return [];
  });

  // Save changes to local storage
  useEffect(() => {
    safeStorage.setItem("guru_evaluations_list", JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    safeStorage.setItem("guru_evaluations_submissions", JSON.stringify(submissions));
  }, [submissions]);

  // 2. Navigation & View States
  const [activeTab, setActiveTab] = useState<'daftar' | 'bank_soal' | 'rekap_guru'>(initialTab || 'daftar');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Token Modal
  const [tokenInputModalExam, setTokenInputModalExam] = useState<EvaluationExam | null>(null);
  const [enteredToken, setEnteredToken] = useState("");
  const [tokenError, setTokenError] = useState("");

  // 3. Active Exam Session State
  const [activeExam, setActiveExam] = useState<EvaluationExam | null>(null);
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [examStartedAt, setExamStartedAt] = useState<string>("");
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  // 4. Anti-Cheating & Security Lock State
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [isSecurityOverlayLocked, setIsSecurityOverlayLocked] = useState(false);
  const [securityLockReason, setSecurityLockReason] = useState("");
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  // 5. Result Viewing State
  const [viewingSubmissionResult, setViewingSubmissionResult] = useState<EvaluationSubmission | null>(null);
  const [viewingViolationsLogModal, setViewingViolationsLogModal] = useState<ViolationLog[] | null>(null);

  // 6. Create New Exam Modal State (For Teachers)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [newExamForm, setNewExamForm] = useState<{
    title: string;
    description: string;
    subject: string;
    className: string;
    durationMinutes: number;
    token: string;
    bab: string;
    isShuffleQuestions: boolean;
    isShuffleOptions: boolean;
    examPackage: string;
  }>({
    title: "",
    description: "",
    subject: subject || "EKONOMI",
    className: "Semua Kelas",
    durationMinutes: 20,
    token: "",
    bab: "BAB 1: Konsep Dasar Ekonomi",
    isShuffleQuestions: false,
    isShuffleOptions: false,
    examPackage: "Utama"
  });

  const [newQuestions, setNewQuestions] = useState<EvaluationQuestion[]>([
    {
      id: "q-1",
      type: "pg",
      question: "Tuliskan pertanyaan nomor 1 di sini...",
      options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      correctAnswer: "Pilihan A",
      explanation: "Penjelasan jawaban nomor 1",
      points: 20
    }
  ]);

  // Current active student profile (mock or from auth)
  const currentStudentName = isStudent ? "Ahmad Hidayat" : "Siswa Ruang Belajar";
  const currentStudentNis = "242510101";

  // Filtered Evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(item => {
      if (selectedClassFilter !== "all" && item.className !== "Semua Kelas" && item.className !== selectedClassFilter) {
        if (item.targetClasses && !item.targetClasses.includes(selectedClassFilter)) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || (item.bab || "").toLowerCase().includes(q) || item.subject.toLowerCase().includes(q);
      }
      return true;
    });
  }, [evaluations, selectedClassFilter, searchQuery]);

  // Request Fullscreen Helper
  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreenActive(true);
      setIsSecurityOverlayLocked(false);
    } catch (e) {
      console.warn("Fullscreen error or permission denied", e);
      setIsFullscreenActive(false);
    }
  };

  // Exit Fullscreen Helper
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Error exiting fullscreen", e);
    }
  };

  // Record Violation Function
  const recordViolation = (type: ViolationLog['type'], description: string) => {
    const newLog: ViolationLog = {
      timestamp: new Date().toLocaleTimeString('id-ID'),
      type,
      description
    };

    setViolations(prev => {
      const updated = [...prev, newLog];
      // Check max violation threshold (3 times)
      if (updated.length >= 3) {
        setTimeout(() => {
          handleAutoSubmitMaxViolations(updated);
        }, 300);
      }
      return updated;
    });

    setSecurityLockReason(description);
    setIsSecurityOverlayLocked(true);
  };

  // Auto-submit exam if max violations reached
  const handleAutoSubmitMaxViolations = (currentViolations: ViolationLog[]) => {
    alert("⚠️ KEAMANAN TERLENGKAPI: Anda telah melakukan 3 kali pelanggaran keamanan (Keluar dari Fullscreen / Switch Tab / Split Screen). Ujian secara otomatis dihentikan dan jawaban dikirimkan ke guru.");
    handleFinishExam(currentViolations, "diskualifikasi");
  };

  // Start Exam Trigger
  const handleStartExam = (exam: EvaluationExam) => {
    if (exam.token && exam.token.trim() !== "") {
      setTokenInputModalExam(exam);
      setEnteredToken("");
      setTokenError("");
      return;
    }
    launchExamSession(exam);
  };

  const handleValidateTokenAndStart = () => {
    if (!tokenInputModalExam) return;
    if (enteredToken.trim().toUpperCase() !== tokenInputModalExam.token?.trim().toUpperCase()) {
      setTokenError("Token ujian tidak valid! Silakan minta token resmi dari guru mata pelajaran.");
      return;
    }
    const examToStart = tokenInputModalExam;
    setTokenInputModalExam(null);
    launchExamSession(examToStart);
  };

  // Helper to shuffle arrays
  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const launchExamSession = (exam: EvaluationExam) => {
    let sessionExam = { ...exam };
    if (sessionExam.isShuffleQuestions) {
      sessionExam.questions = shuffleArray(sessionExam.questions);
    }
    if (sessionExam.isShuffleOptions) {
      sessionExam.questions = sessionExam.questions.map(q => {
        if ((q.type === 'pg' || q.type === 'pg_kompleks') && q.options) {
          return { ...q, options: shuffleArray(q.options) };
        }
        if (q.type === 'menjodohkan' && q.matchingPairs) {
          // Shuffle right side options for menjodohkan
          const rights = shuffleArray(q.matchingPairs.map(p => p.right));
          return { ...q, shuffledRightsForSession: rights }; // Store temporarily
        }
        return q;
      });
    }

    setActiveExam(sessionExam);
    setIsTakingExam(true);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setFlaggedIds([]);
    setViolations([]);
    setExamStartedAt(new Date().toISOString());
    setTimeRemaining(exam.durationMinutes * 60);
    setIsSecurityOverlayLocked(false);

    // Request Auto Fullscreen immediately
    requestFullscreen();
  };

  // Countdown Timer Effect
  useEffect(() => {
    if (!isTakingExam || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("⏱️ WAKTU UJIAN HABIS! Jawaban Anda akan langsung dikumpulkan secara otomatis.");
          handleFinishExam(violations, "selesai");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTakingExam, timeRemaining]);

  // Anti-Cheating Event Listeners Effect
  useEffect(() => {
    if (!isTakingExam) return;

    // 1. Fullscreen Change Detector
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsFullscreenActive(false);
        recordViolation('exit_fullscreen', 'Terdeteksi Keluar dari Mode Layar Penuh (Exit Fullscreen)');
      } else {
        setIsFullscreenActive(true);
      }
    };

    // 2. Tab Switch & Visibility Change Detector
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Terdeteksi berpindah tab / aplikasi (Browser Tab Switch / Blur)');
      }
    };

    // 3. Window Blur Detector (Alt+Tab, Floating Window)
    const handleWindowBlur = () => {
      recordViolation('tab_switch', 'Terdeteksi kehilangan fokus jendela ujian (Blur / Switch App)');
    };

    // 4. Window Resize & Split Screen Detector
    const handleWindowResize = () => {
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // If width or height is less than 82% of total screen dimensions, split-screen or floating window is active
      if (currentWidth < screenWidth * 0.82 || currentHeight < screenHeight * 0.82) {
        recordViolation('split_screen', 'Terdeteksi Layar Terbagi (Split Screen) atau Window Melayang');
      }
    };

    // 5. Prevent Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+C, Ctrl+V, Alt+Tab, PrintScreen)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U" || e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V" || e.key === "a" || e.key === "A"))
      ) {
        e.preventDefault();
        recordViolation('copy_attempt', `Upaya penekanan tombol kombinasi terlarang (${e.key})`);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTakingExam]);

  // Handle Answer Selection
  const handleSelectAnswer = (qId: string, value: any, isMultiple = false) => {
    setAnswers(prev => {
      if (isMultiple) {
        const currentArr: string[] = Array.isArray(prev[qId]) ? prev[qId] : [];
        if (currentArr.includes(value)) {
          return { ...prev, [qId]: currentArr.filter(v => v !== value) };
        } else {
          return { ...prev, [qId]: [...currentArr, value] };
        }
      }
      return { ...prev, [qId]: value };
    });
  };

  // Toggle Ragu-ragu
  const toggleFlagged = (qId: string) => {
    setFlaggedIds(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  // Finish Exam & Calculate Score
  const handleFinishExam = (finalViolations = violations, customStatus: 'selesai' | 'diskualifikasi' = 'selesai') => {
    if (!activeExam) return;

    let earnedScore = 0;
    let maxTotalScore = 0;

    activeExam.questions.forEach(q => {
      maxTotalScore += q.points;
      const userAns = answers[q.id];

      if (userAns !== undefined && userAns !== null) {
        if (q.type === 'pg' || q.type === 'benar_salah') {
          if (String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
            earnedScore += q.points;
          }
        } else if (q.type === 'isian') {
          const userText = String(userAns).trim().toLowerCase();
          const targetText = String(q.correctAnswer).trim().toLowerCase();
          if (userText === targetText || targetText.includes(userText)) {
            earnedScore += q.points;
          }
        } else if (q.type === 'pg_kompleks' && Array.isArray(q.correctAnswer) && Array.isArray(userAns)) {
          const sortedUser = [...userAns].sort().join(",");
          const sortedKey = [...q.correctAnswer].sort().join(",");
          if (sortedUser === sortedKey) {
            earnedScore += q.points;
          } else {
            // Partial credit if at least 1 matches
            const matchCount = userAns.filter(v => q.correctAnswer.includes(v)).length;
            if (matchCount > 0) {
              earnedScore += Math.round((matchCount / q.correctAnswer.length) * q.points);
            }
          }
        } else if (q.type === 'essay') {
          // Give 80% default score for completed essay answer, teacher can adjust later
          if (String(userAns).trim().length > 5) {
            earnedScore += Math.round(q.points * 0.85);
          }
        }
      }
    });

    const durationUsed = (activeExam.durationMinutes * 60) - timeRemaining;
    const percentage = maxTotalScore > 0 ? Math.round((earnedScore / maxTotalScore) * 100) : 0;

    const newSubmission: EvaluationSubmission = {
      id: `sub-${Date.now()}`,
      examId: activeExam.id,
      studentId: currentStudentNis,
      studentName: currentStudentName,
      className: availableClasses[0] || "XII-C2",
      answers,
      flaggedQuestionIds: flaggedIds,
      score: earnedScore,
      totalMaxScore: maxTotalScore,
      percentageScore: percentage,
      startedAt: examStartedAt,
      submittedAt: new Date().toISOString(),
      durationSecondsUsed: durationUsed > 0 ? durationUsed : 10,
      violations: finalViolations,
      status: customStatus
    };

    setSubmissions(prev => [newSubmission, ...prev.filter(s => s.examId !== activeExam.id || s.studentId !== currentStudentNis)]);
    setIsTakingExam(false);
    setActiveExam(null);
    setIsConfirmSubmitOpen(false);

    // Exit Fullscreen
    exitFullscreen();

    // Show Result Modal
    setViewingSubmissionResult(newSubmission);
  };

  // Add Question to New Exam Form
  const handleAddQuestionToForm = () => {
    const nextNum = newQuestions.length + 1;
    setNewQuestions(prev => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        type: "pg",
        question: `Pertanyaan nomor ${nextNum}...`,
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
        correctAnswer: "Pilihan A",
        explanation: `Penjelasan untuk pertanyaan ${nextNum}`,
        points: 20
      }
    ]);
  };

  // Save New Exam (Teacher)
  const handleSaveNewExam = () => {
    if (!newExamForm.title.trim()) {
      alert("Harap isi Judul Evaluasi!");
      return;
    }

    const newExamObj: EvaluationExam = {
      id: `eval-custom-${Date.now()}`,
      title: newExamForm.title,
      description: newExamForm.description || "Evaluasi Mandiri Terstruktur.",
      subject: newExamForm.subject,
      className: newExamForm.className,
      targetClasses: newExamForm.className === "Semua Kelas" ? availableClasses : [newExamForm.className],
      durationMinutes: Number(newExamForm.durationMinutes) || 20,
      token: newExamForm.token,
      bab: newExamForm.bab,
      status: "aktif",
      isSecureMode: true,
      isShuffleQuestions: newExamForm.isShuffleQuestions,
      isShuffleOptions: newExamForm.isShuffleOptions,
      examPackage: newExamForm.examPackage,
      createdAt: new Date().toISOString(),
      questions: newQuestions
    };

    setEvaluations(prev => [newExamObj, ...prev]);
    setIsCreateModalOpen(false);
    alert("✅ Naskah Evaluasi Baru Berhasil Disimpan!");
  };

  // Format Time Display (mm:ss)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get Submission for an Exam
  const getStudentSubmission = (examId: string) => {
    return submissions.find(s => s.examId === examId);
  };

  return (
    <div className="space-y-6 select-none" id="evaluasi-siswa-container">
      {/* SECTION A: MAIN EVALUATION DASHBOARD (When not actively in exam) */}
      {!isTakingExam && (
        <>
          {/* Top Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
              <ShieldAlert size={280} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    Secure CBT System
                  </span>
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold border border-indigo-400/30 flex items-center gap-1">
                    <Lock size={11} /> Auto Fullscreen & Anti Split-Screen
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
                  <ShieldAlert className="text-indigo-400" size={32} />
                  Evaluasi & Ujian Online Terkunci
                </h2>
                <p className="text-xs md:text-sm text-indigo-100/90 max-w-2xl leading-relaxed font-medium">
                  {isStudent 
                    ? "Ruang evaluasi mandiri dan ujian online terlindungi. Pengerjaan akan secara otomatis mengunci browser ke mode Layar Penuh (Fullscreen) untuk menjamin objektivitas nilai."
                    : "Pusat bank naskah soal evaluasi dengan proteksi keamanan ketat: Auto Fullscreen, Deteksi Tab Switch, Deteksi Split-Screen/Floating Window, serta Rekap Log Kecurangan Realtime."}
                </p>
              </div>

              {!isStudent && (
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer border border-indigo-400/30"
                  >
                    <Plus size={16} />
                    <span>Buat Evaluasi Baru</span>
                  </motion.button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'bank_soal' ? 'daftar' : 'bank_soal')}
                    className={`px-4 py-3 font-bold text-xs rounded-2xl flex items-center gap-2 justify-center cursor-pointer transition-all border ${
                      activeTab === 'bank_soal'
                        ? 'bg-white text-indigo-900 border-white shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                  >
                    <Database size={15} className={activeTab === 'bank_soal' ? "text-indigo-600" : "text-emerald-400"} />
                    <span>{activeTab === 'bank_soal' ? 'Daftar Ujian' : 'Bank Soal'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'rekap_guru' ? 'daftar' : 'rekap_guru')}
                    className={`px-4 py-3 font-bold text-xs rounded-2xl flex items-center gap-2 justify-center cursor-pointer transition-all border ${
                      activeTab === 'rekap_guru'
                        ? 'bg-white text-indigo-900 border-white shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                    }`}
                  >
                    <FileText size={15} className={activeTab === 'rekap_guru' ? "text-indigo-600" : "text-amber-400"} />
                    <span>{activeTab === 'rekap_guru' ? 'Daftar Ujian' : 'Rekap Nilai'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Total Naskah Evaluasi</span>
                <span className="text-xl font-black font-display text-white">{evaluations.length} Paket</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Koleksi Bank Soal</span>
                <span className="text-xl font-black font-display text-emerald-300">{bankQuestions.length} Butir</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Total Selesai Ujian</span>
                <span className="text-xl font-black font-display text-indigo-200">{submissions.length} Selesai</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider block">Proteksi Keamanan</span>
                <span className="text-xl font-black font-display text-amber-300">Strict (4 Lapis)</span>
              </div>
            </div>
          </div>

          {/* Navigation Bar & Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('daftar')}
                className={`px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 md:flex-initial ${
                  activeTab === 'daftar' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={15} />
                <span>Daftar Evaluasi ({filteredEvaluations.length})</span>
              </button>

              {!isStudent && (
                <>
                  <button
                    onClick={() => setActiveTab('bank_soal')}
                    className={`px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 md:flex-initial ${
                      activeTab === 'bank_soal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Database size={15} />
                    <span>Bank Soal ({bankQuestions.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('rekap_guru')}
                    className={`px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 md:flex-initial ${
                      activeTab === 'rekap_guru' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck size={15} />
                    <span>Rekap Nilai & Kecurangan ({submissions.length})</span>
                  </button>
                </>
              )}
            </div>

            {/* Filter Bar (Hanya tampil di tab daftar evaluasi) */}
            {activeTab === 'daftar' && (
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari naskah evaluasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Kelas Target</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* VIEW 1: DAFTAR NASKAH EVALUASI */}
          {activeTab === 'daftar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvaluations.map((item) => {
                const existingSub = getStudentSubmission(item.id);
                const isCompleted = Boolean(existingSub);

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -3 }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden ${
                      isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Top Security & Status Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100 flex items-center gap-1">
                        <Lock size={10} className="text-indigo-600" /> Mode Terkunci
                      </span>

                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" /> Selesai ({existingSub?.percentageScore}/100)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200">
                          Belum Dikerjakan
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span>{item.subject}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-bold">{item.bab || "BAB Pembelajaran"}</span>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-base leading-snug line-clamp-2">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {item.description}
                      </p>
                    </div>

                    {/* Metadata Specs */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 mb-4 text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Durasi</span>
                        <span className="text-xs font-black text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                          <Clock size={11} className="text-amber-500" /> {item.durationMinutes} mnt
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Soal</span>
                        <span className="text-xs font-black text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                          <ListOrdered size={11} className="text-indigo-500" /> {item.questions.length} Butir
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Token</span>
                        <span className="text-xs font-black text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                          <Key size={11} className="text-emerald-500" /> {item.token ? "Wajib" : "Bebas"}
                        </span>
                      </div>
                    </div>

                    {/* Security Feature Checklist */}
                    <div className="mb-4 text-[10px] text-slate-500 space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <ShieldAlert size={12} className="text-indigo-600" /> Proteksi Keamanan Terpasang:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                        <span>✓ Auto Fullscreen</span>
                        <span>✓ Anti Tab Switch</span>
                        <span>✓ Anti Split-Screen</span>
                        <span>✓ Lock Copy-Paste</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isCompleted ? (
                      <button
                        onClick={() => setViewingSubmissionResult(existingSub)}
                        className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200 cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>Lihat Hasil & Pembahasan</span>
                      </button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStartExam(item)}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/20"
                      >
                        <Lock size={14} />
                        <span>Mulai Evaluasi (Mode Aman)</span>
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: BANK SOAL CBT */}
          {!isStudent && activeTab === 'bank_soal' && (
            <div className="space-y-4">
              <BankSoal
                questions={bankQuestions}
                onAddQuestion={onAddBankQuestion || (() => {})}
                onEditQuestion={onEditBankQuestion || (() => {})}
                onDeleteQuestion={onDeleteBankQuestion || (() => {})}
                availableClasses={availableClasses}
                subject={subject}
              />
            </div>
          )}

          {/* VIEW 3: REKAP NILAI & LOG KECURANGAN GURU */}
          {!isStudent && activeTab === 'rekap_guru' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <UserCheck className="text-indigo-600" size={18} />
                    Rekap Pengerjaan Evaluasi & Log Keamanan Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar siswa yang telah menyelesaikan ujian beserta log kecurangan (switch tab, split screen, exit fullscreen).
                  </p>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FileText size={40} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">Belum ada data pengerjaan evaluasi dari siswa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3">Judul Evaluasi</th>
                        <th className="p-3">Kelas</th>
                        <th className="p-3 text-center">Skor Akhir</th>
                        <th className="p-3 text-center">Waktu Tempuh</th>
                        <th className="p-3 text-center">Log Pelanggaran</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {submissions.map((sub) => {
                        const exam = evaluations.find(e => e.id === sub.examId);
                        const hasViolations = sub.violations && sub.violations.length > 0;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{sub.studentName}</span>
                              <span className="text-[10px] text-slate-400">NIS: {sub.studentId}</span>
                            </td>
                            <td className="p-3 max-w-xs truncate">
                              <span className="font-bold text-slate-700">{exam?.title || sub.examId}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-600">{sub.className}</td>
                            <td className="p-3 text-center font-black">
                              <span className={`px-2.5 py-1 rounded-lg text-xs ${
                                sub.percentageScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {sub.percentageScore} / 100
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-600">
                              {Math.floor(sub.durationSecondsUsed / 60)}m {sub.durationSecondsUsed % 60}s
                            </td>
                            <td className="p-3 text-center">
                              {hasViolations ? (
                                <button
                                  onClick={() => setViewingViolationsLogModal(sub.violations)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 text-[10px] flex items-center gap-1 mx-auto cursor-pointer"
                                >
                                  <AlertTriangle size={11} className="text-rose-600" />
                                  <span>{sub.violations.length} Pelanggaran</span>
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] inline-block border border-emerald-200">
                                  ✓ Bersih (0)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setViewingSubmissionResult(sub)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer border border-indigo-200"
                              >
                                Detail Jawaban
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SECTION B: LIVE SECURE EXAM SESSION (MODE UJIAN TERKUNCI) */}
      {isTakingExam && activeExam && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col justify-between overflow-hidden select-none" id="secure-exam-fullscreen-stage">
          {/* TOP EXAM APP BAR */}
          <header className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white max-w-md truncate">
                  {activeExam.title}
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={11} /> Secure Mode • Fullscreen Active
                </span>
              </div>
            </div>

            {/* Center: Countdown Timer */}
            <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${
              timeRemaining < 180 
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse' 
                : 'bg-slate-800/80 border-slate-700 text-indigo-200'
            }`}>
              <Clock size={16} className={timeRemaining < 180 ? 'text-rose-400' : 'text-indigo-400'} />
              <span className="text-base font-black font-mono tracking-wider">
                {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Right: Security & Navigator Button */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                violations.length > 0 
                  ? 'bg-amber-900/50 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
              }`}>
                <AlertOctagon size={11} /> {violations.length} Pelanggaran
              </span>

              <button
                onClick={() => setIsNavigatorOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Nomor Soal
              </button>
            </div>
          </header>

          {/* MAIN QUESTION DISPLAY AREA */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full flex flex-col justify-between">
            {/* Watermark Security Overlay */}
            <div className="pointer-events-none fixed inset-0 z-0 opacity-5 flex items-center justify-center rotate-[-25deg] select-none">
              <div className="text-center font-black text-2xl md:text-4xl text-white space-y-4">
                <p>{currentStudentName} • {currentStudentNis}</p>
                <p>EVALUASI TERKUNCI • RUANG BELAJAR</p>
                <p>{new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            <div className="relative z-10 space-y-6">
              {/* Question Header Card */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded-lg">
                    Soal {currentQuestionIdx + 1} / {activeExam.questions.length}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-bold text-[10px] rounded-lg uppercase">
                    Tipe: {activeExam.questions[currentQuestionIdx]?.type.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() => toggleFlagged(activeExam.questions[currentQuestionIdx].id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                    flaggedIds.includes(activeExam.questions[currentQuestionIdx].id)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Flag size={13} />
                  <span>{flaggedIds.includes(activeExam.questions[currentQuestionIdx].id) ? 'Ragu-Ragu (Tandai)' : 'Tandai Ragu'}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 shadow-inner">
                <p className="text-base md:text-lg font-bold text-slate-100 leading-relaxed">
                  {activeExam.questions[currentQuestionIdx]?.question}
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {/* 1. Multiple Choice (PG) */}
                {activeExam.questions[currentQuestionIdx]?.type === 'pg' && activeExam.questions[currentQuestionIdx]?.options?.map((opt, oIdx) => {
                  const qId = activeExam.questions[currentQuestionIdx].id;
                  const isSelected = answers[qId] === opt;

                  return (
                    <motion.div
                      key={oIdx}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectAnswer(qId, opt)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                          : 'bg-slate-800/40 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-500'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-semibold leading-relaxed">{opt}</span>
                    </motion.div>
                  );
                })}

                {/* 2. Multiple Select (PG Kompleks) */}
                {activeExam.questions[currentQuestionIdx]?.type === 'pg_kompleks' && activeExam.questions[currentQuestionIdx]?.options?.map((opt, oIdx) => {
                  const qId = activeExam.questions[currentQuestionIdx].id;
                  const currentSelected: string[] = Array.isArray(answers[qId]) ? answers[qId] : [];
                  const isSelected = currentSelected.includes(opt);

                  return (
                    <motion.div
                      key={oIdx}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectAnswer(qId, opt, true)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                          : 'bg-slate-800/40 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-500'
                      }`}>
                        {isSelected && <Check size={14} className="stroke-[3]" />}
                      </div>
                      <span className="text-sm font-semibold leading-relaxed">{opt}</span>
                    </motion.div>
                  );
                })}

                {/* 3. Benar / Salah */}
                {activeExam.questions[currentQuestionIdx]?.type === 'benar_salah' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Benar', 'Salah'].map((val) => {
                      const qId = activeExam.questions[currentQuestionIdx].id;
                      const isSelected = answers[qId] === val;

                      return (
                        <motion.button
                          key={val}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectAnswer(qId, val)}
                          className={`py-6 px-4 rounded-2xl border-2 font-black text-base cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                            isSelected 
                              ? val === 'Benar' ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-rose-600/30 border-rose-500 text-rose-300'
                              : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-xl">{val === 'Benar' ? '✓' : '✗'}</span>
                          <span>PERNYATAAN {val.toUpperCase()}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* 4. Menjodohkan */}
                {activeExam.questions[currentQuestionIdx]?.type === 'menjodohkan' && activeExam.questions[currentQuestionIdx]?.matchingPairs && (
                  <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 font-bold mb-2 uppercase">Pasangkan kolom kiri dengan opsi di kolom kanan:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kiri */}
                      <div className="space-y-3">
                        {activeExam.questions[currentQuestionIdx].matchingPairs!.map((pair, idx) => {
                          const qId = activeExam.questions[currentQuestionIdx].id;
                          const currentAnswers = answers[qId] || {};
                          // We get the right options (shuffled if applicable, otherwise original)
                          const rightOptions = activeExam.questions[currentQuestionIdx].shuffledRightsForSession 
                                             || activeExam.questions[currentQuestionIdx].matchingPairs!.map(p => p.right);
                          
                          return (
                            <div key={idx} className="flex flex-col space-y-1">
                              <div className="p-3 bg-slate-700 rounded-lg text-sm font-semibold text-slate-200 border border-slate-600">
                                {pair.left}
                              </div>
                              <select
                                value={currentAnswers[pair.left] || ""}
                                onChange={(e) => {
                                  const newObj = { ...currentAnswers, [pair.left]: e.target.value };
                                  handleSelectAnswer(qId, newObj);
                                }}
                                className="p-2 bg-slate-800 text-slate-300 text-sm rounded-lg border border-slate-600 outline-none focus:border-indigo-500"
                              >
                                <option value="" disabled>-- Pilih Pasangan --</option>
                                {rightOptions.map((opt, rIdx) => (
                                  <option key={rIdx} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Isian / Essay */}
                {(activeExam.questions[currentQuestionIdx]?.type === 'isian' || activeExam.questions[currentQuestionIdx]?.type === 'essay') && (
                  <div className="space-y-2">
                    <textarea
                      rows={activeExam.questions[currentQuestionIdx]?.type === 'essay' ? 5 : 2}
                      placeholder="Ketik jawaban Anda secara lengkap di sini..."
                      value={answers[activeExam.questions[currentQuestionIdx]?.id] || ""}
                      onChange={(e) => handleSelectAnswer(activeExam.questions[currentQuestionIdx]?.id, e.target.value)}
                      className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM NAVIGATION FOOTER */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3 relative z-10">
              <button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors border border-slate-700"
              >
                <ChevronLeft size={16} />
                <span>Sebelumnya</span>
              </button>

              {currentQuestionIdx < activeExam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(activeExam.questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setIsConfirmSubmitOpen(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Send size={16} />
                  <span>Kumpulkan Jawaban</span>
                </button>
              )}
            </div>
          </main>

          {/* QUESTION NAVIGATOR DRAWER MODAL */}
          <AnimatePresence>
            {isNavigatorOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                      <ListOrdered size={18} className="text-indigo-400" />
                      Navigasi Nomor Soal
                    </h4>
                    <button
                      onClick={() => setIsNavigatorOpen(false)}
                      className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-full cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Status Legend */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-300 font-bold bg-slate-800/50 p-2.5 rounded-xl">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Sudah Dijawab</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Ragu-Ragu</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Belum Dijawab</span>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-1">
                    {activeExam.questions.map((q, idx) => {
                      const isAns = answers[q.id] !== undefined && answers[q.id] !== "";
                      const isFlag = flaggedIds.includes(q.id);
                      const isCurr = idx === currentQuestionIdx;

                      let bgClass = "bg-slate-800 text-slate-300 border-slate-700";
                      if (isFlag) bgClass = "bg-amber-500 text-slate-950 font-black border-amber-400";
                      else if (isAns) bgClass = "bg-emerald-600 text-white font-extrabold border-emerald-500";

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIdx(idx);
                            setIsNavigatorOpen(false);
                          }}
                          className={`h-11 rounded-xl border font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                            isCurr ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setIsNavigatorOpen(false)}
                    className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Tutup Navigasi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONFIRM SUBMIT MODAL */}
          <AnimatePresence>
            {isConfirmSubmitOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 size={32} />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-black text-white text-lg">Konfirmasi Selesai Ujian</h4>
                    <p className="text-xs text-slate-400">
                      Apakah Anda yakin ingin menyelesaikan dan mengumpulkan seluruh jawaban sekarang?
                    </p>
                  </div>

                  <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Terjawab</span>
                      <span className="font-extrabold text-emerald-400">
                        {Object.keys(answers).length} dari {activeExam.questions.length} Soal
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Ragu-Ragu</span>
                      <span className="font-extrabold text-amber-400">{flaggedIds.length} Soal</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsConfirmSubmitOpen(false)}
                      className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleFinishExam(violations, "selesai")}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                    >
                      Ya, Kumpulkan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SECURITY OVERLAY LOCKER (MODAL DIKUNCI SAAT TERJADI PELANGGARAN) */}
          <AnimatePresence>
            {isSecurityOverlayLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center select-none"
              >
                <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-8 space-y-6 shadow-2xl">
                  <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/40 animate-bounce">
                    <AlertOctagon size={48} />
                  </div>

                  <div className="space-y-2">
                    <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-500/30">
                      Sistem Keamanan Terkunci
                    </span>
                    <h3 className="text-xl font-black text-white">AKSES UJIAN DIBEKUKAN</h3>
                    <p className="text-xs text-rose-200/90 leading-relaxed font-semibold">
                      {securityLockReason || "Terdeteksi keluar dari mode Layar Penuh (Fullscreen) atau berpindah jendela/tab aplikasi."}
                    </p>
                  </div>

                  <div className="bg-rose-950/60 p-4 rounded-2xl border border-rose-800/60 text-left text-xs space-y-2">
                    <div className="flex items-center justify-between font-extrabold text-rose-300">
                      <span>Status Pelanggaran:</span>
                      <span>{violations.length} / 3 Pelanggaran</span>
                    </div>
                    <p className="text-[11px] text-rose-200/80">
                      Seluruh percobaan keluar dari ujian dicatat secara akurat ke dalam rekapitulasi nilai guru. Mencapai 3 kali pelanggaran akan membatalkan ujian secara otomatis.
                    </p>
                  </div>

                  <button
                    onClick={requestFullscreen}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30"
                  >
                    <Maximize2 size={16} />
                    <span>Kembali ke Mode Layar Penuh (Fullscreen)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* RESULT MODAL SUMMARY */}
      <AnimatePresence>
        {viewingSubmissionResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl text-slate-800 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">Hasil & Review Evaluasi</h3>
                    <p className="text-xs text-slate-500 font-bold">{viewingSubmissionResult.studentName} ({viewingSubmissionResult.className})</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingSubmissionResult(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Score Highlight Box */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 text-center space-y-3 relative overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  Capaian Nilai Akhir
                </span>
                <div className="text-5xl font-black font-display text-emerald-300">
                  {viewingSubmissionResult.percentageScore}
                  <span className="text-lg text-indigo-200 font-normal"> / 100</span>
                </div>
                <p className="text-xs text-indigo-100/80 font-medium">
                  {viewingSubmissionResult.percentageScore >= 75 
                    ? "🎉 Selamat! Anda telah mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)."
                    : "💪 Tetap semangat! Silakan pelajari kembali modul materi pada Ruang Belajar."}
                </p>
              </div>

              {/* Specs & Security Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Perolehan Poin</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">
                    {viewingSubmissionResult.score} / {viewingSubmissionResult.totalMaxScore} Poin
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Waktu Digunakan</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">
                    {Math.floor(viewingSubmissionResult.durationSecondsUsed / 60)}m {viewingSubmissionResult.durationSecondsUsed % 60}s
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Log Keamanan</span>
                  <span className={`font-extrabold text-sm mt-0.5 block ${
                    viewingSubmissionResult.violations?.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {viewingSubmissionResult.violations?.length || 0} Pelanggaran
                  </span>
                </div>
              </div>

              {/* Review Answer Key Section */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-600" /> Review Kunci Jawaban & Penjelasan
                </h4>

                {(() => {
                  const examObj = evaluations.find(e => e.id === viewingSubmissionResult.examId);
                  if (!examObj) return null;

                  return (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {examObj.questions.map((q, idx) => {
                        const userAns = viewingSubmissionResult.answers[q.id];

                        return (
                          <div key={q.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span>Soal #{idx + 1} ({q.type.toUpperCase()})</span>
                              <span className="text-indigo-600">{q.points} Poin</span>
                            </div>
                            <p className="font-semibold text-slate-800">{q.question}</p>
                            
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                              <div><strong className="text-slate-500">Jawaban Anda:</strong> {JSON.stringify(userAns) || "Tidak Dijawab"}</div>
                              <div><strong className="text-emerald-600">Kunci Jawaban:</strong> {JSON.stringify(q.correctAnswer)}</div>
                            </div>

                            {q.explanation && (
                              <p className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                                💡 <strong>Penjelasan Guru:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={() => setViewingSubmissionResult(null)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Tutup Review Evaluasi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOKEN INPUT MODAL */}
      <AnimatePresence>
        {tokenInputModalExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Key size={24} />
              </div>

              <div>
                <h4 className="font-extrabold text-base text-slate-800">Masukkan Token Ujian</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Naskah ini membutuhkan Token resmi dari guru mata pelajaran.
                </p>
              </div>

              <input
                type="text"
                placeholder="cth: EKO01"
                value={enteredToken}
                onChange={(e) => {
                  setEnteredToken(e.target.value.toUpperCase());
                  setTokenError("");
                }}
                className="w-full text-center px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-2xl text-base font-black tracking-widest uppercase text-slate-800 outline-none focus:border-indigo-600"
              />

              {tokenError && (
                <p className="text-xs font-bold text-rose-600">{tokenError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setTokenInputModalExam(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleValidateTokenAndStart}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Mulai Evaluasi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIOLATIONS DETAIL MODAL (TEACHER VIEW) */}
      <AnimatePresence>
        {viewingViolationsLogModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="text-rose-600" size={18} />
                  Detail Log Pelanggaran Keamanan Ujian
                </h4>
                <button
                  onClick={() => setViewingViolationsLogModal(null)}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {viewingViolationsLogModal.map((v, idx) => (
                  <div key={idx} className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-0.5">
                    <div className="flex items-center justify-between font-bold text-[10px] text-rose-700">
                      <span>Pelanggaran #{idx + 1}</span>
                      <span>{v.timestamp}</span>
                    </div>
                    <p className="font-semibold">{v.description}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setViewingViolationsLogModal(null)}
                className="w-full py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup Log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TEACHER CREATE NEW EXAM MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl text-slate-800 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Plus className="text-indigo-600" size={20} />
                  Buat Naskah Evaluasi Baru
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Judul Evaluasi / Ujian *</label>
                  <input
                    type="text"
                    placeholder="cth: Evaluasi BAB 3: Keseimbangan Pasar"
                    value={newExamForm.title}
                    onChange={(e) => setNewExamForm({ ...newExamForm, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      value={newExamForm.subject}
                      onChange={(e) => setNewExamForm({ ...newExamForm, subject: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">BAB / Topik</label>
                    <input
                      type="text"
                      value={newExamForm.bab}
                      onChange={(e) => setNewExamForm({ ...newExamForm, bab: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      value={newExamForm.durationMinutes}
                      onChange={(e) => setNewExamForm({ ...newExamForm, durationMinutes: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Token Ujian (Opsional)</label>
                    <input
                      type="text"
                      placeholder="cth: EKO2026"
                      value={newExamForm.token}
                      onChange={(e) => setNewExamForm({ ...newExamForm, token: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Kelas Target</label>
                    <select
                      value={newExamForm.className}
                      onChange={(e) => setNewExamForm({ ...newExamForm, className: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="Semua Kelas">Semua Kelas</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Questions Editor */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-800 text-xs">Butir Soal Evaluasi ({newQuestions.length})</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBankModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-emerald-200"
                      >
                        <Database size={14} /> Bank Soal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddQuestionToForm}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer border border-indigo-200"
                      >
                        <Plus size={14} /> Tambah Manual
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                    {newQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>Soal #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setNewQuestions(newQuestions.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].question = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 text-xs"
                          placeholder="Pertanyaan..."
                        />
                        <select
                          value={q.type}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            updated[idx].type = e.target.value as any;
                            // Reset structure based on type
                            if (e.target.value === 'menjodohkan') {
                              updated[idx].matchingPairs = [
                                { left: 'A', right: 'X' },
                                { left: 'B', right: 'Y' }
                              ];
                            } else if (e.target.value === 'pg' || e.target.value === 'pg_kompleks') {
                              updated[idx].options = ['A', 'B', 'C', 'D'];
                            }
                            setNewQuestions(updated);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none"
                        >
                          <option value="pg">Pilihan Ganda</option>
                          <option value="pg_kompleks">Pilihan Ganda Kompleks</option>
                          <option value="benar_salah">Benar/Salah</option>
                          <option value="menjodohkan">Menjodohkan</option>
                          <option value="isian">Isian Singkat</option>
                          <option value="essay">Uraian</option>
                        </select>
                        <p className="text-[10px] text-indigo-600 font-bold">* Konfigurasi opsi jawaban lebih lanjut dapat dilakukan melalui fitur Import Excel/Word untuk efisiensi.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewExam}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md"
                >
                  Simpan Naskah Evaluasi
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isBankModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Database className="text-emerald-600" size={20} />
                  Ambil dari Bank Soal
                </h3>
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {(!bankQuestions || bankQuestions.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    Bank soal Anda masih kosong. Silakan tambahkan butir soal di menu "Bank Soal".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bankQuestions.map((q) => {
                      const isAdded = newQuestions.some(nq => nq.question === q.question && nq.type === q.type);
                      return (
                        <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase">
                                  {q.type.replace('_', ' ')}
                                </span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">
                                  {q.className}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase max-w-[100px] truncate" title={q.bab}>
                                  {q.bab}
                                </span>
                              </div>
                              <p className="font-bold text-sm text-slate-800 line-clamp-2">{q.question}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (isAdded) {
                                  setNewQuestions(prev => prev.filter(nq => !(nq.question === q.question && nq.type === q.type)));
                                } else {
                                  const payload = { ...q, id: `q-${Date.now()}-${Math.random().toString(36).substring(7)}` };
                                  setNewQuestions(prev => [...prev, payload]);
                                }
                              }}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer flex items-center gap-1 ${
                                isAdded 
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isAdded ? <><Trash2 size={12}/> Hapus</> : <><Plus size={12}/> Tambahkan</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-white font-extrabold text-sm rounded-xl cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
