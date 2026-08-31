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
  Clipboard,
  X,
  Edit3,
  Trash2
} from "lucide-react";
import { Assignment, Submission, Student } from "../types";
import { CLASSES } from "../data/presets";

interface ManajemenTugasProps {
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  onAddAssignment: (newAssignment: Omit<Assignment, "id">, applyToAll?: boolean) => void;
  onEditAssignment: (assignment: Assignment) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  onSelectSubmissionToGrade: (assignmentId: string, submissionId: string) => void;
  classList?: string[];
}

export default function ManajemenTugas({
  students,
  assignments,
  submissions,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onSelectSubmissionToGrade,
  classList
}: ManajemenTugasProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || "X-MIPA-1");
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

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
                    onClick={() => setSelectedClass(cls)}
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

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAddModal}
                className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl text-xs font-bold flex items-center gap-1.5 self-end md:self-auto cursor-pointer"
                id="btn-open-add-tugas-modal"
              >
                <Plus size={16} /> Buat Tugas Baru
              </motion.button>
            </div>

            {/* Assignments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="tugas-cards-grid">
              {classAssignments.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-slate-100 text-slate-400 text-sm flex flex-col items-center justify-center space-y-2">
                  <BookOpen size={40} className="text-slate-200" />
                  <p className="font-semibold">Tidak ada tugas terdaftar di kelas ini.</p>
                  <p className="text-xs">Klik "Buat Tugas Baru" untuk menambahkan pekerjaan rumah atau esai.</p>
                </div>
              ) : (
                classAssignments.map((assignment, index) => {
                  // Compute stats for each assignment
                  const totalSub = submissions.filter(s => s.assignmentId === assignment.id);
                  const collected = totalSub.filter(s => s.status !== "Belum Dikumpulkan").length;
                  const graded = totalSub.filter(s => s.score !== null).length;

                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -5 }}
                      className="group bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                      id={`assignment-card-${assignment.id}`}
                    >
                      <div className="space-y-3" onClick={() => setActiveAssignmentId(assignment.id)}>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                              {assignment.className}
                            </span>
                            {assignment.category && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded uppercase">
                                {assignment.category}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Calendar size={12} /> Deadline: {assignment.dueDate}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors cursor-pointer">
                          {assignment.title}
                        </h4>

                        {/* Submission Stats */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Mengumpulkan</span>
                            <span className="text-sm font-black text-slate-700">{collected} Siswa</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Sudah Dinilai</span>
                            <span className="text-sm font-black text-indigo-600">{graded} / {collected}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex gap-2">
                           <button onClick={(e) => { e.stopPropagation(); openEditModal(assignment); }} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                             <Edit3 size={14} />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); onDeleteAssignment(assignment.id); }} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                             <Trash2 size={14} />
                           </button>
                         </div>
                        <div onClick={() => setActiveAssignmentId(assignment.id)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 group-hover:text-indigo-700 cursor-pointer">
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
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between" id="tugas-details-header">
              <button
                onClick={() => setActiveAssignmentId(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200/60 rounded-xl"
                id="btn-back-to-assignments"
              >
                <ArrowLeft size={14} /> Kembali ke Daftar Tugas
              </button>
              <div className="text-right">
                <h3 className="font-bold text-sm text-slate-800 font-display">{activeAssignment?.title}</h3>
                <p className="text-slate-400 text-xs font-semibold">{activeAssignment?.className} • Skor Maks: {activeAssignment?.maxScore}</p>
              </div>
            </div>

            {/* Submission Rows */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden" id="submissions-table-section">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
                  <CheckSquare size={16} className="text-indigo-600" /> Daftar Pengumpulan Siswa
                </h4>
                <span className="text-xs text-slate-500 font-semibold">{activeSubmissions.length} Rekor terdaftar</span>
              </div>

              <div className="divide-y divide-slate-100">
                {activeSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Belum ada siswa yang terdata mengirim jawaban untuk tugas ini.
                  </div>
                ) : (
                  activeSubmissions.map((sub, idx) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors"
                      id={`submission-row-${sub.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-slate-800 text-sm">{sub.studentName}</h5>
                          {sub.status === "Selesai" ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                              Skor: {sub.score}
                            </span>
                          ) : sub.status === "Perlu Dinilai" ? (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-bold">
                              Perlu Dinilai
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded font-bold">
                              Belum Mengumpulkan
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-xl line-clamp-1">
                          {sub.studentAnswer || "Tidak ada berkas yang dikirim."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {sub.status !== "Belum Dikumpulkan" && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSelectSubmissionToGrade(sub.assignmentId, sub.id)}
                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm border border-indigo-100"
                            id={`btn-grade-submission-${sub.id}`}
                          >
                            <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                            {sub.status === "Selesai" ? "Ubah Nilai / Review AI" : "Koreksi dengan AI"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))
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
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                id="btn-close-tugas-modal"
              >
                <X size={18} />
              </button>

              <div className="mb-5 space-y-1">
                <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-1.5">
                  <Clipboard size={18} className="text-indigo-600" /> Buat Tugas Baru
                </h3>
                <p className="text-slate-400 text-xs font-semibold">Berikan kuis atau esai ke kelas {selectedClass}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Tugas</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="cth: Evaluasi Sistem Persamaan Linier Dua Variabel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700"
                    id="new-tugas-title-input"
                  />
                </div>
                
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Assignment['category'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer"
                  >
                    <option value="Tugas">Tugas</option>
                    <option value="Ulangan Harian">Ulangan Harian</option>
                    <option value="Proyek">Proyek</option>
                    <option value="Kuis">Kuis</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tenggat Waktu (Deadline)</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer"
                      id="new-tugas-due-date"
                    />
                  </div>
                  {!editingAssignment && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Terapkan ke semua kelas</label>
                      <div className="flex items-center h-8">
                        <input
                          type="checkbox"
                          checked={applyToAll}
                          onChange={(e) => setApplyToAll(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                          id="apply-to-all-checkbox"
                        />
                      </div>
                    </div>
                  )}

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
                    Terbitkan Tugas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
