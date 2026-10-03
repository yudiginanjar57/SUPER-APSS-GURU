import { auth, db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded } from './firebaseClient';
import { safeStorage } from './safeStorage';
import { 
  CLASSES, 
  PRESET_STUDENTS, 
  PRESET_SCHEDULE, 
  PRESET_ASSIGNMENTS, 
  PRESET_SUBMISSIONS, 
  PRESET_GRADES, 
  PRESET_JOURNAL 
} from '../data/presets';
import { PRESET_LEARNING_MATERIALS } from '../data/presetMaterials';
import { Student } from '../types';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp, 
  collection, 
  getDocs, 
  query, 
  limit, 
  where,
  orderBy,
  onSnapshot 
} from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export type UserRole = 'admin' | 'guru' | 'siswa';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AppUser {
  uid: string;
  username: string;
  email: string;
  name: string;
  photoURL: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  createdAt?: any;
  lastLogin?: any;
  lastActive?: any;
  nip?: string;
  nisn?: string;
  phone?: string;
  institution?: string;
  kelas?: string;
  subject?: string;
  teachingClasses?: string[];
  homeroomClass?: string;
  gender?: string;
  attendanceNumber?: string;
  databaseKey?: string;
}

export function getTeacherDatabaseKey(user?: Partial<AppUser> | null): string {
  if (!user) return 'guru_default';
  if (user.databaseKey && user.databaseKey.trim()) {
    return user.databaseKey.trim();
  }
  if (user.email && user.email.trim()) {
    return `guru_${user.email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  }
  if (user.username && user.username.trim()) {
    return `guru_${user.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
  }
  return 'guru_default';
}

export interface RegisterExtraDetails {
  email?: string;
  nip?: string;
  nisn?: string;
  phone?: string;
  institution?: string;
  subject?: string;
  teachingClasses?: string[];
  homeroomClass?: string;
  kelas?: string;
  gender?: string;
  attendanceNumber?: string;
}

export interface UserActivityLog {
  id?: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  action: string;
  details?: string;
  type: 'login' | 'status_change' | 'password_reset' | 'user_created' | 'user_deleted' | 'user_updated' | 'general' | 'password_reset_request';
  timestamp?: any;
  performedBy?: string; // Admin or system who performed the action
}

export interface PasswordResetRequest {
  id?: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  email?: string;
  nisn?: string;
  kelas?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt?: any;
  resolvedAt?: any;
  resolvedBy?: string;
  newTemporaryPassword?: string;
}

// Simple fast SHA-256 hash using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_edusecure_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Log user activity to Firestore collection 'user_activities'
export async function logUserActivity(activity: Omit<UserActivityLog, 'id' | 'timestamp'>) {
  try {
    const actRef = collection(db, 'user_activities');
    await addDoc(actRef, {
      ...activity,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}

const LOCAL_SESSION_KEY = 'eduasisten_active_user_session';

// Realtime Auth listeners callback list
const authListeners: Array<(user: AppUser | null) => void> = [];
let currentAppUser: AppUser | null = null;
let userDocUnsubscribe: (() => void) | null = null;

function notifyAuthListeners(user: AppUser | null) {
  currentAppUser = user;
  if (user) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
  authListeners.forEach(listener => listener(user));
}

// Listen to Firestore document changes for current user (e.g., when approved by admin/guru)
function watchUserDoc(uid: string) {
  if (!uid) return;
  if (isFirestoreQuotaExceeded()) return;
  if (userDocUnsubscribe) {
    userDocUnsubscribe();
    userDocUnsubscribe = null;
  }
  try {
    const userRef = doc(db, 'users', uid);
    userDocUnsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedUser: AppUser = {
          uid: docSnap.id,
          username: data.username || data.email || '',
          email: data.email || '',
          name: data.name || 'Pengguna',
          photoURL: data.photoURL || '',
          role: data.role || 'guru',
          status: data.status || 'approved',
          createdAt: data.createdAt
        };
        notifyAuthListeners(updatedUser);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      console.warn("User realtime sync operates offline/cached:", err?.message || err);
    });
  } catch (e) {
    console.warn("Could not attach user watcher:", e);
  }
}

// Initialize session from LocalStorage on load
try {
  const saved = localStorage.getItem(LOCAL_SESSION_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.uid) {
      currentAppUser = parsed;
      watchUserDoc(parsed.uid);
    }
  }
} catch (e) {
  console.error(e);
}

export const registerAccount = async (
  identifier: string, // username or email
  passwordRaw: string, 
  name: string, 
  role: UserRole,
  extraDetails?: RegisterExtraDetails
): Promise<AppUser> => {
  const cleanId = identifier.trim().toLowerCase();
  const cleanName = name.trim();
  
  if (!cleanId) throw new Error("Username atau Email wajib diisi.");
  if (passwordRaw.length < 4) throw new Error("Kata Sandi minimal 4 karakter.");
  if (!cleanName) throw new Error("Nama Lengkap wajib diisi.");

  // Check if username/email already exists
  const qEmail = query(collection(db, 'users'), where('username', '==', cleanId));
  const snap = await getDocs(qEmail);
  if (!snap.empty) {
    throw new Error(`Username/Email "${cleanId}" sudah terdaftar. Silakan pilih Masuk.`);
  }

  // Check if this is the very first user in the system -> make them Admin automatically
  const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
  const isFirstUser = allUsersSnap.empty;

  const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const passwordHash = await hashPassword(passwordRaw);

  const assignedRole: UserRole = isFirstUser ? 'admin' : role;
  const assignedStatus: UserStatus = isFirstUser ? 'approved' : 'pending';

  // Determine email and database key
  const finalEmail = (extraDetails?.email && extraDetails.email.trim()) 
    ? extraDetails.email.trim().toLowerCase() 
    : (cleanId.includes('@') ? cleanId : `${cleanId}@eduasisten.local`);

  const databaseKey = assignedRole === 'guru' 
    ? `guru_${finalEmail.replace(/[^a-z0-9_]/g, '_')}`
    : undefined;

  const newUser: AppUser = {
    uid,
    username: cleanId,
    email: finalEmail,
    name: cleanName,
    photoURL: '',
    role: assignedRole,
    status: assignedStatus,
    passwordHash,
    createdAt: serverTimestamp(),
    nip: extraDetails?.nip?.trim() || '',
    nisn: extraDetails?.nisn?.trim() || '',
    phone: extraDetails?.phone?.trim() || '',
    institution: extraDetails?.institution?.trim() || 'SMA Negeri 2 Tasikmalaya',
    kelas: extraDetails?.kelas?.trim() || '',
    subject: extraDetails?.subject?.trim() || '',
    teachingClasses: extraDetails?.teachingClasses || [],
    homeroomClass: extraDetails?.homeroomClass?.trim() || '',
    gender: extraDetails?.gender?.trim() || '',
    attendanceNumber: extraDetails?.attendanceNumber?.trim() || '',
    databaseKey
  };

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, newUser);

  // If first user (Admin) or pre-approved guru, seed their database document
  if (assignedRole === 'guru' && assignedStatus === 'approved' && databaseKey) {
    await seedInitialGuruData(
      databaseKey,
      cleanName,
      extraDetails?.nip?.trim() || '',
      extraDetails?.subject?.trim() || '',
      extraDetails?.institution?.trim() || 'SMA Negeri 2 Tasikmalaya',
      extraDetails?.homeroomClass?.trim() || 'X-MIPA-1',
      extraDetails?.teachingClasses || [],
      'System Auto-Register'
    );
  }

  // Exclude password hash from memory/state
  const safeUser: AppUser = { ...newUser };
  delete safeUser.passwordHash;

  watchUserDoc(uid);
  notifyAuthListeners(safeUser);
  return safeUser;
};

