import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Download, Printer, Copy, Check, FileText, Settings, 
  Sparkles, CheckCircle, School, Eye, RefreshCw, HelpCircle, FileCheck,
  Image as ImageIcon, Upload, Link as LinkIcon, Trash2, Building2, Info, CheckCircle2
} from "lucide-react";
import { 
  exportToWordFormatted, 
  printDocumentFormatted, 
  copyFormattedRichText, 
  detectDocumentMetadata,
  extractQuestionsOnlyText,
  extractAnswersOnlyText,
  ExportOptions,
  DocMetadata
} from "../lib/documentExporter";
import { formatDriveImageUrl } from "../lib/driveUtils";
import { compressImage } from "../lib/imageUtils";

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
  };
}

export default function EduExportModal({
  isOpen,
  onClose,
  rawContentHtml,
  userProfile
}: EduExportModalProps) {
  const [metadata, setMetadata] = useState<DocMetadata>({ title: "Dokumen Administrasi" });
  
  // Initialize options with localStorage or userProfile fallbacks
  const [options, setOptions] = useState<ExportOptions>(() => {
    const savedKopType = (localStorage.getItem("eduasisten_kop_type") as "text" | "image") || userProfile?.kopType || "text";
    const savedKopImage = localStorage.getItem("eduasisten_kop_image") || userProfile?.kopImageUrl || "";
    
    return {
      paperSize: "A4",
      fontFamily: "Calibri",
      includeKop: true,
      kopType: savedKopType,
      customKopImageUrl: savedKopImage,
      includeSignature: true,
      exportMode: "full",
      customSchoolName: userProfile?.namaSekolah || "SMAN 1 INDONESIA",
      customSchoolSubheader: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
      customSchoolAddress: "Jl. Pendidikan Nasional No. 1 - Kurikulum Merdeka",
      customTeacherName: userProfile?.namaPenyusun || "Guru Mata Pelajaran",
      customTeacherNip: userProfile?.nipPenyusun || "-",
      customPrincipalName: userProfile?.namaKepsek || "Kepala Sekolah",
      customPrincipalNip: userProfile?.nipKepsek || "-",
      customCity: "Jakarta"
    };
  });

  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Sync Kop Surat preferences to localStorage whenever changed
  useEffect(() => {
    if (options.kopType) {
      localStorage.setItem("eduasisten_kop_type", options.kopType);
    }
    if (options.customKopImageUrl !== undefined) {
      localStorage.setItem("eduasisten_kop_image", options.customKopImageUrl);
    }
  }, [options.kopType, options.customKopImageUrl]);

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
    if (options.exportMode === "questions_only") {
      return extractQuestionsOnlyText(rawContentHtml);
    }
    if (options.exportMode === "answers_only") {
      return extractAnswersOnlyText(rawContentHtml);
    }
    return rawContentHtml;
  }, [rawContentHtml, options.exportMode]);

  useEffect(() => {
    if (rawContentHtml) {
      const meta = detectDocumentMetadata(rawContentHtml, userProfile);
      setMetadata(meta);
      setOptions(prev => ({
        ...prev,
        customSchoolName: prev.customSchoolName || userProfile?.namaSekolah || meta.schoolName || "SMAN 1 INDONESIA",
        customTeacherName: prev.customTeacherName || userProfile?.namaPenyusun || meta.teacherName || "Guru Mata Pelajaran",
        customTeacherNip: prev.customTeacherNip || userProfile?.nipPenyusun || meta.teacherNip || "-",
        customPrincipalName: prev.customPrincipalName || userProfile?.namaKepsek || meta.principalName || "Kepala Sekolah",
        customPrincipalNip: prev.customPrincipalNip || userProfile?.nipKepsek || meta.principalNip || "-"
      }));
    }
  }, [rawContentHtml, userProfile]);

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

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

              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                <input
                  type="checkbox"
                  checked={options.includeKop}
                  onChange={(e) => setOptions({ ...options, includeKop: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-700 text-[11px]">Kop Dokumen</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                <input
                  type="checkbox"
                  checked={options.includeSignature}
                  onChange={(e) => setOptions({ ...options, includeSignature: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-700 text-[11px]">TTD</span>
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
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
                {/* Paper Preview Sheet */}
                <div 
                  className={`bg-white text-slate-900 shadow-xl border border-slate-300/80 rounded-sm p-8 md:p-12 transition-all w-full max-w-[800px] min-h-[900px]`}
                  style={{
                    fontFamily: options.fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' :
                                options.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' :
                                'Calibri, "Segoe UI", Arial, sans-serif'
                  }}
                >
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
                  <div 
                    className="doc-preview-content prose prose-slate max-w-none text-xs md:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />

                  {/* Signature block in preview */}
                  {options.includeSignature && (
                    <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
                      <div>
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold text-slate-900 mb-14">Kepala Sekolah</p>
                        <p className="font-bold text-slate-900 underline">{options.customPrincipalName || "Kepala Sekolah"}</p>
                        <p className="text-slate-500 text-[11px]">NIP. {options.customPrincipalNip || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">{options.customCity || "Jakarta"}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="font-bold text-slate-900 mb-14">Guru Mata Pelajaran</p>
                        <p className="font-bold text-slate-900 underline">{options.customTeacherName || "Guru Mata Pelajaran"}</p>
                        <p className="text-slate-500 text-[11px]">NIP. {options.customTeacherNip || "-"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Settings Tab */
              <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-slate-50">
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 w-full max-w-2xl space-y-6">
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

                    {/* Section TTD Pengesahan */}
                    <div className="pt-3 border-t border-slate-200 space-y-4">
                      <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                        Identitas Tanda Tangan Pengesahan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <span className="text-[11px] font-extrabold text-slate-700 block">Kepala Sekolah</span>
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
                        </div>

                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <span className="text-[11px] font-extrabold text-slate-700 block">Guru Mata Pelajaran</span>
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
    </AnimatePresence>
  );
}
