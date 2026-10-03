import { useState, useMemo, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  X, 
  Bookmark, 
  BookOpen, 
  Smile, 
  Check,
  FileUp,
  Sparkles,
  Trash2,
  Edit3,
  Upload,
  Loader2,
  FileText,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  Database
} from "lucide-react";
import { ScheduleItem } from "../types";
import { CLASSES, SUBJECTS, CLASS_ROOM_MAPPING } from "../data/presets";
import { compressFileForOCR } from "../lib/imageUtils";
import MenuDataRestoreModal from "./MenuDataRestoreModal";

interface PenjadwalanProps {
  schedule: ScheduleItem[];
  onAddSchedule: (newItem: Omit<ScheduleItem, "id">) => void;
  onUpdateSchedule?: (updatedItem: ScheduleItem) => void;
  onImportSchedules?: (newItems: Omit<ScheduleItem, "id">[], mode: "merge" | "replace") => void;
  onDeleteSchedule?: (id: string) => void;
  onClearSchedule?: () => void;
  classList?: string[];
}

const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export default function Penjadwalan({
  schedule,
  onAddSchedule,
  onUpdateSchedule,
  onImportSchedules,
  onDeleteSchedule,
  onClearSchedule,
  classList
}: PenjadwalanProps) {
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;
  const [activeDay, setActiveDay] = useState<ScheduleItem["day"]>("Senin");
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  // Form states for manual schedule entry
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [newDay, setNewDay] = useState<ScheduleItem["day"]>("Senin");
  const [newStartTime, setNewStartTime] = useState("07:30");
  const [newEndTime, setNewEndTime] = useState("09:00");
  const [newClassName, setNewClassName] = useState(availableClasses[0] || "X-MIPA-1");
  const [newRoom, setNewRoom] = useState(CLASS_ROOM_MAPPING[availableClasses[0] || "X-MIPA-1"] || "");
  const [newAgenda, setNewAgenda] = useState("");
  const [aiPromptInstructions, setAiPromptInstructions] = useState("");

  // Sync room when class changes
  useEffect(() => {
    setNewRoom(CLASS_ROOM_MAPPING[newClassName] || "");
  }, [newClassName]);

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEditSchedule = (item: ScheduleItem) => {
    setEditingSchedule(item);
    setNewSubject(item.subject);
    setNewDay(item.day);
    setNewStartTime(item.startTime);
    setNewEndTime(item.endTime);
    setNewClassName(item.className);
    setNewRoom(item.room);
    setNewAgenda(item.agenda || "");
    setIsOpenAddModal(true);
  };

  // AI Schedule Import Modal State
  const [isOpenImportModal, setIsOpenImportModal] = useState(false);
  const [importFile, setImportFile] = useState<{
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [importText, setImportText] = useState("");
  const [defaultImportClass, setDefaultImportClass] = useState(availableClasses[0] || "X-MIPA-1");
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [extractedSchedules, setExtractedSchedules] = useState<Omit<ScheduleItem, "id">[] | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // Export JSON Backup
  const handleExportScheduleJson = () => {
    const backupPayload = {
      app: "EduAsisten",
      version: "2.5",
      category: "schedule",
      exportedAt: new Date().toISOString(),
      scheduleCount: schedule.length,
      schedule: schedule
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_Jadwal_Mengajar_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Schedule Data Handler
  const handleRestoreScheduleData = (importedData: any, mode: "merge" | "replace") => {
    let list: ScheduleItem[] = [];
    if (Array.isArray(importedData)) {
      list = importedData;
    } else if (importedData && Array.isArray(importedData.schedule)) {
      list = importedData.schedule;
    }

    if (!Array.isArray(list) || list.length === 0) {
      return { success: false, message: "Tidak ditemukan data jadwal mengajar yang valid dalam berkas." };
    }

    const validList: Omit<ScheduleItem, "id">[] = list
      .filter(item => item && item.subject && item.day && item.startTime)
      .map(item => ({
        subject: item.subject,
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime || "09:00",
        className: item.className || availableClasses[0] || "X-MIPA-1",
        room: item.room || "",
        agenda: item.agenda || ""
      }));

    if (validList.length === 0) {
      return { success: false, message: "Format rekaman jadwal tidak sesuai dengan struktur sistem." };
    }

    if (onImportSchedules) {
      onImportSchedules(validList, mode);
    } else {
      validList.forEach(item => onAddSchedule(item));
    }

    return {
      success: true,
      count: validList.length,
      message: `Berhasil memulihkan ${validList.length} jadwal mengajar (${mode === "merge" ? "Gabung & Lengkapi" : "Ganti Keseluruhan"})!`
    };
  };

  // Filter schedule for the currently active day
  const activeDaySchedule = useMemo(() => {
    return schedule
      .filter(item => item.day === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule, activeDay]);

  // Form submission handler for manual entry
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newRoom.trim()) {
      setFormError("Mata pelajaran dan Ruangan kelas wajib diisi!");
      return;
    }

    if (editingSchedule && onUpdateSchedule) {
      onUpdateSchedule({
        ...editingSchedule,
        subject: newSubject,
        day: newDay,
        startTime: newStartTime,
        endTime: newEndTime,
        className: newClassName,
        room: newRoom,
        agenda: newAgenda
      });
      showSuccessToast("Jadwal Berhasil Diperbarui!");
    } else {
      onAddSchedule({
        subject: newSubject,
        day: newDay,
        startTime: newStartTime,
        endTime: newEndTime,
        className: newClassName,
        room: newRoom,
        agenda: newAgenda
      });
      showSuccessToast("Jadwal Berhasil Ditambahkan!");
    }

    // Reset Form
    setEditingSchedule(null);
    setNewSubject("");
    setNewRoom("");
    setNewAgenda("");
    setFormError("");
    setIsOpenAddModal(false);
  };

  const showSuccessToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // AI Extract Schedule Handler
  const handleExtractScheduleAI = async () => {
    if (!importFile && !importText.trim()) {
      setImportError("Harap unggah file PDF/Gambar atau masukkan teks/tabel jadwal.");
      return;
    }

    setImportError("");
    setIsExtractingAI(true);
    setExtractedSchedules(null);

    try {
      const res = await fetch("/api/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: importFile?.base64,
          fileMimeType: importFile?.mimeType,
          textContent: importText,
          defaultClassName: defaultImportClass,
          instructions: aiPromptInstructions
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error (${res.status}): ${responseText.slice(0, 150)}`);
      }

      if (!res.ok) throw new Error(data.error || data.details || "Gagal mengekstrak jadwal dari file.");

      if (!data.schedules || data.schedules.length === 0) {
        throw new Error("Tidak ditemukan data jadwal pada dokumen/gambar. Pastikan dokumen berisi tabel jadwal.");
      }

      setExtractedSchedules(data.schedules);
      setAiSummary(data.summary || `Berhasil mengekstrak ${data.schedules.length} jam mengajar.`);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Terjadi kesalahan saat memproses file jadwal.");
    } finally {
      setIsExtractingAI(false);
    }
  };

  // Confirm import and apply to schedule state
  const handleConfirmImportAI = () => {
    if (!extractedSchedules || extractedSchedules.length === 0) return;

    // Enhance schedule items with room info based on class name
    const enhancedSchedules = extractedSchedules.map(item => ({
      ...item,
      // Ensure class name and room are set
      className: item.className || defaultImportClass,
      room: CLASS_ROOM_MAPPING[item.className || defaultImportClass] || item.room
    }));

    if (onImportSchedules) {
      onImportSchedules(enhancedSchedules, importMode);
    } else {
      enhancedSchedules.forEach(item => onAddSchedule(item));
    }

    showSuccessToast(`Berhasil mengimpor ${enhancedSchedules.length} jadwal mengajar via AI!`);
    
    // Cleanup modal
    setExtractedSchedules(null);
    setImportFile(null);
    setImportText("");
    setIsOpenImportModal(false);
  };

  const handleRemoveExtractedItem = (index: number) => {
    setExtractedSchedules(prev => prev ? prev.filter((_, idx) => idx !== index) : null);
  };

  return (
    <div className="space-y-6" id="penjadwalan-section">
      {/* Schedule Header / Day Filter & Action Buttons */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4" id="jadwal-header-bar">
        {/* Days Tab Bar */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto" id="jadwal-day-tabs">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeDay === day 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id={`btn-select-day-${day}`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Restore & Backup Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsRestoreModalOpen(true)}
            className="px-3.5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            id="btn-restore-schedule"
            title="Cadangkan atau Pulihkan Jadwal Mengajar"
          >
            <RotateCcw size={14} className="text-indigo-600" /> Cadangkan / Pulihkan
          </motion.button>

          {/* AI Import Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpenImportModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
            id="btn-open-import-schedule-modal"
          >
            <Sparkles size={16} /> Impor Jadwal PDF/Gambar
          </motion.button>

          {/* Add Manual Schedule Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpenAddModal(true)}
            className="px-3.5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            id="btn-open-add-schedule-modal"
          >
            <Plus size={16} /> Manual
          </motion.button>

          {/* Clear Schedule Button */}
          {schedule.length > 0 && onClearSchedule && (
            <button
              onClick={onClearSchedule}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              title="Kosongkan Seluruh Jadwal"
              id="btn-clear-schedule"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Schedule Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="jadwal-main-layout">
        
        {/* Left Schedule Timeline Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[420px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" /> Agenda Mengajar: {activeDay}
            </h3>
            {successMsg && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl flex items-center gap-1"
                id="schedule-add-success-toast"
              >
                <Check size={12} /> {successMsg}
              </motion.span>
            )}
          </div>

          <div className="space-y-4 flex-1">
            {activeDaySchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-400 space-y-3">
                <BookOpen size={48} className="text-slate-200 animate-bounce" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-500">Hari ini Kosong / Libur</p>
                  <p className="text-xs text-slate-400">Tidak ada jadwal mengajar pada hari {activeDay}.</p>
                </div>
                <button
                  onClick={() => setIsOpenImportModal(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all mt-2 cursor-pointer"
                >
                  <Sparkles size={14} /> Impor Jadwal Otomatis dengan AI
                </button>
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-100 pl-4 ml-3 space-y-5">
                {activeDaySchedule.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="relative group bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                    id={`schedule-card-${item.id}`}
                  >
                    {/* Time dot on timeline */}
                    <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white group-hover:scale-125 transition-transform" />

                    <div className="flex gap-4 items-center flex-1">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        <span>{item.startTime}</span>
                        <span className="text-[9px] opacity-75">{item.endTime}</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
                          {item.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-semibold">
                          <span className="bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase">
                            {item.className}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin size={12} className="text-slate-400" /> {item.room}
                          </span>
                          {item.agenda && (
                            <span className="flex items-center gap-1 text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <BookOpen size={12} className="text-indigo-400" /> {item.agenda}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100/50 font-bold px-2.5 py-1 rounded-xl">
                        {item.startTime.localeCompare("09:30") < 0 ? "Pagi hari" : "Siang hari"}
                      </span>

                      {onDeleteSchedule && (
                        <button
                          onClick={() => onDeleteSchedule(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus jam ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {onUpdateSchedule && (
                        <button
                          onClick={() => handleEditSchedule(item)}
                          className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit jam ini"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Info Panels */}
        <div className="space-y-6">
          {/* Class distribution info cards */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
              <Users size={16} className="text-indigo-600" /> Ringkasan Jam Mengajar
            </h3>
            
            <div className="space-y-2.5 text-xs">
              {availableClasses.map((cls) => {
                const classSessions = schedule.filter(s => s.className === cls);
                return (
                  <div key={cls} className="p-3 bg-slate-50 rounded-2xl border border-slate-100/80 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-800">{cls}</p>
                      <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[140px]">
                        {classSessions.map(s => s.subject).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "Belum ada jam"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">{classSessions.length} Sesi</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Mingguan</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Helper Banner */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-md space-y-3">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
            <div className="flex items-center gap-2 text-indigo-200">
              <Sparkles size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Impor Otomatis AI</span>
            </div>
            <h4 className="font-bold text-sm font-display">Punya Foto / PDF Jadwal Sekolah?</h4>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Cukup upload scan PDF atau foto gambar tabel jadwal mingguan Anda, AI Gemini Vision akan memindai dan menjadikannya jadwal terstruktur otomatis.
            </p>
            <button
              onClick={() => setIsOpenImportModal(true)}
              className="w-full py-2 bg-white text-indigo-900 font-extrabold text-xs rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileUp size={14} /> Coba Impor PDF/Gambar Now
            </button>
          </div>
        </div>
      </div>

      {/* AI Schedule Import Modal */}
      <AnimatePresence>
        {isOpenImportModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="import-schedule-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] my-auto"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm md:text-base">Impor Jadwal AI (PDF / Gambar)</h3>
                    <p className="text-[11px] text-indigo-100">Ekstraksi foto/scan PDF jadwal mengajar otomatis dengan AI Vision</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpenImportModal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Upload Section */}
                {!extractedSchedules && (
                  <>
                    <div className="space-y-2">
                      <label className="font-extrabold text-slate-700 uppercase tracking-wide text-[10px] block">
                        1. Unggah File PDF / Foto Jadwal (JPG/PNG)
                      </label>
                      <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-5 bg-indigo-50/40 hover:bg-indigo-50 transition-colors text-center relative cursor-pointer group">
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const base64 = await compressFileForOCR(file);
                                const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
                                setImportFile({
                                  base64,
                                  mimeType: isPdf ? "application/pdf" : "image/jpeg",
                                  fileName: file.name
                                });
                              } catch (err) {
                                console.error("Error processing file:", err);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center gap-2 text-slate-600">
                          <div className="p-3 bg-white rounded-2xl shadow-xs text-indigo-600 group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-800 block">
                              {importFile ? importFile.fileName : "Klik untuk unggah PDF / Gambar Jadwal"}
                            </span>
                            <span className="text-[10px] text-slate-400">Mendukung PDF, PNG, JPG hingga 20MB</span>
                          </div>
                          {importFile && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={12} /> File Siap Dipindai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Or Paste Text */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                        Atau Tempelkan Teks Jadwal (Opsional / Tambahan)
                      </label>
                      <textarea
                        rows={3}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="Contoh: Senin: 07.30-09.00 Matematika X-MIPA-1 R.101, Selasa: 09.30-11.00 Fisika XI-IPA-3..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    {/* AI Prompt Instructions */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                        Instruksi Tambahan untuk AI (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={aiPromptInstructions}
                        onChange={(e) => setAiPromptInstructions(e.target.value)}
                        placeholder="Contoh: Abaikan kelas yang bukan X-MIPA-1, atau beri penekanan pada mapel tertentu..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    {/* Default Class Fallback */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 uppercase tracking-wide text-[10px]">
                        Default Kelas (jika tidak tertera di jadwal)
                      </label>
                      <select
                        value={defaultImportClass}
                        onChange={(e) => setDefaultImportClass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        {availableClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {importError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{importError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOpenImportModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleExtractScheduleAI}
                        disabled={isExtractingAI}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isExtractingAI ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Memindai AI Vision...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Mulai Pindai & Ekstrak AI
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Preview Extracted Schedule */}
                {extractedSchedules && (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-800">
                      <Check size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                      <div className="space-y-0.5">
                        <p className="font-extrabold">Hasil Ekstraksi Jadwal AI</p>
                        <p className="text-[11px] text-emerald-700 font-medium">{aiSummary}</p>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <label className="font-extrabold text-slate-700 uppercase tracking-wide text-[10px]">
                        Metode Penggabungan Jadwal
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImportMode("merge")}
                          className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                            importMode === "merge"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="block text-xs">➕ Gabungkan (Merge)</span>
                          <span className="block text-[10px] font-normal opacity-80">Tambahkan ke jadwal yang sudah ada</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMode("replace")}
                          className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                            importMode === "replace"
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="block text-xs">🔄 Ganti Seluruh Jadwal</span>
                          <span className="block text-[10px] font-normal opacity-80">Hapus jadwal lama dan pakai hasil impor baru</span>
                        </button>
                      </div>
                    </div>

                    {/* Extracted Schedule Items List */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="font-extrabold text-slate-700 uppercase tracking-wide text-[10px]">
                          Daftar Jam Sesi Terpindai ({extractedSchedules.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => setExtractedSchedules(null)}
                          className="text-[11px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} /> Pindai Ulang
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                        {extractedSchedules.map((item, idx) => (
                          <div 
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-800 font-extrabold px-2 py-1 rounded-lg text-[10px] uppercase">
                                  {item.day}
                                </span>
                                <div>
                                  <p className="font-extrabold text-slate-800 text-xs">{item.subject}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    {item.startTime} - {item.endTime} • Kelas {item.className} • {item.room}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExtractedItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Hapus dari daftar impor"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {/* Dropdown for subject */}
                            <select
                              value={item.subject}
                              onChange={(e) => {
                                const newSchedules = [...extractedSchedules];
                                newSchedules[idx].subject = e.target.value;
                                setExtractedSchedules(newSchedules);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700"
                            >
                              {SUBJECTS.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsOpenImportModal(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImportAI}
                        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={16} />
                        Simpan & Terapkan Jadwal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Add Schedule Modal Pop-Up */}
      <AnimatePresence>
        {isOpenAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="add-schedule-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md border border-slate-100 relative"
            >
              <button 
                onClick={() => setIsOpenAddModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                id="btn-close-schedule-modal"
              >
                <X size={18} />
              </button>

              <div className="mb-5 space-y-1">
                <h3 className="text-md font-bold text-slate-800 font-display flex items-center gap-1.5">
                  <Bookmark size={18} className="text-indigo-600" /> Buat Jadwal Mengajar Baru
                </h3>
                <p className="text-slate-400 text-xs font-semibold">Tambahkan jam mata pelajaran baru ke kalender mingguan</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Mata Pelajaran</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer"
                    id="new-schedule-subject-select"
                  >
                    {SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Class selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Kelas (Rombel)</label>
                    <select
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer"
                      id="new-schedule-class-select"
                    >
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Day selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hari Mengajar</label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer"
                      id="new-schedule-day-select"
                    >
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jam Mulai</label>
                    <input
                      type="text"
                      placeholder="07:30"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                      id="new-schedule-start-time"
                    />
                  </div>

                  {/* End time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jam Selesai</label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                      id="new-schedule-end-time"
                    />
                  </div>
                </div>

                {/* Room */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ruangan / Laboratorium</label>
                  <input
                    type="text"
                    value={newRoom}
                    readOnly
                    placeholder="cth: Ruang 102 / Lab Kimia"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-500 font-semibold cursor-not-allowed"
                    id="new-schedule-room-input"
                  />
                </div>

                {/* Agenda */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Agenda / Materi</label>
                  <input
                    type="text"
                    value={newAgenda}
                    onChange={(e) => setNewAgenda(e.target.value)}
                    placeholder="cth: Bab 1: Persamaan Linear"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                    id="new-schedule-agenda-input"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-rose-500 font-bold">{formError}</p>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsOpenAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                    id="btn-cancel-schedule"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    id="btn-submit-schedule"
                  >
                    Tambahkan Jadwal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore & Backup Jadwal Modal */}
      <MenuDataRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        menuTitle="Jadwal Pelajaran & Mengajar"
        menuKey="schedule"
        currentDataCount={schedule.length}
        currentDataSummary={`Mencakup ${schedule.length} agenda jam pelajaran aktif di seluruh kelas (${availableClasses.join(", ")}).`}
        onExportBackup={handleExportScheduleJson}
        onRestoreData={handleRestoreScheduleData}
      />
    </div>
  );
}
