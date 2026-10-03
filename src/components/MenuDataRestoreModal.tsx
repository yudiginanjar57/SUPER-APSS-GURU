import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  Database, 
  Sparkles, 
  Layers, 
  Check, 
  FileUp,
  FileCheck,
  ShieldAlert,
  Info
} from "lucide-react";

export interface MenuRestoreItemPreview {
  label: string;
  count: number;
  sampleText?: string;
}

interface MenuDataRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuTitle: string; // e.g. "Presensi Kehadiran", "Daftar Nilai & Penilaian", "Jadwal Pelajaran", "Jurnal Harian", "Catatan Wali Kelas"
  menuKey: "attendance" | "grades" | "schedule" | "journals" | "homeroom" | "materials" | "bank_soal" | "master_data";
  currentDataCount: number;
  currentDataSummary?: string;
  onExportBackup: () => void;
  onRestoreData: (importedData: any, mode: "merge" | "replace") => { success: boolean; message?: string; count?: number };
  extraExportButtons?: React.ReactNode;
}

export default function MenuDataRestoreModal({
  isOpen,
  onClose,
  menuTitle,
  menuKey,
  currentDataCount,
  currentDataSummary,
  onExportBackup,
  onRestoreData,
  extraExportButtons
}: MenuDataRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<"restore" | "backup">("restore");
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [rawParsedData, setRawParsedData] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleResetState = () => {
    setRawParsedData(null);
    setFileName("");
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (file: File) => {
    handleResetState();
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error("Berkas kosong.");
        }

        const parsed = JSON.parse(text);

        // Smart extractor based on menuKey or full system backup
        let extractedData: any = null;
        let detectedCount = 0;

        if (menuKey === "attendance") {
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (Array.isArray(parsed.attendanceList)) {
            extractedData = parsed.attendanceList;
          } else if (Array.isArray(parsed.attendance)) {
            extractedData = parsed.attendance;
          } else if (Array.isArray(parsed.data)) {
            extractedData = parsed.data;
          }
          detectedCount = Array.isArray(extractedData) ? extractedData.length : 0;
        } else if (menuKey === "grades") {
          if (Array.isArray(parsed)) {
            extractedData = { grades: parsed };
            detectedCount = parsed.length;
          } else if (parsed.grades || parsed.studentGrades || parsed.assignments || parsed.submissions) {
            extractedData = {
              grades: parsed.grades || parsed.studentGrades || [],
              assignments: parsed.assignments || [],
              submissions: parsed.submissions || []
            };
            detectedCount = (extractedData.grades?.length || 0) + (extractedData.assignments?.length || 0);
          }
        } else if (menuKey === "schedule") {
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (Array.isArray(parsed.schedule)) {
            extractedData = parsed.schedule;
          } else if (Array.isArray(parsed.data)) {
            extractedData = parsed.data;
          }
          detectedCount = Array.isArray(extractedData) ? extractedData.length : 0;
        } else if (menuKey === "journals") {
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (Array.isArray(parsed.journals)) {
            extractedData = parsed.journals;
          } else if (Array.isArray(parsed.journalEntries)) {
            extractedData = parsed.journalEntries;
          } else if (Array.isArray(parsed.data)) {
            extractedData = parsed.data;
          }
          detectedCount = Array.isArray(extractedData) ? extractedData.length : 0;
        } else if (menuKey === "homeroom") {
          if (parsed.notes || parsed.homeroomNotes || parsed.homeVisits || parsed.homeVisitReports) {
            extractedData = {
              notes: parsed.notes || parsed.homeroomNotes || [],
              homeVisits: parsed.homeVisits || parsed.homeVisitReports || []
            };
            detectedCount = (extractedData.notes?.length || 0) + (extractedData.homeVisits?.length || 0);
          } else if (Array.isArray(parsed)) {
            extractedData = { notes: parsed, homeVisits: [] };
            detectedCount = parsed.length;
          }
        } else if (menuKey === "materials") {
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (Array.isArray(parsed.materials)) {
            extractedData = parsed.materials;
          } else if (Array.isArray(parsed.learningMaterials)) {
            extractedData = parsed.learningMaterials;
          }
          detectedCount = Array.isArray(extractedData) ? extractedData.length : 0;
        } else if (menuKey === "bank_soal") {
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (Array.isArray(parsed.bankQuestions)) {
            extractedData = parsed.bankQuestions;
          } else if (Array.isArray(parsed.questions)) {
            extractedData = parsed.questions;
          }
          detectedCount = Array.isArray(extractedData) ? extractedData.length : 0;
        } else {
          extractedData = parsed;
          detectedCount = Array.isArray(parsed) ? parsed.length : 1;
        }

        if (!extractedData || (Array.isArray(extractedData) && extractedData.length === 0 && detectedCount === 0)) {
          // If structure didn't match immediately, still allow if parsed contains valid objects
          if (typeof parsed === "object") {
            extractedData = parsed;
            detectedCount = 1;
          } else {
            throw new Error(`Berkas tidak memiliki struktur data yang sesuai untuk menu ${menuTitle}.`);
          }
        }

        setRawParsedData({
          original: parsed,
          extracted: extractedData,
          detectedCount
        });
      } catch (err: any) {
        console.error("Parse backup file error:", err);
        setErrorMessage(err.message || "Gagal membaca berkas cadangan JSON. Pastikan berkas berupa JSON yang valid.");
      }
    };

    reader.onerror = () => {
      setErrorMessage("Gagal membuka berkas. Silakan coba lagi.");
    };

    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!rawParsedData) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = onRestoreData(rawParsedData.extracted, restoreMode);
      if (result && result.success) {
        setSuccessMessage(result.message || `Data ${menuTitle} berhasil dipulihkan dengan mode ${restoreMode === "merge" ? "Gabung & Lengkapi" : "Ganti Total"}!`);
        setTimeout(() => {
          handleResetState();
          onClose();
        }, 1800);
      } else {
        setErrorMessage(result?.message || "Gagal memulihkan data. Format tidak didukung.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan saat menerapkan pemulihan data.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shadow-xs">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  Cadangkan & Pulihkan {menuTitle}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-black text-[10px] rounded-lg border border-indigo-200">
                  {currentDataCount} Data Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Simpan cadangan ke file (.json) atau pulihkan data kapan saja tanpa takut hilang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleResetState();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl my-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "restore"
                ? "bg-white text-indigo-600 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload size={14} /> Pulihkan Data (Restore)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("backup")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "backup"
                ? "bg-white text-emerald-600 shadow-xs font-black"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Download size={14} /> Cadangkan Data (Backup)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {activeTab === "restore" && (
            <div className="space-y-4">
              {/* Success Banner */}
              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 font-bold"
                >
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-2.5 font-bold"
                >
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* File Upload Zone */}
              {!rawParsedData ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/30 transition-all rounded-3xl p-6 flex flex-col items-center justify-center gap-2.5 text-center group cursor-pointer"
                >
                  <label className="w-full flex flex-col items-center justify-center cursor-pointer">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-1">
                      <FileUp size={24} />
                    </div>
                    <span className="text-xs font-black text-slate-800 block">
                      Pilih atau Seret (Drag & Drop) Berkas Cadangan (.json)
                    </span>
                    <span className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                      Mendukung file cadangan spesifik {menuTitle} maupun file cadangan penuh sistem EduAsisten.
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File Detected Card */}
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-indigo-950">
                          {rawParsedData.detectedCount} Data Ditemukan
                        </p>
                        <p className="text-[10.5px] text-indigo-700 font-mono">
                          {fileName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetState}
                      className="px-3 py-1.5 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                    >
                      Ganti Berkas
                    </button>
                  </div>

                  {/* Restore Strategy Selection */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-600" />
                      Pilih Metode Penggabungan Data:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Merge Mode */}
                      <div
                        onClick={() => setRestoreMode("merge")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          restoreMode === "merge"
                            ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            🔄 Gabung & Lengkapi
                          </span>
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded">
                            Disarankan
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
                          Menambahkan rekaman baru dan melengkapi yang kosong tanpa menghapus data aktif yang sudah ada.
                        </p>
                      </div>

                      {/* Replace Mode */}
                      <div
                        onClick={() => setRestoreMode("replace")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          restoreMode === "replace"
                            ? "bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                            ⚠️ Ganti Seluruhnya
                          </span>
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded">
                            Timpa
                          </span>
                        </div>
                        <p className="text-[10.5px] text-rose-700/80 mt-1 leading-relaxed">
                          Menghapus data {menuTitle} saat ini dan menggantinya seluruhnya dengan isi berkas cadangan.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info guidelines */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-600">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Tips Keamanan:</strong> Pemulihan data hanya memproses data kategori <em>{menuTitle}</em>. Data pada modul lainnya (seperti akun pengguna atau data siswa utama) tidak akan terpengaruh.
                </p>
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                  <Database size={16} className="text-emerald-600" />
                  <span>Cadangkan Data {menuTitle}</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Unduh seluruh data <strong>{menuTitle}</strong> ({currentDataCount} rekaman) ke dalam berkas JSON terstruktur yang aman dan dapat dipulihkan kapan pun Anda butuhkan.
                </p>
                {currentDataSummary && (
                  <p className="text-[10.5px] text-emerald-700 bg-white/70 p-2 rounded-xl border border-emerald-100">
                    {currentDataSummary}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={16} /> Unduh Cadangan JSON ({currentDataCount} Data)
                </button>
                {extraExportButtons}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={() => {
              handleResetState();
              onClose();
            }}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
          >
            Tutup
          </button>

          {activeTab === "restore" && rawParsedData && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteRestore}
              className={`px-5 py-2.5 rounded-xl font-black text-xs text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                restoreMode === "replace"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <RotateCcw size={14} />
              {isProcessing ? "Memproses..." : `Terapkan Pemulihan (${restoreMode === "merge" ? "Gabung" : "Timpa"})`}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
