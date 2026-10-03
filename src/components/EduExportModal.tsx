import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Download, Printer, Copy, Check, FileText, Settings, 
  Sparkles, CheckCircle, School, Eye, RefreshCw, HelpCircle, FileCheck,
  Image as ImageIcon, Upload, Link as LinkIcon, Trash2, Building2, Info, CheckCircle2,
  Layers, BookOpen, Save, Cloud, ExternalLink, FileSignature
} from "lucide-react";
import { 
  exportToWordFormatted, 
  printDocumentFormatted, 
  copyFormattedRichText, 
  detectDocumentMetadata,
  cleanIntroPreamble,
  stripSignatureBlock,
  extractQuestionsOnlyText,
  extractAnswersOnlyText,
  generateWordDocumentBlob,
  optimizeHtmlTableWidths,
  injectTteIntoExistingTables,
  ExportOptions,
  DocMetadata
} from "../lib/documentExporter";
import { 
  getGeometricHeaderSvg, 
  getGeometricFooterSvg, 
  BUILDING_SILHOUETTE_SVG, 
  JANG_GURU_LOGO_SVG 
} from "../lib/documentTemplateAssets";
import { formatDriveImageUrl } from "../lib/driveUtils";
import { compressImage } from "../lib/imageUtils";
import { useDriveDatabase } from "../context/DriveSyncContext";
import { saveDocumentToDriveFolder } from "../lib/googleDriveDb";
import TteSignatureModal from "./TteSignatureModal";

interface EduExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawContentHtml: string;
  userProfile?: {
    namaSekolah?: string;
    namaPenyusun?: string;
    nipPenyusun?: string;
    namaKepsek?: string;
    nipKepsek?: string;
    kopType?: 'text' | 'image';
    kopImageUrl?: string;
    tahunPelajaran?: string;
    alamatSekolah?: string;
    kontakSekolah?: string;
  };
  onUpdateProfile?: (profile: any) => void;
  docTypeHint?: string;
  initialTitle?: string;
}