export const loginAccount = async (
  identifier: string, // username or email
  passwordRaw: string
): Promise<AppUser> => {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId || !passwordRaw) {
    throw new Error("Username/Email dan Kata Sandi wajib diisi.");
  }

  // Auto-seed and handle default admin account if tried
  if (cleanId === 'admin' && (passwordRaw === 'admin123' || passwordRaw === 'admin')) {
    const defaultAdmin: AppUser = {
      uid: 'admin_default',
      username: 'admin',
      email: 'admin@eduasisten.local',
      name: 'Administrator Utama',
      photoURL: '',
      role: 'admin',
      status: 'approved'
    };

    if (isFirestoreQuotaExceeded()) {
      watchUserDoc('admin_default');
      notifyAuthListeners(defaultAdmin);
      return defaultAdmin;
    }

    try {
      const adminDocRef = doc(db, 'users', 'admin_default');
      const adminDocSnap = await getDoc(adminDocRef);
      const passHash = await hashPassword(passwordRaw);

      if (!adminDocSnap.exists()) {
        await setDoc(adminDocRef, { ...defaultAdmin, passwordHash: passHash, createdAt: serverTimestamp() });
      } else {
        const data = adminDocSnap.data();
        if (data.name) defaultAdmin.name = data.name;
        if (data.photoURL) defaultAdmin.photoURL = data.photoURL;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users/admin_default');
    }

    watchUserDoc('admin_default');
    notifyAuthListeners(defaultAdmin);
    return defaultAdmin;
  }

  // Look up by username or email
  let userSnap;
  try {
    userSnap = await getDocs(query(collection(db, 'users'), where('username', '==', cleanId)));
    if (userSnap.empty && cleanId.includes('@')) {
      userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanId)));
    }
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    throw new Error("Sistem database sedang dalam batas kuota harian. Silakan coba masuk sebagai admin atau gunakan data lokal.");
  }

  if (!userSnap || userSnap.empty) {
    throw new Error("Akun tidak ditemukan. Periksa kembali username/email atau lakukan pendaftaran.");
  }

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();
    const expectedHash = await hashPassword(passwordRaw);

    if (userData.passwordHash && userData.passwordHash !== expectedHash) {
      throw new Error("Kata Sandi salah. Silakan coba lagi.");
    }

    if (userData.status === 'suspended') {
      throw new Error("Akun Anda sedang dinonaktifkan oleh Administrator. Silakan hubungi admin sekolah.");
    }

    // Update last login timestamp in background
    try {
      await updateDoc(doc(db, 'users', userDoc.id), {
        lastLogin: serverTimestamp(),
        lastActive: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not update lastLogin:", e);
    }

    const appUser: AppUser = {
      uid: userDoc.id,
      username: userData.username || userData.email || cleanId,
      email: userData.email || cleanId,
      name: userData.name || 'Pengguna',
      photoURL: userData.photoURL || '',
      role: userData.role || 'guru',
      status: userData.status || 'approved',
      createdAt: userData.createdAt,
      lastLogin: new Date(),
      nip: userData.nip,
      nisn: userData.nisn,
      phone: userData.phone,
      institution: userData.institution,
      kelas: userData.kelas
    };

    // Log login activity
    logUserActivity({
      userId: userDoc.id,
      username: appUser.username,
      name: appUser.name,
      role: appUser.role,
      action: 'Masuk Aplikasi',
      details: 'Pengguna berhasil login ke sistem',
      type: 'login'
    });

    watchUserDoc(userDoc.id);
    notifyAuthListeners(appUser);
    return appUser;
  };

export const signInWithGoogle = async (): Promise<AppUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    let appUser: AppUser;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.status === 'suspended') {
          throw new Error("Akun Google Anda sedang dinonaktifkan oleh Administrator.");
        }

        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          lastActive: serverTimestamp()
        }).catch(() => {});

        appUser = { 
          uid: user.uid, 
          username: data.username || user.email || user.uid,
          email: data.email || user.email || '',
          name: data.name || user.displayName || 'Pengguna',
          photoURL: data.photoURL || user.photoURL || '',
          role: data.role || 'guru',
          status: data.status || 'approved',
          createdAt: data.createdAt,
          lastLogin: new Date(),
          nip: data.nip,
          nisn: data.nisn,
          phone: data.phone,
          institution: data.institution,
          kelas: data.kelas,
          databaseKey: data.databaseKey || (data.role === 'guru' ? getTeacherDatabaseKey(data) : undefined)
        };
      } else {
        const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(1))).catch(() => null);
        const isFirstUser = allUsersSnap ? allUsersSnap.empty : false;

        const role: UserRole = isFirstUser ? 'admin' : 'guru';
        const status: UserStatus = isFirstUser ? 'approved' : 'pending';
        const email = user.email || '';
        const databaseKey = role === 'guru' 
          ? `guru_${email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
          : undefined;

        appUser = {
          uid: user.uid,
          username: user.email || user.uid,
          email: email,
          name: user.displayName || 'Pengguna Baru',
          photoURL: user.photoURL || '',
          role,
          status,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          databaseKey
        };
        await setDoc(userRef, appUser).catch(() => {});

        if (role === 'guru' && status === 'approved' && databaseKey) {
          seedInitialGuruData(
            databaseKey,
            appUser.name,
            '',
            '',
            'SMA Negeri 2 Tasikmalaya',
            'X-MIPA-1',
            [],
            'Google SSO Auto Initialization'
          ).catch(() => {});
        }
      }
    } catch (firestoreErr: any) {
      if (firestoreErr?.message?.includes("dinonaktifkan")) {
        throw firestoreErr;
      }
      console.warn("Catatan: Sinkronisasi database online pengguna tertunda, menggunakan data profil Google SSO.", firestoreErr?.message || firestoreErr);
      const email = user.email || '';
      appUser = {
        uid: user.uid,
        username: email || user.uid,
        email: email,
        name: user.displayName || 'Pengguna Google',
        photoURL: user.photoURL || '',
        role: 'guru',
        status: 'approved',
        databaseKey: `guru_${email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
      };
    }

    logUserActivity({
      userId: user.uid,
      username: appUser.username,
      name: appUser.name,
      role: appUser.role,
      action: 'Masuk via Google',
      details: 'Pengguna login menggunakan akun Google SSO',
      type: 'login'
    }).catch(() => {});
    
    watchUserDoc(user.uid);
    notifyAuthListeners(appUser);
    return appUser;
  } catch (error: any) {
    // Gracefully handle user cancellation/closing the popup window without logging an error
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';
    if (
      errorCode === 'auth/popup-closed-by-user' || 
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('auth/popup-closed-by-user') ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      console.info("Info: Jendela popup login Google ditutup oleh pengguna.");
      return null;
    }
    
    console.warn("Catatan autentikasi Google:", error?.message || error);
    throw error;
  }
};

