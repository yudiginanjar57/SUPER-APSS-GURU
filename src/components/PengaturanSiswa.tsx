import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  KeyRound, 
  Mail, 
  Phone, 
  Building2, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  Camera, 
  X, 
  Save, 
  ShieldAlert,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { AppUser, userUpdateSelfProfile, userChangePassword, submitPasswordResetRequest } from '../lib/firebase';
import { formatDriveImageUrl } from '../lib/driveUtils';

interface PengaturanSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
  classList?: string[];
  onProfileUpdated?: (updatedUser: Partial<AppUser>) => void;
}

export default function PengaturanSiswaModal({
  isOpen,
  onClose,
  user,
  classList = ["X-1", "X-2", "XI-1", "XI-2", "XII-1", "XII-2"],
  onProfileUpdated
}: PengaturanSiswaModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'reset_request'>('profile');

  // Form states for profile
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [nisn, setNisn] = useState(user.nisn || '');
  const [kelas, setKelas] = useState(user.kelas || classList[0] || 'X-1');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');

  // Form states for change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form state for password reset request
  const [resetReason, setResetReason] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setStatusMessage({ type: 'error', text: 'Ukuran foto maksimal 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotoURL(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        throw new Error("Nama lengkap wajib diisi.");
      }

      await userUpdateSelfProfile(user.uid, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nisn: nisn.trim(),
        kelas: kelas.trim(),
        photoURL
      });

      if (onProfileUpdated) {
        onProfileUpdated({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          nisn: nisn.trim(),
          kelas: kelas.trim(),
          photoURL
        });
      }

      setStatusMessage({ type: 'success', text: 'Profil siswa berhasil diperbarui.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword !== confirmNewPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    if (newPassword.length < 4) {
      setStatusMessage({ type: 'error', text: 'Kata sandi baru minimal 4 karakter.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await userChangePassword(user.uid, oldPassword, newPassword);
      setStatusMessage({ type: 'success', text: 'Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!resetReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Mohon tuliskan alasan permohonan reset password.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPasswordResetRequest(user, resetReason);
      setRequestSubmitted(true);
      setStatusMessage({ 
        type: 'success', 
        text: 'Permohonan reset kata sandi berhasil dikirim ke Administrator dan Guru. Mohon tunggu konfirmasi admin.' 
      });
      setResetReason('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mengirim permohonan reset password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-xl relative z-10 max-h-[90vh] flex flex-col"
        id="student-settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Pengaturan Akun Siswa</h2>
              <p className="text-xs text-slate-500 font-medium">Ubah informasi profil, kata sandi, & ajukan reset password</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            id="close-student-settings-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-2xl my-4 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setStatusMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-btn-student-profile"
          >
            <User size={14} /> Profil Siswa
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('password'); setStatusMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'password' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-btn-student-password"
          >
            <Lock size={14} /> Ganti Kata Sandi
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('reset_request'); setStatusMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'reset_request' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="tab-btn-student-reset-request"
          >
            <KeyRound size={14} /> Ajukan Reset
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className={`p-3.5 rounded-2xl mb-3 flex items-start gap-2 text-xs font-bold ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            )}
            <span className="flex-1 leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4" id="student-profile-form">
              {/* Photo Upload */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md overflow-hidden border-2 border-white ring-2 ring-indigo-200">
                    {photoURL ? (
                      <img src={formatDriveImageUrl(photoURL)} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={34} className="text-white/80" />
                    )}
                  </div>
                  <label 
                    htmlFor="student-photo-upload-input" 
                    className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer border border-white"
                    title="Unggah Foto Profil"
                  >
                    <Camera size={13} />
                    <input 
                      id="student-photo-upload-input" 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1 w-full">
                  <h3 className="text-sm font-extrabold text-slate-800">Foto Profil Siswa</h3>
                  <p className="text-[11px] text-slate-500">
                    Gunakan foto formal atau tempel link Google Drive untuk identitas absensi digital Anda.
                  </p>

                  <div className="pt-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 mb-1 text-left">
                      Link Foto (Google Drive / URL Gambar):
                    </label>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/file/d/..."
                      value={photoURL}
                      onChange={(e) => setPhotoURL(formatDriveImageUrl(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                    />
                  </div>

                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="text-[10px] text-rose-600 font-bold hover:underline block pt-0.5"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              {/* Username (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Username Akun (ID Sistem)
                </label>
                <input 
                  type="text" 
                  value={`@${user.username}`} 
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed font-bold"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                  id="student-input-name"
                />
              </div>

              {/* Kelas & NISN in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas Terdaftar *
                  </label>
                  <select 
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold text-slate-800 outline-none transition-all bg-white"
                    id="student-select-kelas"
                  >
                    {classList.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NISN / NIS
                  </label>
                  <input 
                    type="text" 
                    value={nisn} 
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Nomor Induk Siswa Nasional"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                    id="student-input-nisn"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email
                  </label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                    id="student-input-email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                    id="student-input-phone"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  id="save-student-profile-btn"
                >
                  <Save size={15} />
                  <span>{isSubmitting ? "Menyimpan Perubahan..." : "Simpan Perubahan Profil"}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4" id="student-change-password-form">
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 text-xs text-slate-600 leading-relaxed">
                Ubah kata sandi Anda secara berkala untuk menjaga keamanan akun siswa Anda.
              </div>

              {/* Old Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Lama *
                </label>
                <div className="relative">
                  <input 
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi saat ini"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all pr-10"
                    id="student-input-old-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all pr-10"
                    id="student-input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru *
                </label>
                <input 
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                  id="student-input-confirm-password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  id="student-submit-change-password-btn"
                >
                  <Lock size={15} />
                  <span>{isSubmitting ? "Mengubah Kata Sandi..." : "Perbarui Kata Sandi Sekarang"}</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. Request Password Reset Tab */}
          {activeTab === 'reset_request' && (
            <form onSubmit={handleRequestPasswordReset} className="space-y-4" id="student-reset-request-form">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <span>Lupa Kata Sandi Akun atau Butuh Reset?</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Jika Anda lupa kata sandi lama atau mengalami kendala login pada perangkat lain, Anda dapat mengajukan permohonan reset resmi kepada Administrator Sekolah / Guru Pengampu.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Permohonan Reset Password *
                </label>
                <textarea 
                  rows={3}
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Contoh: Lupa password akun, ingin reset ke password default atau bantuan login di HP baru."
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-medium text-slate-800 outline-none transition-all"
                  id="student-input-reset-reason"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Data Akun Yang Akan Dikirim:</div>
                <div>• Nama: <strong>{user.name}</strong></div>
                <div>• Username: <strong>@{user.username}</strong></div>
                <div>• Kelas: <strong>{kelas || user.kelas || "-"}</strong></div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  id="student-submit-reset-request-btn"
                >
                  <Send size={15} />
                  <span>{isSubmitting ? "Mengirim Pengajuan..." : "Kirim Pengajuan Reset ke Admin / Guru"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
