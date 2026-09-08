import React, { useState, useEffect, FormEvent, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Cpu, 
  Sparkles, 
  Calendar, 
  Plus, 
  Trash2, 
  FileText,
  AlertCircle,
  Download,
  Image as ImageIcon,
  Clock,
  User,
  Hash,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Edit3,
  X,
  CheckSquare
} from "lucide-react";
import { JournalEntry } from "../types";
import { CLASSES } from "../data/presets";
import { compressImage } from "../lib/imageUtils";
import html2canvas from "html2canvas-pro";
import * as jspdfModule from "jspdf";
const jsPDF = (jspdfModule as any).jsPDF || (jspdfModule as any).default?.jsPDF || (jspdfModule as any).default || jspdfModule;

interface JurnalHarianProps {
  journals: JournalEntry[];
  onAddJournal: (newJournal: JournalEntry) => void;
  onEditJournal?: (updatedJournal: JournalEntry) => void;
  onDeleteJournal: (id: string) => void;
  classList?: string[];
  teacherProfile?: {
    name: string;
    nip: string;
    subject: string;
    month: string;
    weekNum: string;
    institution?: string;
    headmasterName?: string;
    headmasterNip?: string;
    headmasterRank?: string;
    documentCity?: string;
    schoolNpsn?: string;
    academicYear?: string;
  };
}