export default function EduExportModal({
  isOpen,
  onClose,
  rawContentHtml,
  userProfile,
  onUpdateProfile,
  docTypeHint,
  initialTitle
}: EduExportModalProps) {
  const [metadata, setMetadata] = useState<DocMetadata>({ title: "Dokumen Administrasi" });
  const [previewView, setPreviewView] = useState<"all" | "cover" | "document">("all");
  const [savedToast, setSavedToast] = useState(false);
  
  // Initialize options with localStorage or userProfile fallbacks
  const [options, setOptions] = useState<ExportOptions>(() => {
    const savedKopType = (localStorage.getItem("eduasisten_kop_type") as "text" | "image") || (localStorage.getItem("guru_kop_type") === "image" ? "image" : "text") || userProfile?.kopType || "text";
    const savedKopImage = localStorage.getItem("eduasisten_kop_image") || localStorage.getItem("guru_kop_image") || userProfile?.kopImageUrl || "";
    const savedTeacherTteImage = localStorage.getItem("eduasisten_teacher_tte_image") || localStorage.getItem("guru_tte_image") || (userProfile as any)?.teacherTteImageUrl || "";
    const savedPrincipalTteImage = localStorage.getItem("eduasisten_principal_tte_image") || localStorage.getItem("guru_headmaster_tte_image") || (userProfile as any)?.headmasterTteImageUrl || "";
    const savedUseTeacherTte = localStorage.getItem("eduasisten_use_teacher_tte") === "true" || (!!savedTeacherTteImage && localStorage.getItem("eduasisten_use_teacher_tte") !== "false");
    const savedUsePrincipalTte = localStorage.getItem("eduasisten_use_principal_tte") === "true" || (!!savedPrincipalTteImage && localStorage.getItem("eduasisten_use_principal_tte") !== "false");

    const initAddress = userProfile?.alamatSekolah 
      ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` 
      : "Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id";
    const initYear = userProfile?.tahunPelajaran || "2024/2025";
    const initSchool = userProfile?.namaSekolah || "SMAN 1 INDONESIA";
    const initTeacher = userProfile?.namaPenyusun || "Guru Mata Pelajaran";
    const initNip = userProfile?.nipPenyusun || "-";
    
    return {
      paperSize: "A4",
      fontFamily: "Calibri",
      includeKop: false, // Default Tanpa Kop (Opsional)
      kopType: savedKopType,
      customKopImageUrl: savedKopImage,
      includeSignature: false, // Default Tanpa TTD (Opsional)
      exportMode: "full",
      includeCover: true, // Default PAKAI COVER (Gambar 1)
      includeGeometricFrame: true, // Default PAKAI FRAME HEADER & FOOTER (Gambar 2)
      coverTitle: "",
      coverSubtitle: "",
      coverAuthor: initTeacher,
      coverNip: initNip,
      coverSchool: initSchool,
      coverAddress: initAddress,
      coverYear: initYear,
      coverBrandText: "Jang Guru Super App",
      customSchoolName: initSchool,
      customSchoolSubheader: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
      customSchoolAddress: initAddress,
      customTeacherName: initTeacher,
      customTeacherNip: initNip,
      customPrincipalName: userProfile?.namaKepsek || "Kepala Sekolah",
      customPrincipalNip: userProfile?.nipKepsek || "-",
      customCity: "Jakarta",
      useTeacherTte: savedUseTeacherTte,
      teacherTteImageUrl: savedTeacherTteImage,
      usePrincipalTte: savedUsePrincipalTte,
      principalTteImageUrl: savedPrincipalTteImage
    };
  });

  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isTteModalOpen, setIsTteModalOpen] = useState(false);
  const [tteTargetRole, setTteTargetRole] = useState<"guru" | "kepsek">("guru");

  // Sync Kop Surat & TTE preferences to localStorage whenever changed
  useEffect(() => {
    if (options.kopType) {
      localStorage.setItem("eduasisten_kop_type", options.kopType);
    }
    if (options.customKopImageUrl !== undefined) {
      localStorage.setItem("eduasisten_kop_image", options.customKopImageUrl);
    }
    if (options.useTeacherTte !== undefined) {
      localStorage.setItem("eduasisten_use_teacher_tte", options.useTeacherTte ? "true" : "false");
    }
    if (options.teacherTteImageUrl !== undefined) {
      localStorage.setItem("eduasisten_teacher_tte_image", options.teacherTteImageUrl);
      if (options.teacherTteImageUrl) {
        localStorage.setItem("guru_tte_image", options.teacherTteImageUrl);
      }
    }
    if (options.usePrincipalTte !== undefined) {
      localStorage.setItem("eduasisten_use_principal_tte", options.usePrincipalTte ? "true" : "false");
    }
    if (options.principalTteImageUrl !== undefined) {
      localStorage.setItem("eduasisten_principal_tte_image", options.principalTteImageUrl);
      if (options.principalTteImageUrl) {
        localStorage.setItem("guru_headmaster_tte_image", options.principalTteImageUrl);
      }
    }
  }, [
    options.kopType, 
    options.customKopImageUrl, 
    options.useTeacherTte, 
    options.teacherTteImageUrl, 
    options.usePrincipalTte, 
    options.principalTteImageUrl
  ]);

  // Handle uploading Kop Surat image file
  const handleKopImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingImage(true);
      const compressed = await compressImage(file, 1600, 0.85);
      setOptions(prev => ({
        ...prev,
        kopType: "image",
        customKopImageUrl: compressed
      }));
    } catch (err) {
      console.error("Gagal memproses gambar Kop Surat:", err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Filter content for preview based on exportMode
  const previewHtml = useMemo(() => {
    if (!rawContentHtml) return "";
    let cleanContent = cleanIntroPreamble(rawContentHtml);
    if (!options.includeSignature) {
      cleanContent = stripSignatureBlock(cleanContent);
    } else {
      cleanContent = injectTteIntoExistingTables(cleanContent, options);
    }
    if (options.exportMode === "questions_only") {
      cleanContent = extractQuestionsOnlyText(cleanContent);
    } else if (options.exportMode === "answers_only") {
      cleanContent = extractAnswersOnlyText(cleanContent);
    }
    return optimizeHtmlTableWidths(cleanContent);
  }, [
    rawContentHtml, 
    options.exportMode, 
    options.includeSignature, 
    options.useTeacherTte, 
    options.teacherTteImageUrl, 
    options.usePrincipalTte, 
    options.principalTteImageUrl
  ]);

  useEffect(() => {
    if (isOpen && rawContentHtml) {
      const meta = detectDocumentMetadata(rawContentHtml, userProfile, { docType: docTypeHint, title: initialTitle });
      setMetadata(meta);

      let resolvedCoverTitle = meta.title || "";
      if (initialTitle && initialTitle.trim()) {
        resolvedCoverTitle = initialTitle.trim();
      } else if (!resolvedCoverTitle || resolvedCoverTitle === 'Dokumen Administrasi Pembelajaran') {
        if (meta.docType === 'lkpd' || docTypeHint === 'lkpd') {
          resolvedCoverTitle = "LEMBAR KERJA PESERTA DIDIK (LKPD)";
        } else if (meta.docType === 'modul' || docTypeHint === 'modul') {
          resolvedCoverTitle = "MODUL AJAR DEEP LEARNING";
        } else if (meta.docType === 'soal' || docTypeHint === 'soal') {
          resolvedCoverTitle = "NASKAH SOAL EVALUASI PEMBELAJARAN";
        } else if (meta.docType === 'pembahasan' || docTypeHint === 'pembahasan') {
          resolvedCoverTitle = "PEMBAHASAN SOAL & KUNCI JAWABAN";
        } else if (meta.docType === 'prota' || docTypeHint === 'prota') {
          resolvedCoverTitle = "PROGRAM TAHUNAN & PROGRAM SEMESTER";
        } else if (meta.docType === 'atp' || docTypeHint === 'atp') {
          resolvedCoverTitle = "ANALISIS CP & ALUR TUJUAN PEMBELAJARAN (ATP)";
        } else if (meta.docType === 'rubrik' || docTypeHint === 'rubrik') {
          resolvedCoverTitle = "RUBRIK PENILAIAN PEMBELAJARAN";
        } else if (meta.docType === 'penilaian' || docTypeHint === 'penilaian') {
          resolvedCoverTitle = "LAPORAN HASIL PENILAIAN SISWA";
        } else {
          resolvedCoverTitle = "DOKUMEN ADMINISTRASI PEMBELAJARAN";
        }
      }

      const computedSubtitle = [
        meta.subject ? `Mata Pelajaran: ${meta.subject}` : '',
        meta.grade ? `Fase / Kelas: ${meta.grade}` : '',
        userProfile?.tahunPelajaran ? `Tahun Pelajaran: ${userProfile.tahunPelajaran}` : (meta.academicYear ? `Tahun Pelajaran: ${meta.academicYear}` : ''),
        meta.topic ? `Topik: ${meta.topic}` : ''
      ].filter(Boolean).join('\n') || "Perangkat Administrasi Kurikulum Merdeka";

      const finalAddress = userProfile?.alamatSekolah 
        ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}`
        : (meta.schoolAddress ? `${meta.schoolAddress}${meta.schoolContact ? ' • ' + meta.schoolContact : ''}` : "Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id");

      const finalYear = userProfile?.tahunPelajaran || meta.academicYear || "2024/2025";
      const finalSchool = userProfile?.namaSekolah || meta.schoolName || "SMAN 1 INDONESIA";
      const finalTeacher = userProfile?.namaPenyusun || meta.teacherName || "Guru Mata Pelajaran";
      const finalNip = userProfile?.nipPenyusun || meta.teacherNip || "-";
      const finalPrincipal = userProfile?.namaKepsek || meta.principalName || "Kepala Sekolah";
      const finalPrincipalNip = userProfile?.nipKepsek || meta.principalNip || "-";

      setOptions(prev => ({
        ...prev,
        customSchoolName: finalSchool,
        customTeacherName: finalTeacher,
        customTeacherNip: finalNip,
        customPrincipalName: finalPrincipal,
        customPrincipalNip: finalPrincipalNip,
        customSchoolAddress: finalAddress,
        coverTitle: resolvedCoverTitle,
        coverSubtitle: computedSubtitle,
        coverAuthor: finalTeacher,
        coverNip: finalNip,
        coverSchool: finalSchool,
        coverAddress: finalAddress,
        coverYear: finalYear
      }));
    }
  }, [rawContentHtml, userProfile, isOpen, docTypeHint, initialTitle]);

  // Handler to sync options back to userProfile and safeStorage
  const handleSaveToProfile = () => {
    const updatedProfile = {
      ...(userProfile || {}),
      namaSekolah: options.coverSchool || options.customSchoolName || userProfile?.namaSekolah || "",
      namaPenyusun: options.coverAuthor || options.customTeacherName || userProfile?.namaPenyusun || "",
      nipPenyusun: options.coverNip || options.customTeacherNip || userProfile?.nipPenyusun || "",
      namaKepsek: options.customPrincipalName || userProfile?.namaKepsek || "",
      nipKepsek: options.customPrincipalNip || userProfile?.nipKepsek || "",
      tahunPelajaran: options.coverYear || userProfile?.tahunPelajaran || "2024/2025",
      alamatSekolah: options.coverAddress || options.customSchoolAddress || userProfile?.alamatSekolah || "",
      kopType: options.kopType,
      kopImageUrl: options.customKopImageUrl
    };
    
    try {
      localStorage.setItem("eduasisten_profile", JSON.stringify(updatedProfile));
      if (onUpdateProfile) {
        onUpdateProfile(updatedProfile);
      }
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (e) {
      console.error("Gagal menyimpan profil:", e);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSavedLink, setDriveSavedLink] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const { isConnected, accessToken, connectGoogleDrive } = useDriveDatabase();

  if (!isOpen) return null;

  const handleSaveToGoogleDrive = async () => {
    if (!isConnected || !accessToken) {
      connectGoogleDrive();
      return;
    }

    try {
      setIsSavingToDrive(true);
      setDriveError(null);
      setDriveSavedLink(null);

      // Generate the doc blob
      const { blob, filename } = await generateWordDocumentBlob(rawContentHtml, options, userProfile);
      
      // Determine subfolder based on document title
      let subfolder = "01_Modul_Ajar_Deep_Learning";
      const titleLower = (options.coverTitle || "").toLowerCase();
      if (titleLower.includes("soal") || titleLower.includes("asesmen")) {
        subfolder = "02_Naskah_dan_Pembahasan_Soal";
      } else if (titleLower.includes("rubrik")) {
        subfolder = "03_Rubrik_dan_Penilaian";
      }

      const result = await saveDocumentToDriveFolder(accessToken, filename, blob, subfolder);
      setDriveSavedLink(result.webViewLink || "saved");
      setTimeout(() => {
        if (!result.webViewLink) setDriveSavedLink(null);
      }, 4000);
    } catch (err: any) {
      console.error("Gagal simpan ke Drive:", err);
      setDriveError(err.message || "Gagal menyimpan ke Google Drive");
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsExporting(true);
      await exportToWordFormatted(rawContentHtml, options, userProfile);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    printDocumentFormatted(rawContentHtml, options, userProfile);
  };

  const handleCopyRichText = async () => {
    const success = await copyFormattedRichText(rawContentHtml, options, userProfile);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Check if content contains questions
  const hasQuestions = /soal|kunci|pembahasan|pilihan ganda|rubrik/i.test(rawContentHtml);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
                <FileText size={22} className="text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold font-display">Ekspor & Cetak Rapi Dokumen</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-indigo-950">
                    Siap Pakai
                  </span>
                </div>
                <p className="text-xs text-indigo-100 opacity-90 line-clamp-1">
                  {metadata.title} ({options.paperSize} • {options.fontFamily})
                </p>
              </div>
            </div>

            {/* Top Toolbar Tabs & Close */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex bg-black/20 p-1 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "preview" 
                      ? "bg-white text-indigo-900 shadow-xs" 
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Eye size={14} />
                  <span>Preview Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === "settings" 
                      ? "bg-white text-indigo-900 shadow-xs" 
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Settings size={14} />
                  <span>Pengaturan Kop & Kertas</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors text-white"
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick Format Options Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Left: Paper & Font Quick Selectors */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Export Mode / Filter Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-indigo-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="font-extrabold text-indigo-700 text-[11px] flex items-center gap-1">
                  <FileCheck size={13} className="text-indigo-600" /> Mode Isi:
                </span>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, exportMode: "full" })}
                  className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] transition-colors ${
                    options.exportMode === "full" || !options.exportMode
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Unduh seluruh dokumen lengkap dengan pembahasan & rubrik"
                >
                  Semua Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, exportMode: "questions_only", includeSignature: false })}
                  className={`px-2.5 py-0.5 rounded-md font-extrabold text-[11px] transition-colors flex items-center gap-1 ${
                    options.exportMode === "questions_only"
                      ? "bg-amber-600 text-white shadow-2xs"
                      : "text-amber-800 hover:bg-amber-50"
                  }`}
                  title="Hanya lembar naskah soal untuk dibagikan ke siswa (tanpa kunci & pembahasan)"
                >
                  <HelpCircle size={12} />
                  <span>Hanya Soal (Siswa)</span>
                </button>
                {hasQuestions && (
                  <button
                    type="button"
                    onClick={() => setOptions({ ...options, exportMode: "answers_only" })}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                      options.exportMode === "answers_only"
                        ? "bg-indigo-600 text-white font-extrabold shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                    title="Hanya kunci jawaban dan pembahasan untuk pegangan guru"
                  >
                    Kunci & Pembahasan
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="font-bold text-slate-500 text-[11px]">Kertas:</span>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, paperSize: "A4" })}
                  className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] transition-colors ${
                    options.paperSize === "A4"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, paperSize: "F4" })}
                  className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] transition-colors ${
                    options.paperSize === "F4"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  F4 / Folio
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="font-bold text-slate-500 text-[11px]">Font:</span>
                {(["Calibri", "Times New Roman", "Arial"] as const).map(font => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setOptions({ ...options, fontFamily: font })}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                      options.fontFamily === font
                        ? "bg-indigo-600 text-white font-extrabold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {font === "Times New Roman" ? "Times" : font}
                  </button>
                ))}
              </div>

              <label className={`flex items-center gap-1.5 cursor-pointer select-none border px-2.5 py-1 rounded-xl shadow-2xs transition-colors ${
                options.includeCover ? "bg-cyan-50 border-cyan-300 text-cyan-950 font-extrabold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
                <input
                  type="checkbox"
                  checked={options.includeCover}
                  onChange={(e) => setOptions({ ...options, includeCover: e.target.checked })}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-[11px]">Cover Modern (Gbr 1)</span>
              </label>

              <label 
                className={`flex items-center gap-1.5 cursor-pointer select-none border px-2.5 py-1 rounded-xl shadow-2xs transition-colors ${
                  options.includeGeometricFrame ? "bg-amber-50 border-amber-300 text-amber-950 font-extrabold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                title="Header & Footer geometris diterapkan pada halaman dokumen setelah cover"
              >
                <input
                  type="checkbox"
                  checked={options.includeGeometricFrame}
                  onChange={(e) => setOptions({ ...options, includeGeometricFrame: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px]">Header & Footer Dokumen (Gbr 2)</span>
              </label>

              <label className={`flex items-center gap-1.5 cursor-pointer select-none border px-2.5 py-1 rounded-xl shadow-2xs transition-colors ${
                options.includeKop ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
                <input
                  type="checkbox"
                  checked={options.includeKop}
                  onChange={(e) => setOptions({ ...options, includeKop: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-[11px]">Kop Surat {options.includeKop ? "(Aktif)" : "(Opsional)"}</span>
              </label>

              <label className={`flex items-center gap-1.5 cursor-pointer select-none border px-2.5 py-1 rounded-xl shadow-2xs transition-colors ${
                options.includeSignature ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
                <input
                  type="checkbox"
                  checked={options.includeSignature}
                  onChange={(e) => setOptions({ ...options, includeSignature: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-[11px]">TTD Pengesahan {options.includeSignature ? "(Aktif)" : "(Opsional)"}</span>
              </label>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex sm:hidden w-full justify-between items-center pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`py-1 px-3 rounded-lg font-bold text-xs ${activeTab === "preview" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                👁️ Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`py-1 px-3 rounded-lg font-bold text-xs ${activeTab === "settings" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                ⚙️ Pengaturan Kop & TTD
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-100">
            {activeTab === "preview" ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
                {/* Page View Selector Toolbar */}
                <div className="flex items-center justify-between gap-3 mb-4 max-w-[800px] w-full px-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-600">Tampilan Pratinjau:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewView("all")}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                        previewView === "all" 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      <Layers size={13} />
                      <span>Semua Halaman</span>
                    </button>
                    {options.includeCover && (
                      <button
                        type="button"
                        onClick={() => setPreviewView("cover")}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                          previewView === "cover" 
                            ? "bg-cyan-700 text-white shadow-xs" 
                            : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        <BookOpen size={13} />
                        <span>Cover (Gambar 1)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewView("document")}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                        previewView === "document" 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      <FileText size={13} />
                      <span>Dokumen setelah Cover (Gambar 2)</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 hidden md:block">
                    {options.includeCover ? "✓ Cover Aktif" : "✕ Cover Nonaktif"} • {options.includeGeometricFrame ? "✓ Frame Aktif" : "✕ Frame Nonaktif"}
                  </div>
                </div>

                {/* --- HALAMAN COVER (GAMBAR 1) --- */}
                {options.includeCover && (previewView === "all" || previewView === "cover") && (
                  <div 
                    className="w-full max-w-[800px] min-h-[920px] rounded-lg shadow-2xl relative overflow-hidden flex flex-col justify-between mb-8 border border-cyan-900/40 text-white"
                    style={{
                      background: "linear-gradient(135deg, #022b42 0%, #00567a 45%, #00768c 100%)",
                      fontFamily: options.fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' :
                                  options.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' :
                                  'Calibri, "Segoe UI", Arial, sans-serif'
                    }}
                  >
                    {/* Top Branding Bar */}
                    <div className="p-8 md:p-10 flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 shrink-0 drop-shadow-md"
                          dangerouslySetInnerHTML={{ __html: JANG_GURU_LOGO_SVG }}
                        />
                        <div>
                          <h2 className="text-base font-black tracking-wide text-white drop-shadow-sm uppercase">
                            {options.coverBrandText || "Jang Guru Super App"}
                          </h2>
                          <p className="text-[10px] font-semibold text-cyan-200 tracking-wider uppercase">
                            Sistem Administrasi Kurikulum Merdeka
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-amber-300 flex items-center gap-1.5 shadow-sm">
                        <span>★</span>
                        <span>KURIKULUM MERDEKA</span>
                      </div>
                    </div>

                    {/* Middle Section: Document Title & Metadata Badges */}
                    <div className="px-8 md:px-12 py-6 z-10 my-auto">
                      <div className="inline-block px-3 py-1 rounded-md bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 text-xs font-black uppercase tracking-wider mb-4">
                        DOKUMEN RESMI PEMBELAJARAN
                      </div>

                      <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-lg mb-4 break-words text-balance max-w-[95%]">
                        {options.coverTitle || metadata.title || "MODUL AJAR DEEP LEARNING"}
                      </h1>

                      {/* Golden Accent Line */}
                      <div className="flex items-center gap-2 mb-6">
                        <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-200 w-24 rounded-full" />
                        <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 rounded-2xs" />
                        <div className="h-0.5 bg-cyan-400/40 w-16 rounded-full" />
                      </div>

                      {/* Subtitle / Metadata Panel */}
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 mb-8 max-w-xl shadow-lg">
                        <p className="text-xs md:text-sm font-semibold text-cyan-100 leading-relaxed break-words text-pretty whitespace-pre-wrap">
                          {options.coverSubtitle || "Perangkat Administrasi Kurikulum Merdeka Terintegrasi"}
                        </p>
                      </div>

                      {/* Author / Teacher Identity Box */}
                      <div className="bg-cyan-950/70 backdrop-blur-md border border-cyan-700/50 rounded-2xl p-5 max-w-md shadow-lg">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-1">
                          Disusun Oleh:
                        </span>
                        <h3 className="text-base font-bold text-white mb-0.5">
                          {options.coverAuthor || options.customTeacherName || "Guru Mata Pelajaran"}
                        </h3>
                        <p className="text-xs font-mono text-cyan-200 mb-2">
                          NIP. {options.coverNip || options.customTeacherNip || "-"}
                        </p>
                        <div className="pt-2 border-t border-cyan-800/60 flex items-center gap-1.5 text-xs font-semibold text-cyan-100">
                          <School size={13} className="text-amber-400 shrink-0" />
                          <span>{options.coverSchool || options.customSchoolName || "SMAN 1 INDONESIA"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Architectural Silhouette & Deep Navy Footer Bar */}
                    <div className="w-full relative mt-auto">
                      {/* Stylized Architectural Skyline Graphic */}
                      <div 
                        className="w-full text-cyan-200/20"
                        dangerouslySetInnerHTML={{ __html: BUILDING_SILHOUETTE_SVG }}
                      />

                      {/* Deep Navy Footer Bar */}
                      <div className="bg-[#021827] px-8 py-4 border-t border-cyan-800/40 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
                        <div className="text-cyan-300/90 text-[11px] font-medium max-w-md">
                          {options.coverAddress || (userProfile?.alamatSekolah ? `${userProfile.alamatSekolah}${userProfile.kontakSekolah ? ' • ' + userProfile.kontakSekolah : ''}` : "Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id")}
                        </div>
                        <div className="bg-cyan-900/60 border border-cyan-700/50 px-3 py-1 rounded-lg text-amber-300 font-mono font-bold text-[11px]">
                          Tahun Pelajaran {options.coverYear || userProfile?.tahunPelajaran || "2024/2025"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- HALAMAN DOKUMEN & BINGKAI (GAMBAR 2) --- */}
                {(previewView === "all" || previewView === "document") && (
                  <div className="w-full max-w-[800px] flex flex-col gap-2">
                    {previewView === "all" && (
                      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-200/80 border border-slate-300 rounded-lg text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-600" />
                          Halaman Dokumen Pembelajaran (Setelah Cover)
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {options.includeGeometricFrame ? "Header & Footer Gambar 2 Aktif" : "Tanpa Header & Footer"}
                        </span>
                      </div>
                    )}

                    <div 
                      className="bg-white text-slate-900 shadow-2xl border border-slate-300/80 rounded-lg overflow-hidden transition-all w-full min-h-[900px] flex flex-col justify-between"
                      style={{
                        fontFamily: options.fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' :
                                    options.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' :
                                    'Calibri, "Segoe UI", Arial, sans-serif'
                      }}
                    >
                      {/* Top Geometric Header (Gambar 2) - At the top of document after cover */}
                      {options.includeGeometricFrame && (
                        <div 
                          className="w-full overflow-hidden shrink-0"
                          dangerouslySetInnerHTML={{ __html: getGeometricHeaderSvg(800, 95) }}
                        />
                      )}

                      {/* Main Inner Document Content */}
                      <div className="p-8 md:p-12 flex-1">
                        {/* Kop Surat in Preview */}
                        {options.includeKop && (
                          options.kopType === "image" && options.customKopImageUrl ? (
                            <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 text-center">
                              <img 
                                src={formatDriveImageUrl(options.customKopImageUrl)} 
                                alt="Kop Surat Digital" 
                                className="max-h-36 max-w-full mx-auto object-contain" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 flex items-center justify-between gap-4">
                              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-xs">
                                ★
                              </div>
                              <div className="text-center flex-1">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  {options.customSchoolSubheader || "DINAS PENDIDIKAN DAN KEBUDAYAAN"}
                                </p>
                                <h2 className="text-base md:text-lg font-extrabold text-slate-900 uppercase tracking-wide my-0.5">
                                  {options.customSchoolName || "SMAN 1 INDONESIA"}
                                </h2>
                                <p className="text-[11px] text-slate-500 italic">
                                  {options.customSchoolAddress || "Jl. Pendidikan Nasional No. 1 - Kurikulum Merdeka"}
                                </p>
                              </div>
                              <div className="w-14 h-14 rounded-full border-2 border-blue-600 text-blue-700 flex items-center justify-center font-bold text-[9px] text-center p-1 shrink-0 uppercase">
                                Kurikulum Merdeka
                              </div>
                            </div>
                          )
                        )}

                        {/* Main Rendered Document Content */}
                        <style>{`
                          .doc-preview-content .page-landscape {
                            background-color: #f8fafc;
                            border: 1.5px dashed #94a3b8;
                            border-radius: 10px;
                            padding: 16px 12px;
                            margin: 20px 0;
                            overflow-x: auto;
                            box-shadow: inset 0 2px 6px rgba(0,0,0,0.03);
                          }
                          .doc-preview-content .page-landscape table {
                            min-width: 680px;
                            font-size: 11px;
                          }
                          .doc-preview-content table {
                            width: 100%;
                            border-collapse: collapse;
                          }
                        `}</style>
                        <div 
                          className="doc-preview-content prose prose-slate max-w-none text-xs md:text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />

                        {/* Signature block in preview */}
                        {options.includeSignature && (
                          <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs gap-4">
                            <div className="flex flex-col items-center">
                              <p className="text-slate-600">Mengetahui,</p>
                              <p className="font-bold text-slate-900">Kepala Sekolah</p>
                              {options.usePrincipalTte && options.principalTteImageUrl?.trim() ? (
                                <div className="h-16 my-1.5 flex items-center justify-center">
                                  <img 
                                    src={formatDriveImageUrl(options.principalTteImageUrl.trim())} 
                                    alt="TTE Kepala Sekolah" 
                                    className="max-h-14 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="h-14 my-1.5 flex items-center justify-center">
                                  <span className="text-[10px] text-slate-400 italic">(Ruang TTD Manual)</span>
                                </div>
                              )}
                              <p className="font-bold text-slate-900 underline">{options.customPrincipalName || "Kepala Sekolah"}</p>
                              <p className="text-slate-500 text-[11px]">NIP. {options.customPrincipalNip || "-"}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setTteTargetRole("kepsek");
                                  setIsTteModalOpen(true);
                                }}
                                className="mt-1.5 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Atur Gambar Tanda Tangan Elektronik Kepala Sekolah"
                              >
                                <FileSignature size={11} /> {options.usePrincipalTte && options.principalTteImageUrl ? "Ubah TTE Kepsek" : "+ Opsi TTE Kepsek"}
                              </button>
                            </div>

                            <div className="flex flex-col items-center">
                              <p className="text-slate-600">{options.customCity || "Jakarta"}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="font-bold text-slate-900">Guru Mata Pelajaran</p>
                              {options.useTeacherTte && options.teacherTteImageUrl?.trim() ? (
                                <div className="h-16 my-1.5 flex items-center justify-center">
                                  <img 
                                    src={formatDriveImageUrl(options.teacherTteImageUrl.trim())} 
                                    alt="TTE Guru Mata Pelajaran" 
                                    className="max-h-14 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="h-14 my-1.5 flex items-center justify-center">
                                  <span className="text-[10px] text-slate-400 italic">(Ruang TTD Manual)</span>
                                </div>
                              )}
                              <p className="font-bold text-slate-900 underline">{options.customTeacherName || "Guru Mata Pelajaran"}</p>
                              <p className="text-slate-500 text-[11px]">NIP. {options.customTeacherNip || "-"}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setTteTargetRole("guru");
                                  setIsTteModalOpen(true);
                                }}
                                className="mt-1.5 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg border border-indigo-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Atur Gambar Tanda Tangan Elektronik Guru"
                              >
                                <FileSignature size={11} /> {options.useTeacherTte && options.teacherTteImageUrl ? "Ubah TTE Guru" : "+ Opsi TTE Guru"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Geometric Footer (Gambar 2) - At the bottom of document after cover */}
                      {options.includeGeometricFrame && (
                        <div 
                          className="w-full overflow-hidden shrink-0 mt-auto"
                          dangerouslySetInnerHTML={{ __html: getGeometricFooterSvg(800, 95) }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Settings Tab */
              <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-slate-50">
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 w-full max-w-2xl space-y-6">
                  {/* Modern Cover Page Customizer Section (Gambar 1) */}
                  <div className="p-5 bg-gradient-to-br from-cyan-900 via-sky-900 to-blue-950 rounded-2xl text-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold flex items-center gap-2 text-cyan-200">
                        <BookOpen size={17} className="text-amber-300" />
                        Desain Halaman Cover (Referensi Gambar 1)
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold bg-white/15 px-3 py-1 rounded-full border border-white/20">
                        <input
                          type="checkbox"
                          checked={options.includeCover}
                          onChange={(e) => setOptions({ ...options, includeCover: e.target.checked })}
                          className="rounded text-cyan-500 focus:ring-cyan-400"
                        />
                        <span>{options.includeCover ? "Cover Aktif" : "Nonaktifkan Cover"}</span>
                      </label>
                    </div>
                    <p className="text-xs text-cyan-100/90 leading-relaxed">
                      Cover didesain dengan gradien teal-biru, siluet arsitektural modern, branding Jang Guru Super App, dan identitas modul lengkap.
                    </p>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Judul Dokumen di Cover</label>
                        <input
                          type="text"
                          value={options.coverTitle || ""}
                          onChange={(e) => setOptions({ ...options, coverTitle: e.target.value })}
                          placeholder="MODUL AJAR DEEP LEARNING"
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-cyan-200/50 focus:bg-white/20"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Subjudul / Mata Pelajaran & Topik</label>
                        <textarea
                          value={options.coverSubtitle || ""}
                          onChange={(e) => setOptions({ ...options, coverSubtitle: e.target.value })}
                          placeholder="Mata Pelajaran: Geografi&#10;Fase / Kelas: Fase E / X&#10;Topik: Fenomena Geosfer"
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white placeholder-cyan-200/50 focus:bg-white/20 min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Nama Penulis / Guru</label>
                          <input
                            type="text"
                            value={options.coverAuthor || ""}
                            onChange={(e) => setOptions({ ...options, coverAuthor: e.target.value })}
                            placeholder="Nama Guru Penyusun"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-cyan-200/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">NIP Penulis</label>
                          <input
                            type="text"
                            value={options.coverNip || ""}
                            onChange={(e) => setOptions({ ...options, coverNip: e.target.value })}
                            placeholder="NIP Guru Penyusun"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-cyan-200/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Nama Satuan Pendidikan / Sekolah</label>
                          <input
                            type="text"
                            value={options.coverSchool || ""}
                            onChange={(e) => setOptions({ ...options, coverSchool: e.target.value })}
                            placeholder="SMA NEGERI 1 INDONESIA"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-cyan-200/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Tahun Pelajaran</label>
                          <input
                            type="text"
                            value={options.coverYear || ""}
                            onChange={(e) => setOptions({ ...options, coverYear: e.target.value })}
                            placeholder="2025/2026"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-cyan-200/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">Alamat & Kontak Footer Cover</label>
                        <input
                          type="text"
                          value={options.coverAddress || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOptions({ 
                              ...options, 
                              coverAddress: val,
                              customSchoolAddress: val 
                            });
                          }}
                          placeholder="Jl. Pendidikan Nasional No. 1 • Telp: (021) 123456 • info@sekolah.sch.id"
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-cyan-200/50"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-cyan-200/80">
                          {savedToast ? "✅ Tersimpan ke Profil Default!" : "Perubahan dapat disimpan permanen ke profil akun:"}
                        </span>
                        <button
                          type="button"
                          onClick={handleSaveToProfile}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                        >
                          <Save size={13} />
                          <span>Simpan ke Profil</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Geometric Frame Toggle (Gambar 2) */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                        <Layers size={15} className="text-amber-600" />
                        Header & Footer Dokumen setelah Cover (Referensi Gambar 2)
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Menempatkan Header di bagian atas dan Footer di bagian bawah halaman dokumen (setelah cover), dengan aksen geometris biru dongker, garis diagonal kuning emas, dan pola dot matrix.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={options.includeGeometricFrame}
                        onChange={(e) => setOptions({ ...options, includeGeometricFrame: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <School size={18} className="text-indigo-600" />
                      Pengaturan Kop Surat & Identitas Sekolah
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Kustomisasi informasi kop dan data pengesahan untuk seluruh dokumen yang diekspor.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Mode Pilihan Kop Surat */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 size={14} className="text-indigo-600" />
                        Jenis / Format Kop Surat Dokumen
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOptions({ ...options, kopType: "text" })}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                            options.kopType === "text" || !options.kopType
                              ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/30 shadow-xs"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${options.kopType === "text" || !options.kopType ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold">📝 Teks Standar</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Otomatis menyusun nama sekolah, instansi, & logo bintang</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOptions({ ...options, kopType: "image" })}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                            options.kopType === "image"
                              ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/30 shadow-xs"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${options.kopType === "image" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                            <ImageIcon size={18} />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold">🖼️ Gambar Kop Digital</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Upload/Impor file gambar kop resmi sekolah (PNG/JPG/Drive)</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Conditional controls based on kopType */}
                    {options.kopType === "image" ? (
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                        {options.customKopImageUrl ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                                <CheckCircle2 size={15} className="text-emerald-600" /> Gambar Kop Surat Terpasang
                              </span>
                              <button
                                type="button"
                                onClick={() => setOptions({ ...options, customKopImageUrl: "" })}
                                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <Trash2 size={13} /> Hapus Gambar
                              </button>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center overflow-hidden">
                              <img
                                src={formatDriveImageUrl(options.customKopImageUrl)}
                                alt="Kop Surat Preview"
                                className="max-h-28 max-w-full mx-auto object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-900 text-xs">
                            <p className="font-bold">Belum Ada Gambar Kop Surat</p>
                            <p className="text-[11px] text-amber-700 mt-0.5">Unggah berkas atau tempel link Google Drive di bawah untuk memasang Kop Surat digital.</p>
                          </div>
                        )}

                        {/* File Upload Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Upload size={13} className="text-indigo-600" />
                            Unggah File Gambar Kop Surat (PNG / JPG / WEBP)
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleKopImageUpload}
                              disabled={isProcessingImage}
                              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer border border-slate-200 rounded-xl bg-white p-1"
                            />
                            {isProcessingImage && (
                              <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center text-xs font-bold text-indigo-700 gap-2">
                                <RefreshCw size={14} className="animate-spin" /> Memproses gambar...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Google Drive / Link Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <LinkIcon size={13} className="text-indigo-600" />
                            Atau Tempel Link Google Drive / Direct URL Gambar
                          </label>
                          <input
                            type="text"
                            value={options.customKopImageUrl || ""}
                            onChange={(e) => setOptions({ ...options, customKopImageUrl: e.target.value })}
                            placeholder="https://drive.google.com/file/d/.../view atau Data URL / Link PNG"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                          <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span>
                            Gambar Kop Surat digital akan disisipkan dengan presisi tinggi pada bagian atas dokumen Microsoft Word (.doc), cetak langsung, dan ekspor PDF.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Instansi / Yayasan</label>
                          <input
                            type="text"
                            value={options.customSchoolSubheader}
                            onChange={(e) => setOptions({ ...options, customSchoolSubheader: e.target.value })}
                            placeholder="Contoh: DINAS PENDIDIKAN PROVINSI JAWA BARAT"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nama Sekolah</label>
                          <input
                            type="text"
                            value={options.customSchoolName}
                            onChange={(e) => setOptions({ ...options, customSchoolName: e.target.value })}
                            placeholder="Contoh: SMAN 1 BANDUNG"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Alamat / Kontak Sekolah</label>
                          <input
                            type="text"
                            value={options.customSchoolAddress}
                            onChange={(e) => setOptions({ ...options, customSchoolAddress: e.target.value })}
                            placeholder="Contoh: Jl. Ir. H. Juanda No. 93, Kota Bandung - Telp. (022) 123456"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <FileCheck size={14} className="text-indigo-600" />
                        Mode Konten Ekspor (Filter Soal / Pembahasan)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setOptions({ ...options, exportMode: "full" })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            options.exportMode === "full" || !options.exportMode
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-600"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-xs font-extrabold text-slate-900">📄 Lengkap</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Semua identitas, modul, soal, & pembahasan</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOptions({ ...options, exportMode: "questions_only", includeSignature: false })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            options.exportMode === "questions_only"
                              ? "border-amber-600 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-600"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-xs font-extrabold text-amber-900">📝 Hanya Soal (Siswa)</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Tanpa identitas & kunci (langsung siap bagikan)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOptions({ ...options, exportMode: "answers_only" })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            options.exportMode === "answers_only"
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-600"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="text-xs font-extrabold text-indigo-900">🔑 Kunci & Pembahasan</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Hanya kunci jawaban & pembahasan untuk guru</div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kota / Lokasi Dokumen</label>
                        <input
                          type="text"
                          value={options.customCity}
                          onChange={(e) => setOptions({ ...options, customCity: e.target.value })}
                          placeholder="Contoh: Bandung"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ukuran Kertas Standar</label>
                        <select
                          value={options.paperSize}
                          onChange={(e) => setOptions({ ...options, paperSize: e.target.value as any })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                        >
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="F4">F4 / Folio (215 x 330 mm)</option>
                        </select>
                      </div>
                    </div>

                    {/* Section TTD Pengesahan & TTE */}
                    <div className="pt-3 border-t border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileSignature size={14} /> Identitas & Gambar Tanda Tangan Elektronik (TTE)
                        </h4>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          Mendukung tanda tangan digital, gambar transparan, & badge QR resmi
                        </span>
                      </div>

                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800">Kota Dokumen / Penandatanganan</span>
                          <p className="text-[11px] text-slate-500">Dicantumkan pada titimangsa surat/pengesahan (Contoh: Tasikmalaya, Jakarta)</p>
                        </div>
                        <input
                          type="text"
                          value={options.customCity || ""}
                          onChange={(e) => setOptions({ ...options, customCity: e.target.value })}
                          placeholder="Kota Dokumen (misal: Tasikmalaya)"
                          className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Kepala Sekolah */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700 block">Kepala Sekolah</span>
                            {options.usePrincipalTte && options.principalTteImageUrl && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={11} /> TTE Aktif
                              </span>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            value={options.customPrincipalName}
                            onChange={(e) => setOptions({ ...options, customPrincipalName: e.target.value })}
                            placeholder="Nama Kepala Sekolah"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={options.customPrincipalNip}
                            onChange={(e) => setOptions({ ...options, customPrincipalNip: e.target.value })}
                            placeholder="NIP Kepala Sekolah"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                          />

                          {/* TTE Box for Principal */}
                          <div className="pt-2 border-t border-slate-200/70 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!options.usePrincipalTte}
                                onChange={(e) => setOptions({ ...options, usePrincipalTte: e.target.checked })}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <span className="text-xs font-semibold text-slate-700">Isi kolom TTD dengan gambar TTE</span>
                            </label>

                            {options.principalTteImageUrl ? (
                              <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                                <div className="w-16 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                                  <img
                                    src={formatDriveImageUrl(options.principalTteImageUrl)}
                                    alt="Preview TTE Kepala Sekolah"
                                    className="max-h-full max-w-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <span className="text-[11px] font-bold text-slate-700 block truncate">Gambar TTE Tersimpan</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTteTargetRole("kepsek");
                                        setIsTteModalOpen(true);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                      Ubah TTE
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button
                                      type="button"
                                      onClick={() => setOptions({ ...options, principalTteImageUrl: "", usePrincipalTte: false })}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setTteTargetRole("kepsek");
                                  setIsTteModalOpen(true);
                                }}
                                className="w-full py-2 px-3 border border-dashed border-indigo-300 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileSignature size={13} /> Atur / Pasang Gambar TTE Kepsek
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Guru Mata Pelajaran */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700 block">Guru Mata Pelajaran</span>
                            {options.useTeacherTte && options.teacherTteImageUrl && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={11} /> TTE Aktif
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={options.customTeacherName}
                            onChange={(e) => setOptions({ ...options, customTeacherName: e.target.value })}
                            placeholder="Nama Guru"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={options.customTeacherNip}
                            onChange={(e) => setOptions({ ...options, customTeacherNip: e.target.value })}
                            placeholder="NIP Guru"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                          />

                          {/* TTE Box for Teacher */}
                          <div className="pt-2 border-t border-slate-200/70 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!options.useTeacherTte}
                                onChange={(e) => setOptions({ ...options, useTeacherTte: e.target.checked })}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <span className="text-xs font-semibold text-slate-700">Isi kolom TTD dengan gambar TTE</span>
                            </label>

                            {options.teacherTteImageUrl ? (
                              <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                                <div className="w-16 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                                  <img
                                    src={formatDriveImageUrl(options.teacherTteImageUrl)}
                                    alt="Preview TTE Guru"
                                    className="max-h-full max-w-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <span className="text-[11px] font-bold text-slate-700 block truncate">Gambar TTE Tersimpan</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTteTargetRole("guru");
                                        setIsTteModalOpen(true);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                      Ubah TTE
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button
                                      type="button"
                                      onClick={() => setOptions({ ...options, teacherTteImageUrl: "", useTeacherTte: false })}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setTteTargetRole("guru");
                                  setIsTteModalOpen(true);
                                }}
                                className="w-full py-2 px-3 border border-dashed border-indigo-300 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileSignature size={13} /> Atur / Pasang Gambar TTE Guru
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={15} /> Terapkan & Lihat Preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles size={14} className="text-amber-500" />
              <span>Format tabel & tata letak telah dioptimasi secara presisi.</span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Tombol Simpan ke Google Drive */}
              <button
                type="button"
                onClick={handleSaveToGoogleDrive}
                disabled={isSavingToDrive}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 shadow-sm border ${
                  driveSavedLink
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    : isConnected
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                } ${isSavingToDrive ? "opacity-75 cursor-wait" : ""}`}
                title={isConnected ? "Simpan dokumen langsung ke folder EduAsisten di Google Drive Anda" : "Hubungkan Google Drive untuk menyimpan dokumen langsung ke akun Anda"}
              >
                {isSavingToDrive ? (
                  <RefreshCw size={16} className="animate-spin text-emerald-500" />
                ) : driveSavedLink ? (
                  <Check size={16} className="text-emerald-600" />
                ) : (
                  <Cloud size={16} className={isConnected ? "text-white" : "text-emerald-600"} />
                )}
                <span>
                  {isSavingToDrive
                    ? "Menyimpan ke Drive..."
                    : driveSavedLink
                    ? "Tersimpan di Drive!"
                    : isConnected
                    ? "Simpan ke Drive"
                    : "Hubungkan Drive"}
                </span>
                {driveSavedLink && driveSavedLink !== "saved" && (
                  <a
                    href={driveSavedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 p-0.5 hover:bg-emerald-200 rounded text-emerald-800"
                    title="Buka file di Google Drive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyRichText}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-2xs"
                title="Salin ke clipboard untuk ditempel di Microsoft Word atau Google Docs"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span>{copied ? "Format Tersalin!" : "Salin Format Rapi"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
                title="Cetak langsung atau simpan dokumen ke file PDF"
              >
                <Printer size={16} />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={isExporting}
                className={`px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 ${isExporting ? 'opacity-75 cursor-wait' : ''}`}
                title="Unduh dokumen dalam format Microsoft Word (.doc)"
              >
                {downloadSuccess ? (
                  <Check size={16} className="text-amber-300" />
                ) : isExporting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>
                  {downloadSuccess ? "Teralirkan!" : isExporting ? "Memproses..." : "Unduh Word (.doc)"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <TteSignatureModal
        isOpen={isTteModalOpen}
        onClose={() => setIsTteModalOpen(false)}
        targetRole={tteTargetRole}
        onTargetChange={(target) => setTteTargetRole(target)}
        currentTteImageUrl={tteTargetRole === "guru" ? (options.teacherTteImageUrl || "") : (options.principalTteImageUrl || "")}
        useTte={tteTargetRole === "guru" ? (options.useTeacherTte ?? true) : (options.usePrincipalTte ?? true)}
        signerName={tteTargetRole === "guru" ? (options.customTeacherName || "Guru Mata Pelajaran") : (options.customPrincipalName || "Kepala Sekolah")}
        signerNip={tteTargetRole === "guru" ? (options.customTeacherNip || "") : (options.customPrincipalNip || "")}
        institution={options.customSchoolName || "SMAN 1 INDONESIA"}
        city={options.customCity || "Jakarta"}
        onSave={(imageUrl, enabled, role) => {
          if (role === "guru") {
            setOptions(prev => ({
              ...prev,
              useTeacherTte: enabled,
              teacherTteImageUrl: imageUrl
            }));
          } else {
            setOptions(prev => ({
              ...prev,
              usePrincipalTte: enabled,
              principalTteImageUrl: imageUrl
            }));
          }
        }}
      />
    </AnimatePresence>
  );
}
