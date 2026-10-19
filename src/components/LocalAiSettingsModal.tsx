import React, { useState, useEffect } from "react";
import { 
  Cpu, Zap, HardDrive, Download, CheckCircle2, AlertTriangle, 
  X, RefreshCw, ShieldCheck, Wifi, WifiOff, Sparkles, Activity
} from "lucide-react";
import { 
  RECOMMENDED_LOCAL_MODELS, 
  LocalModelOption, 
  checkWebGPUSupport, 
  initLocalAiEngine,
  getActiveEngine
} from "../services/localAiEngine";

interface LocalAiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiMode: "cloud" | "local";
  setAiMode: (mode: "cloud" | "local") => void;
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
}

export const LocalAiSettingsModal: React.FC<LocalAiSettingsModalProps> = ({
  isOpen,
  onClose,
  aiMode,
  setAiMode,
  selectedModelId,
  setSelectedModelId,
}) => {
  const [gpuStatus, setGpuStatus] = useState<{ supported: boolean; reason?: string }>({ supported: false });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ text: string; progress: number }>({ text: "", progress: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    checkWebGPUSupport().then(res => setGpuStatus(res));
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if engine is already loaded
    if (getActiveEngine()) {
      setIsLoaded(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleInitModel = async () => {
    setIsDownloading(true);
    setDownloadProgress({ text: "Memulai inisialisasi WebGPU...", progress: 5 });
    try {
      await initLocalAiEngine(selectedModelId, (report) => {
        setDownloadProgress(report);
      });
      setIsLoaded(true);
      setAiMode("local");
    } catch (err: any) {
      alert("Gagal memuat model lokal: " + (err?.message || err));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Pengaturan AI Perangkat Keras (Offline AI)</h3>
              <p className="text-xs text-slate-5-00 dark:text-slate-400">Jalankan AI 100% lokal pada GPU/CPU laptop tanpa internet</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network & Hardware Status */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-blue-500 shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status Koneksi</div>
              <div className="text-xs font-bold">{isOnline ? "Online (Terhubung)" : "Offline (Terputus)"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
            {gpuStatus.supported ? (
              <Zap className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Akselerasi Hardware</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {gpuStatus.supported ? "WebGPU Aktif ⚡" : "Sintesis Lokal Active"}
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Pilih Mode Eksekusi AI:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAiMode("cloud")}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                aiMode === "cloud"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-500" /> Mode Online Cloud
                </span>
                {aiMode === "cloud" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
              </div>
              <p className="text-[11px] opacity-80 leading-snug">Gemini 2.5 Flash via Server. Sangat cepat, butuh internet.</p>
            </button>

            <button
              onClick={() => setAiMode("local")}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                aiMode === "local"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-500" /> Mode Perangkat Keras
                </span>
                {aiMode === "local" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <p className="text-[11px] opacity-80 leading-snug">
                100% Offline. Ditenagai GPU/CPU lokal. Privasi total.
              </p>
            </button>
          </div>
        </div>

        {/* Model Selection for Local Hardware */}
        <div className="mb-5 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-500" /> Pilih Model WebGPU Perangkat Keras
            </h4>
            {isLoaded && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-800">
                Model Terlibat di GPU
              </span>
            )}
          </div>

          <div className="space-y-2 mb-4">
            {RECOMMENDED_LOCAL_MODELS.map((model) => (
              <label
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  selectedModelId === model.id
                    ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="localModel"
                    checked={selectedModelId === model.id}
                    onChange={() => setSelectedModelId(model.id)}
                    className="accent-emerald-600"
                  />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      {model.name}
                      {model.recommended && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-medium">
                          Rekomendasi
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ukuran: {model.size} | Kebutuhan: {model.vramRequired}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Download & Load Button */}
          {gpuStatus.supported && (
            <div>
              {isDownloading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {downloadProgress.text || "Memuat model..."}
                    </span>
                    <span>{downloadProgress.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300" 
                      style={{ width: `${downloadProgress.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleInitModel}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Muat & Jalankan Model di GPU Perangkat
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">Jaminan Keamanan & Privasi Data Guru:</div>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              Saat Mode Perangkat Keras aktif, seluruh pemrosesan teks, penyusunan Modul Ajar, dan pembuatan Soal berjalan 100% lokal pada memori & GPU laptop Anda. Tidak ada data yang dikirim ke internet.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
