import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, Plus, Search, Filter, Edit3, Trash2, X, FileText, ChevronDown
} from "lucide-react";
import { QuestionBankItem } from "../types";
import { CLASSES } from "../data/presets";

interface BankSoalProps {
  questions: QuestionBankItem[];
  onAddQuestion: (q: QuestionBankItem) => void;
  onEditQuestion: (q: QuestionBankItem) => void;
  onDeleteQuestion: (id: string) => void;
  availableClasses: string[];
  subject: string;
}

export default function BankSoal({
  questions,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  availableClasses,
  subject
}: BankSoalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("Semua Kelas");
  const [filterType, setFilterType] = useState("Semua Tipe");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);

  const [formData, setFormData] = useState<Partial<QuestionBankItem>>({
    type: 'pg',
    question: '',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    points: 10,
    className: availableClasses[0] || 'Kelas 10',
    subject: subject,
    bab: 'BAB 1',
    tags: []
  });

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        q.bab.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = filterClass === "Semua Kelas" || q.className === filterClass;
    const matchType = filterType === "Semua Tipe" || q.type === filterType;
    return matchSearch && matchClass && matchType;
  });

  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      type: 'pg',
      question: '',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      points: 10,
      className: availableClasses[0] || 'Kelas 10',
      subject: subject,
      bab: 'BAB 1',
      tags: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (q: QuestionBankItem) => {
    setEditingQuestion(q);
    setFormData({ ...q });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.question || !formData.type) {
      alert("Pertanyaan wajib diisi!");
      return;
    }

    const payload: QuestionBankItem = {
      id: editingQuestion ? editingQuestion.id : `qb-${Date.now()}`,
      type: formData.type as any,
      question: formData.question,
      options: formData.options,
      matchingPairs: formData.matchingPairs,
      correctAnswer: formData.correctAnswer,
      points: formData.points || 10,
      className: formData.className || availableClasses[0],
      subject: formData.subject || subject,
      bab: formData.bab || 'Umum',
      tags: formData.tags || [],
      createdAt: editingQuestion ? editingQuestion.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingQuestion) {
      onEditQuestion(payload);
    } else {
      onAddQuestion(payload);
    }
    setIsModalOpen(false);
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'pg': return 'Pilihan Ganda';
      case 'pg_kompleks': return 'PG Kompleks';
      case 'benar_salah': return 'Benar / Salah';
      case 'menjodohkan': return 'Menjodohkan';
      case 'isian': return 'Isian Singkat';
      case 'essay': return 'Uraian';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Bank Soal</h2>
            <p className="text-sm text-slate-500 font-medium">Kelola repositori butir soal Anda untuk ujian CBT.</p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus size={16} /> Tambah Soal
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan pertanyaan atau BAB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 text-slate-700 shadow-sm"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="md:w-48 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 text-slate-700 shadow-sm cursor-pointer"
        >
          <option value="Semua Kelas">Semua Kelas</option>
          {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="md:w-48 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500 text-slate-700 shadow-sm cursor-pointer"
        >
          <option value="Semua Tipe">Semua Tipe</option>
          <option value="pg">Pilihan Ganda</option>
          <option value="pg_kompleks">PG Kompleks</option>
          <option value="benar_salah">Benar/Salah</option>
          <option value="menjodohkan">Menjodohkan</option>
          <option value="isian">Isian Singkat</option>
          <option value="essay">Uraian</option>
        </select>
      </div>

      {/* Question List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuestions.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col relative group"
          >
            <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
              <button onClick={() => handleOpenEditModal(q)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer">
                <Edit3 size={14} />
              </button>
              <button onClick={() => { if(confirm('Hapus soal ini dari Bank Soal?')) onDeleteQuestion(q.id); }} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase">
                {getTypeLabel(q.type)}
              </span>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black uppercase">
                {q.className}
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase max-w-[80px] truncate" title={q.bab}>
                {q.bab}
              </span>
            </div>
            
            <p className="text-sm font-bold text-slate-800 line-clamp-3 mb-4 flex-1">
              {q.question}
            </p>

            <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <FileText size={14} /> 
                {q.type === 'pg' || q.type === 'pg_kompleks' ? `${q.options?.length || 0} Opsi` : ''}
                {q.type === 'menjodohkan' ? `${q.matchingPairs?.length || 0} Pasang` : ''}
              </div>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                Bobot: {q.points}
              </span>
            </div>
          </motion.div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 font-semibold bg-white rounded-3xl border border-slate-100 border-dashed">
            Tidak ada butir soal yang sesuai dengan pencarian Anda.
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                <Database size={20} className="text-indigo-600" />
                {editingQuestion ? 'Edit Soal' : 'Tambah Soal ke Bank'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Kelas Target</label>
                    <select
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-indigo-500"
                    >
                      {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">BAB / Topik</label>
                    <input
                      type="text"
                      placeholder="cth: BAB 1: Dinamika"
                      value={formData.bab}
                      onChange={(e) => setFormData({ ...formData, bab: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Bobot Nilai</label>
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tipe Soal</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      const updates: Partial<QuestionBankItem> = { type: t as any };
                      if (t === 'menjodohkan') {
                        updates.matchingPairs = [{ left: 'A', right: 'X' }, { left: 'B', right: 'Y' }];
                      } else if (t === 'pg' || t === 'pg_kompleks') {
                        updates.options = ['A', 'B', 'C', 'D'];
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="pg">Pilihan Ganda</option>
                    <option value="pg_kompleks">Pilihan Ganda Kompleks</option>
                    <option value="benar_salah">Benar/Salah</option>
                    <option value="menjodohkan">Menjodohkan</option>
                    <option value="isian">Isian Singkat</option>
                    <option value="essay">Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Pertanyaan Utama</label>
                  <textarea
                    rows={4}
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm outline-none focus:border-indigo-500"
                    placeholder="Tuliskan pertanyaan Anda..."
                  />
                </div>

                {/* Specific Editor based on Type */}
                {(formData.type === 'pg' || formData.type === 'pg_kompleks') && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Opsi Jawaban (Pisahkan dengan koma jika menggunakan opsi sederhana, atau sesuaikan array options - UI sederhana mockup)</label>
                    <textarea
                      rows={3}
                      value={formData.options?.join('\\n') || ''}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value.split('\\n') })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm outline-none focus:border-indigo-500"
                      placeholder="Opsi 1\nOpsi 2\nOpsi 3\nOpsi 4 (Satu opsi per baris)"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-slate-100 flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-colors">
                    Batal
                  </button>
                  <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors">
                    Simpan Soal
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