// ----------------------------------------------------
// ADMIN USER MANAGEMENT & ACTIVITY LOGGING HELPERS
// ----------------------------------------------------

export async function adminResetUserPassword(
  targetUid: string, 
  newPasswordRaw: string, 
  targetName: string,
  targetUsername: string,
  adminUser?: { name: string; username: string }
): Promise<void> {
  if (newPasswordRaw.length < 4) {
    throw new Error("Kata Sandi baru minimal 4 karakter.");
  }
  const passwordHash = await hashPassword(newPasswordRaw);
  const userRef = doc(db, 'users', targetUid);
  await updateDoc(userRef, { 
    passwordHash,
    updatedAt: serverTimestamp()
  });

  await logUserActivity({
    userId: targetUid,
    username: targetUsername,
    name: targetName,
    role: 'system',
    action: 'Reset Password',
    details: `Password akun di-reset oleh Admin ${adminUser ? `(${adminUser.name})` : ''}`,
    type: 'password_reset',
    performedBy: adminUser?.name || 'Administrator'
  });
}

// Helper function to seed initial preset template data for a newly approved teacher database partition
export async function seedInitialGuruData(
  databaseKey: string,
  teacherName: string,
  nip: string = '',
  subject: string = '',
  institution: string = 'SMA Negeri 2 Tasikmalaya',
  homeroomClass: string = 'X-MIPA-1',
  teachingClasses: string[] = [],
  updatedBy: string = 'System Initialization'
): Promise<void> {
  if (isFirestoreQuotaExceeded() || !databaseKey) return;
  try {
    const guruDataRef = doc(db, 'guru_data', databaseKey);
    const snap = await getDoc(guruDataRef);
    const existing = snap.exists() ? snap.data() : null;

    // Seed preset template data if document doesn't exist OR if students array is empty/missing
    if (!existing || !Array.isArray(existing.students) || existing.students.length === 0) {
      const mergedClasses = Array.from(new Set([...(teachingClasses || []), ...CLASSES]));
      
      // Fetch official student records from Admin master database corresponding to selected teaching classes
      const targetClassesToFetch = teachingClasses && teachingClasses.length > 0 ? teachingClasses : [homeroomClass || 'X-MIPA-1'];
      let initialStudents: Student[] = [];
      try {
        initialStudents = await fetchMasterStudentsFromAdmin(targetClassesToFetch);
      } catch (err) {
        console.warn("Could not fetch master students from Admin during seed, falling back:", err);
      }
      if (!initialStudents || initialStudents.length === 0) {
        initialStudents = PRESET_STUDENTS;
      }

      await setDoc(guruDataRef, {
        syncKey: databaseKey,
        teacherName: teacherName || 'Guru Baru',
        nip: nip || '',
        subject: subject || '',
        institution: institution || 'SMA Negeri 2 Tasikmalaya',
        currentMonth: 'JANUARI 2026',
        currentWeek: '2',
        profilePhoto: existing?.profilePhoto || '',
        homeroomClass: homeroomClass || 'X-MIPA-1',
        classList: mergedClasses,
        students: initialStudents,
        attendanceList: existing?.attendanceList || [],
        grades: PRESET_GRADES,
        schedule: PRESET_SCHEDULE,
        assignments: PRESET_ASSIGNMENTS,
        submissions: PRESET_SUBMISSIONS,
        journals: PRESET_JOURNAL,
        homeroomNotes: [
          {
            id: "hn-1",
            date: "12/01/2026",
            studentId: "s1",
            studentName: "Ahmad Fauzi",
            category: "Prestasi",
            title: "Juara 1 OSN Ekonomi Tingkat Kota",
            content: "Siswa menunjukkan pemahaman yang sangat mendalam pada materi Ekonomi dan akuntansi. Diberikan bimbingan intensif untuk tingkat provinsi.",
            followUp: "Diberikan modul soal OSN tingkat Provinsi.",
            status: "Selesai"
          }
        ],
        homeVisits: existing?.homeVisits || [],
        materials: PRESET_LEARNING_MATERIALS,
        lastUpdated: Date.now(),
        updatedBy
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Could not seed initial guru data:", err);
  }
}

export async function adminUpdateUser(
  targetUid: string,
  updates: Partial<AppUser>,
  adminUser?: { name: string; username: string }
): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  const cleanUpdates: any = { ...updates, updatedAt: serverTimestamp() };
  if (cleanUpdates.passwordHash === undefined) {
    delete cleanUpdates.passwordHash;
  }
  await updateDoc(userRef, cleanUpdates);

  // If approved and role is guru, ensure database is initialized with email-based key & preset template data
  if (updates.status === 'approved') {
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const uData = snap.data() as AppUser;
        if (uData.role === 'guru') {
          const dbKey = uData.databaseKey || getTeacherDatabaseKey(uData);
          if (!uData.databaseKey) {
            await updateDoc(userRef, { databaseKey: dbKey });
          }
          await seedInitialGuruData(
            dbKey,
            uData.name || 'Guru Baru',
            uData.nip || '',
            uData.subject || '',
            uData.institution || 'SMA Negeri 2 Tasikmalaya',
            uData.homeroomClass || 'X-MIPA-1',
            uData.teachingClasses || [],
            `Persetujuan Akun oleh ${adminUser?.name || 'Administrator'}`
          );
        }
      }
    } catch (e) {
      console.warn("Could not auto-initialize teacher database on approval:", e);
    }
  }

  await logUserActivity({
    userId: targetUid,
    username: updates.username || targetUid,
    name: updates.name || 'Pengguna',
    role: updates.role || 'user',
    action: updates.status === 'approved' ? 'Persetujuan Akun Pengguna' : 'Perbarui Data Akun',
    details: `Profil & status diperbarui (${updates.status ? `Status: ${updates.status}, ` : ''}${updates.role ? `Role: ${updates.role}` : ''})`,
    type: 'user_updated',
    performedBy: adminUser?.name || 'Administrator'
  });
}

