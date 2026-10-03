import React, { useState } from 'react';
import { AppUser, Student, SubjectMaster, SchoolMasterProfile } from '../../types';
import { 
  School, Users, Calendar, Save, Download, Upload, 
  CheckCircle2, ShieldCheck, Database, Building2, UserCheck, RefreshCw
} from 'lucide-react';

interface Props {
  teachers: AppUser[];
  schoolProfile: SchoolMasterProfile;
  onUpdateSchoolProfile: (profile: SchoolMasterProfile) => void;
  students: Student[];
  classList: string[];
  subjects: SubjectMaster[];
  onRestoreMasterData: (data: {
    students?: Student[];
    classList?: string[];
    subjects?: SubjectMaster[];
    schoolProfile?: SchoolMasterProfile;
  }) => void;
}

export default function TabSemuaData({
  teachers,
  schoolProfile,
  onUpdateSchoolProfile,
  students,
  classList,
  subjects,
  onRestoreMasterData
}: Props) {
  const [profileForm, setProfileForm] = useState<SchoolMasterProfile>(schoolProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolProfile(profileForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleExportFullMasterBackup = () => {
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      school: profileForm,
      classList,
      subjects,
      studentsCount: students.length,
      students,
      teachersCount: teachers.length,
      teachersSummary: teachers.map(t => ({
        uid: t.uid,
        name: t.name,
        email: t.email,
        nip: t.nip,
        subject: t.subject,
        teachingClasses: t.teachingClasses,
        homeroomClass: t.homeroomClass
      }))
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master_data_sekolah_full_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleParseRestore = () => {
    if (!restoreText.trim()) return;
    try {
      const parsed = JSON.parse(restoreText.trim());
      onRestoreMasterData({
        students: Array.isArray(parsed.students) ? parsed.students : undefined,
        classList: Array.isArray(parsed.classList) ? parsed.classList : undefined,
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : undefined,
        schoolProfile: parsed.school || undefined
      });
      if (parsed.school) {
        setProfileForm(parsed.school);
      }
      setIsRestoreModalOpen(false);
      setRestoreText('');
      alert('Master data sekolah berhasil dipulihkan dari cadangan JSON!');
    } catch (err) {
      alert('Format JSON tidak valid atau rusak. Silakan periksa kembali berkas.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Profil Satuan Pendidikan & Kepala Sekolah */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              Identitas Satuan Pendidikan & Penandatangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data ini berlaku sebagai master kop surat, titimangsa rapor, dan dokumen resmi kurikulum.
            </p>
          </div>

          {saveSuccess && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 size={14} /> Tersimpan
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="font-bold text-slate-600 block mb-1">Nama Satuan Pendidikan *</label>
              <input
                type="text"
                required
                value={profileForm.schoolName}
                onChange={e => setProfileForm({ ...profileForm, schoolName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">NPSN</label>
              <input
                type="text"
                value={profileForm.npsn}
                onChange={e => setProfileForm({ ...profileForm, npsn: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Jenjang Pendidikan</label>
              <input
                type="text"
                value={profileForm.educationLevel}
                onChange={e => setProfileForm({ ...profileForm, educationLevel: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Status Akreditasi</label>
              <input
                type="text"
                value={profileForm.accreditation}
                onChange={e => setProfileForm({ ...profileForm, accreditation: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={profileForm.city}
                onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Provinsi</label>
              <input
                type="text"
                value={profileForm.province}
                onChange={e => setProfileForm({ ...profileForm, province: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
              />
            </div>
          </div>

          {/* Kepala Sekolah */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
              <UserCheck size={14} className="text-indigo-600" />
              Pimpinan Satuan Pendidikan & Dokumen Titimangsa
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Nama Kepala Sekolah & Gelar *</label>
                <input
                  type="text"
                  required
                  value={profileForm.headmasterName}
                  onChange={e => setProfileForm({ ...profileForm, headmasterName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={profileForm.headmasterNip}
                  onChange={e => setProfileForm({ ...profileForm, headmasterNip: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Pangkat / Golongan</label>
                <input
                  type="text"
                  value={profileForm.headmasterRank}
                  onChange={e => setProfileForm({ ...profileForm, headmasterRank: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tahun Ajaran & Semester */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              Tahun Ajaran & Periode Semester Aktif
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Tahun Ajaran Aktif</label>
                <input
                  type="text"
                  value={profileForm.academicYear}
                  onChange={e => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Semester</label>
                <select
                  value={profileForm.semester}
                  onChange={e => setProfileForm({ ...profileForm, semester: e.target.value as any })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="Ganjil">Semester 1 (Ganjil)</option>
                  <option value="Genap">Semester 2 (Genap)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Tanggal Titimangsa Rapor</label>
                <input
                  type="text"
                  placeholder="Contoh: 19 Desember 2025"
                  value={profileForm.reportDate || ''}
                  onChange={e => setProfileForm({ ...profileForm, reportDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save size={15} />
              <span>Simpan Pengaturan Master Lembaga</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Daftar Pendidik & Tenaga Kependidikan (Guru) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              Direktori Pendidik & Tenaga Kependidikan ({teachers.length} Guru)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi tugas mengajar, rombel yang diampu, dan penugasan wali kelas seluruh guru.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Nama Pendidik</th>
                <th className="px-4 py-3">NIP</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-4 py-3">Kelas Ajar</th>
                <th className="px-4 py-3">Wali Kelas</th>
                <th className="px-4 py-3">Partisi Database</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Belum ada akun guru terdaftar.</td>
                </tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.uid} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{t.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{t.email}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {t.nip || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                        {t.subject || 'Umum'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {Array.isArray(t.teachingClasses) && t.teachingClasses.length > 0 ? (
                        <span className="text-slate-700 font-medium">{t.teachingClasses.join(', ')}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.homeroomClass ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-black border border-emerald-100">
                          {t.homeroomClass}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                      <code>{t.databaseKey || `guru_${t.email.replace(/[^a-z0-9_]/g, '_')}`}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Pusat Backup & Sinkronisasi Master Data Big Data */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-wider mb-1">
            <Database size={12} className="text-indigo-400" />
            Big Data Master Control
          </div>
          <h3 className="text-base font-black">Cadangan Master & Pemulihan Seluruh Data Sekolah</h3>
          <p className="text-xs text-indigo-200 leading-relaxed">
            Unduh seluruh berkas konfigurasi sekolah ({students.length} siswa, {classList.length} rombel, {subjects.length} mata pelajaran, profil lembaga) dalam format terpadu JSON untuk arsip tahunan atau migrasi antar perangkat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsRestoreModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload size={14} />
            <span>Pulihkan dari JSON</span>
          </button>

          <button
            onClick={handleExportFullMasterBackup}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download size={15} />
            <span>Unduh Big Data JSON</span>
          </button>
        </div>
      </div>

      {/* MODAL RESTORE JSON */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Upload size={18} className="text-indigo-600" />
              Pulihkan Master Data Sekolah (JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tempel isi berkas JSON cadangan master data sekolah yang telah Anda unduh sebelumnya:
            </p>
            <textarea
              rows={8}
              value={restoreText}
              onChange={e => setRestoreText(e.target.value)}
              placeholder="Tempel format JSON di sini..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleParseRestore}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-xs"
              >
                Terapkan Pemulihan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
