import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  CheckSquare, 
  Users, 
  Clock, 
  ArrowLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle, 
  CheckCircle2,
  Clipboard,
  X,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Check,
  Save,
  AlertCircle,
  Download
} from "lucide-react";
import { Assignment, Submission, Student, StudentGrade } from "../types";
import { CLASSES } from "../data/presets";
import { safeStorage } from "../lib/safeStorage";
import ExportPendingTasksModal from "./ExportPendingTasksModal";

interface ManajemenTugasProps {
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  grades?: StudentGrade[];
  onUpdateGradeCell?: (studentId: string, assignmentId: string, value: number) => void;
  onNavigateToGradebook?: (className?: string) => void;
  onAddAssignment: (newAssignment: Omit<Assignment, "id">, applyToAll?: boolean) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onSelectSubmissionToGrade: (assignmentId: string, submissionId: string) => void;
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

export default function ManajemenTugas({
  students,
  assignments,
  submissions,
  grades = [],
  onUpdateGradeCell,
  onNavigateToGradebook,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onSelectSubmissionToGrade,
  classList,
  teacherName,
  nip,
  subject,
  institution,
  headmasterName,
  headmasterNip,
  headmasterRank,
  documentCity,
  schoolNpsn,
  academicYear
}: ManajemenTugasProps) {
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

  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isPendingExportModalOpen, setIsPendingExportModalOpen] = useState(false);
  const [pendingPreselectedAssignmentId, setPendingPreselectedAssignmentId] = useState<string | undefined>(undefined);

  // Quick inline grading states
  const [inlineScores, setInlineScores] = useState<Record<string, string>>({});
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [fillZeroNotice, setFillZeroNotice] = useState<string | null>(null);

  const activeSelectedClass = availableClasses.includes(selectedClass) 
    ? selectedClass 
    : availableClasses[0] || "X-MIPA-1";

  // New/Edit assignment form states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Assignment['category']>('Tugas');
  const [newDueDate, setNewDueDate] = useState("");
  const [newMaxScore, setNewMaxScore] = useState<number>(100);
  const [applyToAll, setApplyToAll] = useState(false);
  const [formError, setFormError] = useState("");

  // Filter assignments based on class selection
  const classAssignments = assignments.filter(a => a.className === activeSelectedClass);

  // Assignment details view
  const activeAssignment = assignments.find(a => a.id === activeAssignmentId);
  const activeSubmissions = submissions.filter(s => s.assignmentId === activeAssignmentId);

  // Class students for active assignment
  const targetClassStudents = activeAssignment 
    ? students.filter(s => s.className === activeAssignment.className)
    : [];

  const openAddModal = () => {
    setEditingAssignment(null);
    setNewTitle("");
    setNewCategory("Tugas");
    setNewDueDate("");
    setNewMaxScore(100);
    setApplyToAll(false);
    setIsOpenAddModal(true);
  };