export async function userUpdateSelfProfile(
  uid: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    nisn?: string;
    nip?: string;
    kelas?: string;
    institution?: string;
    photoURL?: string;
    teachingClasses?: string[];
    homeroomClass?: string;
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const cleanUpdates: any = { ...updates, updatedAt: serverTimestamp() };
  await updateDoc(userRef, cleanUpdates);

  if (currentAppUser && currentAppUser.uid === uid) {
    currentAppUser = {
      ...currentAppUser,
      ...updates
    };
    notifyAuthListeners(currentAppUser);
  }

  await logUserActivity({
    userId: uid,
    username: currentAppUser?.username || uid,
    name: updates.name || currentAppUser?.name || 'Pengguna',
    role: currentAppUser?.role || 'siswa',
    action: 'Perbarui Profil Pribadi',
    details: `Profil diperbarui mandiri oleh pengguna`,
    type: 'user_updated',
    performedBy: updates.name || currentAppUser?.name || 'Pengguna'
  });
}

export async function userChangePassword(
  uid: string,
  oldPasswordRaw: string,
  newPasswordRaw: string
): Promise<void> {
  if (newPasswordRaw.length < 4) {
    throw new Error("Kata Sandi baru minimal 4 karakter.");
  }
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("Akun pengguna tidak ditemukan.");
  }
  const userData = userSnap.data();
  const oldHash = await hashPassword(oldPasswordRaw);
  if (userData.passwordHash && userData.passwordHash !== oldHash) {
    throw new Error("Kata Sandi lama yang Anda masukkan tidak sesuai.");
  }

  const newHash = await hashPassword(newPasswordRaw);
  await updateDoc(userRef, {
    passwordHash: newHash,
    updatedAt: serverTimestamp()
  });

  await logUserActivity({
    userId: uid,
    username: userData.username || uid,
    name: userData.name || 'Pengguna',
    role: userData.role || 'siswa',
    action: 'Ubah Kata Sandi Mandiri',
    details: `Kata sandi diubah mandiri oleh pengguna yang bersangkutan`,
    type: 'password_reset',
    performedBy: userData.name || 'Pengguna'
  });
}

