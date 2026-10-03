import React, { useState, useMemo } from 'react';
import { SubjectMaster, AppUser } from '../../types';
import { 
  BookOpen, Plus, Search, Filter, Edit, Trash2, 
  Download, Award, Clock, CheckCircle2
} from 'lucide-react';

interface Props {
  subjects: SubjectMaster[];
  teachers: AppUser[];
  onAddSubject: (subject: SubjectMaster) => void;
  onEditSubject: (subject: SubjectMaster) => void;
  onDeleteSubject: (subjectId: string) => void;
}

export default function TabPelajaran({
  subjects,
  teachers,
  onAddSubject,
  onEditSubject,
  onDeleteSubject
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectMaster | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<SubjectMaster>>({
    code: '',
    name: '',
    category: 'Umum',
    fase: 'Semua Fase',
    hoursPerWeek: 3,
    kkm: 75,
    description: '',
    assignedTeachers: []
  });

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [subjects, searchQuery, selectedCategory]);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.code?.trim()) return;

    const newSubject: SubjectMaster = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      category: formData.category || 'Umum',
      fase: formData.fase || 'Semua Fase',
      hoursPerWeek: Number(formData.hoursPerWeek) || 2,
      kkm: Number(formData.kkm) || 75,
      description: formData.description || '',
      assignedTeachers: formData.assignedTeachers || []
    };

    onAddSubject(newSubject);
    setFormData({
      code: '',
      name: '',
      category: 'Umum',
      fase: 'Semua Fase',
      hoursPerWeek: 3,
      kkm: 75,
      description: '',
      assignedTeachers: []
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject.name.trim() || !editingSubject.code.trim()) return;
    onEditSubject(editingSubject);
    setEditingSubject(null);
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Kode Mapel', 'Nama Mata Pelajaran', 'Kelompok', 'Fase', 'Beban JP', 'KKTP/KKM', 'Keterangan'];
    const rows = filteredSubjects.map((s, idx) => [
      idx + 1,
      `"${s.code}"`,
      `"${s.name}"`,
      `"${s.category}"`,
      `"${s.fase}"`,
      s.hoursPerWeek,
      s.kkm,
      `"${s.description || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_mata_pelajaran_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mata pelajaran atau kode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Semua Kelompok ({subjects.length})</option>
              <option value="Umum">Kelompok Umum</option>
              <option value="Pilihan">Kelompok Pilihan</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
              <option value="Layanan">Layanan BK</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Mapel</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Kode</th>
                <th className="px-5 py-3.5">Nama Mata Pelajaran</th>
                <th className="px-5 py-3.5">Kelompok & Fase</th>
                <th className="px-5 py-3.5">Alokasi Beban</th>
                <th className="px-5 py-3.5">KKTP/KKM</th>
                <th className="px-5 py-3.5">Guru Terdaftar</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Tidak ada mata pelajaran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map(sub => {
                  // Teachers assigned to this subject
                  const matchingTeachers = teachers.filter(t => 
                    t.subject && (t.subject.toLowerCase().includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes(t.subject.toLowerCase()))
                  );

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-black text-indigo-700 text-xs">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                          {sub.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{sub.name}</p>
                        {sub.description && (
                          <span className="text-[10px] text-slate-400 line-clamp-1">{sub.description}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                            sub.category === 'Umum' 
                              ? 'bg-blue-50 text-blue-700' 
                              : sub.category === 'Pilihan' 
                              ? 'bg-purple-50 text-purple-700' 
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {sub.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{sub.fase}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {sub.hoursPerWeek} JP / Minggu
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-[11px] font-black">
                          {sub.kkm}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {matchingTeachers.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">
                              {matchingTeachers.length} Guru
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              ({matchingTeachers.map(t => t.name.split(' ')[0]).join(', ')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada Guru</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingSubject(sub)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Mapel"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus mata pelajaran "${sub.name}"?`)) {
                                onDeleteSubject(sub.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Mapel"
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

      {/* MODAL ADD SUBJECT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" />
              Tambah Mata Pelajaran
            </h3>
            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-600 block mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    placeholder="MAT-W"
                    value={formData.code || ''}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase text-slate-800 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-600 block mb-1">Nama Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    placeholder="Matematika (Umum)"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Kelompok</label>
                  <select
                    value={formData.category || 'Umum'}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="Umum">Kelompok Umum</option>
                    <option value="Pilihan">Kelompok Pilihan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Layanan">Layanan BK</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Fase / Tingkat</label>
                  <select
                    value={formData.fase || 'Semua Fase'}
                    onChange={e => setFormData({ ...formData, fase: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="Semua Fase">Semua Fase</option>
                    <option value="Fase E (Kelas 10)">Fase E (Kelas 10)</option>
                    <option value="Fase F (Kelas 11-12)">Fase F (Kelas 11-12)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Beban JP / Minggu</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.hoursPerWeek || 3}
                    onChange={e => setFormData({ ...formData, hoursPerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">KKTP / KKM Standar</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.kkm || 75}
                    onChange={e => setFormData({ ...formData, kkm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="Deskripsi singkat kurikulum..."
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
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
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT SUBJECT */}
      {editingSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Edit size={18} className="text-indigo-600" />
              Edit Mata Pelajaran {editingSubject.name}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-600 block mb-1">Kode *</label>
                  <input
                    type="text"
                    required
                    value={editingSubject.code}
                    onChange={e => setEditingSubject({ ...editingSubject, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase text-slate-800 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-600 block mb-1">Nama Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={editingSubject.name}
                    onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Kelompok</label>
                  <select
                    value={editingSubject.category}
                    onChange={e => setEditingSubject({ ...editingSubject, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="Umum">Kelompok Umum</option>
                    <option value="Pilihan">Kelompok Pilihan</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                    <option value="Layanan">Layanan BK</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Fase / Tingkat</label>
                  <select
                    value={editingSubject.fase}
                    onChange={e => setEditingSubject({ ...editingSubject, fase: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                  >
                    <option value="Semua Fase">Semua Fase</option>
                    <option value="Fase E (Kelas 10)">Fase E (Kelas 10)</option>
                    <option value="Fase F (Kelas 11-12)">Fase F (Kelas 11-12)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Beban JP / Minggu</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingSubject.hoursPerWeek}
                    onChange={e => setEditingSubject({ ...editingSubject, hoursPerWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">KKTP / KKM Standar</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={editingSubject.kkm}
                    onChange={e => setEditingSubject({ ...editingSubject, kkm: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={editingSubject.description || ''}
                  onChange={e => setEditingSubject({ ...editingSubject, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs"
                >
                  Perbarui Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
