import React, { useState } from 'react';
import { Student, AppUser, ClassMaster } from '../../types';
import { 
  Layers, Plus, Edit, Trash2, Users, Download, 
  CheckCircle2, AlertTriangle, ShieldCheck, DoorOpen
} from 'lucide-react';

interface Props {
  classList: string[];
  students: Student[];
  teachers: AppUser[];
  onAddClass: (className: string) => void;
  onRenameClass: (oldName: string, newName: string) => void;
  onDeleteClass: (classNameToDelete: string) => void;
  classMetadata: Record<string, Partial<ClassMaster>>;
  onUpdateClassMeta: (className: string, meta: Partial<ClassMaster>) => void;
}

export default function TabKelas({
  classList,
  students,
  teachers,
  onAddClass,
  onRenameClass,
  onDeleteClass,
  classMetadata,
  onUpdateClassMeta
}: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState<'10' | '11' | '12'>('10');
  const [newHomeroomId, setNewHomeroomId] = useState('');
  const [newRoom, setNewRoom] = useState('');

  // Editing Class
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHomeroomId, setEditHomeroomId] = useState('');
  const [editRoom, setEditRoom] = useState('');

  // View Roster Modal
  const [viewingRosterClass, setViewingRosterClass] = useState<string | null>(null);

  // Deleting Class
  const [deletingClass, setDeletingClass] = useState<string | null>(null);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    onAddClass(trimmed);
    
    // Save metadata
    const selectedTeacher = teachers.find(t => t.uid === newHomeroomId || t.name === newHomeroomId);
    onUpdateClassMeta(trimmed, {
      name: trimmed,
      gradeLevel: newGradeLevel,
      fase: newGradeLevel === '10' ? 'Fase E' : 'Fase F',
      homeroomTeacherId: newHomeroomId,
      homeroomTeacherName: selectedTeacher ? selectedTeacher.name : undefined,
      room: newRoom.trim() || undefined
    });

    setNewClassName('');
    setNewHomeroomId('');
    setNewRoom('');
    setIsAddModalOpen(false);
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== editingClass) {
      onRenameClass(editingClass, trimmedName);
    }
    const finalClassName = trimmedName || editingClass;
    const selectedTeacher = teachers.find(t => t.uid === editHomeroomId || t.name === editHomeroomId);
    onUpdateClassMeta(finalClassName, {
      name: finalClassName,
      homeroomTeacherId: editHomeroomId,
      homeroomTeacherName: selectedTeacher ? selectedTeacher.name : undefined,
      room: editRoom.trim() || undefined
    });

    setEditingClass(null);
  };

  const rosterStudents = viewingRosterClass 
    ? students.filter(s => s.className === viewingRosterClass)
    : [];

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            Manajemen Rombongan Belajar (Rombel)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola {classList.length} kelas aktif, penetapan wali kelas, dan kapasitas ruang belajar.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Tambah Rombel Baru</span>
        </button>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classList.map(cls => {
          const classStudents = students.filter(s => s.className === cls);
          const maleCount = classStudents.filter(s => s.gender !== 'P').length;
          const femaleCount = classStudents.filter(s => s.gender === 'P').length;
          const meta = classMetadata[cls] || {};
          
          // Homeroom teacher: check metadata or matching user with homeroomClass === cls
          const assignedTeacher = teachers.find(t => 
            t.homeroomClass === cls || 
            (meta.homeroomTeacherId && (t.uid === meta.homeroomTeacherId || t.name === meta.homeroomTeacherId))
          );
          const homeroomName = meta.homeroomTeacherName || (assignedTeacher ? assignedTeacher.name : 'Belum Ditugaskan');

          return (
            <div
              key={cls}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm">
                      {cls.slice(0, 3)}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800">Kelas {cls}</h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        {cls.startsWith('X-') || cls.startsWith('10') ? 'Fase E (Kelas 10)' : 'Fase F (Kelas 11/12)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingClass(cls);
                        setEditName(cls);
                        setEditHomeroomId(assignedTeacher ? assignedTeacher.uid : (meta.homeroomTeacherId || ''));
                        setEditRoom(meta.room || '');
                      }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Rombel"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingClass(cls)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Rombel"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-500" />
                      Wali Kelas
                    </span>
                    <span className="font-bold text-slate-700 max-w-[170px] truncate text-right">
                      {homeroomName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <DoorOpen size={13} className="text-sky-500" />
                      Ruang Kelas
                    </span>
                    <span className="font-bold text-slate-700">
                      {meta.room || `Ruang ${cls}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Users size={13} className="text-indigo-500" />
                      Peserta Didik
                    </span>
                    <span className="font-black text-indigo-700">
                      {classStudents.length} Siswa (L: {maleCount}, P: {femaleCount})
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingRosterClass(cls)}
                  className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Lihat Anggota ({classStudents.length})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL ADD CLASS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" />
              Tambah Rombongan Belajar Baru
            </h3>
            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Rombel / Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X-1, XI-MIPA-1, atau XII-4"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Tingkat / Jenjang</label>
                <select
                  value={newGradeLevel}
                  onChange={e => setNewGradeLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="10">Kelas 10 (Fase E)</option>
                  <option value="11">Kelas 11 (Fase F)</option>
                  <option value="12">Kelas 12 (Fase F)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Wali Kelas</label>
                <select
                  value={newHomeroomId}
                  onChange={e => setNewHomeroomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="">Pilih Guru Pengajar...</option>
                  {teachers.map(t => (
                    <option key={t.uid} value={t.uid}>{t.name} (NIP. {t.nip || '-'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Ruang Kelas Fisik</label>
                <input
                  type="text"
                  placeholder="Contoh: Ruang 102 / Gedung B"
                  value={newRoom}
                  onChange={e => setNewRoom(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT CLASS */}
      {editingClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Edit size={18} className="text-indigo-600" />
              Edit Data Rombel {editingClass}
            </h3>
            <form onSubmit={handleSaveEditClass} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Rombel / Kelas *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Wali Kelas</label>
                <select
                  value={editHomeroomId}
                  onChange={e => setEditHomeroomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                >
                  <option value="">Pilih Guru Pengajar...</option>
                  {teachers.map(t => (
                    <option key={t.uid} value={t.uid}>{t.name} (NIP. {t.nip || '-'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Ruang Kelas Fisik</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={e => setEditRoom(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs"
                >
                  Perbarui Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW ROSTER */}
      {viewingRosterClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Daftar Peserta Didik Kelas {viewingRosterClass}
                </h3>
                <p className="text-xs text-slate-500">
                  Total {rosterStudents.length} siswa terdaftar di rombel ini
                </p>
              </div>
              <button
                onClick={() => setViewingRosterClass(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {rosterStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada siswa yang ditempatkan di kelas {viewingRosterClass}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rosterStudents.map((st, idx) => (
                    <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-slate-400 font-bold">{idx + 1}</span>
                        <div>
                          <p className="font-bold text-slate-800">{st.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">NIS: {st.nis || '-'}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        st.gender === 'P' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {st.gender === 'P' ? 'P' : 'L'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE CLASS */}
      {deletingClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Hapus Rombel {deletingClass}?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tindakan ini akan menghapus kelas dan memutus relasi siswa di rombel ini. Siswa tidak akan dihapus, tetapi akan dialihkan status rombelnya.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteClass(deletingClass);
                  setDeletingClass(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Ya, Hapus Rombel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