export async function submitPasswordResetRequest(
  user: AppUser,
  reason: string
): Promise<void> {
  if (!reason.trim()) {
    throw new Error("Alasan permohonan reset kata sandi wajib diisi.");
  }

  const requestData: PasswordResetRequest = {
    userId: user.uid,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || '',
    nisn: user.nisn || '',
    kelas: user.kelas || '',
    reason: reason.trim(),
    status: 'pending',
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, 'password_reset_requests'), requestData);

  await logUserActivity({
    userId: user.uid,
    username: user.username,
    name: user.name,
    role: user.role,
    action: 'Pengajuan Reset Password',
    details: `Pengajuan reset kata sandi: "${reason.trim().slice(0, 60)}"`,
    type: 'password_reset_request',
    performedBy: user.name
  });
}

export async function resolvePasswordResetRequest(
  requestId: string,
  userId: string,
  targetUsername: string,
  targetName: string,
  newPasswordRaw: string,
  adminUser?: { name: string; username: string }
): Promise<void> {
  const newHash = await hashPassword(newPasswordRaw);
  
  // 1. Update user password in users collection
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    passwordHash: newHash,
    lastActive: serverTimestamp()
  });

  // 2. Mark request as resolved
  const reqRef = doc(db, 'password_reset_requests', requestId);
  await updateDoc(reqRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUser?.name || 'Administrator',
    newTemporaryPassword: newPasswordRaw
  });

  // 3. Log activity
  await logUserActivity({
    userId,
    username: targetUsername,
    name: targetName,
    role: 'siswa',
    action: 'Reset Password Disetujui',
    details: `Permohonan reset password disetujui & kata sandi baru disetel oleh ${adminUser?.name || 'Administrator'}`,
    type: 'password_reset',
    performedBy: adminUser?.name || 'Administrator'
  });
}