// Helper to format date into Indonesian (e.g., SENIN, 12 JANUARI 2026)
export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return "";
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString.toUpperCase();

  const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  const months = [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOPEMBER", "DESEMBER"
  ];

  const dayName = days[dateObj.getDay()];
  const dateNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${dayName}, ${dateNum} ${monthName} ${year}`;
}

export default function JurnalHarian({
  journals,
  onAddJournal,
  onEditJournal,
  onDeleteJournal,
  classList = ["X-MIPA-1", "XI-MIPA-3", "XII-IPS-2", "XI D4", "XI C1"],
  teacherProfile
}: JurnalHarianProps) {
  const [activeMode, setActiveMode] = useState<"view" | "write">("view");
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);

  // Form main details
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState<string>(todayStr);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState<boolean>(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false);
      }
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(event.target as Node)) {
        setIsTopicDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Administrative details (can be edited per-journal)
  const [teacherName, setTeacherName] = useState(teacherProfile?.name || "YUDI GINANJAR");
  const [nip, setNip] = useState(teacherProfile?.nip || "199605242024211008");
  const [subject, setSubject] = useState(teacherProfile?.subject || "EKONOMI");
  const [month, setMonth] = useState(teacherProfile?.month || "JANUARI 2026");
  const [weekNum, setWeekNum] = useState(teacherProfile?.weekNum || "2");

  // Keep synced with profile when creating new (not editing)
  useEffect(() => {
    if (!editingJournalId && teacherProfile) {
      setTeacherName(prev => prev === teacherProfile.name ? prev : teacherProfile.name);
      setNip(prev => prev === teacherProfile.nip ? prev : teacherProfile.nip);
      setSubject(prev => prev === teacherProfile.subject ? prev : teacherProfile.subject);
      setMonth(prev => prev === teacherProfile.month ? prev : teacherProfile.month);
      setWeekNum(prev => prev === teacherProfile.weekNum ? prev : teacherProfile.weekNum);
    }
  }, [teacherProfile?.name, teacherProfile?.nip, teacherProfile?.subject, teacherProfile?.month, teacherProfile?.weekNum, editingJournalId]);

  // User uploaded photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Description text area (pre-filled with the exact text from the image for ease of use)
  const [descriptionText, setDescriptionText] = useState("");
  const [summary, setSummary] = useState("");
  const [reflection, setReflection] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [previewJournal, setPreviewJournal] = useState<JournalEntry | null>(null);

  // Reset form to defaults
  const handleResetForm = () => {
    setEditingJournalId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setSelectedClasses([]);
    setSelectedTopics([]);
    setPhotos([]);
    setDescriptionText("");
    setSummary("");
    setReflection("");
    setNextSteps("");
    setErrorMsg(null);
  };

  // Auto expand the first journal initially
  useEffect(() => {
    if (journals.length > 0 && expandedJournalId === null) {
      setExpandedJournalId(journals[0].id);
    }
  }, [journals]);

  // Handle Photo Upload & Base64 Convert (2 to 6 photos support with auto-compression)
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const remainingSlots = 6 - photos.length;
      if (remainingSlots <= 0) {
        alert("Maksimal 6 foto telah tercapai!");
        return;
      }
      const filesToProcess = files.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        try {
          const compressed = await compressImage(file);
          setPhotos((prev) => {
            if (prev.length >= 6) return prev;
            return [...prev, compressed];
          });
        } catch (err) {
          console.warn("Gagal mengompres foto:", err);
        }
      }
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Render photo grid helper (handles 1 to 6 photos arranged compactly in a grid so output never gets cut off)
  const renderDocumentPhotoGrid = (photosList: string[], timestamps?: string[]) => {
    if (!photosList || photosList.length === 0) {
      return (
        <div className="border border-slate-200 border-dashed rounded-xl p-4 text-center text-slate-400 flex flex-col items-center justify-center min-h-[140px]">
          <p className="text-xs font-semibold">Belum ada foto</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Silakan unggah foto kegiatan</p>
        </div>
      );
    }

    const count = photosList.length;

    if (count === 1) {
      return (
        <div className="w-full mx-auto py-1">
          <div className="relative w-full h-[180px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs">
            <img 
              src={photosList[0]} 
              alt="Foto Dokumentasi 1" 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
            {timestamps && timestamps[0] && (
              <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
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
            <div key={pIdx} className="relative w-full h-[120px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs">
              <img 
                src={photo} 
                alt={`Foto Dokumentasi ${pIdx + 1}`} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
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
                className={`relative w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs ${
                  isLast ? "col-span-2 h-[115px]" : "h-[105px]"
                }`}
              >
                <img 
                  src={photo} 
                  alt={`Foto Dokumentasi ${pIdx + 1}`} 
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
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
            <div key={pIdx} className="relative w-full h-[100px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs">
              <img 
                src={photo} 
                alt={`Foto Dokumentasi ${pIdx + 1}`} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
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

    // 5 or 6 photos: 3 column grid
    return (
      <div className="grid grid-cols-3 gap-1.5 w-full mx-auto py-1">
        {photosList.map((photo, pIdx) => (
          <div key={pIdx} className="relative w-full h-[90px] rounded-lg overflow-hidden border border-slate-300 bg-slate-50 shadow-2xs">
            <img 
              src={photo} 
              alt={`Foto Dokumentasi ${pIdx + 1}`} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
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

  // Handle Edit Click
  const handleEditClick = (journal: JournalEntry) => {
    setEditingJournalId(journal.id);
    setDate(journal.date || new Date().toISOString().split("T")[0]);
    
    if (journal.className) {
      const splitClasses = journal.className.split("&").map(c => c.trim()).filter(Boolean);
      setSelectedClasses(splitClasses.length > 0 ? splitClasses : [journal.className]);
    } else {
      setSelectedClasses(["XI D4", "XI C1"]);
    }

    if (journal.topic) {
      const splitTopics = journal.topic.split(", ").map(t => t.trim()).filter(Boolean);
      setSelectedTopics(splitTopics.length > 0 ? splitTopics : [journal.topic]);
    } else {
      setSelectedTopics([]);
    }

    setDescriptionText(journal.descriptionText || "");
    setSummary(journal.summary || "");
    setReflection(journal.reflection || "");
    setNextSteps(journal.nextSteps || "");
    setPhotos(journal.photos || []);
    
    // Load existing administrative details if any
    setTeacherName(journal.teacherName || teacherProfile?.name || "YUDI GINANJAR");
    setNip(journal.nip || teacherProfile?.nip || "199605242024211008");
    setSubject(journal.subject || teacherProfile?.subject || "EKONOMI");
    setMonth(journal.month || teacherProfile?.month || "JANUARI 2026");
    setWeekNum(journal.weekNum || teacherProfile?.weekNum || "2");
    
    setActiveMode("write");
  };

  // Submit Journal Entry to parent state
  const handleSaveJournal = (e: FormEvent) => {
    e.preventDefault();
    const finalTopic = selectedTopics.length > 0 ? selectedTopics.join(", ") : "";

    if (!finalTopic.trim() || !descriptionText.trim()) {
      setErrorMsg("Topik Pembelajaran dan Deskripsi Kegiatan wajib diisi!");
      return;
    }

    const classNameCombined = selectedClasses.length > 0 ? selectedClasses.join(" & ") : "Umum";

    if (editingJournalId && onEditJournal) {
      const updatedJournal: JournalEntry = {
        id: editingJournalId,
        date,
        className: classNameCombined,
        topic: finalTopic,
        notes: "",
        summary,
        reflection,
        nextSteps,
        isAISuggested: false,
        teacherName,
        nip,
        subject,
        month,
        weekNum,
        descriptionText,
        photos: photos.length > 0 ? photos : undefined
      };
      onEditJournal(updatedJournal);
      setEditingJournalId(null);
      setExpandedJournalId(updatedJournal.id);
    } else {
      const newJournal: JournalEntry = {
        id: `jurnal-${Date.now()}`,
        date,
        className: classNameCombined,
        topic: finalTopic,
        notes: "",
        summary,
        reflection,
        nextSteps,
        isAISuggested: false,
        teacherName,
        nip,
        subject,
        month,
        weekNum,
        descriptionText,
        photos: photos.length > 0 ? photos : undefined
      };
      onAddJournal(newJournal);
      setExpandedJournalId(newJournal.id);
    }

    handleResetForm();
    setActiveMode("view");
  };

  // High-Resolution PDF Export utilizing html2canvas-pro & jsPDF
  const handleExportPDF = async (journal: JournalEntry) => {
    setExportingId(journal.id);

    try {
      // Find the printable element
      const element = document.getElementById(`pdf-target-sheet-${journal.id}`);
      if (!element) {
        throw new Error("Elemen lembar jurnal tidak ditemukan.");
      }

      // Ensure all images are fully loaded before rendering
      const imgs = element.querySelectorAll("img");
      const promises = Array.from(imgs).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // proceed even on error
        });
      });
      await Promise.all(promises);

      // Add a small delay for DOM stability
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2.5, // Ultra sharp scale
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfPageWidth = 297; // A4 landscape size width (mm)
      const pdfPageHeight = 210; // A4 landscape size height (mm)

      let renderedWidth = pdfPageWidth;
      let renderedHeight = (canvas.height * pdfPageWidth) / canvas.width;

      // If renderedHeight is slightly greater than 210mm (up to 245mm),
      // auto-scale proportionally so everything fits on 1 page cleanly without truncation
      if (renderedHeight > pdfPageHeight && renderedHeight <= 245) {
        const scaleFactor = (pdfPageHeight - 8) / renderedHeight;
        renderedWidth = pdfPageWidth * scaleFactor;
        renderedHeight = renderedHeight * scaleFactor;
        const xOffset = (pdfPageWidth - renderedWidth) / 2;
        const yOffset = (pdfPageHeight - renderedHeight) / 2;
        pdf.addImage(imgData, "JPEG", xOffset, yOffset, renderedWidth, renderedHeight, undefined, "FAST");
      } else if (renderedHeight <= pdfPageHeight) {
        // Fits perfectly on 1 page
        pdf.addImage(imgData, "JPEG", 0, 0, renderedWidth, renderedHeight, undefined, "FAST");
      } else {
        // Multi-page export if content is longer
        let heightLeft = renderedHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, renderedWidth, renderedHeight, undefined, "FAST");
        heightLeft -= pdfPageHeight;

        while (heightLeft > 0) {
          position -= pdfPageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, renderedWidth, renderedHeight, undefined, "FAST");
          heightLeft -= pdfPageHeight;
        }
      }
      
      pdf.save(`Jurnal_${journal.subject || "Ekonomi"}_Minggu_${journal.weekNum || "2"}_${journal.date}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Gagal memproses ekspor PDF: " + (err.message || err));
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6" id="jurnal-harian-section">
      {/* Mode Navigation Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="jurnal-nav-bar">
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start">
          <button
            onClick={() => setActiveMode("view")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === "view" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            id="btn-jurnal-mode-view"
          >
            📋 Lembar & Timeline Jurnal
          </button>
          <button
            onClick={() => setActiveMode("write")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === "write" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            id="btn-jurnal-mode-write"
          >
            ✍ {editingJournalId ? "Edit Jurnal Harian" : "Tulis Jurnal Harian Baru"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <BookOpen size={14} className="text-indigo-600" /> {journals.length} Jurnal Tercatat
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeMode === "view" ? (
          /* TIMELINE VIEW WITH PRINT LAYOUT PREVIEWS */
          <motion.div
            key="view-timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
            id="jurnal-timeline-layout"
          >
            {journals.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
                <FileText size={48} className="text-slate-200 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-semibold">Buku Jurnal Harian Kosong</p>
                  <p className="text-xs">Klik "Tulis Jurnal Harian Baru" untuk mencatat agenda, dokumentasi foto, dan deskripsi kegiatan mengajar Anda.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8" id="timeline-list">
                {journals.map((journal, index) => {
                  const isExpanded = expandedJournalId === journal.id;
                  const formattedDate = formatIndonesianDate(journal.date);
                  
                  // Safe defaults if entries are old or miss properties
                  const currentTeacher = journal.teacherName || "YUDI GINANJAR";
                  const currentNip = journal.nip || "199605242024211008";
                  const currentSubject = journal.subject || "EKONOMI";
                  const currentMonth = journal.month || "JANUARI 2026";
                  const currentWeek = journal.weekNum || "2";
                  const currentDesc = journal.descriptionText || journal.summary;
                  
                  // Clean user uploaded photos or fallback images cleanly without template
                  const currentPhotos = journal.photos || [
                    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80"
                  ];

                  return (
                    <motion.div
                      key={journal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.4) }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative"
                      id={`journal-container-card-${journal.id}`}
                    >
                      {/* Hidden printable target sheet for PDF generation, always in the DOM */}
                      <div 
                        className="absolute pointer-events-none select-none opacity-0 overflow-hidden"
                        style={{ left: "-9999px", top: "-9999px", width: "1100px", zIndex: -100 }}
                        aria-hidden="true"
                      >
                        <div 
                          id={`pdf-target-sheet-${journal.id}`}
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
                                <span className="text-black">: {currentTeacher}</span>
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
                                <span className="text-black">: {currentMonth}</span>
                              </div>
                              <div className="flex">
                                <span className="w-32 uppercase text-slate-500 font-bold">MINGGU KE</span>
                                <span className="text-black">: {currentWeek}</span>
                              </div>
                            </div>
                          </div>

                          {/* Main Table layout exactly matching the requested image */}
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
                                  {/* Row No */}
                                  <td className="py-4 px-3 border-r border-black text-center font-bold text-sm text-black">
                                    1
                                  </td>

                                  {/* Day & Date */}
                                  <td className="py-4 px-3 border-r border-black text-center font-black text-black leading-snug">
                                    {formattedDate}
                                  </td>

                                  {/* Photo Documentation Multi-Image Panel */}
                                  <td className="p-3 border-r border-black bg-white w-[38%]">
                                    {renderDocumentPhotoGrid(currentPhotos, journal.photoTimestamps)}
                                  </td>

                                  {/* Description of Activities list with Justify align */}
                                  <td className="p-4 whitespace-pre-line text-xs font-medium text-black leading-relaxed text-justify" style={{ textAlign: "justify" }}>
                                    {currentDesc}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Signatures Section for Official Document Print */}
                          <div className="flex justify-between items-start mt-6 text-xs font-bold text-black px-4">
                            <div className="text-center min-w-[200px]">
                              <p>Mengetahui,<br />Kepala Sekolah</p>
                              <div className="mt-12 font-bold">
                                {teacherProfile?.headmasterName || "Dr. Hj. Yanti Suryanti, M.Pd."}
                                <br />
                                <span className="font-normal text-[11px]">NIP. {teacherProfile?.headmasterNip || "197005121995122001"}</span>
                                {teacherProfile?.headmasterRank && (
                                  <>
                                    <br />
                                    <span className="font-normal text-[10px] text-slate-700">{teacherProfile.headmasterRank}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-center min-w-[200px]">
                              <p>{teacherProfile?.documentCity || "Tasikmalaya"}, {formattedDate}<br />Guru Mata Pelajaran</p>
                              <div className="mt-12 font-bold">
                                {currentTeacher}
                                <br />
                                <span className="font-normal text-[11px]">NIP. {currentNip}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary Banner Bar */}
                      <div 
                        onClick={() => setExpandedJournalId(isExpanded ? null : journal.id)}
                        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors bg-gradient-to-r from-slate-50 to-white border-b border-slate-100"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-xl uppercase self-start sm:self-auto">
                            {journal.className}
                          </span>
                          <span className="text-slate-400 text-xs font-semibold flex items-center gap-1 font-mono">
                            <Calendar size={12} className="text-slate-400" /> {formattedDate}
                          </span>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <h4 className="font-bold text-slate-800 text-sm leading-snug">
                            {journal.topic}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
                            Guru: {currentTeacher}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewJournal(journal);
                            }}
                            disabled={exportingId === journal.id}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <Download size={13} />
                            {exportingId === journal.id ? "Membuat PDF..." : "Ekspor PDF"}
                          </button>
                          <button className="text-slate-400 p-1">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section with Document Preview */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-slate-100 bg-slate-50/30 p-6 space-y-6"
                          >


                            {/* DOCUMENT SHEET VISUAL PREVIEW (MATCHES THE PHYSICAL SHEET IMAGE PERFECTLY) */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <BookOpenCheck size={12} className="text-indigo-600" /> Lembar Fisik Cetak Jurnal (Pratinjau PDF)
                              </span>

                              {/* Sheet Container */}
                              <div 
                                id={`pdf-preview-sheet-${journal.id}`}
                                className="bg-white p-8 border border-slate-200 shadow-md rounded-2xl max-w-[1100px] w-full mx-auto text-black font-sans leading-relaxed"
                                style={{ fontFamily: "'Inter', sans-serif" }}
                              >
                                {/* Sheet Title */}
                                <h2 className="text-center font-bold text-sm tracking-wide mb-6 text-black uppercase">
                                  JURNAL DESKRIPSI DAN KEGIATAN BELAJAR MENGAJAR
                                </h2>

                                {/* Teacher info grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 text-xs font-semibold mb-6 border-b border-black/10 pb-5">
                                  <div className="space-y-1">
                                    <div className="flex">
                                      <span className="w-32 uppercase text-slate-500 font-bold">NAMA GURU</span>
                                      <span>: {currentTeacher}</span>
                                    </div>
                                    <div className="flex">
                                      <span className="w-32 uppercase text-slate-500 font-bold">NIP</span>
                                      <span>: {currentNip}</span>
                                    </div>
                                    <div className="flex">
                                      <span className="w-32 uppercase text-slate-500 font-bold">MATA PELAJARAN</span>
                                      <span>: {currentSubject}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex">
                                      <span className="w-32 uppercase text-slate-500 font-bold">BULAN</span>
                                      <span>: {currentMonth}</span>
                                    </div>
                                    <div className="flex">
                                      <span className="w-32 uppercase text-slate-500 font-bold">MINGGU KE</span>
                                      <span>: {currentWeek}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Main Table layout exactly matching the requested image */}
                                <div className="border border-black overflow-hidden rounded-md">
                                  <table className="w-full border-collapse text-left">
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
                                        {/* Row No */}
                                        <td className="py-4 px-3 border-r border-black text-center font-bold text-sm">
                                          1
                                        </td>

                                        {/* Day & Date */}
                                        <td className="py-4 px-3 border-r border-black text-center font-black text-slate-800 leading-snug">
                                          {formattedDate}
                                        </td>

                                        {/* Photo Documentation Multi-Image Panel */}
                                        <td className="p-3 border-r border-black bg-white w-[38%]">
                                          {renderDocumentPhotoGrid(currentPhotos, journal.photoTimestamps)}
                                        </td>

                                        {/* Description of Activities list with Justify align */}
                                        <td className="p-4 whitespace-pre-line text-xs font-medium text-slate-800 leading-relaxed text-justify" style={{ textAlign: "justify" }}>
                                          {currentDesc}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                {/* Signatures Section for Visual Preview */}
                                <div className="flex justify-between items-start mt-6 text-xs font-bold text-slate-800 px-4">
                                  <div className="text-center min-w-[200px]">
                                    <p>Mengetahui,<br />Kepala Sekolah</p>
                                    <div className="mt-12 font-bold">
                                      {teacherProfile?.headmasterName || "Dr. Hj. Yanti Suryanti, M.Pd."}
                                      <br />
                                      <span className="font-normal text-[11px] text-slate-500">NIP. {teacherProfile?.headmasterNip || "197005121995122001"}</span>
                                      {teacherProfile?.headmasterRank && (
                                        <>
                                          <br />
                                          <span className="font-normal text-[10px] text-slate-400">{teacherProfile.headmasterRank}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-center min-w-[200px]">
                                    <p>{teacherProfile?.documentCity || "Tasikmalaya"}, {formattedDate}<br />Guru Mata Pelajaran</p>
                                    <div className="mt-14 font-bold">
                                      {currentTeacher}
                                      <br />
                                      <span className="font-normal text-[11px] text-slate-500">NIP. {currentNip}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions (Edit and Delete) */}
                            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(journal)}
                                className="px-3 py-1.5 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                id={`btn-edit-journal-${journal.id}`}
                              >
                                <Edit3 size={12} /> Edit Jurnal ini
                              </button>
                              <button
                                onClick={() => onDeleteJournal(journal.id)}
                                className="px-3 py-1.5 hover:bg-rose-50 text-rose-500 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                id={`btn-delete-journal-${journal.id}`}
                              >
                                <Trash2 size={12} /> Hapus Entri Jurnal ini
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* WRITE MODE - EXTREMELY INTUITIVE COMPACT FORM MATCHING IMAGE FIELDS */
          <motion.div
            key="write-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto"
            id="jurnal-write-form-layout"
          >
            {/* Form Column - 8/12 width */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-1.5">
                    <FileText size={16} className="text-indigo-600" /> Lembar Pengisian Jurnal Mengajar
                  </h3>
                  <p className="text-slate-400 text-[11px] font-medium">Lengkapi input administrasi & deskripsi kegiatan</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase"
                >
                  <RotateCcw size={12} /> Muat Contoh Gambar
                </button>
              </div>

              {/* SECTION A: ADMIN DETAILS (MATCHES HEADER INFO IN THE IMAGE) */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  🏢 1. Informasi Administratif (Header Dokumen)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Nama Guru</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-slate-400" size={13} />
                      <input
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">NIP</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 text-slate-400" size={13} />
                      <input
                        type="text"
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Mata Pelajaran</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Bulan</label>
                      <input
                        type="text"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        placeholder="cth: JANUARI 2026"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Minggu Ke</label>
                      <input
                        type="text"
                        value={weekNum}
                        onChange={(e) => setWeekNum(e.target.value)}
                        placeholder="cth: 2"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: DATE, ROMBEL & GENERAL TOPIC */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  📅 2. Jadwal & Topik Pembelajaran
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Hari / Tanggal</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Kelas / Rombel (Bisa Pilih Banyak)</label>
                    <div 
                      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer flex items-center justify-between min-h-[34px]"
                    >
                      <span className="truncate">
                        {selectedClasses.length > 0 ? selectedClasses.join(" & ") : "Pilih Kelas..."}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isClassDropdownOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isClassDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 max-h-48 overflow-y-auto">
                        {(classList && classList.length > 0 ? classList : ["X-MIPA-1", "XI-MIPA-3", "XII-IPS-2", "XI D4", "XI C1"]).map((cls) => {
                          const isSelected = selectedClasses.includes(cls);
                          return (
                            <div
                              key={cls}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedClasses(selectedClasses.filter(c => c !== cls));
                                } else {
                                  setSelectedClasses([...selectedClasses, cls]);
                                  
                                  // Auto-fill description text
                                  setDescriptionText(prev => {
                                    const prefix = prev.trim() === "" ? "" : "\n\n";
                                    const numbering = selectedClasses.length + 1;
                                    const newText = `${prefix}${numbering}. Kelas ${cls}\n   - Berdoa Sebelum belajar\n   - Menyampaikan tujuan pembelajaran\n   - `;
                                    return prev + newText;
                                  });
                                }
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span>{cls}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected ? "✓" : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative" ref={topicDropdownRef}>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Topik Utama</label>
                    <div 
                      onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-slate-700 font-semibold cursor-pointer flex items-center justify-between min-h-[34px]"
                    >
                      <span className="truncate">
                        {selectedTopics.length > 0 ? selectedTopics.join(", ") : "Pilih Topik..."}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTopicDropdownOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isTopicDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 max-h-48 overflow-y-auto">
                        {["Kegiatan Pembelajaran", "Kegiatan Dinas Sekolah", "Kegiatan Luar Sekolah"].map((topicOption) => {
                          const isSelected = selectedTopics.includes(topicOption);
                          return (
                            <div
                              key={topicOption}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTopics(selectedTopics.filter(t => t !== topicOption));
                                } else {
                                  setSelectedTopics([...selectedTopics, topicOption]);
                                }
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isSelected ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span>{topicOption}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected ? "✓" : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION C: DIRECT ACTIVITY DESCRIPTION (IMAGE RIGHT COLUMN) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                  ✍ 3. Deskripsi Kegiatan Pembelajaran (Kolom Kanan Tabel)
                </label>
                <textarea
                  rows={8}
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  placeholder="Uraikan rincian kegiatan guru dan siswa, serta urutan kelas secara terstruktur..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-400 text-slate-700 leading-relaxed resize-y min-h-[180px]"
                />
              </div>

              {/* SECTION D: PHOTO DOCUMENTATION FIELD */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    📸 4. Panel Dokumentasi (2 - 6 Foto Kegiatan)
                  </h4>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{photos.length}/6 Foto Terpilih</span>
                </div>

                {/* Uploaded Photos Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col items-center space-y-2 shadow-xs">
                        <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          <img src={photo} className="w-full h-full object-cover" alt={`Dokumentasi ${idx + 1}`} />
                          <button 
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors cursor-pointer"
                            title="Hapus Foto"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Foto #{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Photo Dropzone (if less than 6) */}
                {photos.length < 6 && (
                  <label className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                    <ImageIcon className="text-indigo-400 mb-1" size={22} />
                    <span className="text-xs font-bold text-indigo-950">
                      {photos.length === 0 ? "Unggah Foto Kegiatan (2 - 6 Foto)" : "Tambah Foto Lainnya"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {photos.length === 0 ? "Anda dapat memilih 2 hingga 6 foto sekaligus." : `Tersisa ${6 - photos.length} slot foto.`}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* ACTION BOARD COLUMN - 4/12 width */}
            <div className="lg:col-span-4 space-y-6">
              {/* SAVE JOURNAL ACTION BOARD */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 sticky top-6">
                <div className="pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={15} className="text-indigo-600" /> Simpan Jurnal
                  </h4>
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-500 font-bold">{errorMsg}</p>
                )}

                <div className="flex items-center gap-2.5 text-xs text-slate-500 leading-normal">
                  <AlertCircle size={15} className="text-indigo-600 shrink-0" />
                  <span>Jurnal ini akan disimpan ke memori lokal dan dapat diekspor langsung ke dokumen PDF.</span>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveJournal}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer text-center"
                    id="btn-save-write-journal"
                  >
                    Simpan & Bukukan Jurnal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("view")}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Kembali ke Timeline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* EXPORT PREVIEW MODAL */}
      <AnimatePresence>
        {previewJournal && (() => {
          const formattedDate = formatIndonesianDate(previewJournal.date);
          const currentTeacher = previewJournal.teacherName || "YUDI GINANJAR";
          const currentNip = previewJournal.nip || "199605242024211008";
          const currentSubject = previewJournal.subject || "EKONOMI";
          const currentMonth = previewJournal.month || "JANUARI 2026";
          const currentWeek = previewJournal.weekNum || "2";
          const currentDesc = previewJournal.descriptionText || previewJournal.summary;
          const currentPhotos = previewJournal.photos || [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <FileText size={18} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">Pratinjau Dokumen Jurnal Harian</h3>
                      <p className="text-xs text-slate-500">Periksa tata letak dan isi dokumen sebelum diunduh ke PDF.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewJournal(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Scrollable Body (The Document Preview) */}
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
                  <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-2xl max-w-[1000px] w-full mx-auto text-black font-sans leading-relaxed">
                    {/* Sheet Title */}
                    <h2 className="text-center font-bold text-sm tracking-wide mb-6 text-black uppercase">
                      JURNAL DESKRIPSI DAN KEGIATAN BELAJAR MENGAJAR
                    </h2>

                    {/* Teacher info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 text-xs font-semibold mb-6 border-b border-black/10 pb-5">
                      <div className="space-y-1">
                        <div className="flex">
                          <span className="w-32 uppercase text-slate-500 font-bold">NAMA GURU</span>
                          <span className="text-black">: {currentTeacher}</span>
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
                      <div className="space-y-1 sm:col-start-2">
                        <div className="flex">
                          <span className="w-32 uppercase text-slate-500 font-bold">BULAN</span>
                          <span className="text-black">: {currentMonth}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 uppercase text-slate-500 font-bold">MINGGU KE</span>
                          <span className="text-black">: {currentWeek}</span>
                        </div>
                        <div className="flex">
                          <span className="w-32 uppercase text-slate-500 font-bold">KELAS</span>
                          <span className="text-black">: {previewJournal.className}</span>
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
                              1
                            </td>
                            <td className="py-4 px-3 border-r border-black text-center font-black text-black leading-snug">
                              {formattedDate}
                            </td>
                            <td className="p-3 border-r border-black bg-white w-[38%]">
                              {renderDocumentPhotoGrid(currentPhotos, previewJournal.photoTimestamps)}
                            </td>
                            <td className="p-4 whitespace-pre-line text-xs font-medium text-black leading-relaxed text-justify" style={{ textAlign: "justify" }}>
                              {currentDesc}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures Section for Modal Document Preview */}
                    <div className="flex justify-between items-start mt-6 text-xs font-bold text-black px-4">
                      <div className="text-center min-w-[200px]">
                        <p>Mengetahui,<br />Kepala Sekolah</p>
                        <div className="mt-12 font-bold">
                          {teacherProfile?.headmasterName || "Dr. Hj. Yanti Suryanti, M.Pd."}
                          <br />
                          <span className="font-normal text-[11px] text-slate-600">NIP. {teacherProfile?.headmasterNip || "197005121995122001"}</span>
                          {teacherProfile?.headmasterRank && (
                            <>
                              <br />
                              <span className="font-normal text-[10px] text-slate-500">{teacherProfile.headmasterRank}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-center min-w-[200px]">
                        <p>{teacherProfile?.documentCity || "Tasikmalaya"}, {formattedDate}<br />Guru Mata Pelajaran</p>
                        <div className="mt-14 font-bold">
                          {currentTeacher}
                          <br />
                          <span className="font-normal text-[11px] text-slate-600">NIP. {currentNip}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
                  <button
                    onClick={() => setPreviewJournal(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      const journalToExport = previewJournal;
                      setPreviewJournal(null);
                      if (journalToExport) {
                        handleExportPDF(journalToExport);
                      }
                    }}
                    disabled={exportingId === previewJournal.id}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    {exportingId === previewJournal.id ? "Memproses PDF..." : "Konfirmasi & Unduh PDF"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