  const openEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewTitle(assignment.title);
    setNewCategory(assignment.category || "Tugas");
    setNewDueDate(assignment.dueDate);
    setNewMaxScore(assignment.maxScore);
    setIsOpenAddModal(true);
  };

  // Form submission handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate.trim()) {
      setFormError("Judul tugas dan Tenggat waktu wajib diisi!");
      return;
    }

    if (editingAssignment) {
      onEditAssignment({
        ...editingAssignment,
        title: newTitle,
        category: newCategory,
        className: activeSelectedClass,
        dueDate: newDueDate,
        maxScore: newMaxScore
      });
    } else {
      onAddAssignment({
        title: newTitle,
        category: newCategory,
        className: activeSelectedClass,
        dueDate: newDueDate,
        maxScore: newMaxScore
      }, applyToAll);
    }

    setNewTitle("");
    setNewCategory("Tugas");
    setNewDueDate("");
    setNewMaxScore(100);
    setFormError("");
    setIsOpenAddModal(false);
    setEditingAssignment(null);
  };

  // Save inline score for student directly into both submissions & Daftar Nilai
  const handleSaveInlineScore = (studentId: string, assignmentId: string) => {
    const rawVal = inlineScores[studentId];
    if (rawVal === undefined || rawVal === "") return;
    const scoreNum = Math.min(100, Math.max(0, parseFloat(rawVal) || 0));
    
    if (onUpdateGradeCell) {
      onUpdateGradeCell(studentId, assignmentId, scoreNum);
      setSavedSuccessId(studentId);
      setTimeout(() => setSavedSuccessId(null), 2500);
    }
  };

  // Isi nilai 0 untuk seluruh siswa yang belum mengumpulkan / belum dinilai pada tugas ini
  const handleFillZeroForUnsubmitted = () => {
    if (!activeAssignmentId || !onUpdateGradeCell) return;
    const targetList = targetClassStudents.length > 0 ? targetClassStudents : activeSubmissions;
    let count = 0;
    targetList.forEach((item: any) => {
      const isStudent = "nis" in item;
      const studentId = isStudent ? item.id : item.studentId;
      const sub = submissions.find(s => s.assignmentId === activeAssignmentId && s.studentId === studentId);
      const gradeObj = grades?.find(g => g.studentId === studentId);
      const scoreFromGrade = gradeObj?.assignmentScores?.[activeAssignmentId];
      const isGraded = (sub?.score !== null && sub?.score !== undefined) || (scoreFromGrade !== undefined && scoreFromGrade !== null);
      if (!isGraded) {
        onUpdateGradeCell(studentId, activeAssignmentId, 0);
        count++;
      }
    });

    if (count > 0) {
      setFillZeroNotice(`Berhasil mengisikan nilai 0 untuk ${count} siswa yang belum mengumpulkan tugas ini.`);
    } else {
      setFillZeroNotice("Seluruh siswa di kelas ini sudah memiliki nilai untuk tugas ini.");
    }
    setTimeout(() => setFillZeroNotice(null), 3500);
  };

  return (
    <div className="space-y-6" id="tugas-section">
      <AnimatePresence mode="wait">
        {!activeAssignmentId ? (
          /* List of Assignments View */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
            id="tugas-list-view"
          >
            {/* Header Selection & Action Button */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto flex-wrap gap-1">
                {availableClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => handleSelectClass(cls)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeSelectedClass === cls 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    id={`tugas-btn-select-class-${cls}`}
                  >
                    {cls}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                {/* Tombol Ekspor Belum Mengumpulkan / Belum Dinilai */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setPendingPreselectedAssignmentId(undefined);
                    setIsPendingExportModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  id="btn-export-pending-tugas"
                  title="Ekspor daftar siswa yang belum menyampaikan tugas atau belum mendapat nilai (Excel/PDF)"
                >
                  <AlertCircle size={15} className="text-amber-600" />
                  <span>Ekspor Belum Kumpul / Nilai</span>
                </motion.button>

                {onNavigateToGradebook && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigateToGradebook(activeSelectedClass)}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    id="btn-goto-daftarnilai"
                    title="Buka Buku Nilai (Daftar Nilai) untuk kelas ini"
                  >
                    <FileSpreadsheet size={15} className="text-indigo-600" /> Buka Buku Nilai
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openAddModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
                  id="btn-open-add-tugas-modal"
                >
                  <Plus size={16} /> Buat Tugas Baru
                </motion.button>
              </div>
            </div>

            {/* Assignments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="tugas-cards-grid">
              {classAssignments.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-slate-100 text-slate-400 text-sm flex flex-col items-center justify-center space-y-2">
                  <BookOpen size={40} className="text-slate-200" />
                  <p className="font-semibold">Tidak ada tugas terdaftar di kelas ini.</p>
                  <p className="text-xs">Klik "Buat Tugas Baru" untuk menambahkan pekerjaan rumah, esai, atau ulangan harian.</p>
                </div>
              ) : (
                classAssignments.map((assignment, index) => {
                  // Compute stats for each assignment taking both submissions and grades into account
                  const classStudents = students.filter(s => s.className === assignment.className);
                  const totalClassStudents = classStudents.length;

                  const gradedStudents = classStudents.filter(student => {
                    const sub = submissions.find(s => s.assignmentId === assignment.id && s.studentId === student.id);
                    const gradeObj = grades?.find(g => g.studentId === student.id);
                    const scoreFromGrade = gradeObj?.assignmentScores?.[assignment.id];
                    return (sub && sub.score !== null && sub.score !== undefined) || (scoreFromGrade !== undefined && scoreFromGrade !== null);
                  });

                  const collectedStudents = classStudents.filter(student => {
                    const sub = submissions.find(s => s.assignmentId === assignment.id && s.studentId === student.id);
                    const isSubmitted = sub && sub.status !== "Belum Dikumpulkan";
                    const gradeObj = grades?.find(g => g.studentId === student.id);
                    const isGradedInGradebook = gradeObj?.assignmentScores?.[assignment.id] !== undefined && gradeObj?.assignmentScores?.[assignment.id] !== null;
                    return isSubmitted || isGradedInGradebook;
                  });

                  const collected = collectedStudents.length;
                  const graded = gradedStudents.length;
                  const totalTarget = totalClassStudents > 0 ? totalClassStudents : (collected > 0 ? collected : 0);

                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="group bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                      id={`assignment-card-${assignment.id}`}
                    >
                      <div className="space-y-3" onClick={() => setActiveAssignmentId(assignment.id)}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                              {assignment.className}
                            </span>
                            {assignment.category && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded uppercase">
                                {assignment.category}
                              </span>
                            )}
                            {graded > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60" title="Tersinkronisasi dengan Buku Nilai">
                                <CheckCircle2 size={10} className="text-emerald-600" /> Sinkron Nilai
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Calendar size={12} /> {assignment.dueDate}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors cursor-pointer leading-snug">
                          {assignment.title}
                        </h4>

                        {/* Submission Stats */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Mengumpulkan</span>
                            <span className="text-sm font-black text-slate-700">{collected} {totalTarget > 0 ? `/ ${totalTarget}` : 'Siswa'}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Sudah Dinilai</span>
                            <span className="text-sm font-black text-indigo-600">{graded} / {totalTarget > 0 ? totalTarget : collected}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-1">
                           <button 
                             onClick={(e) => { e.stopPropagation(); openEditModal(assignment); }} 
                             className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                             title="Edit Tugas"
                           >
                             <Edit3 size={14} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); onDeleteAssignment(assignment.id); }} 
                             className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                             title="Hapus Tugas"
                           >
                             <Trash2 size={14} />
                           </button>
                           {onNavigateToGradebook && (
                             <button
                               onClick={(e) => { e.stopPropagation(); onNavigateToGradebook(assignment.className); }}
                               className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                               title="Buka Kolom Nilai di Daftar Nilai"
                             >
                               <FileSpreadsheet size={14} />
                             </button>
                           )}
                         </div>

                        <div 
                          onClick={() => setActiveAssignmentId(assignment.id)} 
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:text-indigo-700 cursor-pointer"
                        >
                          <span>Kelola Jawaban</span>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          /* Submissions Details View */
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
            id="tugas-submissions-view"
          >
            {/* Back Header Bar */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4" id="tugas-details-header">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveAssignmentId(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200/60 rounded-xl"
                  id="btn-back-to-assignments"
                >
                  <ArrowLeft size={14} /> Kembali ke Daftar Tugas
                </button>

                {onNavigateToGradebook && activeAssignment && (
                  <button
                    onClick={() => onNavigateToGradebook(activeAssignment.className)}
                    className="px-3.5 py-2 text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 rounded-xl transition-all"
                    title="Buka langsung spreadsheet Daftar Nilai untuk tugas ini"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" /> Buka di Buku Nilai
                  </button>
                )}
              </div>

              <div className="text-left md:text-right">
                <div className="flex items-center md:justify-end gap-2">
                  <h3 className="font-bold text-sm text-slate-800 font-display">{activeAssignment?.title}</h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded">
                    {activeAssignment?.category || "Tugas"}
                  </span>
                </div>
                <p className="text-slate-400 text-xs font-semibold flex items-center md:justify-end gap-2 mt-0.5">
                  <span>Kelas: {activeAssignment?.className}</span>
                  <span>•</span>
                  <span>Skor Maksimal: {activeAssignment?.maxScore}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Sinkron Otomatis ke Daftar Nilai
                  </span>
                </p>
              </div>
            </div>

            {/* Submissions List Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="submissions-table-section">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
                    <CheckSquare size={16} className="text-indigo-600" /> Daftar Pengumpulan & Penilaian Siswa
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Nilai yang diinput disini otomatis diperbarui di Daftar Nilai, begitu juga sebaliknya.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setPendingPreselectedAssignmentId(activeAssignment?.id);
                      setIsPendingExportModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    id="btn-export-pending-this-assignment"
                    title="Ekspor daftar siswa yang belum mengumpulkan atau belum dinilai untuk tugas ini"
                  >
                    <Download size={13} className="text-amber-600" />
                    <span>Ekspor Belum Kumpul / Nilai</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleFillZeroForUnsubmitted}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300/80 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    id="btn-fill-zero-this-assignment"
                    title="Isikan nilai 0 secara otomatis bagi seluruh siswa yang belum mengumpulkan atau belum dinilai"
                  >
                    <CheckSquare size={13} className="text-rose-600" />
                    <span>Isi 0 Belum Kumpul</span>
                  </motion.button>

                  <span className="text-xs text-slate-500 font-semibold bg-white px-3 py-1 rounded-xl border border-slate-200/60 shadow-2xs">
                    {targetClassStudents.length > 0 ? targetClassStudents.length : activeSubmissions.length} Siswa Terdaftar
                  </span>
                </div>
              </div>

              {fillZeroNotice && (
                <div className="bg-rose-50 border-b border-rose-100 px-5 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-bold animate-fadeIn">
                  <CheckSquare size={14} className="text-rose-600 shrink-0" />
                  <span>{fillZeroNotice}</span>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {(targetClassStudents.length > 0 ? targetClassStudents : activeSubmissions).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Belum ada siswa yang terdata di kelas ini.
                  </div>
                ) : (
                  (targetClassStudents.length > 0 ? targetClassStudents : activeSubmissions).map((item: any, idx: number) => {
                    const isStudent = "nis" in item;
                    const studentId = isStudent ? item.id : item.studentId;
                    const studentName = isStudent ? item.name : item.studentName;
                    const studentNis = isStudent ? item.nis : "";

                    // Find corresponding submission record
                    const sub = submissions.find(s => s.assignmentId === activeAssignmentId && s.studentId === studentId);
                    
                    // Find corresponding score from grades (Daftar Nilai)
                    const gradeObj = grades?.find(g => g.studentId === studentId);
                    const scoreFromGrade = activeAssignmentId ? gradeObj?.assignmentScores?.[activeAssignmentId] : undefined;

                    // Resolved effective score
                    const resolvedScore = sub?.score !== null && sub?.score !== undefined 
                      ? sub.score 
                      : (scoreFromGrade !== undefined && scoreFromGrade !== null ? scoreFromGrade : null);

                    const isGraded = resolvedScore !== null && resolvedScore !== undefined;
                    const isSubmitted = sub && sub.status !== "Belum Dikumpulkan";
                    const isSuccess = savedSuccessId === studentId;

                    return (
                      <motion.div
                        key={studentId}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
                        id={`submission-row-${studentId}`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                            <h5 className="font-bold text-slate-800 text-sm">{studentName}</h5>
                            {studentNis && (
                              <span className="text-[10px] text-slate-400 font-mono">NIS: {studentNis}</span>
                            )}
                            
                            {/* Status Badges */}
                            {isGraded ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-lg font-extrabold flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                Sudah Dinilai: {resolvedScore}
                              </span>
                            ) : isSubmitted ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-lg font-bold">
                                Perlu Dinilai
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-lg font-semibold">
                                Belum Mengumpulkan
                              </span>
                            )}

                            {isGraded && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded font-bold">
                                Terhubung Buku Nilai
                              </span>
                            )}
                          </div>

                          <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-2xl line-clamp-1">
                            {sub?.studentAnswer 
                              ? `Jawaban: "${sub.studentAnswer}"` 
                              : (isGraded ? "Nilai tercatat langsung melalui Buku Nilai (Daftar Nilai)." : "Belum ada catatan berkas/jawaban.")}
                          </p>
                        </div>

                        {/* Direct Scoring and Actions */}
                        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                          {/* Inline Score Quick Input */}
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-400 pl-2">Nilai:</span>
                            <input
                              type="number"
                              min="0"
                              max={activeAssignment?.maxScore || 100}
                              placeholder={resolvedScore !== null ? String(resolvedScore) : "-"}
                              value={inlineScores[studentId] !== undefined ? inlineScores[studentId] : (resolvedScore !== null ? String(resolvedScore) : "")}
                              onChange={(e) => setInlineScores(prev => ({ ...prev, [studentId]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && activeAssignmentId) {
                                  handleSaveInlineScore(studentId, activeAssignmentId);
                                }
                              }}
                              className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-indigo-500 shadow-2xs"
                              title="Tekan Enter atau klik Simpan untuk menyimpan ke Buku Nilai"
                            />
                            <button
                              onClick={() => activeAssignmentId && handleSaveInlineScore(studentId, activeAssignmentId)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSuccess 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              }`}
                              title="Simpan nilai ke Daftar Nilai & Kelola Tugas"
                            >
                              {isSuccess ? <Check size={13} /> : <Save size={13} />}
                            </button>
                          </div>

                          {/* AI Review / Rubric button */}
                          {sub && (
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => onSelectSubmissionToGrade(sub.assignmentId, sub.id)}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-200/80"
                              id={`btn-grade-submission-${sub.id}`}
                              title="Buka penilaian mendalam atau koreksi jawaban dengan AI"
                            >
                              <Sparkles size={12} className="text-indigo-600" />
                              <span>{isGraded ? "Detail / AI" : "Koreksi AI"}</span>
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Assignment Modal Pop-Up */}
      <AnimatePresence>
        {isOpenAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="add-tugas-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md border border-slate-100 relative"
            >
              <button 
                onClick={() => setIsOpenAddModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                id="btn-close-tugas-modal"
              >
                <X size={18} />
              </button>

              <div className="mb-5 space-y-1">
                <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-1.5">
                  <Clipboard size={18} className="text-indigo-600" /> 
                  {editingAssignment ? "Edit Tugas / Ulangan" : "Buat Tugas / Ulangan Baru"}
                </h3>
                <p className="text-slate-400 text-xs font-semibold">Tugas ini otomatis menjadi kolom penilaian di Buku Nilai ({selectedClass})</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Tugas / Ulangan</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="cth: Ulangan Harian BAB 1: Pendapatan Nasional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700"
                    id="new-tugas-title-input"
                  />
                </div>
                
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Penilaian</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Assignment['category'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer"
                  >
                    <option value="Tugas">Tugas Harian</option>
                    <option value="Ulangan Harian">Ulangan Harian</option>
                    <option value="Proyek">Proyek / Praktik</option>
                    <option value="Kuis">Kuis</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tenggat Waktu</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer"
                      id="new-tugas-due-date"
                    />
                  </div>

                  {/* Max Score */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Skor Maksimal</label>
                    <input
                      type="number"
                      value={newMaxScore}
                      onChange={(e) => setNewMaxScore(parseInt(e.target.value) || 100)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700"
                      id="new-tugas-max-score"
                    />
                  </div>
                </div>

                {!editingAssignment && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">Terapkan ke semua kelas</label>
                      <span className="text-[10px] text-slate-400">Tugas akan otomatis dibuat untuk seluruh kelas paralel</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      id="apply-to-all-checkbox"
                    />
                  </div>
                )}

                {formError && (
                  <p className="text-xs text-rose-500 font-bold">{formError}</p>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsOpenAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                    id="btn-cancel-tugas"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    id="btn-submit-tugas"
                  >
                    {editingAssignment ? "Simpan Perubahan" : "Terbitkan Tugas"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ekspor Siswa Belum Mengumpulkan Tugas / Belum Ada Nilai */}
      <ExportPendingTasksModal
        isOpen={isPendingExportModalOpen}
        onClose={() => {
          setIsPendingExportModalOpen(false);
          setPendingPreselectedAssignmentId(undefined);
        }}
        students={students}
        assignments={assignments}
        submissions={submissions}
        grades={grades}
        initialClass={activeSelectedClass}
        classList={availableClasses}
        preselectedAssignmentId={pendingPreselectedAssignmentId}
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
    </div>
  );
}
