import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ShieldCheck, 
  KeyRound, 
  UserPlus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  Activity, 
  Clock, 
  RefreshCw, 
  GraduationCap, 
  Lock, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  UserX, 
  UserCheck, 
  Download, 
  Mail, 
  Phone, 
  Building2, 
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Ban
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded } from '../lib/firebaseClient';
import { formatDriveImageUrl } from '../lib/driveUtils';
import { collection, query, onSnapshot, orderBy, doc, limit } from 'firebase/firestore';
import { 
  AppUser, 
  UserRole, 
  UserStatus, 
  UserActivityLog,
  PasswordResetRequest,
  adminResetUserPassword, 
  adminUpdateUser, 
  adminCreateUser, 
  adminDeleteUser,
  resolvePasswordResetRequest,
  rejectPasswordResetRequest,
  logUserActivity
} from '../lib/firebase';

interface Props {
  currentUserRole: 'admin' | 'guru' | 'siswa';
  currentUser?: AppUser | null;
  classList?: string[];
}

export default function ManajemenPengguna({ 
  currentUserRole, 
  currentUser,
  classList = ["X-1", "X-2", "XI-1", "XI-2", "XII-1", "XII-2"] 
}: Props) {
  // Navigation & subtabs
  const [activeTab, setActiveTab] = useState<'users' | 'verification' | 'activities' | 'reset_requests'>('users');
  
  // Data state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isResetReqLoading, setIsResetReqLoading] = useState(true);
  
  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guru' | 'siswa' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'suspended' | 'rejected'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  
  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResolveReqModalOpen, setIsResolveReqModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selectedUserActivities, setSelectedUserActivities] = useState<AppUser | null>(null);
  const [selectedResetReq, setSelectedResetReq] = useState<PasswordResetRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    passwordRaw: '',
    role: 'guru' as UserRole,
    status: 'approved' as UserStatus,
    nip: '',
    nisn: '',
    phone: '',
    institution: 'SMA Negeri 2 Tasikmalaya',
    kelas: classList[0] || 'X-1'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'guru' as UserRole,
    status: 'approved' as UserStatus,
    nip: '',
    nisn: '',
    phone: '',
    institution: '',
    kelas: ''
  });

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Realtime Listen to Users
  useEffect(() => {
    if (isFirestoreQuotaExceeded()) {
      setIsLoading(false);
      setActionError('Batas kuota harian Firestore tercapai. Menggunakan mode penyimpanan lokal.');
      return;
    }
    setIsLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        fetched.push({
          uid: docSnap.id,
          username: d.username || d.email || docSnap.id,
          email: d.email || '',
          name: d.name || 'Pengguna',
          photoURL: d.photoURL || '',
          role: d.role || 'guru',
          status: d.status || 'approved',
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
          lastActive: d.lastActive,
          nip: d.nip || '',
          nisn: d.nisn || '',
          phone: d.phone || '',
          institution: d.institution || '',
          kelas: d.kelas || ''
        });
      });
      // Sort users: admins first, then guru, then siswa
      fetched.sort((a, b) => {
        const roleOrder: Record<string, number> = { admin: 1, guru: 2, siswa: 3 };
        const roA = roleOrder[a.role] || 99;
        const roB = roleOrder[b.role] || 99;
        if (roA !== roB) return roA - roB;
        return a.name.localeCompare(b.name);
      });
      setUsers(fetched);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setActionError('Gagal menghubungkan ke database pengguna. Mode offline aktif.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Realtime Listen to Activity Logs
  useEffect(() => {
    if (isFirestoreQuotaExceeded()) {
      setIsActivitiesLoading(false);
      return;
    }
    setIsActivitiesLoading(true);
    const qAct = query(collection(db, 'user_activities'), limit(100));
    const unsubAct = onSnapshot(qAct, (snapshot) => {
      const fetchedActs: UserActivityLog[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        fetchedActs.push({
          id: docSnap.id,
          userId: d.userId || '',
          username: d.username || '',
          name: d.name || 'Pengguna',
          role: d.role || '',
          action: d.action || '',
          details: d.details || '',
          type: d.type || 'general',
          timestamp: d.timestamp,
          performedBy: d.performedBy
        });
      });
      // Sort descending by timestamp
      fetchedActs.sort((a, b) => {
        const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
        const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
        return tB - tA;
      });
      setActivities(fetchedActs);
      setIsActivitiesLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'user_activities');
      setIsActivitiesLoading(false);
    });

    return () => unsubAct();
  }, []);

  // 3. Realtime Listen to Password Reset Requests
  useEffect(() => {
    if (isFirestoreQuotaExceeded()) {
      setIsResetReqLoading(false);
      return;
    }
    setIsResetReqLoading(true);
    const qReq = query(collection(db, 'password_reset_requests'), limit(100));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      const fetchedReqs: PasswordResetRequest[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        fetchedReqs.push({
          id: docSnap.id,
          userId: d.userId || '',
          username: d.username || '',
          name: d.name || 'Siswa',
          role: d.role || 'siswa',
          email: d.email || '',
          nisn: d.nisn || '',
          kelas: d.kelas || '',
          reason: d.reason || '',
          status: d.status || 'pending',
          createdAt: d.createdAt,
          resolvedAt: d.resolvedAt,
          resolvedBy: d.resolvedBy,
          newTemporaryPassword: d.newTemporaryPassword
        });
      });
      // Sort descending by createdAt
      fetchedReqs.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
        return tB - tA;
      });
      setResetRequests(fetchedReqs);
      setIsResetReqLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'password_reset_requests');
      setIsResetReqLoading(false);
    });

    return () => unsubReq();
  }, []);

  // Helper notice
  const notifySuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4500);
  };

  const notifyError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 6000);
  };

  // Status metrics
  const totalUsers = users.length;
  const totalGuru = users.filter(u => u.role === 'guru' && u.status === 'approved').length;
  const totalSiswa = users.filter(u => u.role === 'siswa' && u.status === 'approved').length;
  const totalPending = users.filter(u => u.status === 'pending').length;
  const totalSuspended = users.filter(u => u.status === 'suspended' || u.status === 'rejected').length;
  const totalPendingResetReqs = resetRequests.filter(r => r.status === 'pending').length;

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    // Role restriction: If logged in as Guru, they can only manage Siswa
    if (currentUserRole === 'guru' && u.role !== 'siswa') {
      return false;
    }

    // Role filter
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchNip = u.nip?.toLowerCase().includes(q);
      const matchNisn = u.nisn?.toLowerCase().includes(q);
      const matchKelas = u.kelas?.toLowerCase().includes(q);
      return matchName || matchUser || matchEmail || matchNip || matchNisn || matchKelas;
    }

    return true;
  });

  // Filtered Activities
  const filteredActivities = activities.filter((act) => {
    if (activityTypeFilter !== 'all' && act.type !== activityTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        act.name.toLowerCase().includes(q) ||
        act.username.toLowerCase().includes(q) ||
        act.action.toLowerCase().includes(q) ||
        (act.details && act.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Verification Pending Queue
  const pendingUsers = users.filter(u => {
    if (currentUserRole === 'guru' && u.role !== 'siswa') return false;
    return u.status === 'pending';
  });

  // Filtered Reset Requests
  const filteredResetRequests = resetRequests.filter((req) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.name.toLowerCase().includes(q);
      const matchUser = req.username.toLowerCase().includes(q);
      const matchReason = req.reason.toLowerCase().includes(q);
      const matchNisn = req.nisn?.toLowerCase().includes(q);
      const matchKelas = req.kelas?.toLowerCase().includes(q);
      return matchName || matchUser || matchReason || matchNisn || matchKelas;
    }
    return true;
  });

  // Action Handlers
  const handleOpenResolveRequestModal = (req: PasswordResetRequest) => {
    setSelectedResetReq(req);
    // Suggest a friendly new password (e.g. Siswa2026!)
    const randomPass = 'Siswa' + Math.floor(1000 + Math.random() * 9000) + '!';
    setNewPassword(randomPass);
    setShowPassword(true);
    setCopiedPass(false);
    setIsResolveReqModalOpen(true);
  };

  const handleConfirmResolveRequest = async () => {
    if (!selectedResetReq || !selectedResetReq.id) return;
    if (!newPassword.trim() || newPassword.length < 6) {
      notifyError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resolvePasswordResetRequest(
        selectedResetReq.id,
        selectedResetReq.userId,
        selectedResetReq.username,
        selectedResetReq.name,
        newPassword.trim(),
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );

      notifySuccess(`Kata sandi untuk ${selectedResetReq.name} (@${selectedResetReq.username}) berhasil direset!`);
      setIsResolveReqModalOpen(false);
      setSelectedResetReq(null);
    } catch (err: any) {
      notifyError("Gagal mereset kata sandi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRejectModal = (req: PasswordResetRequest) => {
    setSelectedResetReq(req);
    setRejectReasonInput('Permohonan tidak dapat diverifikasi atau tidak memenuhi syarat.');
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectRequest = async () => {
    if (!selectedResetReq || !selectedResetReq.id) return;
    if (!rejectReasonInput.trim()) {
      notifyError("Alasan penolakan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectPasswordResetRequest(
        selectedResetReq.id,
        selectedResetReq.userId,
        selectedResetReq.username,
        selectedResetReq.name,
        rejectReasonInput.trim(),
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );

      notifySuccess(`Permohonan reset kata sandi dari ${selectedResetReq.name} telah ditolak.`);
      setIsRejectModalOpen(false);
      setSelectedResetReq(null);
    } catch (err: any) {
      notifyError("Gagal menolak permohonan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (user: AppUser, newStatus: UserStatus) => {
    try {
      await adminUpdateUser(
        user.uid, 
        { status: newStatus }, 
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );
      notifySuccess(`Status akun ${user.name} diubah menjadi: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      notifyError('Gagal mengubah status: ' + err.message);
    }
  };

  const handleOpenResetModal = (user: AppUser) => {
    setSelectedUser(user);
    // Generate a secure, friendly default random password
    const randomPass = 'guru' + Math.floor(1000 + Math.random() * 9000) + '!';
    setNewPassword(randomPass);
    setShowPassword(true);
    setCopiedPass(false);
    setIsResetPassModalOpen(true);
  };

  const handleExecuteResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 4) {
      notifyError("Password baru minimal 4 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminResetUserPassword(
        selectedUser.uid,
        newPassword,
        selectedUser.name,
        selectedUser.username,
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );
      setIsResetPassModalOpen(false);
      notifySuccess(`Password untuk ${selectedUser.name} (@${selectedUser.username}) berhasil di-reset menjadi "${newPassword}".`);
    } catch (err: any) {
      notifyError('Gagal me-reset password: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      nip: user.nip || '',
      nisn: user.nisn || '',
      phone: user.phone || '',
      institution: user.institution || '',
      kelas: user.kelas || ''
    });
    setIsEditModalOpen(true);
  };

  const handleExecuteEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!editForm.name.trim() || !editForm.username.trim()) {
      notifyError("Nama dan Username tidak boleh kosong.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminUpdateUser(
        selectedUser.uid,
        {
          name: editForm.name.trim(),
          username: editForm.username.trim().toLowerCase(),
          email: editForm.email.trim(),
          role: editForm.role,
          status: editForm.status,
          nip: editForm.nip.trim(),
          nisn: editForm.nisn.trim(),
          phone: editForm.phone.trim(),
          institution: editForm.institution.trim(),
          kelas: editForm.kelas.trim()
        },
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );
      setIsEditModalOpen(false);
      notifySuccess(`Data akun ${editForm.name} berhasil diperbarui.`);
    } catch (err: any) {
      notifyError('Gagal memperbarui akun: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.passwordRaw) {
      notifyError("Nama, Username, dan Password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await adminCreateUser(
        createForm,
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );
      setIsCreateModalOpen(false);
      // Reset form
      setCreateForm({
        name: '',
        username: '',
        email: '',
        passwordRaw: '',
        role: 'guru',
        status: 'approved',
        nip: '',
        nisn: '',
        phone: '',
        institution: 'SMA Negeri 2 Tasikmalaya',
        kelas: classList[0] || 'X-1'
      });
      notifySuccess(`Akun ${created.name} (@${created.username}) berhasil dibuat dan langsung aktif.`);
    } catch (err: any) {
      notifyError('Gagal membuat akun: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await adminDeleteUser(
        selectedUser.uid,
        selectedUser.name,
        selectedUser.username,
        currentUser ? { name: currentUser.name, username: currentUser.username } : undefined
      );
      setIsDeleteModalOpen(false);
      notifySuccess(`Akun ${selectedUser.name} telah dihapus permanen dari sistem.`);
    } catch (err: any) {
      notifyError('Gagal menghapus akun: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export User List to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      notifyError("Tidak ada data pengguna untuk diekspor.");
      return;
    }

    const headers = ["Nama Lengkap", "Username", "Email", "Peran", "Status", "NIP/NISN", "Kelas", "Terdaftar Pada", "Login Terakhir"];
    const rows = filteredUsers.map(u => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.username}"`,
      `"${u.email}"`,
      `"${u.role.toUpperCase()}"`,
      `"${u.status.toUpperCase()}"`,
      `"${u.nip || u.nisn || '-'}"`,
      `"${u.kelas || '-'}"`,
      `"${u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('id-ID') : '-'}"`,
      `"${u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString('id-ID') : '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daftar_Pengguna_SuperAppGuru_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess("File CSV daftar pengguna berhasil diunduh.");
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  // Format date helper
  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Belum ada data';
    try {
      if (ts.toDate) return ts.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      if (ts instanceof Date) return ts.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      if (typeof ts === 'number') return new Date(ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      return String(ts);
    } catch (e) {
      return 'Tercatat';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                {currentUserRole === 'admin' ? 'Master Control Admin' : 'Panel Manajemen Siswa'}
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-400/30">
                Firestore Realtime
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
              Manajemen Pengguna & Aktivitas Akun
            </h1>
            <p className="text-xs md:text-sm text-indigo-100/80 max-w-2xl leading-relaxed">
              {currentUserRole === 'admin'
                ? 'Kelola data guru dan siswa, verifikasi pendaftaran akun baru, atur hak akses, pantau log aktivitas login, dan lakukan reset kata sandi instan.'
                : 'Verifikasi dan kelola akun siswa kelas Anda, aktifkan akun belajar, dan pantau aktivitas belajar siswa.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUserRole === 'admin' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCreateForm({
                    name: '',
                    username: '',
                    email: '',
                    passwordRaw: 'guru1234',
                    role: 'guru',
                    status: 'approved',
                    nip: '',
                    nisn: '',
                    phone: '',
                    institution: 'SMA Negeri 2 Tasikmalaya',
                    kelas: classList[0] || 'X-1'
                  });
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer border border-indigo-400/30 transition-all"
                id="btn-add-user"
              >
                <UserPlus size={16} />
                <span>Tambah Pengguna</span>
              </motion.button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl flex items-center gap-2 cursor-pointer transition-colors border border-white/10"
              title="Unduh Data Pengguna (.CSV)"
            >
              <Download size={15} />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 mt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-indigo-200 font-bold block">Total Pengguna</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-white">{totalUsers}</span>
              <span className="text-[9px] text-indigo-300 font-medium">Akun</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-emerald-200 font-bold block">Guru Aktif</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-300">{totalGuru}</span>
              <span className="text-[9px] text-emerald-200/80 font-medium">Pengajar</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-sky-200 font-bold block">Siswa Aktif</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-sky-300">{totalSiswa}</span>
              <span className="text-[9px] text-sky-200/80 font-medium">Peserta Didik</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border transition-all ${
            totalPending > 0 
              ? 'bg-amber-500/20 border-amber-400/50 shadow-xs' 
              : 'bg-white/5 border-white/10'
          }`}>
            <span className="text-[10px] text-amber-200 font-bold block flex items-center gap-1">
              {totalPending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
              Menunggu Verifikasi
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-amber-300">{totalPending}</span>
              <span className="text-[9px] text-amber-200/80 font-medium">Pendaftar</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-rose-200 font-bold block">Dinonaktifkan</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-rose-300">{totalSuspended}</span>
              <span className="text-[9px] text-rose-200/80 font-medium">Suspended</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between border border-emerald-200 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-black">✕</button>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between border border-rose-200 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800 text-xs font-black">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Navigation Tabs & Search Controls */}
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Navigation Subtabs */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl shrink-0 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={15} />
              <span>Semua Pengguna</span>
              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-md text-[10px]">
                {filteredUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap relative ${
                activeTab === 'verification'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck size={15} />
              <span>Verifikasi Pendaftaran</span>
              {totalPending > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-md text-[10px] font-black animate-pulse">
                  {totalPending}
                </span>
              )}
            </button>

            {currentUserRole === 'admin' && (
              <button
                onClick={() => setActiveTab('activities')}
                className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'activities'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity size={15} />
                <span>Log & Aktivitas Login</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('reset_requests')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap relative ${
                activeTab === 'reset_requests'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound size={15} />
              <span>Permohonan Reset Kata Sandi</span>
              {totalPendingResetReqs > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-md text-[10px] font-black animate-pulse">
                  {totalPendingResetReqs}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-md relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'activities'
                  ? "Cari nama, aksi, atau rincian aktivitas..."
                  : activeTab === 'reset_requests'
                  ? "Cari nama siswa, username, NISN, atau alasan..."
                  : "Cari nama, username, email, NIP/NISN, atau kelas..."
              }
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sub-Filters Row (Only for Users Tab) */}
        {activeTab === 'users' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Filter size={12} /> Filter:
              </span>

              {/* Role Filter */}
              {currentUserRole === 'admin' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['all', 'guru', 'siswa', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                        roleFilter === r
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {r === 'all' ? 'Semua Peran' : r}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 'approved', 'pending', 'suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s === 'all' ? 'Semua Status' : s === 'approved' ? 'Aktif' : s === 'pending' ? 'Tertunda' : 'Suspended'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-800 font-bold">{filteredUsers.length}</strong> dari {totalUsers} akun
            </div>
          </div>
        )}

        {/* Sub-Filters Row (Only for Activities Tab) */}
        {activeTab === 'activities' && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Activity size={12} /> Jenis Log:
            </span>
            {(['all', 'login', 'password_reset', 'status_change', 'user_created', 'user_updated', 'user_deleted'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActivityTypeFilter(t)}
                className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                  activityTypeFilter === t
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'Semua Aktivitas' 
                  : t === 'login' ? 'Login' 
                  : t === 'password_reset' ? 'Reset Password' 
                  : t === 'status_change' ? 'Status' 
                  : t === 'user_created' ? 'Buat Akun'
                  : t === 'user_updated' ? 'Update Akun'
                  : 'Hapus Akun'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB A: SEMUA PENGGUNA */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Memuat data pengguna dari cloud Firestore...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Users size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">Tidak ada pengguna ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan ubah kata kunci pencarian atau sesuaikan filter status dan peran.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Identitas Pengguna</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Peran</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Status Akun</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Aktivitas Terakhir</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Aksi & Keamanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isSelf = currentUser?.uid === u.uid;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors group">
                        {/* User Identity */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs text-white ${
                              u.role === 'admin'
                                ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                                : u.role === 'guru'
                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700'
                                : 'bg-gradient-to-br from-sky-500 to-sky-600'
                            }`}>
                              {u.photoURL ? (
                                <img src={formatDriveImageUrl(u.photoURL)} alt={u.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-black text-slate-800 text-xs truncate max-w-[180px] md:max-w-xs">{u.name}</p>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-600 text-[9px] font-extrabold rounded">Anda</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono">@{u.username}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                {u.email && <span>{u.email}</span>}
                                {u.kelas && <span className="font-bold text-sky-600 bg-sky-50 px-1.5 rounded">Kelas {u.kelas}</span>}
                                {u.nip && <span className="font-bold text-indigo-600">NIP. {u.nip}</span>}
                                {u.nisn && <span className="font-bold text-sky-600">NISN. {u.nisn}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            u.role === 'admin'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : u.role === 'guru'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}>
                            {u.role === 'admin' ? <ShieldCheck size={11} /> : u.role === 'guru' ? <Users size={11} /> : <GraduationCap size={11} />}
                            {u.role}
                          </span>
                        </td>

                        {/* Status Badge & Quick Toggle */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              u.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : u.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.status === 'approved' && <CheckCircle2 size={11} />}
                              {u.status === 'pending' && <Clock size={11} />}
                              {(u.status === 'suspended' || u.status === 'rejected') && <XCircle size={11} />}
                              {u.status === 'approved' ? 'Aktif' : u.status === 'pending' ? 'Menunggu' : 'Suspended'}
                            </span>

                            {/* Quick suspend/activate toggle for Admin */}
                            {currentUserRole === 'admin' && !isSelf && (
                              <button
                                onClick={() => handleQuickStatusChange(u, u.status === 'approved' ? 'suspended' : 'approved')}
                                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.status === 'approved'
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.status === 'approved' ? "Nonaktifkan Akun (Suspend)" : "Aktifkan Akun"}
                              >
                                {u.status === 'approved' ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Last Activity / Login */}
                        <td className="px-5 py-4 text-slate-500">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                              <Activity size={12} className="text-emerald-500 shrink-0" />
                              <span>{u.lastLogin ? formatTimestamp(u.lastLogin) : 'Belum pernah login'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Daftar: {formatTimestamp(u.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleOpenResetModal(u)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Reset Kata Sandi Akun"
                              id={`btn-reset-pass-${u.uid}`}
                            >
                              <KeyRound size={13} className="text-amber-600" />
                              <span className="hidden sm:inline">Reset Password</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                              title="Edit Detail Akun & Peran"
                              id={`btn-edit-${u.uid}`}
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Delete Button (Admin Only, Cannot delete self) */}
                            {currentUserRole === 'admin' && !isSelf && (
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                title="Hapus Akun Permanen"
                                id={`btn-del-${u.uid}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
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

      {/* TAB B: VERIFIKASI PENDAFTARAN (PENDING QUEUE) */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900">Antrean Verifikasi Pendaftar Baru</h4>
                <p className="text-[11px] text-amber-700">
                  Tinjau akun baru yang mendaftar secara mandiri. Setujui untuk memberikan akses atau tolak pendaftaran yang tidak valid.
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-amber-200/70 text-amber-900 rounded-full text-xs font-black">
              {pendingUsers.length} Tertunda
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {pendingUsers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-base font-black text-slate-800">Semua Pendaftaran Telah Selesai Diverifikasi</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tidak ada permintaan pendaftaran akun baru yang sedang menunggu persetujuan saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-100">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Identitas Pendaftar</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Peran Diminta</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Waktu Mendaftar</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Keputusan Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pendingUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                              u.role === 'guru' ? 'bg-indigo-600' : 'bg-sky-500'
                            }`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-slate-800">{u.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">@{u.username}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'guru' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-sky-50 text-sky-700 border border-sky-100'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock size={13} className="text-slate-400" />
                            <span>{formatTimestamp(u.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleQuickStatusChange(u, 'rejected')}
                              className="px-3.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Tolak Pendaftaran Akun"
                            >
                              <XCircle size={14} /> Tolak
                            </button>
                            <button
                              onClick={() => handleQuickStatusChange(u, 'approved')}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Setujui dan Aktifkan Akun"
                            >
                              <CheckCircle2 size={14} /> Setujui
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: LOG AKTIVITAS PENGGUNA */}
      {activeTab === 'activities' && currentUserRole === 'admin' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {isActivitiesLoading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Memuat log aktivitas...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Activity size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">Belum ada catatan aktivitas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Setiap login pengguna, reset password, dan pembaruan data akun akan dicatat otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredActivities.map((act, index) => {
                const isLogin = act.type === 'login';
                const isPassReset = act.type === 'password_reset';
                const isCreated = act.type === 'user_created';
                const isDeleted = act.type === 'user_deleted';

                return (
                  <div key={act.id || index} className="p-4 md:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isLogin 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : isPassReset 
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : isCreated
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : isDeleted
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isLogin && <CheckCircle2 size={16} />}
                        {isPassReset && <KeyRound size={16} />}
                        {isCreated && <UserPlus size={16} />}
                        {isDeleted && <Trash2 size={16} />}
                        {!isLogin && !isPassReset && !isCreated && !isDeleted && <Activity size={16} />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">{act.action}</span>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                            act.role === 'admin' ? 'bg-amber-100 text-amber-800' : act.role === 'guru' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {act.role || 'USER'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          <strong>{act.name}</strong> <span className="font-mono text-[11px] text-slate-400">(@{act.username})</span>
                          {act.details && <span className="text-slate-500"> — {act.details}</span>}
                        </p>
                        {act.performedBy && (
                          <p className="text-[10px] text-indigo-600 font-semibold">
                            Dilakukan oleh: {act.performedBy}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimestamp(act.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB D: PERMOHONAN RESET KATA SANDI DARI SISWA */}
      {activeTab === 'reset_requests' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
                <KeyRound className="text-amber-600" size={18} />
                Permohonan Reset Kata Sandi Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar siswa yang mengajukan permohonan pemulihan atau reset kata sandi melalui aplikasi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-black">
                {totalPendingResetReqs} Menunggu Tindakan
              </span>
            </div>
          </div>

          {isResetReqLoading ? (
            <div className="p-16 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-amber-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Memuat data permohonan...</p>
            </div>
          ) : filteredResetRequests.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <KeyRound size={36} className="text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">Tidak ada permohonan reset sandi</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Siswa yang lupa sandi dapat mengajukan reset melalui menu Pengaturan di akun mereka.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredResetRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isResolved = req.status === 'resolved';
                const isRejected = req.status === 'rejected';

                return (
                  <div key={req.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{req.name}</span>
                        <span className="text-xs font-mono font-bold text-slate-400">(@{req.username})</span>
                        {req.kelas && (
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold">
                            Kelas {req.kelas}
                          </span>
                        )}
                        {req.nisn && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-medium font-mono">
                            NISN: {req.nisn}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPending ? 'Menunggu' : isResolved ? 'Selesai' : 'Ditolak'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-500 text-[11px]">Alasan Pengajuan:</p>
                        <p className="font-medium text-slate-800 italic">"{req.reason}"</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          Diajukan: {formatTimestamp(req.createdAt)}
                        </span>
                        {req.resolvedBy && (
                          <span className="text-indigo-600 font-medium">
                            Diproses oleh: {req.resolvedBy} {req.resolvedAt && `(${formatTimestamp(req.resolvedAt)})`}
                          </span>
                        )}
                        {req.newTemporaryPassword && (
                          <span className="bg-emerald-50 px-2 py-0.5 border border-emerald-200 text-emerald-700 rounded font-mono font-bold">
                            Sandi Baru Diberikan: {req.newTemporaryPassword}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(req)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Ban size={14} />
                          <span>Tolak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenResolveRequestModal(req)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <KeyRound size={14} />
                          <span>Reset & Beri Sandi</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: RESET PASSWORD (SUPER PRACTICAL)             */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isResetPassModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Reset Kata Sandi</h3>
                    <p className="text-xs text-slate-500">Atur kata sandi baru untuk pengguna</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Target User Info */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 truncate">{selectedUser.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">@{selectedUser.username} ({selectedUser.role.toUpperCase()})</p>
                </div>
              </div>

              {/* Password Input & Generator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Kata Sandi Baru</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = selectedUser.role === 'siswa' ? 'siswa' : 'guru';
                      const generated = prefix + Math.floor(1000 + Math.random() * 9000) + '!';
                      setNewPassword(generated);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} /> Buat Acak
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password minimal 4 karakter..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none pr-20"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className={`p-1.5 rounded-lg transition-colors ${
                        copiedPass ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-indigo-600'
                      }`}
                      title="Salin Password ke Clipboard"
                    >
                      {copiedPass ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Password akan dienkripsi dengan standar SHA-256 sebelum disimpan ke database.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecuteResetPassword}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  id="btn-confirm-reset-pass"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  <span>Simpan & Terapkan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: EDIT DETAIL AKUN & PERAN                    */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Edit Akun Pengguna</h3>
                    <p className="text-xs text-slate-500">Perbarui identitas, peran, dan status akses</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleExecuteEditUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">No. HP / WhatsApp</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Role & Status (Admin Only can change Role) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Peran Akun</label>
                    <select
                      disabled={currentUserRole !== 'admin'}
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none disabled:opacity-60"
                    >
                      <option value="guru">Guru (Pengajar)</option>
                      <option value="siswa">Siswa (Peserta Didik)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Status Akun</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="approved">Aktif (Approved)</option>
                      <option value="pending">Menunggu Verifikasi (Pending)</option>
                      <option value="suspended">Dinonaktifkan (Suspended)</option>
                      <option value="rejected">Ditolak (Rejected)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields: Teacher NIP vs Student NISN/Kelas */}
                {editForm.role === 'guru' || editForm.role === 'admin' ? (
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">NIP Guru</label>
                    <input
                      type="text"
                      value={editForm.nip}
                      onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                      placeholder="1980xxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">NISN Siswa</label>
                      <input
                        type="text"
                        value={editForm.nisn}
                        onChange={(e) => setEditForm({ ...editForm, nisn: e.target.value })}
                        placeholder="00xxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">Kelas</label>
                      <select
                        value={editForm.kelas}
                        onChange={(e) => setEditForm({ ...editForm, kelas: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                      >
                        {classList.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: TAMBAH PENGGUNA BARU (ADMIN ONLY)           */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isCreateModalOpen && currentUserRole === 'admin' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Tambah Akun Pengguna Baru</h3>
                    <p className="text-xs text-slate-500">Buat langsung akun Guru atau Siswa di sistem</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleExecuteCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Peran Akun</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="guru">Guru (Pengajar)</option>
                      <option value="siswa">Siswa (Peserta Didik)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Status Awal</label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as UserStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="approved">Langsung Aktif (Approved)</option>
                      <option value="pending">Menunggu Verifikasi (Pending)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso, S.Pd"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: budi_santoso"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Kata Sandi Awal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Minimal 4 karakter"
                      value={createForm.passwordRaw}
                      onChange={(e) => setCreateForm({ ...createForm, passwordRaw: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">Email (Opsional)</label>
                    <input
                      type="email"
                      placeholder="email@sekolah.sch.id"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {createForm.role === 'guru' || createForm.role === 'admin' ? (
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">NIP Guru (Opsional)</label>
                    <input
                      type="text"
                      value={createForm.nip}
                      onChange={(e) => setCreateForm({ ...createForm, nip: e.target.value })}
                      placeholder="1980xxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">NISN Siswa (Opsional)</label>
                      <input
                        type="text"
                        value={createForm.nisn}
                        onChange={(e) => setCreateForm({ ...createForm, nisn: e.target.value })}
                        placeholder="00xxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">Kelas</label>
                      <select
                        value={createForm.kelas}
                        onChange={(e) => setCreateForm({ ...createForm, kelas: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                      >
                        {classList.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    <span>Buat Akun Sekarang</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: HAPUS AKUN PERMANEN (CONFIRMATION)          */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
                <Trash2 size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800">Hapus Akun Pengguna?</h3>
                <p className="text-xs text-slate-500">
                  Anda akan menghapus akun <strong className="text-slate-800">{selectedUser.name}</strong> (@{selectedUser.username}) secara permanen dari basis data Firestore.
                </p>
              </div>

              <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100 text-[11px] text-rose-700 text-left flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>Tindakan ini tidak dapat dibatalkan. Pengguna tidak akan dapat lagi masuk ke sistem.</span>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecuteDeleteUser}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  id="btn-confirm-delete-user"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Ya, Hapus Permanen</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: PROSES RESET PASSWORD DARI PERMOHONAN SISWA */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isResolveReqModalOpen && selectedResetReq && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Proses Permohonan Sandi</h3>
                    <p className="text-xs text-slate-500">Beri kata sandi baru untuk siswa</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResolveReqModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Info Siswa */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {selectedResetReq.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">{selectedResetReq.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      @{selectedResetReq.username} {selectedResetReq.kelas ? `• Kelas ${selectedResetReq.kelas}` : ''}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 text-xs">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Alasan Siswa:</span>
                  <p className="text-slate-700 italic">"{selectedResetReq.reason}"</p>
                </div>
              </div>

              {/* Password Input & Generator */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan sandi baru..."
                    className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-600"
                      title="Salin Sandi"
                    >
                      {copiedPass ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Minimal 6 karakter</span>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = 'Siswa' + Math.floor(1000 + Math.random() * 9000) + '!';
                      setNewPassword(gen);
                    }}
                    className="text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Acak Sandi Baru
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResolveReqModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmResolveRequest}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  <span>Simpan & Beri Sandi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: TOLAK PERMOHONAN RESET SANDI                */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {isRejectModalOpen && selectedResetReq && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                    <Ban size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Tolak Permohonan</h3>
                    <p className="text-xs text-slate-500">Tolak pengajuan reset sandi dari siswa</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-600">
                  Tolak permohonan dari <strong className="text-slate-800">{selectedResetReq.name}</strong> (@{selectedResetReq.username})?
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Alasan Penolakan</label>
                <textarea
                  rows={3}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Masukkan alasan mengapa permohonan ditolak..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmRejectRequest}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                  <span>Tolak Permohonan</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
