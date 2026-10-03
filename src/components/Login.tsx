import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, GraduationCap, ShieldCheck, Users, AlertCircle, Loader2, 
  User as UserIcon, Lock, Sparkles, CheckCircle2, ArrowRight, 
  BookOpen, Building2, Phone, Hash, Layers, CheckSquare, Plus, Mail, RefreshCw
} from 'lucide-react';
import { signInWithGoogle, loginAccount, registerAccount, UserRole, RegisterExtraDetails, fetchMasterClassesFromAdmin } from '../lib/firebase';
import { safeStorage } from '../lib/safeStorage';
import { CLASSES } from '../data/presets';

interface LoginProps {
  onLoginSuccess: () => void;
}

const DEFAULT_SCHOOL_CLASSES = [
  "X-MIPA-1", "XI-MIPA-3", "XII-IPS-2",
  "X-1", "X-2", "X-3",
  "XI-1", "XI-2", "XI-3",
  "XII-1", "XII-2", "XII-3"
];

const COMMON_SUBJECTS = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila (PPKn)",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS SD)",
  "Ilmu Pengetahuan Alam (IPA SMP)",
  "Ilmu Pengetahuan Sosial (IPS SMP)",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)",
  "Informatika",
  "Seni Budaya",
  "Prakarya & Kewirausahaan",
  "Sejarah",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ekonomi",
  "Sosiologi",
  "Geografi",
  "Matematika Tingkat Lanjut",
  "Projek IPAS (SMK)",
  "Dasar-Dasar Rekayasa Perangkat Lunak (RPL SMK)",
  "Dasar-Dasar Teknik Komputer dan Jaringan (TKJ SMK)",
  "Dasar-Dasar Teknik Otomotif (SMK)",
  "Dasar-Dasar Akuntansi & Keuangan Lembaga (SMK)",
  "Dasar-Dasar Manajemen Perkantoran & Layanan Bisnis (SMK)",
  "Dasar-Dasar Pemasaran & Bisnis Digital (SMK)",
  "Dasar-Dasar Kuliner / Tata Boga (SMK)",
  "Dasar-Dasar Desain Komunikasi Visual (DKV SMK)",
  "Konsentrasi Keahlian RPL (Pemrograman Web & PBO)",
  "Konsentrasi Keahlian TKJ (Server & Keamanan Jaringan)",
  "Konsentrasi Keahlian TKR / TSM (Teknik Otomotif)",
  "Konsentrasi Keahlian AKL (Akuntansi Keuangan & Komputer Akuntansi)",
  "Konsentrasi Keahlian MPLB (Otomatisasi Perkantoran)",
  "Konsentrasi Keahlian Pemasaran Digital & Bisnis Ritel",
  "Konsentrasi Keahlian Kuliner (Pengolahan Makanan & Pastry)",
  "Konsentrasi Keahlian DKV (Desain Grafis, Videografi & Animasi)",
  "Konsentrasi Keahlian Perhotelan & Housekeeping",
  "Konsentrasi Keahlian Keperawatan & Farmasi Klinis",
  "Projek Kreatif dan Kewirausahaan (PKK SMK)",
  "Praktik Kerja Lapangan (PKL SMK)",
  "Bimbingan & Konseling (BK)"
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states - Basic Auth
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [emailInput, setEmailInput] = useState('');

  // Form states - Guru Identitas & Kelas Mengajar
  const [nip, setNip] = useState('');
  const [subject, setSubject] = useState('Ekonomi');
  const [customSubject, setCustomSubject] = useState('');
  const [institution, setInstitution] = useState('SMA Negeri 2 Tasikmalaya');
  const [phone, setPhone] = useState('');
  const [availableClassesList, setAvailableClassesList] = useState<string[]>(() => {
    const stored = safeStorage.getJSON<string[]>("guru_classes", []);
    const merged = Array.from(new Set([...CLASSES, ...DEFAULT_SCHOOL_CLASSES, ...stored]));
    return merged;
  });
  const [selectedTeachingClasses, setSelectedTeachingClasses] = useState<string[]>(["X-MIPA-1", "XI-MIPA-3"]);
  const [homeroomClass, setHomeroomClass] = useState<string>('');
  const [newClassInput, setNewClassInput] = useState('');
  const [isFetchingAdminClasses, setIsFetchingAdminClasses] = useState(false);
  const [adminClassMsg, setAdminClassMsg] = useState<string | null>(null);

  // Auto-fetch admin class list on mount
  useEffect(() => {
    let isMounted = true;
    fetchMasterClassesFromAdmin().then(classes => {
      if (isMounted && classes && classes.length > 0) {
        setAvailableClassesList(prev => Array.from(new Set([...prev, ...classes])));
      }
    }).catch(err => console.warn("Fetch admin classes error on mount:", err));
    return () => { isMounted = false; };
  }, []);

  const handleFetchAdminClasses = async () => {
    setIsFetchingAdminClasses(true);
    setAdminClassMsg(null);
    try {
      const classes = await fetchMasterClassesFromAdmin();
      if (classes && classes.length > 0) {
        setAvailableClassesList(prev => Array.from(new Set([...prev, ...classes])));
        setAdminClassMsg(`Berhasil memuat ${classes.length} kelas dari database Administrator!`);
      } else {
        setAdminClassMsg("Data kelas telah disinkronkan dari database.");
      }
    } catch (err: any) {
      console.warn("Manual fetch admin classes error:", err);
      setAdminClassMsg("Gagal mengambil data kelas dari database admin.");
    } finally {
      setIsFetchingAdminClasses(false);
      setTimeout(() => setAdminClassMsg(null), 4500);
    }
  };

  // Form states - Siswa Identitas & Masuk Kelas yang Tersedia
  const [nisn, setNisn] = useState('');
  const [attendanceNumber, setAttendanceNumber] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [selectedStudentClass, setSelectedStudentClass] = useState<string>(DEFAULT_SCHOOL_CLASSES[0]);

  // Handle class toggle for teacher
  const toggleTeachingClass = (cls: string) => {
    if (selectedTeachingClasses.includes(cls)) {
      if (selectedTeachingClasses.length <= 1) {
        setError("Guru wajib memilih minimal 1 kelas yang diajar.");
        return;
      }
      setSelectedTeachingClasses(selectedTeachingClasses.filter(c => c !== cls));
    } else {
      setSelectedTeachingClasses([...selectedTeachingClasses, cls]);
    }
    setError(null);
  };

  const handleAddNewClass = () => {
    const trimmed = newClassInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!availableClassesList.includes(trimmed)) {
      setAvailableClassesList([...availableClassesList, trimmed]);
    }
    if (!selectedTeachingClasses.includes(trimmed)) {
      setSelectedTeachingClasses([...selectedTeachingClasses, trimmed]);
    }
    setNewClassInput('');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess();
      }
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMsg = err?.message || '';

      // User closed popup or cancelled: cleanly dismiss without showing an alarming error banner
      if (
        errorCode === 'auth/popup-closed-by-user' || 
        errorCode === 'auth/cancelled-popup-request' ||
        errorMsg.includes('auth/popup-closed-by-user') ||
        errorMsg.includes('popup-closed-by-user') ||
        errorMsg.includes('cancelled-popup-request')
      ) {
        console.info('Jendela Google sign-in ditutup oleh pengguna.');
        return;
      }

      if (errorCode === 'auth/popup-blocked') {
        setError('Jendela pop-up diblokir oleh peramban web (browser). Harap izinkan pop-up untuk situs ini pada pengaturan browser Anda dan coba lagi.');
        return;
      }

      if (errorCode === 'auth/unauthorized-domain') {
        setError('Domain aplikasi ini belum diizinkan pada konsol Firebase Authentication. Silakan masuk menggunakan form username dan kata sandi di atas.');
        return;
      }

      if (errorCode === 'auth/network-request-failed') {
        setError('Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.');
        return;
      }

      console.warn("Catatan autentikasi Google:", errorMsg || err);
      setError(errorMsg || 'Gagal masuk dengan Google. Silakan coba lagi atau gunakan login akun di atas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    if (isLoginTab) {
      if (!identifier.trim() || !password) {
        setError('Username/Email dan Kata Sandi wajib diisi.');
        setIsLoading(false);
        return;
      }

      try {
        await loginAccount(identifier, password);
        onLoginSuccess();
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Terjadi kesalahan saat masuk. Periksa kembali username dan kata sandi Anda.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // REGISTRATION VALIDATION
    if (!name.trim()) {
      setError('Nama Lengkap wajib diisi.');
      setIsLoading(false);
      return;
    }

    if (!identifier.trim()) {
      setError('Username login wajib diisi.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Kata Sandi minimal 6 karakter demi keamanan akun.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi Kata Sandi tidak cocok dengan kata sandi yang dimasukkan.');
      setIsLoading(false);
      return;
    }

    let extraDetails: RegisterExtraDetails = {
      phone: phone.trim()
    };

    if (role === 'guru') {
      const finalEmail = emailInput.trim() || (identifier.includes('@') ? identifier.trim() : '');
      if (!finalEmail || !finalEmail.includes('@')) {
        setError('Alamat Email Guru wajib diisi dengan format valid. Email ini akan digunakan sebagai basis database mandiri Anda.');
        setIsLoading(false);
        return;
      }
      if (!nip.trim()) {
        setError('NIP / NUPTK / No. Identitas Guru wajib diisi.');
        setIsLoading(false);
        return;
      }
      if (!phone.trim()) {
        setError('No. WhatsApp / HP wajib diisi untuk verifikasi akun.');
        setIsLoading(false);
        return;
      }
      if (selectedTeachingClasses.length === 0) {
        setError('Wajib memilih minimal 1 kelas yang Anda ajar.');
        setIsLoading(false);
        return;
      }

      const finalSubject = subject === 'Lainnya' ? (customSubject.trim() || 'Umum') : subject;

      extraDetails = {
        email: finalEmail,
        nip: nip.trim(),
        phone: phone.trim(),
        institution: institution.trim() || 'SMA Negeri 2 Tasikmalaya',
        subject: finalSubject,
        teachingClasses: selectedTeachingClasses,
        homeroomClass: homeroomClass ? homeroomClass.trim() : undefined
      };
    } else if (role === 'siswa') {
      if (!nisn.trim()) {
        setError('NISN / NIS Siswa wajib diisi.');
        setIsLoading(false);
        return;
      }
      if (!attendanceNumber.trim()) {
        setError('Nomor Absen Siswa wajib diisi.');
        setIsLoading(false);
        return;
      }
      if (!phone.trim()) {
        setError('No. WhatsApp / HP Siswa wajib diisi.');
        setIsLoading(false);
        return;
      }
      if (!selectedStudentClass) {
        setError('Siswa wajib memilih salah satu kelas yang sudah tersedia.');
        setIsLoading(false);
        return;
      }

      const finalEmail = emailInput.trim() || (identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@siswa.sekolah.id`);

      extraDetails = {
        email: finalEmail,
        nisn: nisn.trim(),
        kelas: selectedStudentClass,
        gender,
        attendanceNumber: attendanceNumber.trim(),
        phone: phone.trim()
      };
    }

    try {
      const newUser = await registerAccount(identifier, password, name, role, extraDetails);
      if (newUser.status === 'approved') {
        setSuccessMessage('Akun Administrator utama berhasil dibuat dan langsung aktif!');
      } else if (role === 'guru') {
        setSuccessMessage(`Pendaftaran Guru berhasil diajukan! Akun dan database mandiri Anda (${newUser.email}) akan otomatis aktif setelah disetujui Administrator.`);
      } else {
        setSuccessMessage(`Pendaftaran Siswa di kelas ${selectedStudentClass} berhasil diajukan! Akun Anda sedang menunggu verifikasi oleh Guru.`);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan pendaftaran. Silakan periksa kembali data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex items-center justify-center p-4 py-8">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full ${!isLoginTab ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 transition-all duration-300`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 p-6 text-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="mx-auto w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-display">EduAsisten</h1>
          <p className="text-indigo-100 text-xs font-medium mt-0.5">
            SuperApp Administrasi Pendidikan, Big Data & Pembelajaran Digital
          </p>
        </div>
        
        <div className="p-6 md:p-8 space-y-5">
          {/* Switch Tab: Masuk / Daftar */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => { setIsLoginTab(true); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                isLoginTab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginTab(false); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                !isLoginTab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginTab && (
              <>
                {/* Peran Akun: Guru / Siswa */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Pilih Peran Akun <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setRole('guru'); setError(null); }}
                      className={`p-3 border-2 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        role === 'guru' 
                          ? 'bg-indigo-50/80 border-indigo-600 text-indigo-800 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black">
                        <Users size={16} className={role === 'guru' ? 'text-indigo-600' : 'text-slate-400'} /> 
                        <span>Guru / Pendidik</span>
                      </div>
                      <span className="text-[10px] text-slate-500 text-center font-normal leading-tight">
                        Database Mandiri berbasis Email
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRole('siswa'); setError(null); }}
                      className={`p-3 border-2 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        role === 'siswa' 
                          ? 'bg-sky-50/80 border-sky-600 text-sky-800 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black">
                        <GraduationCap size={16} className={role === 'siswa' ? 'text-sky-600' : 'text-slate-400'} /> 
                        <span>Siswa / Pelajar</span>
                      </div>
                      <span className="text-[10px] text-slate-500 text-center font-normal leading-tight">
                        Bergabung ke Kelas Tersedia
                      </span>
                    </button>
                  </div>
                </div>

                {/* GURU SPECIFIC FIELDS */}
                {role === 'guru' && (
                  <div className="space-y-4 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-900 border-b border-indigo-100 pb-2">
                      <ShieldCheck size={16} className="text-indigo-600" />
                      <span>Form Identitas Pribadi & Database Guru</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Nama Lengkap */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Yudi Ginanjar, M.Pd."
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* NIP / NUPTK */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          NIP / NUPTK / No. Pegawai <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={nip}
                            onChange={(e) => setNip(e.target.value)}
                            placeholder="199605242024211008"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Email Resmi Guru (Basis Database) */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Email Guru (Basis Database) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="nama.guru@guru.sma.belajar.id"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
                          Setiap guru yang disetujui memiliki database mandiri sesuai email ini.
                        </span>
                      </div>

                      {/* No WhatsApp / HP */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          No. WhatsApp / HP Aktif <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="081234567890"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Mata Pelajaran yang Diampu */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Mata Pelajaran yang Diampu <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {COMMON_SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="Lainnya">Mata Pelajaran Lainnya...</option>
                        </select>
                        {subject === 'Lainnya' && (
                          <input
                            type="text"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Tuliskan nama mata pelajaran..."
                            className="w-full mt-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        )}
                      </div>

                      {/* Instansi / Sekolah */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Instansi / Sekolah Asal
                        </label>
                        <div className="relative">
                          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            placeholder="SMA Negeri 2 Tasikmalaya"
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* KELAS APA SAJA DIA MENGAJAR */}
                    <div className="pt-2 border-t border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={14} className="text-indigo-600" />
                          <span>Kelas Apa Saja yang Anda Ajar? <span className="text-rose-500">*</span></span>
                        </label>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                          {selectedTeachingClasses.length} kelas dipilih
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Centang rombel kelas yang Anda ampu di sekolah ini:
                          </p>
                          <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                            ✨ Data siswa kelas terpilih akan otomatis diintegrasikan dari database Administrator.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFetchAdminClasses}
                          disabled={isFetchingAdminClasses}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-indigo-200 shadow-2xs shrink-0"
                          title="Ambil dan sinkronkan daftar kelas dari database administrator"
                        >
                          <RefreshCw size={11} className={isFetchingAdminClasses ? "animate-spin text-indigo-600" : "text-indigo-600"} />
                          <span>{isFetchingAdminClasses ? "Memuat..." : "Ambil Data Kelas Admin"}</span>
                        </button>
                      </div>

                      {adminClassMsg && (
                        <div className="mb-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-medium flex items-center justify-between">
                          <span>{adminClassMsg}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {availableClassesList.map((cls) => {
                          const isSelected = selectedTeachingClasses.includes(cls);
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleTeachingClass(cls)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[9px] ${
                                isSelected ? 'bg-white text-indigo-700 font-black' : 'border border-slate-300'
                              }`}>
                                {isSelected ? "✓" : ""}
                              </span>
                              <span>{cls}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Add custom teaching class */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newClassInput}
                          onChange={(e) => setNewClassInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewClass(); } }}
                          placeholder="Tambah kelas lain (contoh: XII-MIPA-1)..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewClass}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus size={14} /> Tambah
                        </button>
                      </div>

                      {/* Wali Kelas Optional */}
                      <div className="mt-3 pt-2 border-t border-indigo-50 flex items-center gap-3">
                        <span className="text-[11px] font-bold text-slate-600">Wali Kelas (Opsional):</span>
                        <select
                          value={homeroomClass}
                          onChange={(e) => setHomeroomClass(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Bukan Wali Kelas</option>
                          {selectedTeachingClasses.map(c => (
                            <option key={c} value={c}>Wali Kelas {c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SISWA SPECIFIC FIELDS */}
                {role === 'siswa' && (
                  <div className="space-y-4 bg-sky-50/40 p-4 rounded-2xl border border-sky-100">
                    <div className="flex items-center gap-2 text-xs font-black text-sky-900 border-b border-sky-100 pb-2">
                      <GraduationCap size={16} className="text-sky-600" />
                      <span>Form Identitas Siswa & Masuk Kelas Tersedia</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Nama Siswa */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Nama Lengkap Siswa <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ahmad Fauzi"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* NISN / NIS */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          NISN / NIS Siswa <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={nisn}
                            onChange={(e) => setNisn(e.target.value)}
                            placeholder="0078912345"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* No Absen */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Nomor Absen <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={attendanceNumber}
                          onChange={(e) => setAttendanceNumber(e.target.value)}
                          placeholder="Contoh: 14"
                          required
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      {/* Jenis Kelamin */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          Jenis Kelamin <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setGender('L')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                              gender === 'L' ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Laki-laki (L)
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender('P')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                              gender === 'P' ? 'bg-pink-600 text-white border-pink-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            Perempuan (P)
                          </button>
                        </div>
                      </div>

                      {/* No WhatsApp / HP */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                          No. WhatsApp / HP Siswa <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* MASUK KE KELAS YANG SUDAH TERSEDIA */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                            Masuk ke Kelas Tersedia <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleFetchAdminClasses}
                            disabled={isFetchingAdminClasses}
                            className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border border-sky-200"
                            title="Ambil data kelas resmi dari database administrator"
                          >
                            <RefreshCw size={10} className={isFetchingAdminClasses ? "animate-spin text-sky-600" : "text-sky-600"} />
                            <span>Ambil Kelas Admin</span>
                          </button>
                        </div>
                        <div className="relative">
                          <Layers size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-600" />
                          <select
                            value={selectedStudentClass}
                            onChange={(e) => setSelectedStudentClass(e.target.value)}
                            required
                            className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-sky-300 rounded-xl text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none"
                          >
                            {availableClassesList.map((cls) => (
                              <option key={cls} value={cls}>Kelas {cls}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[10px] text-sky-700 font-semibold block mt-0.5">
                          Siswa wajib bergabung pada rombel kelas resmi sekolah yang tersedia.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* AKUN LOGIN (Username & Password) */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                    {isLoginTab ? "Username atau Email" : "Username Login Akun"} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={isLoginTab ? "Username atau email terdaftar" : "Buat username unik"}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLoginTab ? "Masukkan kata sandi" : "Minimal 6 karakter"}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Confirm Password (Register Only) */}
                {!isLoginTab && (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1">
                      Ulangi Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi yang sama"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200">
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
                  <span>Ajukan Pendaftaran Akun</span>
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
                atau masuk SSO
              </span>
            </div>
          </div>

          {/* Google Login Option */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs cursor-pointer text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google Workspace
          </button>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck size={12} className="text-indigo-600" /> Ketentuan Administrasi & Basis Data:
            </p>
            <p>• <strong>Guru:</strong> Setiap guru yang disetujui Admin memiliki partisi database mandiri sesuai email terdaftar.</p>
            <p>• <strong>Siswa:</strong> Setiap siswa wajib mendaftar dan masuk ke salah satu kelas sekolah yang tersedia.</p>
            <p>• <strong>Admin:</strong> Administrator utama bertindak sebagai pusat <strong>Big Data</strong> sekolah untuk seluruh administrasi guru dan siswa.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