export async function rejectPasswordResetRequest(
  requestId: string,
  userId: string,
  targetUsername: string,
  targetName: string,
  rejectionReason: string,
  adminUser?: { name: string; username: string }
): Promise<void> {
  const reqRef = doc(db, 'password_reset_requests', requestId);
  await updateDoc(reqRef, {
    status: 'rejected',
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUser?.name || 'Administrator',
    rejectionReason: rejectionReason.trim()
  });

  await logUserActivity({
    userId,
    username: targetUsername,
    name: targetName,
    role: 'siswa',
    action: 'Reset Password Ditolak',
    details: `Permohonan reset password ditolak: "${rejectionReason.trim()}"`,
    type: 'status_change',
    performedBy: adminUser?.name || 'Administrator'
  });
}

export async function adminCreateUser(
  userData: {
    username: string;
    name: string;
    email?: string;
    passwordRaw: string;
    role: UserRole;
    status: UserStatus;
    nip?: string;
    nisn?: string;
    phone?: string;
    institution?: string;
    kelas?: string;
  },
  adminUser?: { name: string; username: string }
): Promise<AppUser> {
  const cleanId = userData.username.trim().toLowerCase();
  const cleanName = userData.name.trim();

  if (!cleanId) throw new Error("Username wajib diisi.");
  if (userData.passwordRaw.length < 4) throw new Error("Kata Sandi minimal 4 karakter.");
  if (!cleanName) throw new Error("Nama Lengkap wajib diisi.");

  // Check unique username
  const qUsername = query(collection(db, 'users'), where('username', '==', cleanId));
  const snap = await getDocs(qUsername);
  if (!snap.empty) {
    throw new Error(`Username "${cleanId}" sudah digunakan akun lain.`);
  }

  const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const passwordHash = await hashPassword(userData.passwordRaw);

  const dbKey = userData.role === 'guru'
    ? `guru_${(userData.email?.trim() || `${cleanId}@eduasisten.local`).replace(/[^a-z0-9_]/g, '_')}`
    : undefined;

  const newUser: AppUser = {
    uid,
    username: cleanId,
    email: userData.email?.trim() || `${cleanId}@eduasisten.local`,
    name: cleanName,
    photoURL: '',
    role: userData.role,
    status: userData.status,
    passwordHash,
    createdAt: serverTimestamp(),
    nip: userData.nip?.trim() || '',
    nisn: userData.nisn?.trim() || '',
    phone: userData.phone?.trim() || '',
    institution: userData.institution?.trim() || '',
    kelas: userData.kelas?.trim() || '',
    databaseKey: dbKey
  };

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, newUser);

  if (userData.role === 'guru' && userData.status === 'approved' && dbKey) {
    await seedInitialGuruData(
      dbKey,
      cleanName,
      userData.nip?.trim() || '',
      '',
      userData.institution?.trim() || 'SMA Negeri 2 Tasikmalaya',
      'X-MIPA-1',
      [],
      `Akun Dibuat Langsung oleh ${adminUser?.name || 'Administrator'}`
    );
  }

  await logUserActivity({
    userId: uid,
    username: cleanId,
    name: cleanName,
    role: userData.role,
    action: 'Pembuatan Akun Baru',
    details: `Akun dibuat langsung oleh Administrator (Peran: ${userData.role}, Status: ${userData.status})`,
    type: 'user_created',
    performedBy: adminUser?.name || 'Administrator'
  });

  const safeUser = { ...newUser };
  delete safeUser.passwordHash;
  return safeUser;
}

export async function adminDeleteUser(
  targetUid: string,
  targetName: string,
  targetUsername: string,
  adminUser?: { name: string; username: string }
): Promise<void> {
  const userRef = doc(db, 'users', targetUid);
  await deleteDoc(userRef);

  await logUserActivity({
    userId: targetUid,
    username: targetUsername,
    name: targetName,
    role: 'deleted',
    action: 'Hapus Akun',
    details: `Akun ${targetName} (@${targetUsername}) dihapus permanen oleh Administrator`,
    type: 'user_deleted',
    performedBy: adminUser?.name || 'Administrator'
  });
}

