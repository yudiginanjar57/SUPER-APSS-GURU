import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Calendar,
  Download,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Building2,
  User,
  Filter,
  CheckSquare,
  Sparkles,
  Eye,
  FileSpreadsheet
} from "lucide-react";
import { JournalEntry } from "../types";
import html2canvas from "html2canvas-pro";
import * as jspdfModule from "jspdf";
const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;

export interface MonthlyJournalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  journals: JournalEntry[];
  classList?: string[];
  teacherProfile?: {
    name: string;
    nip: string;
    subject: string;
    month?: string;
    weekNum?: string;
    institution?: string;
    headmasterName?: string;
    headmasterNip?: string;
    headmasterRank?: string;
    documentCity?: string;
    schoolNpsn?: string;
    academicYear?: string;
    teacherTteImageUrl?: string;
    headmasterTteImageUrl?: string;
    useTte?: boolean;
  };
}

const MONTH_NAMES_ID = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

// Helper to format date into Indonesian (e.g. 12 JANUARI 2026)
function formatIndonesianDate(dateString: string): string {
  if (!dateString) return "";
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString.toUpperCase();

  const months = [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
  ];

  const dateNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${dateNum} ${monthName} ${year}`;
}

// Extract Month & Year from JournalEntry
function getJournalMonthYear(journal: JournalEntry): { monthName: string; year: number; key: string } {
  if (journal.month && journal.month.trim()) {
    const raw = journal.month.trim().toUpperCase();
    const parts = raw.split(/\s+/);
    let mName = parts[0] || "JANUARI";
    if (mName === "NOPEMBER") mName = "NOVEMBER";
    const yNum = parseInt(parts[1] || `${new Date().getFullYear()}`, 10) || new Date().getFullYear();
    return { monthName: mName, year: yNum, key: `${mName} ${yNum}` };
  }

  if (journal.date) {
    const d = new Date(journal.date);
    if (!isNaN(d.getTime())) {
      const mName = MONTH_NAMES_ID[d.getMonth()] || "JANUARI";
      const yNum = d.getFullYear();
      return { monthName: mName, year: yNum, key: `${mName} ${yNum}` };
    }
    const upper = journal.date.toUpperCase();
    for (const m of MONTH_NAMES_ID) {
      if (upper.includes(m) || (m === "NOVEMBER" && upper.includes("NOPEMBER"))) {
        const yearMatch = upper.match(/\b(20\d\d)\b/);
        const yNum = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
        return { monthName: m, year: yNum, key: `${m} ${yNum}` };
      }
    }
  }

  return { monthName: "JANUARI", year: new Date().getFullYear(), key: `JANUARI ${new Date().getFullYear()}` };
}

export default function MonthlyJournalExportModal({
  isOpen,
  onClose,
  journals,
  classList = [],
  teacherProfile
}: MonthlyJournalExportModalProps) {
  // Current calendar year & month
  const currentYear = new Date().getFullYear();
  
  // Available unique month keys from journal records
  const recordedMonthKeys = Array.from(
    new Set(journals.map(j => getJournalMonthYear(j).key))
  );

  // Initial month selection: teacherProfile month or first recorded month or current month
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    if (teacherProfile?.month) {
      const parts = teacherProfile.month.trim().toUpperCase().split(/\s+/);
      const mName = parts[0] === "NOPEMBER" ? "NOVEMBER" : parts[0];
      const yNum = parts[1] || `${currentYear}`;
      return `${mName} ${yNum}`;
    }
    return recordedMonthKeys.length > 0 ? recordedMonthKeys[0] : `JANUARI ${currentYear}`;
  });

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [exportMode, setExportMode] = useState<"bundle" | "recap">("bundle");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [includeCover, setIncludeCover] = useState(true);

  // Filter journals for selected month and class
  const filteredJournals = journals.filter(j => {
    const my = getJournalMonthYear(j);
    const matchesMonth = my.key === selectedMonthKey;
    const matchesClass = selectedClass === "all" || j.className === selectedClass;
    return matchesMonth && matchesClass;
  });

  // Sort journals by date ascending
  const sortedFilteredJournals = [...filteredJournals].sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    return timeA - timeB;
  });

  if (!isOpen) return null;

  // Render photo grid helper for printable sheets
  const renderPrintPhotoGrid = (photosList: string[], timestamps?: string[]) => {
    if (!photosList || photosList.length === 0) {
      return (
        <div className="border border-slate-300 border-dashed rounded-lg p-4 text-center text-slate-400 flex flex-col items-center justify-center min-h-[140px] bg-slate-50">
          <p className="text-xs font-semibold">Tidak ada foto dokumentasi</p>
        </div>
      );
    }

    const count = photosList.length;

    if (count === 1) {
      return (
        <div className="w-full mx-auto py-1">
          <div className="relative w-full h-[180px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50">
            <img 
              src={photosList[0]} 
              alt="Dokumentasi 1" 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            {timestamps && timestamps[0] && (
              <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                {timestamps[0]}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full mx-auto py-1">
          {photosList.map((photo, pIdx) => (
            <div key={pIdx} className="relative w-full h-[120px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50">
              <img 
                src={photo} 
                alt={`Dokumentasi ${pIdx + 1}`} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              {timestamps && timestamps[pIdx] && (
                <span className="absolute bottom-1 left-1 bg-black/75 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded">
                  {timestamps[pIdx]}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full mx-auto py-1">
          {photosList.map((photo, pIdx) => {
            const isLast = pIdx === 2;
            return (
              <div 
                key={pIdx} 
                className={`relative w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-50 ${
                  isLast ? "col-span-2 h-[115px]" : "h-[105px]"
                }`}
              >
                <img 
                  src={photo} 
                  alt={`Dokumentasi ${pIdx + 1}`} 
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
                {timestamps && timestamps[pIdx] && (
                  <span className="absolute bottom-1 left-1 bg-black/75 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded">
                    {timestamps[pIdx]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full mx-auto py-1">
          {photosList.map((photo, pIdx) => (
            <div key={pIdx} className="relative w-full h-[100px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50">
              <img 
                src={photo} 
                alt={`Dokumentasi ${pIdx + 1}`} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              {timestamps && timestamps[pIdx] && (
                <span className="absolute bottom-1 left-1 bg-black/75 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded">
                  {timestamps[pIdx]}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1.5 w-full mx-auto py-1">
        {photosList.map((photo, pIdx) => (
          <div key={pIdx} className="relative w-full h-[90px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50">
            <img 
              src={photo} 
              alt={`Dokumentasi ${pIdx + 1}`} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            {timestamps && timestamps[pIdx] && (
              <span className="absolute bottom-1 left-1 bg-black/75 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded">
                {timestamps[pIdx]}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Main PDF Generation Logic
  const handleExecuteExport = async () => {
    if (sortedFilteredJournals.length === 0) {
      alert("Tidak ada data jurnal pada bulan dan filter kelas yang dipilih.");
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: sortedFilteredJournals.length, stage: "Mempersiapkan lembar dokumen..." });

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfPageWidth = 297;  // A4 Landscape mm
      const pdfPageHeight = 210; // A4 Landscape mm

      // Check if export mode is Recap Table
      if (exportMode === "recap") {
        setExportProgress({ current: 1, total: 1, stage: "Merender tabel rekapitulasi bulanan..." });
        const recapEl = document.getElementById("monthly-recap-pdf-target");
        if (!recapEl) throw new Error("Elemen rekapitulasi tidak ditemukan.");

        // Wait for images
        const imgs = recapEl.querySelectorAll("img");
        await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
        await new Promise(r => setTimeout(r, 400));

        const canvas = await html2canvas(recapEl, {
          scale: 2.2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        let renderedHeight = (canvas.height * pdfPageWidth) / canvas.width;

        if (renderedHeight <= pdfPageHeight) {
          pdf.addImage(imgData, "JPEG", 0, 0, pdfPageWidth, renderedHeight, undefined, "FAST");
        } else {
          let heightLeft = renderedHeight;
          let position = 0;
          pdf.addImage(imgData, "JPEG", 0, position, pdfPageWidth, renderedHeight, undefined, "FAST");
          heightLeft -= pdfPageHeight;

          while (heightLeft > 0) {
            position -= pdfPageHeight;
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, position, pdfPageWidth, renderedHeight, undefined, "FAST");
            heightLeft -= pdfPageHeight;
          }
        }
      } else {
        // MODE BUNDLE: Multi-page individual journal sheets
        const totalSheets = sortedFilteredJournals.length;

        // 1. Optional Cover Page
        if (includeCover) {
          setExportProgress({ current: 0, total: totalSheets, stage: "Membuat sampul buku jurnal..." });
          const coverEl = document.getElementById("monthly-cover-pdf-target");
          if (coverEl) {
            const coverCanvas = await html2canvas(coverEl, {
              scale: 2.2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff"
            });
            const coverImg = coverCanvas.toDataURL("image/jpeg", 0.96);
            pdf.addImage(coverImg, "JPEG", 0, 0, pdfPageWidth, pdfPageHeight, undefined, "FAST");
          }
        }

        // 2. Iterate each journal sheet
        for (let i = 0; i < totalSheets; i++) {
          const journal = sortedFilteredJournals[i];
          setExportProgress({
            current: i + 1,
            total: totalSheets,
            stage: `Memproses lembar ${i + 1} dari ${totalSheets} (${formatIndonesianDate(journal.date)})...`
          });

          const sheetEl = document.getElementById(`monthly-sheet-target-${journal.id}`);
          if (!sheetEl) continue;

          // Wait for images
          const imgs = sheetEl.querySelectorAll("img");
          await Promise.all(Array.from(imgs).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
          await new Promise(r => setTimeout(r, 200));

          const canvas = await html2canvas(sheetEl, {
            scale: 2.2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.96);
          let renderedWidth = pdfPageWidth;
          let renderedHeight = (canvas.height * pdfPageWidth) / canvas.width;

          // Add new page if not the very first page without cover
          if (i > 0 || includeCover) {
            pdf.addPage();
          }

          if (renderedHeight > pdfPageHeight && renderedHeight <= 245) {
            const scaleFactor = (pdfPageHeight - 8) / renderedHeight;
            renderedWidth = pdfPageWidth * scaleFactor;
            renderedHeight = renderedHeight * scaleFactor;
            const xOffset = (pdfPageWidth - renderedWidth) / 2;
            const yOffset = (pdfPageHeight - renderedHeight) / 2;
            pdf.addImage(imgData, "JPEG", xOffset, yOffset, renderedWidth, renderedHeight, undefined, "FAST");
          } else {
            pdf.addImage(imgData, "JPEG", 0, 0, renderedWidth, renderedHeight, undefined, "FAST");
          }
        }
      }

      setExportProgress({ current: sortedFilteredJournals.length, total: sortedFilteredJournals.length, stage: "Menyimpan berkas PDF..." });
      await new Promise(r => setTimeout(r, 400));

      const cleanMonth = selectedMonthKey.replace(/\s+/g, "_");
      const teacherSlug = (teacherProfile?.name || "Guru").replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = exportMode === "recap"
        ? `Rekap_Jurnal_Bulanan_${cleanMonth}_${teacherSlug}.pdf`
        : `Jurnal_Mengajar_Bulanan_${cleanMonth}_${teacherSlug}.pdf`;

      pdf.save(fileName);
      onClose();
    } catch (err: any) {
      console.error("Monthly PDF export error:", err);
      alert("Gagal mengekspor PDF bulanan: " + (err.message || err));
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const currentTeacher = teacherProfile?.name || "YUDI GINANJAR";
  const currentNip = teacherProfile?.nip || "199605242024211008";
  const currentSubject = teacherProfile?.subject || "EKONOMI";
  const useTte = teacherProfile?.useTte ?? false;
  const teacherTteImageUrl = teacherProfile?.teacherTteImageUrl || "";
  const headmasterTteImageUrl = teacherProfile?.headmasterTteImageUrl || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
              <Calendar size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                Ekspor Jurnal Harian per Bulan (PDF)
              </h3>
              <p className="text-xs text-indigo-100/90 font-medium">
                Kompilasi seluruh agenda dan dokumentasi kegiatan belajar mengajar dalam 1 berkas resmi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">
          
          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Month & Year Selector */}
            <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
              <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" />
                Pilih Periode Bulan & Tahun
              </label>
              
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                disabled={isExporting}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                {/* Populate standard 12 months for current & adjacent years */}
                {[currentYear, currentYear - 1, currentYear + 1].flatMap(yr =>
                  MONTH_NAMES_ID.map(m => {
                    const key = `${m} ${yr}`;
                    const count = journals.filter(j => getJournalMonthYear(j).key === key).length;
                    return (
                      <option key={key} value={key}>
                        {key} {count > 0 ? `(${count} Jurnal Tercatat)` : "(0 Jurnal)"}
                      </option>
                    );
                  })
                )}
              </select>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {recordedMonthKeys.map(k => {
                  const count = journals.filter(j => getJournalMonthYear(j).key === k).length;
                  const isSelected = selectedMonthKey === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedMonthKey(k)}
                      disabled={isExporting}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {k} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Class Filter */}
            <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
              <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Filter size={14} className="text-indigo-600" />
                Filter Kelas
              </label>
              
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isExporting}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="all">Semua Kelas ({journals.filter(j => getJournalMonthYear(j).key === selectedMonthKey).length} Jurnal)</option>
                {classList.map(cls => {
                  const count = journals.filter(j => getJournalMonthYear(j).key === selectedMonthKey && j.className === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      Kelas {cls} ({count} Jurnal)
                    </option>
                  );
                })}
              </select>

              <p className="text-[11px] text-slate-500 pt-1">
                Pilih <span className="font-semibold text-indigo-700">Semua Kelas</span> untuk menyusun buku jurnal gabungan seluruh jadwal mengajar Anda di bulan ini.
              </p>
            </div>
          </div>

          {/* 3. Export Mode Selection */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              Pilih Format Dokumen PDF
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Full Multi-Page Sheets Bundle */}
              <div
                onClick={() => setExportMode("bundle")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 items-start ${
                  exportMode === "bundle"
                    ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${exportMode === "bundle" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <FileText size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    Bundel Lengkap Lembar Jurnal & Foto
                    {exportMode === "bundle" && <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setiap pertemuan dicetak pada 1 lembar A4 landscape utuh dengan kisi foto resolusi tinggi, deskripsi kegiatan terjustifikasi, dan blok tanda tangan.
                  </p>
                  
                  {exportMode === "bundle" && (
                    <label className="flex items-center gap-2 pt-2 text-[11px] font-bold text-indigo-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCover}
                        onChange={(e) => setIncludeCover(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Sertakan Halaman Sampul Depan (Cover Book)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Option B: Consolidated Monthly Recap Table */}
              <div
                onClick={() => setExportMode("recap")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 items-start ${
                  exportMode === "recap"
                    ? "bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${exportMode === "recap" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <FileSpreadsheet size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    Tabel Rekapitulasi Jurnal Bulanan
                    {exportMode === "recap" && <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dokumen rekapitulasi ringkas dalam bentuk tabel matriks dengan Kop Surat resmi, daftar tanggal, kelas, materi/topik, ringkasan, dan kolom pengesahan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Filtered Journals Preview Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-600" />
                Daftar Jurnal Terpilih ({sortedFilteredJournals.length} Pertemuan)
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                Periode: {selectedMonthKey}
              </span>
            </div>

            {sortedFilteredJournals.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400 space-y-1">
                <AlertCircle size={28} className="mx-auto text-amber-500" />
                <p className="font-bold text-slate-700">Tidak ada jurnal mengajar pada periode ini</p>
                <p className="text-[10px]">Silakan pilih bulan lain atau tulis jurnal harian baru pada menu sebelumnya.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {sortedFilteredJournals.map((j, idx) => (
                  <div
                    key={j.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                        {j.className}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px] shrink-0 font-mono">
                        {formatIndonesianDate(j.date)}
                      </span>
                      <span className="text-slate-700 font-medium truncate text-xs">
                        {j.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400 font-bold">
                      <span>{j.photos?.length || 0} Foto</span>
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Bar when exporting */}
          {isExporting && exportProgress && (
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  {exportProgress.stage}
                </span>
                <span>
                  {exportProgress.total > 0 ? `${Math.round((exportProgress.current / exportProgress.total) * 100)}%` : ""}
                </span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 50}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-600" />
            <span>Format PDF A4 Landscape • Beresolusi Tinggi 2.2x</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteExport}
              disabled={isExporting || sortedFilteredJournals.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Unduh PDF Bulan {selectedMonthKey}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* HIDDEN TARGET SHEETS FOR HTML2CANVAS HIGH RESOLUTION RENDERING             */}
      {/* ========================================================================= */}
      <div 
        className="absolute pointer-events-none select-none opacity-0 overflow-hidden"
        style={{ left: "-9999px", top: "-9999px", width: "1100px", zIndex: -100 }}
        aria-hidden="true"
      >
        {/* 1. COVER PAGE TARGET */}
        <div 
          id="monthly-cover-pdf-target"
          className="bg-white p-12 text-black font-sans leading-relaxed w-[1100px] h-[770px] flex flex-col justify-between border-8 border-double border-indigo-900"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div className="text-center space-y-3 pt-6">
            <p className="text-sm font-bold tracking-widest text-slate-600 uppercase">
              PEMERINTAH PROVINSI JAWA BARAT
            </p>
            <h1 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">
              BUKU JURNAL KEGIATAN BELAJAR MENGAJAR
            </h1>
            <p className="text-lg font-bold text-indigo-700 uppercase">
              PERIODE BULAN {selectedMonthKey}
            </p>
            <div className="w-32 h-1 bg-indigo-600 mx-auto rounded-full mt-2"></div>
          </div>

          {/* Center Identity Box */}
          <div className="max-w-xl mx-auto w-full bg-slate-50 border-2 border-indigo-200 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              <span className="text-slate-500">NAMA GURU</span>
              <span className="col-span-2 text-black font-black">: {currentTeacher}</span>

              <span className="text-slate-500">NIP</span>
              <span className="col-span-2 text-black font-bold">: {currentNip}</span>

              <span className="text-slate-500">MATA PELAJARAN</span>
              <span className="col-span-2 text-black font-bold">: {currentSubject}</span>

              <span className="text-slate-500">SEKOLAH / INSTANSI</span>
              <span className="col-span-2 text-black font-bold">: {teacherProfile?.institution || "SMA Negeri 2 Tasikmalaya"}</span>

              <span className="text-slate-500">TAHUN AJARAN</span>
              <span className="col-span-2 text-black font-bold">: {teacherProfile?.academicYear || "2025/2026"}</span>

              <span className="text-slate-500">TOTAL PERTEMUAN</span>
              <span className="col-span-2 text-indigo-700 font-black">: {sortedFilteredJournals.length} Rekaman Jurnal</span>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs font-bold text-slate-500 pb-4 border-t border-slate-200 pt-4">
            <p>{teacherProfile?.institution || "SMA Negeri 2 Tasikmalaya"} • {teacherProfile?.documentCity || "Tasikmalaya"}</p>
          </div>
        </div>

        {/* 2. RECAP TABLE TARGET */}
        <div 
          id="monthly-recap-pdf-target"
          className="bg-white p-8 text-black font-sans leading-relaxed w-[1100px]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header Title */}
          <div className="text-center space-y-1 mb-6 border-b-2 border-black pb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {teacherProfile?.institution || "SMA NEGERI 2 TASIKMALAYA"}
            </p>
            <h2 className="text-base font-black text-black uppercase tracking-wide">
              REKAPITULASI JURNAL KEGIATAN BELAJAR MENGAJAR GURU
            </h2>
            <p className="text-xs font-bold text-indigo-900 uppercase">
              PERIODE: {selectedMonthKey} {selectedClass !== "all" ? `• KELAS ${selectedClass}` : ""}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-y-1 text-xs font-semibold mb-4 bg-slate-50 p-3 rounded-lg border border-slate-300">
            <div className="flex">
              <span className="w-32 uppercase text-slate-600 font-bold">NAMA GURU</span>
              <span className="text-black font-black">: {currentTeacher}</span>
            </div>
            <div className="flex">
              <span className="w-32 uppercase text-slate-600 font-bold">MATA PELAJARAN</span>
              <span className="text-black font-bold">: {currentSubject}</span>
            </div>
            <div className="flex">
              <span className="w-32 uppercase text-slate-600 font-bold">NIP</span>
              <span className="text-black">: {currentNip}</span>
            </div>
            <div className="flex">
              <span className="w-32 uppercase text-slate-600 font-bold">TOTAL PERTEMUAN</span>
              <span className="text-indigo-700 font-bold">: {sortedFilteredJournals.length} Pertemuan</span>
            </div>
          </div>

          {/* Recap Table */}
          <table className="w-full border-collapse text-left bg-white border border-black mb-6 text-xs">
            <thead>
              <tr className="bg-[#8db4e2] text-black font-bold border-b border-black text-center">
                <th className="py-2.5 px-2 border-r border-black w-[5%]">NO</th>
                <th className="py-2.5 px-2 border-r border-black w-[15%]">HARI/TANGGAL</th>
                <th className="py-2.5 px-2 border-r border-black w-[10%]">KELAS</th>
                <th className="py-2.5 px-3 border-r border-black w-[25%]">MATERI / TOPIK</th>
                <th className="py-2.5 px-3 border-r border-black w-[35%]">DESKRIPSI & RINGKASAN KEGIATAN</th>
                <th className="py-2.5 px-2 text-center w-[10%]">DOKUMENTASI</th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredJournals.map((journal, idx) => (
                <tr key={journal.id} className="align-top border-b border-black/50 text-[11px]">
                  <td className="py-2.5 px-2 border-r border-black text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-2 border-r border-black text-center font-semibold">
                    {formatIndonesianDate(journal.date)}
                  </td>
                  <td className="py-2.5 px-2 border-r border-black text-center font-bold">
                    {journal.className}
                  </td>
                  <td className="py-2.5 px-3 border-r border-black font-bold text-indigo-950">
                    {journal.topic}
                  </td>
                  <td className="py-2.5 px-3 border-r border-black whitespace-pre-line text-justify leading-relaxed" style={{ textAlign: "justify" }}>
                    {journal.descriptionText || journal.summary}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                    {journal.photos && journal.photos.length > 0 ? `${journal.photos.length} Foto` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between items-start mt-6 text-xs font-bold text-black px-4">
            <div className="text-center min-w-[220px] flex flex-col items-center">
              <p>Mengetahui,<br />Kepala Sekolah</p>
              {useTte && headmasterTteImageUrl?.trim() ? (
                <div className="h-16 my-1 flex items-center justify-center">
                  <img
                    src={headmasterTteImageUrl.trim()}
                    alt="TTE Kepala Sekolah"
                    className="max-h-14 max-w-[130px] object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="h-14"></div>
              )}
              <div className="font-bold">
                {teacherProfile?.headmasterName || "Dr. Hj. Yanti Suryanti, M.Pd."}
                <br />
                <span className="font-normal text-[11px]">NIP. {teacherProfile?.headmasterNip || "197005121995122001"}</span>
              </div>
            </div>

            <div className="text-center min-w-[220px] flex flex-col items-center">
              <p>{teacherProfile?.documentCity || "Tasikmalaya"}, {formatIndonesianDate(new Date().toISOString())}<br />Guru Mata Pelajaran</p>
              {useTte && teacherTteImageUrl?.trim() ? (
                <div className="h-16 my-1 flex items-center justify-center">
                  <img
                    src={teacherTteImageUrl.trim()}
                    alt="TTE Guru"
                    className="max-h-14 max-w-[130px] object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="h-14"></div>
              )}
              <div className="font-bold">
                {currentTeacher}
                <br />
                <span className="font-normal text-[11px]">NIP. {currentNip}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. INDIVIDUAL SHEETS FOR BUNDLE TARGET */}
        {sortedFilteredJournals.map((journal, jIdx) => {
          const formattedDate = formatIndonesianDate(journal.date);
          const currentPhotos = journal.photos || [];
          const currentDesc = journal.descriptionText || journal.summary;
          const currentWeek = journal.weekNum || "1";

          return (
            <div
              key={`monthly-sheet-${journal.id}`}
              id={`monthly-sheet-target-${journal.id}`}
              className="bg-white p-8 text-black font-sans leading-relaxed w-[1100px]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {/* Sheet Title */}
              <h2 className="text-center font-bold text-sm tracking-wide mb-6 text-black uppercase">
                JURNAL DESKRIPSI DAN KEGIATAN BELAJAR MENGAJAR
              </h2>

              {/* Teacher info grid */}
              <div className="grid grid-cols-2 gap-y-1.5 text-xs font-semibold mb-6 border-b border-black/10 pb-5">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">NAMA GURU</span>
                    <span className="text-black font-black">: {currentTeacher}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">NIP</span>
                    <span className="text-black">: {currentNip}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">MATA PELAJARAN</span>
                    <span className="text-black">: {currentSubject}</span>
                  </div>
                </div>
                <div className="space-y-1 col-start-2">
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">BULAN</span>
                    <span className="text-black">: {selectedMonthKey}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">MINGGU KE</span>
                    <span className="text-black">: {currentWeek}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 uppercase text-slate-500 font-bold">KELAS</span>
                    <span className="text-black font-black">: {journal.className}</span>
                  </div>
                </div>
              </div>

              {/* Main Table layout */}
              <div className="border border-black overflow-hidden rounded-md bg-white">
                <table className="w-full border-collapse text-left bg-white">
                  <thead>
                    <tr className="bg-[#8db4e2] text-black text-xs font-bold border-b border-black">
                      <th className="py-2.5 px-3 border-r border-black text-center w-[5%]">NO</th>
                      <th className="py-2.5 px-3 border-r border-black text-center w-[15%]">HARI/TANGGAL</th>
                      <th className="py-2.5 px-3 border-r border-black text-center w-[38%]">DOKUMENTASI</th>
                      <th className="py-2.5 px-3 text-center w-[42%]">DESKRIPSI KEGIATAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top text-xs">
                      <td className="py-4 px-3 border-r border-black text-center font-bold text-sm text-black">
                        {jIdx + 1}
                      </td>
                      <td className="py-4 px-3 border-r border-black text-center font-black text-black leading-snug">
                        {formattedDate}
                      </td>
                      <td className="p-3 border-r border-black bg-white w-[38%]">
                        {renderPrintPhotoGrid(currentPhotos, journal.photoTimestamps)}
                      </td>
                      <td className="p-4 whitespace-pre-line text-xs font-medium text-black leading-relaxed text-justify" style={{ textAlign: "justify" }}>
                        {currentDesc}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-start mt-6 text-xs font-bold text-black px-4">
                <div className="text-center min-w-[200px] flex flex-col items-center">
                  <p>Mengetahui,<br />Kepala Sekolah</p>
                  {useTte && headmasterTteImageUrl?.trim() ? (
                    <div className="h-16 my-1 flex items-center justify-center">
                      <img
                        src={headmasterTteImageUrl.trim()}
                        alt="TTE Kepala Sekolah"
                        className="max-h-14 max-w-[130px] object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div className="h-12"></div>
                  )}
                  <div className="font-bold">
                    {teacherProfile?.headmasterName || "Dr. Hj. Yanti Suryanti, M.Pd."}
                    <br />
                    <span className="font-normal text-[11px]">NIP. {teacherProfile?.headmasterNip || "197005121995122001"}</span>
                  </div>
                </div>

                <div className="text-center min-w-[200px] flex flex-col items-center">
                  <p>{teacherProfile?.documentCity || "Tasikmalaya"}, {formattedDate}<br />Guru Mata Pelajaran</p>
                  {useTte && teacherTteImageUrl?.trim() ? (
                    <div className="h-16 my-1 flex items-center justify-center">
                      <img
                        src={teacherTteImageUrl.trim()}
                        alt="TTE Guru"
                        className="max-h-14 max-w-[130px] object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div className="h-12"></div>
                  )}
                  <div className="font-bold">
                    {currentTeacher}
                    <br />
                    <span className="font-normal text-[11px]">NIP. {currentNip}</span>
                  </div>
                </div>
              </div>

              {/* Page Number / Footer indicator */}
              <div className="mt-4 pt-2 border-t border-slate-200 text-right text-[10px] text-slate-400 font-mono">
                Lembar {jIdx + 1} dari {sortedFilteredJournals.length} • Buku Jurnal Mengajar {selectedMonthKey}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
