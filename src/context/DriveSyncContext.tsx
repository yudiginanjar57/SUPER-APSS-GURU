import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  saveMasterDatabaseToDrive,
  loadMasterDatabaseFromDrive,
  fetchGoogleUserInfo,
  GoogleDriveUser
} from "../lib/googleDriveDb";
import { safeStorage } from "../lib/safeStorage";

interface DriveDatabaseContextType {
  isConnected: boolean;
  accessToken: string | null;
  googleUser: GoogleDriveUser | null;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  syncNotice: { type: "success" | "error" | "info"; message: string } | null;
  connectGoogleDrive: () => void;
  disconnectGoogleDrive: () => void;
  syncAllToDrive: (customPayload?: any) => Promise<boolean>;
  restoreAllFromDrive: () => Promise<any | null>;
  clearNotice: () => void;
}

const DriveDatabaseContext = createContext<DriveDatabaseContextType | null>(null);

const DRIVE_TOKEN_KEY = "eduasisten_gdrive_access_token";
const DRIVE_USER_KEY = "eduasisten_gdrive_user";
const DRIVE_LAST_SYNC_KEY = "eduasisten_gdrive_last_sync";

export const DriveDatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return safeStorage.getItem(DRIVE_TOKEN_KEY) || null;
  });

  const [googleUser, setGoogleUser] = useState<GoogleDriveUser | null>(() => {
    const raw = safeStorage.getItem(DRIVE_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return safeStorage.getItem(DRIVE_LAST_SYNC_KEY) || null;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const clearNotice = useCallback(() => {
    setSyncNotice(null);
  }, []);

  // Update storage whenever tokens or user change
  useEffect(() => {
    if (accessToken) {
      safeStorage.setItem(DRIVE_TOKEN_KEY, accessToken);
    } else {
      safeStorage.removeItem(DRIVE_TOKEN_KEY);
    }
  }, [accessToken]);

  useEffect(() => {
    if (googleUser) {
      safeStorage.setItem(DRIVE_USER_KEY, JSON.stringify(googleUser));
    } else {
      safeStorage.removeItem(DRIVE_USER_KEY);
    }
  }, [googleUser]);

  useEffect(() => {
    if (lastSyncedTime) {
      safeStorage.setItem(DRIVE_LAST_SYNC_KEY, lastSyncedTime);
    }
  }, [lastSyncedTime]);

  // Google OAuth Login hook with full drive file scope
  const connectLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      setSyncNotice({ type: "info", message: "Menghubungkan akun Google Drive..." });

      try {
        const userInfo = await fetchGoogleUserInfo(token);
        if (userInfo) {
          setGoogleUser(userInfo);
        }
        setSyncNotice({
          type: "success",
          message: `Google Drive terhubung! Akun: ${userInfo?.email || "Aktif"}`
        });
      } catch (err: any) {
        console.error("Gagal mendapatkan profil:", err);
      }
    },
    onError: (error) => {
      const errStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
      if (errStr.includes('popup_closed') || errStr.includes('popup-closed')) {
        console.info("Info: Otorisasi Google Drive ditutup oleh pengguna.");
        setSyncNotice({ type: "info", message: "Otorisasi Google Drive dibatalkan." });
        return;
      }
      console.warn("Gagal otorisasi Google Drive:", error);
      setSyncNotice({ type: "error", message: "Otorisasi Google Drive dibatalkan atau gagal." });
    }
  });

  const connectGoogleDrive = useCallback(() => {
    connectLogin();
  }, [connectLogin]);

  const disconnectGoogleDrive = useCallback(() => {
    setAccessToken(null);
    setGoogleUser(null);
    safeStorage.removeItem(DRIVE_TOKEN_KEY);
    safeStorage.removeItem(DRIVE_USER_KEY);
    setSyncNotice({ type: "info", message: "Koneksi Google Drive diputuskan." });
  }, []);

  // Function to gather complete app data from safeStorage & state
  const gatherFullDatabaseSnapshot = useCallback(() => {
    const rawSessions = safeStorage.getItem("eduasisten_sessions");
    const rawSavedModules = safeStorage.getItem("eduasisten_saved_modules");
    const rawProfile = safeStorage.getItem("eduasisten_profile");
    const rawHistory = safeStorage.getItem("eduasisten_history");
    const rawSyncKey = safeStorage.getItem("guru_sync_key") || "GURU-DEFAULT";

    // App core management data (supporting both direct and syncKey-prefixed storage)
    const students = safeStorage.getJSON(`students_${rawSyncKey}`, []) || safeStorage.getJSON("guru_students", []);
    const classes = safeStorage.getJSON(`classes_${rawSyncKey}`, []) || safeStorage.getJSON("guru_classes", []);
    const attendance = safeStorage.getJSON(`attendance_${rawSyncKey}`, []) || safeStorage.getJSON("guru_attendance", []);
    const grades = safeStorage.getJSON(`grades_${rawSyncKey}`, []) || safeStorage.getJSON("guru_grades", []);
    const journals = safeStorage.getJSON(`journals_${rawSyncKey}`, []) || safeStorage.getJSON("guru_journals", []);
    const schedule = safeStorage.getJSON(`schedule_${rawSyncKey}`, []) || safeStorage.getJSON("guru_schedule", []);
    const assignments = safeStorage.getJSON(`assignments_${rawSyncKey}`, []) || safeStorage.getJSON("guru_assignments", []);
    const submissions = safeStorage.getJSON("guru_submissions", []);
    const homeroomNotes = safeStorage.getJSON("guru_homeroom_notes", []);
    const homeVisits = safeStorage.getJSON("guru_home_visits", []);
    const materials = safeStorage.getJSON("guru_materials", []);

    const teacherProfile = safeStorage.getJSON(`teacherProfile_${rawSyncKey}`, null) || {
      teacherName: safeStorage.getItem("guru_name") || "",
      nip: safeStorage.getItem("guru_nip") || "",
      subject: safeStorage.getItem("guru_subject") || "",
      institution: safeStorage.getItem("guru_institution") || "",
      currentMonth: safeStorage.getItem("guru_month") || "",
      currentWeek: safeStorage.getItem("guru_week") || "",
      headmasterName: safeStorage.getItem("guru_headmaster_name") || "",
      headmasterNip: safeStorage.getItem("guru_headmaster_nip") || "",
      headmasterRank: safeStorage.getItem("guru_headmaster_rank") || "",
      documentCity: safeStorage.getItem("guru_document_city") || "",
      schoolNpsn: safeStorage.getItem("guru_school_npsn") || "",
      academicYear: safeStorage.getItem("guru_academic_year") || "",
      profilePhoto: safeStorage.getItem("guru_profile_photo") || "",
      homeroomClass: safeStorage.getItem("guru_homeroom_class") || ""
    };

    return {
      version: "2.0-drive-database",
      savedAt: new Date().toISOString(),
      syncKey: rawSyncKey,
      eduasisten: {
        profile: rawProfile ? (typeof rawProfile === "string" ? JSON.parse(rawProfile) : rawProfile) : {},
        sessions: rawSessions ? (typeof rawSessions === "string" ? JSON.parse(rawSessions) : rawSessions) : [],
        savedModules: rawSavedModules ? (typeof rawSavedModules === "string" ? JSON.parse(rawSavedModules) : rawSavedModules) : [],
        history: rawHistory ? (typeof rawHistory === "string" ? JSON.parse(rawHistory) : rawHistory) : []
      },
      schoolManagement: {
        teacherProfile,
        students,
        classes,
        attendance,
        grades,
        journals,
        schedule,
        assignments,
        submissions,
        homeroomNotes,
        homeVisits,
        materials
      }
    };
  }, []);

  // Sync to Drive
  const syncAllToDrive = useCallback(async (customPayload?: any): Promise<boolean> => {
    if (!accessToken) {
      setSyncNotice({ type: "error", message: "Silakan hubungkan Google Drive terlebih dahulu." });
      return false;
    }

    try {
      setIsSyncing(true);
      setSyncNotice({ type: "info", message: "Menyinkronkan data ke Google Drive..." });

      const payload = customPayload || gatherFullDatabaseSnapshot();
      const result = await saveMasterDatabaseToDrive(accessToken, payload);

      const nowStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setLastSyncedTime(result.modifiedTime || nowStr);

      setSyncNotice({
        type: "success",
        message: `Database berhasil disinkronkan ke Google Drive (${nowStr})`
      });
      return true;
    } catch (err: any) {
      console.error("Gagal sinkronisasi ke Drive:", err);
      setSyncNotice({
        type: "error",
        message: `Gagal sinkron ke Google Drive: ${err.message || "Kesalahan koneksi"}`
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, gatherFullDatabaseSnapshot]);

  // Restore from Drive
  const restoreAllFromDrive = useCallback(async (): Promise<any | null> => {
    if (!accessToken) {
      setSyncNotice({ type: "error", message: "Silakan hubungkan Google Drive terlebih dahulu." });
      return null;
    }

    try {
      setIsSyncing(true);
      setSyncNotice({ type: "info", message: "Memuat database dari Google Drive..." });

      const result = await loadMasterDatabaseFromDrive(accessToken);
      if (!result || !result.data) {
        setSyncNotice({
          type: "info",
          message: "Belum ditemukan file database EduAsisten di Google Drive Anda."
        });
        return null;
      }

      const db = result.data;

      // Restore to local storage
      if (db.eduasisten) {
        if (db.eduasisten.profile) {
          safeStorage.setItem("eduasisten_profile", db.eduasisten.profile);
        }
        if (db.eduasisten.sessions) {
          safeStorage.setItem("eduasisten_sessions", db.eduasisten.sessions);
        }
        if (db.eduasisten.savedModules) {
          safeStorage.setItem("eduasisten_saved_modules", db.eduasisten.savedModules);
        }
        if (db.eduasisten.history) {
          safeStorage.setItem("eduasisten_history", db.eduasisten.history);
        }
      }

      const syncKey = db.syncKey || safeStorage.getItem("guru_sync_key") || "GURU-DEFAULT";
      safeStorage.setItem("guru_sync_key", syncKey);

      if (db.schoolManagement) {
        const sm = db.schoolManagement;
        if (sm.teacherProfile) {
          safeStorage.setItem(`teacherProfile_${syncKey}`, sm.teacherProfile);
          const tp = sm.teacherProfile;
          if (tp.teacherName) safeStorage.setItem("guru_name", tp.teacherName);
          if (tp.nip) safeStorage.setItem("guru_nip", tp.nip);
          if (tp.subject) safeStorage.setItem("guru_subject", tp.subject);
          if (tp.institution) safeStorage.setItem("guru_institution", tp.institution);
          if (tp.currentMonth) safeStorage.setItem("guru_month", tp.currentMonth);
          if (tp.currentWeek) safeStorage.setItem("guru_week", tp.currentWeek);
          if (tp.headmasterName) safeStorage.setItem("guru_headmaster_name", tp.headmasterName);
          if (tp.headmasterNip) safeStorage.setItem("guru_headmaster_nip", tp.headmasterNip);
          if (tp.headmasterRank) safeStorage.setItem("guru_headmaster_rank", tp.headmasterRank);
          if (tp.documentCity) safeStorage.setItem("guru_document_city", tp.documentCity);
          if (tp.schoolNpsn) safeStorage.setItem("guru_school_npsn", tp.schoolNpsn);
          if (tp.academicYear) safeStorage.setItem("guru_academic_year", tp.academicYear);
          if (tp.profilePhoto) safeStorage.setItem("guru_profile_photo", tp.profilePhoto);
          if (tp.homeroomClass) safeStorage.setItem("guru_homeroom_class", tp.homeroomClass);
        }
        if (sm.students) {
          safeStorage.setItem(`students_${syncKey}`, sm.students);
          safeStorage.setItem("guru_students", sm.students);
        }
        if (sm.classes) {
          safeStorage.setItem(`classes_${syncKey}`, sm.classes);
          safeStorage.setItem("guru_classes", sm.classes);
        }
        if (sm.attendance) {
          safeStorage.setItem(`attendance_${syncKey}`, sm.attendance);
          safeStorage.setItem("guru_attendance", sm.attendance);
        }
        if (sm.grades) {
          safeStorage.setItem(`grades_${syncKey}`, sm.grades);
          safeStorage.setItem("guru_grades", sm.grades);
        }
        if (sm.journals) {
          safeStorage.setItem(`journals_${syncKey}`, sm.journals);
          safeStorage.setItem("guru_journals", sm.journals);
        }
        if (sm.schedule) {
          safeStorage.setItem(`schedule_${syncKey}`, sm.schedule);
          safeStorage.setItem("guru_schedule", sm.schedule);
        }
        if (sm.assignments) {
          safeStorage.setItem(`assignments_${syncKey}`, sm.assignments);
          safeStorage.setItem("guru_assignments", sm.assignments);
        }
        if (sm.submissions) safeStorage.setItem("guru_submissions", sm.submissions);
        if (sm.homeroomNotes) safeStorage.setItem("guru_homeroom_notes", sm.homeroomNotes);
        if (sm.homeVisits) safeStorage.setItem("guru_home_visits", sm.homeVisits);
        if (sm.materials) safeStorage.setItem("guru_materials", sm.materials);
      }

      setLastSyncedTime(result.modifiedTime || new Date().toISOString());
      setSyncNotice({
        type: "success",
        message: "Database berhasil dipulihkan dari Google Drive! Memuat ulang..."
      });

      return db;
    } catch (err: any) {
      console.error("Gagal restore dari Drive:", err);
      setSyncNotice({
        type: "error",
        message: `Gagal memuat database dari Drive: ${err.message}`
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken]);

  return (
    <DriveDatabaseContext.Provider
      value={{
        isConnected: !!accessToken,
        accessToken,
        googleUser,
        isSyncing,
        lastSyncedTime,
        syncNotice,
        connectGoogleDrive,
        disconnectGoogleDrive,
        syncAllToDrive,
        restoreAllFromDrive,
        clearNotice
      }}
    >
      {children}
    </DriveDatabaseContext.Provider>
  );
};

export function useDriveDatabase() {
  const context = useContext(DriveDatabaseContext);
  if (!context) {
    throw new Error("useDriveDatabase must be used within a DriveDatabaseProvider");
  }
  return context;
}