export const signOut = async () => {
  if (userDocUnsubscribe) {
    userDocUnsubscribe();
    userDocUnsubscribe = null;
  }
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    // Ignore if not google-authenticated
  }
  notifyAuthListeners(null);
};

export const subscribeToAuthChanges = (callback: (user: AppUser | null) => void) => {
  authListeners.push(callback);
  // Send current known state immediately
  callback(currentAppUser);

  // Also hook Firebase Auth listener for Google sign in/out
  const fbUnsub = onAuthStateChanged(auth, async (user) => {
    if (user && !currentAppUser) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const appUser: AppUser = {
            uid: user.uid,
            username: data.username || user.email || user.uid,
            email: data.email || user.email || '',
            name: data.name || user.displayName || 'Pengguna',
            photoURL: data.photoURL || user.photoURL || '',
            role: data.role || 'guru',
            status: data.status || 'approved',
            createdAt: data.createdAt
          };
          watchUserDoc(user.uid);
          notifyAuthListeners(appUser);
        }
      } catch (err) {
        console.warn("Auth state sync user warning:", err);
      }
    }
  }, (err) => {
    console.warn("Auth state changed error (offline mode active):", err);
  });

  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
    fbUnsub();
  };
};

const DEFAULT_SCHOOL_CLASSES_PRESET = [
  "X-MIPA-1", "XI-MIPA-3", "XII-IPS-2",
  "X-1", "X-2", "X-3",
  "XI-1", "XI-2", "XI-3",
  "XII-1", "XII-2", "XII-3",
  "XII-C2", "XII-D1", "XII-D2", "XII-D3", "XII-D4", "TKA EKONOMI 1"
];

export async function fetchMasterClassesFromAdmin(): Promise<string[]> {
  const localStored = safeStorage.getJSON<string[]>("guru_classes", []);
  let foundClasses: string[] = [...DEFAULT_SCHOOL_CLASSES_PRESET, ...localStored];

  if (!isFirestoreQuotaExceeded()) {
    try {
      // 1. Check school_master collection
      const schoolMasterRef = doc(db, 'school_master', 'classes');
      const schoolMasterSnap = await getDoc(schoolMasterRef);
      if (schoolMasterSnap.exists()) {
        const data = schoolMasterSnap.data();
        if (Array.isArray(data.classList) && data.classList.length > 0) {
          foundClasses = [...data.classList, ...foundClasses];
        }
      }

      // 2. Check admin default user document
      const adminDocRef = doc(db, 'users', 'admin_default');
      const adminSnap = await getDoc(adminDocRef);
      if (adminSnap.exists()) {
        const aData = adminSnap.data();
        if (Array.isArray(aData.classList) && aData.classList.length > 0) {
          foundClasses = [...aData.classList, ...foundClasses];
        }
        if (Array.isArray(aData.teachingClasses) && aData.teachingClasses.length > 0) {
          foundClasses = [...aData.teachingClasses, ...foundClasses];
        }
      }

      // 3. Query all users with role 'admin'
      const adminUsersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminUsersSnap = await getDocs(adminUsersQuery);
      adminUsersSnap.forEach((uDoc) => {
        const uData = uDoc.data();
        if (Array.isArray(uData.classList)) {
          foundClasses = [...foundClasses, ...uData.classList];
        }
        if (Array.isArray(uData.teachingClasses)) {
          foundClasses = [...foundClasses, ...uData.teachingClasses];
        }
      });

      // 4. Query all documents in guru_data collection to pull existing class records
      const guruDataQuery = query(collection(db, 'guru_data'), limit(20));
      const guruDataSnap = await getDocs(guruDataQuery);
      guruDataSnap.forEach((gDoc) => {
        const gData = gDoc.data();
        if (Array.isArray(gData.classList)) {
          foundClasses = [...foundClasses, ...gData.classList];
        }
      });
    } catch (err) {
      console.warn("fetchMasterClassesFromAdmin warning:", err);
    }
  }

  const uniqueClasses = Array.from(new Set(foundClasses.filter(Boolean)));
  safeStorage.setItem("guru_classes", uniqueClasses);
  return uniqueClasses;
}

export async function saveMasterClassesToFirestore(classes: string[]): Promise<void> {
  if (isFirestoreQuotaExceeded() || !classes || classes.length === 0) return;
  const unique = Array.from(new Set(classes.filter(Boolean)));
  try {
    const schoolMasterRef = doc(db, 'school_master', 'classes');
    await setDoc(schoolMasterRef, { classList: unique, updatedAt: serverTimestamp() }, { merge: true });

    const adminDocRef = doc(db, 'users', 'admin_default');
    await setDoc(adminDocRef, { classList: unique, teachingClasses: unique }, { merge: true });
  } catch (err) {
    console.warn("saveMasterClassesToFirestore warning:", err);
  }
}

