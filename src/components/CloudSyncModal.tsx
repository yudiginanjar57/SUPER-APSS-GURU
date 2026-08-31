import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Cloud, 
  Smartphone, 
  Laptop, 
  QrCode, 
  Copy, 
  Check, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  KeyRound, 
  Radio, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  Info
} from "lucide-react";
import { 
  getDeviceLabel, 
  generateQrCodeDataUrl, 
  GuruSyncPayload 
} from "../lib/firestoreSync";

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  device?: string;
}

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncKey: string;
  onUpdateSyncKey: (newKey: string) => void;
  isRealtimeSyncEnabled: boolean;
  onToggleRealtimeSync: (enabled: boolean) => void;
  realtimeSyncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncTime: string | null;
  lastUpdatedBy: string | null;
  syncLogs: SyncLogEntry[];
  onManualPush: () => Promise<void>;
  onManualPull: () => Promise<void>;
  onClearLogs?: () => void;
  onRestorePresets?: () => Promise<void> | void;
  currentDataSummary?: {
    studentsCount: number;
    attendanceCount: number;
    gradesCount: number;
    journalsCount: number;
    scheduleCount: number;
    notesCount: number;
  };
}

export default function CloudSyncModal({
  isOpen,
  onClose,
  syncKey,
  onUpdateSyncKey,
  isRealtimeSyncEnabled,
  onToggleRealtimeSync,
  realtimeSyncStatus,
  lastSyncTime,
  lastUpdatedBy,
  syncLogs,
  onManualPush,
  onManualPull,
  onClearLogs,
  onRestorePresets,
  currentDataSummary = {
    studentsCount: 0,
    attendanceCount: 0,
    gradesCount: 0,
    journalsCount: 0,
    scheduleCount: 0,
    notesCount: 0
  }
}: CloudSyncModalProps) {
  const [inputKey, setInputKey] = useState(syncKey);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const deviceLabel = getDeviceLabel();

  // Construct sharing URL
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${window.location.pathname}?syncKey=${encodeURIComponent(syncKey)}`
    : "";

  useEffect(() => {
    setInputKey(syncKey);
    if (shareUrl) {
      generateQrCodeDataUrl(shareUrl).then(url => setQrCodeUrl(url));
    }
  }, [syncKey, shareUrl, isOpen]);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(syncKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleSaveSyncKey = () => {
    if (!inputKey.trim()) return;
    onUpdateSyncKey(inputKey.trim());
    setActionSuccessMsg(`Kode sinkronisasi berhasil diubah ke: ${inputKey.trim()}`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleTriggerPush = async () => {
    setIsPushing(true);
    try {
      await onManualPush();
      setActionSuccessMsg("Data berhasil diunggah ke Cloud Firestore!");
    } catch {
      // handled in parent
    } finally {
      setIsPushing(false);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const handleTriggerPull = async () => {
    setIsPulling(true);
    try {
      await onManualPull();
      setActionSuccessMsg("Data terbaru berhasil ditarik dari Cloud Firestore!");
    } catch {
      // handled in parent
    } finally {
      setIsPulling(false);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-emerald-400">
                  <Cloud size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                      Sinkronisasi Firestore (HP ⇄ Laptop)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Realtime
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/90 font-medium">
                    Edit di HP langsung berubah di laptop secara instan & tanpa batas
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
              
              {/* Notification Banner */}
              {actionSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2.5 font-bold animate-in fade-in">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Realtime Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-indigo-100/80 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${
                      realtimeSyncStatus === "syncing" 
                        ? "bg-amber-500 animate-spin" 
                        : isRealtimeSyncEnabled 
                        ? "bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" 
                        : "bg-slate-400"
                    }`} />
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Status: {isRealtimeSyncEnabled ? "Realtime Cloud Aktif" : "Non-aktif"}</span>
                        {realtimeSyncStatus === "syncing" && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Sedang Sinkronisasi...
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Perangkat Anda: <strong className="text-indigo-950 font-bold">{deviceLabel}</strong>
                        {lastSyncTime && (
                          <span> • Update: {lastSyncTime} {lastUpdatedBy ? `(${lastUpdatedBy})` : ""}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRealtimeSync(!isRealtimeSyncEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isRealtimeSyncEnabled 
                          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs" 
                          : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
                      }`}
                    >
                      <Radio size={14} className={isRealtimeSyncEnabled ? "animate-pulse" : ""} />
                      {isRealtimeSyncEnabled ? "Auto-Sync Nyala" : "Nyalakan Auto-Sync"}
                    </button>
                  </div>
                </div>

                {/* Quick Data Count */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-indigo-100/60 text-center">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Siswa</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.studentsCount}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Absensi</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.attendanceCount}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Nilai</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.gradesCount}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Jurnal</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.journalsCount}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Jadwal</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.scheduleCount}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Catatan</div>
                    <div className="font-black text-indigo-950 text-sm">{currentDataSummary.notesCount}</div>
                  </div>
                </div>
              </div>

              {/* Connecting HP & Laptop (QR & Link) */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-white space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                      <QrCode size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Cara Sambungkan HP & Laptop
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Cukup scan QR Code ini di HP, maka kedua perangkat akan terhubung otomatis
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {/* QR Code */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    {qrCodeUrl ? (
                      <div className="p-2.5 bg-white rounded-2xl border-2 border-indigo-100 shadow-md">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code Sinkronisasi" 
                          className="w-36 h-36 sm:w-40 sm:h-40 rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                        Memuat QR...
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-indigo-900 mt-2 text-center">
                      Arahkan kamera HP ke QR Code ini
                    </span>
                  </div>

                  {/* Options & Direct Links */}
                  <div className="sm:col-span-7 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
                        <span>Kode Sinkronisasi Unik:</span>
                        <button 
                          onClick={handleCopyKey}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          {copiedKey ? "Tersalin!" : "Salin Kode"}
                        </button>
                      </label>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-indigo-950 text-center tracking-wider text-sm shadow-2xs">
                        {syncKey}
                      </div>
                    </div>

                    <button
                      onClick={handleCopyLink}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                      <span>{copiedLink ? "Tautan HP Berhasil Disalin!" : "Salin Tautan Langsung untuk HP"}</span>
                    </button>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                      <Info size={14} className="shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        Buka tautan ini di peramban (Chrome/Safari) HP Anda. Setiap perubahan absen, nilai, atau jurnal akan langsung sinkron detik itu juga!
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Sync Key Field */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative flex-1 w-full">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="Masukkan kode sinkronisasi..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-indigo-600"
                    />
                  </div>
                  <button
                    onClick={handleSaveSyncKey}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs shadow-2xs"
                  >
                    Ganti / Gabung Kode
                  </button>
                </div>
              </div>

              {/* Manual Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleTriggerPush}
                  disabled={isPushing}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800 flex items-center gap-3 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <UploadCloud size={18} className={isPushing ? "animate-bounce" : ""} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xs text-slate-900">
                      {isPushing ? "Mengunggah..." : "Unggah Manual ke Cloud"}
                    </div>
                    <div className="text-[10px] text-slate-500">Kirim paksa data saat ini ke Firestore</div>
                  </div>
                </button>

                <button
                  onClick={handleTriggerPull}
                  disabled={isPulling}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-800 flex items-center gap-3 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <DownloadCloud size={18} className={isPulling ? "animate-bounce" : ""} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xs text-slate-900">
                      {isPulling ? "Menarik..." : "Tarik Data dari Cloud"}
                    </div>
                    <div className="text-[10px] text-slate-500">Muat ulang data terbaru dari Firestore</div>
                  </div>
                </button>
              </div>

              {/* Restore Preset Demo Data Action */}
              {onRestorePresets && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">Data Kosong / Ingin Muat Ulang Contoh?</div>
                      <div className="text-[10px] text-slate-600">Muat ulang data lengkap (Siswa, Jadwal, Nilai, Jurnal, Tugas) ke Cloud & HP</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm("Muat ulang seluruh data contoh bawaan? Data saat ini akan diperbarui dengan data contoh lengkap.")) {
                        await onRestorePresets();
                        setActionSuccessMsg("Data contoh lengkap berhasil dimuat & disinkronkan!");
                        setTimeout(() => setActionSuccessMsg(""), 3500);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shrink-0 shadow-xs transition-all"
                  >
                    Muat Data Bawaan
                  </button>
                </div>
              )}

              {/* Sync Activity Logs */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Riwayat Sinkronisasi Realtime</span>
                  <span className="text-[10px] text-slate-400 font-normal">{syncLogs.length} aktivitas tercatat</span>
                </h4>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {syncLogs.length === 0 ? (
                    <div className="text-slate-400 text-center py-3 italic">Belum ada riwayat aktivitas sinkronisasi.</div>
                  ) : (
                    syncLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-slate-700">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            log.type === "success" ? "bg-emerald-500" :
                            log.type === "error" ? "bg-rose-500" :
                            log.type === "warning" ? "bg-amber-500" : "bg-indigo-500"
                          }`} />
                          <span className="truncate">{log.message}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 shrink-0 font-sans">{log.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Data dienkripsi dan disimpan aman di Google Cloud Firestore</span>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
