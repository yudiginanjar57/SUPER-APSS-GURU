import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, GraduationCap, ShieldCheck, Users, AlertCircle, Loader2, User as UserIcon, Lock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { signInWithGoogle, loginAccount, registerAccount, UserRole } from '../lib/firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('guru');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal masuk dengan Google. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    if (!identifier.trim() || !password) {
      setError('Username/Email dan Kata Sandi wajib diisi.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLoginTab) {
        const user = await loginAccount(identifier, password);
        if (user.status === 'pending') {
          // Account is pending verification
        }
        onLoginSuccess();
      } else {
        if (!name.trim()) {
          setError('Nama Lengkap wajib diisi.');
          setIsLoading(false);
          return;
        }
        const newUser = await registerAccount(identifier, password, name, role);
        if (newUser.status === 'approved') {
          setSuccessMessage('Akun Admin pertama berhasil dibuat dan langsung aktif!');
        } else {
          setSuccessMessage(`Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi oleh ${role === 'guru' ? 'Admin' : 'Guru'}.`);
        }
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan. Silakan periksa kembali data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 border border-white/20 shadow-inner">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">EduAsisten</h1>
          <p className="text-indigo-100 text-xs font-medium mt-1">
            SuperApp Administrasi Pendidikan & Ruang Belajar
          </p>
        </div>
        
        <div className="p-7 space-y-5">
          {/* Switch Tab: Masuk / Daftar */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setIsLoginTab(true); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
                isLoginTab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginTab(false); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
                !isLoginTab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginTab && (
              <>
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso, S.Pd."
                      required={!isLoginTab}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Peran Akun: Guru / Siswa */}
                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                    Peran Akun
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('guru')}
                      className={`py-2.5 px-3 border rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        role === 'guru' 
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users size={15} /> <span>Guru</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-normal">Diverifikasi Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('siswa')}
                      className={`py-2.5 px-3 border rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        role === 'siswa' 
                          ? 'bg-sky-50 border-sky-600 text-sky-700 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={15} /> <span>Siswa</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-normal">Diverifikasi Guru</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Username / Email */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isLoginTab ? "Username atau alamat email" : "Pilih username atau email"}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-70 mt-3 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isLoginTab ? (
                <>
                  <LogIn size={18} />
                  <span>Masuk ke Akun</span>
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  <span>Daftar Sekarang</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative pt-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-wider">
                atau opsi lain
              </span>
            </div>
          </div>

          {/* Google Login Option */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>
          

          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-indigo-900 flex items-center gap-1">
              <ShieldCheck size={12} className="text-indigo-600" /> Aturan Verifikasi Akun:
            </p>
            <p>• Akun <strong>Guru</strong> akan diverifikasi dan disetujui oleh <strong>Admin</strong>.</p>
            <p>• Akun <strong>Siswa</strong> akan diverifikasi dan disetujui oleh <strong>Guru</strong>.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