export async function fetchMasterStudentsFromAdmin(selectedClasses?: string[]): Promise<Student[]> {
  const localStored = safeStorage.getJSON<Student[]>("guru_students", []);
  let allStudents: Student[] = [...localStored, ...PRESET_STUDENTS];

  if (!isFirestoreQuotaExceeded()) {
    try {
      // 1. Check school_master/students
      const schoolMasterRef = doc(db, 'school_master', 'students');
      const schoolMasterSnap = await getDoc(schoolMasterRef);
      if (schoolMasterSnap.exists()) {
        const data = schoolMasterSnap.data();
        if (Array.isArray(data.studentList) && data.studentList.length > 0) {
          allStudents = [...data.studentList, ...allStudents];
        }
      }

      // 2. Check admin default document
      const adminDocRef = doc(db, 'users', 'admin_default');
      const adminSnap = await getDoc(adminDocRef);
      if (adminSnap.exists()) {
        const aData = adminSnap.data();
        if (Array.isArray(aData.students) && aData.students.length > 0) {
          allStudents = [...aData.students, ...allStudents];
        }
      }

      // 3. Query all users with role 'siswa'
      const studentUsersQuery = query(collection(db, 'users'), where('role', '==', 'siswa'));
      const studentUsersSnap = await getDocs(studentUsersQuery);
      studentUsersSnap.forEach((sDoc) => {
        const sData = sDoc.data();
        if (sData.name && (sData.kelas || sData.className)) {
          allStudents.push({
            id: sDoc.id || sData.nisn || `s_${Date.now()}_${Math.random()}`,
            name: sData.name,
            nis: sData.nis || sData.username || '',
            nisn: sData.nisn || '',
            className: sData.kelas || sData.className || 'X-1',
            gender: sData.gender || 'L',
            attendanceNumber: sData.attendanceNumber || '',
            studentPhone: sData.phone || '',
            parentName: sData.parentName || '',
            parentPhone: sData.parentPhone || '',
            address: sData.address || '',
            email: sData.email || '',
            linkedUserId: sDoc.id
          });
        }
      });

      // 4. Query guru_data collection to pull students from other partitions
      const guruDataQuery = query(collection(db, 'guru_data'), limit(20));
      const guruDataSnap = await getDocs(guruDataQuery);
      guruDataSnap.forEach((gDoc) => {
        const gData = gDoc.data();
        if (Array.isArray(gData.students) && gData.students.length > 0) {
          allStudents = [...allStudents, ...gData.students];
        }
      });
    } catch (err) {
      console.warn("fetchMasterStudentsFromAdmin error:", err);
    }
  }

  // Deduplicate by NISN / NIS / Name+Class
  const uniqueMap = new Map<string, Student>();
  allStudents.forEach((st) => {
    if (!st || !st.name) return;
    const key = (st.nisn && st.nisn.trim()) 
      ? `nisn_${st.nisn.trim()}`
      : (st.nis && st.nis.trim())
      ? `nis_${st.nis.trim()}`
      : `name_${st.name.trim().toLowerCase()}_${(st.className || '').trim().toLowerCase()}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, st);
    } else {
      const existing = uniqueMap.get(key)!;
      uniqueMap.set(key, {
        ...st,
        ...existing,
        nisn: existing.nisn || st.nisn,
        nis: existing.nis || st.nis,
        parentName: existing.parentName || st.parentName,
        parentPhone: existing.parentPhone || st.parentPhone,
        address: existing.address || st.address,
        studentPhone: existing.studentPhone || st.studentPhone
      });
    }
  });

  const mergedList = Array.from(uniqueMap.values());

  // Filter by selectedClasses if provided and not containing 'all'
  if (selectedClasses && selectedClasses.length > 0 && !selectedClasses.includes('all')) {
    const classSet = new Set(selectedClasses.map(c => c.trim().toLowerCase()));
    const filtered = mergedList.filter(s => s.className && classSet.has(s.className.trim().toLowerCase()));
    return filtered.length > 0 ? filtered : mergedList;
  }

  return mergedList;
}

export async function saveMasterStudentsToFirestore(students: Student[]): Promise<void> {
  if (isFirestoreQuotaExceeded() || !students || students.length === 0) return;
  try {
    const schoolMasterRef = doc(db, 'school_master', 'students');
    await setDoc(schoolMasterRef, { studentList: students, updatedAt: serverTimestamp() }, { merge: true });

    const adminDocRef = doc(db, 'users', 'admin_default');
    await setDoc(adminDocRef, { students: students }, { merge: true });
  } catch (err) {
    console.warn("saveMasterStudentsToFirestore warning:", err);
  }
}

