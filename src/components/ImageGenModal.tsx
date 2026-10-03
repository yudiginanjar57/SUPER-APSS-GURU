import React, { useState } from "react";
import { 
  X, 
  Sparkles, 
  Download, 
  Share2, 
  Check, 
  Image as ImageIcon, 
  Layers, 
  Wand2, 
  Palette, 
  RefreshCw, 
  FolderPlus,
  Maximize2
} from "lucide-react";
import { SubMateriMultiSelect } from "./SubMateriHelper";

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMateri?: string;
  defaultMapel?: string;
  defaultKelas?: string;
  onInsertToChat?: (markdownImage: string) => void;
}

const STYLE_PRESETS = [
  {
    id: "mindmap",
    label: "Peta Konsep & Mind Map",
    desc: "Bagan konsep alur terstruktur dengan cabang warna-warni & kartu konsep",
    icon: Layers,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  {
    id: "infografis",
    label: "Infografis Poster Edukasi",
    desc: "Ringkasan materi visual lengkap dengan bagan data, ikon, dan poin penting",
    icon: Palette,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: "diagram",
    label: "Diagram Alir & Siklus Ilmiah",
    desc: "Diagram teknis, proses ilmiah, siklus biologi/ekonomi, dan skema panah",
    icon: Wand2,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
  },
  {
    id: "cartoon",
    label: "Kartun Edukasi & Karakter",
    desc: "Ilustrasi ramah anak & menarik untuk jenjang PAUD, SD, dan SMP",
    icon: Sparkles,
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200"
  },
  {
    id: "3d",
    label: "3D Isometrik Modern",
    desc: "Render visual 3D berestetika modern untuk konsep teknologi & sains",
    icon: ImageIcon,
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200"
  }
];

export const ImageGenModal: React.FC<ImageGenModalProps> = ({
  isOpen,
  onClose,
  defaultMateri = "",
  defaultMapel = "Ekonomi",
  defaultKelas = "10 (Fase E)",
  onInsertToChat
}) => {
  const [materi, setMateri] = useState<string>(defaultMateri);
  const [subMateri, setSubMateri] = useState<string[]>([]);
  const [mapel, setMapel] = useState<string>(defaultMapel);
  const [kelas, setKelas] = useState<string>(defaultKelas);
  const [style, setStyle] = useState<string>("mindmap");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; type: string; title: string; prompt: string } | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; title: string; style?: string; type?: string; prompt?: string }>>([]);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!materi.trim() && !additionalPrompt.trim()) {
      alert("Silakan masukkan topik materi pokok atau deskripsi gambar yang ingin dibuat.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: additionalPrompt || `Ilustrasi edukatif tentang ${materi}`,
          materi: materi.trim(),
          subMateri,
          mapel,
          kelas,
          style,
          aspectRatio
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || "Gagal menghasilkan gambar AI.");

      const newImg = {
        url: data.imageUrl,
        type: data.type || "ai-generated",
        title: materi || additionalPrompt,
        prompt: data.prompt || "",
        style
      };

      setGeneratedImage(newImg);
      setHistory(prev => [newImg, ...prev.slice(0, 7)]);
    } catch (err: any) {
      alert(`Pemberitahuan: ${err.message || "Gagal menghasilkan gambar. Silakan coba kembali."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (imgUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = imgUrl;
    link.download = `MediaAjar-${title.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async (imgUrl: string) => {
    try {
      await navigator.clipboard.writeText(imgUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("URL gambar berhasil disalin.");
    }
  };

  const handleInsert = (imgUrl: string, title: string) => {
    if (onInsertToChat) {
      const md = `\n\n![${title}](${imgUrl})\n*Gambar: ${title} (Dihasilkan oleh Generatif Gambar AI)*\n\n`;
      onInsertToChat(md);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-xs">
              <Sparkles size={20} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Studio Gambar & Media Ajar AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/40 uppercase">
                  Generatif AI
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                Rancang visualisasi Peta Konsep, infografis, diagram alir, dan media ajar siap pakai dengan teknologi Gemini Vision.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40">
          
          {/* Left Form Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Subject & Class selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  placeholder="Contoh: Ekonomi, IPA"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kelas / Fase
                </label>
                <input
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: 10 (Fase E)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Topik Materi Pokok (Global) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Topik / Materi Pokok (Global) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                placeholder="Contoh: Siklus Akuntansi Perusahaan Jasa"
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Gunakan judul bab/topik esensial secara global; rincian konsep diatur pada sub-materi.
              </p>
            </div>

            {/* Sub-Materi Selector */}
            <div>
              <SubMateriMultiSelect
                materi={materi}
                mapel={mapel}
                kelas={kelas}
                selected={subMateri}
                onChange={(vals) => setSubMateri(vals)}
                label="Fokus Sub-Materi / Cabang Konsep (Opsional)"
                placeholder="Pilih atau ketik cabang konsep materi..."
              />
            </div>

            {/* Style Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Gaya Visual Gambar
              </label>
              <div className="grid grid-cols-1 gap-2">
                {STYLE_PRESETS.map((pst) => {
                  const Icon = pst.icon;
                  const isSelected = style === pst.id;
                  return (
                    <div
                      key={pst.id}
                      onClick={() => setStyle(pst.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/10"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${pst.badgeColor}`}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                            {pst.label}
                          </span>
                          {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {pst.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rasio Aspek (Format Gambar)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "16:9", label: "16:9", sub: "Presentasi" },
                  { id: "4:3", label: "4:3", sub: "Buku Teks" },
                  { id: "1:1", label: "1:1", sub: "Persegi" },
                  { id: "3:4", label: "3:4", sub: "Poster" }
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      aspectRatio === ar.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span className="block text-xs">{ar.label}</span>
                    <span className={`block text-[9px] ${aspectRatio === ar.id ? "text-indigo-100" : "text-slate-400"}`}>
                      {ar.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Prompt / Detail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petunjuk Khusus / Detail Visual (Opsional)
              </label>
              <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                rows={2}
                placeholder="Misal: Sertakan skema aktiva pasiva, warna biru pastel, dan panah alur posting transaksi."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles size={16} className={isLoading ? "animate-spin" : ""} />
              <span>{isLoading ? "Sedang Menggambar Media..." : "Generasikan Gambar AI"}</span>
            </button>
          </div>

          {/* Right Preview & History Area (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Main Preview Box */}
            <div className="flex-1 min-h-[380px] bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-indigo-600" />
                  <span>Pratinjau Hasil Gambar Media Ajar</span>
                </span>
                {generatedImage && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Selesai Dibuat
                  </span>
                )}
              </div>

              {/* Display Area */}
              <div className="flex-1 flex items-center justify-center min-h-[300px] overflow-hidden rounded-xl bg-slate-900/5 relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 animate-spin flex items-center justify-center p-0.5 mb-3">
                      <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                        <Sparkles size={22} className="text-indigo-600 animate-pulse" />
                      </div>
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 mb-1">
                      Gemini AI Sedang Merancang Visual...
                    </h5>
                    <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                      Menghubungkan konsep materi, palet warna pedagogis, dan tata letak infografis berkualitas tinggi.
                    </p>
                  </div>
                ) : generatedImage ? (
                  <div className="relative w-full h-full flex items-center justify-center group">
                    <img
                      src={generatedImage.url}
                      alt={generatedImage.title}
                      referrerPolicy="no-referrer"
                      className="max-h-[380px] max-w-full object-contain rounded-lg shadow-xs"
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-md">
                      Format: {aspectRatio}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                      <Palette size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 mb-1">
                      Belum Ada Gambar yang Dibuat
                    </p>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Pilih topik materi pokok atau rincian konsep di sebelah kiri, lalu klik tombol "Generasikan Gambar AI".
                    </p>
                  </div>
                )}
              </div>

              {/* Action Bar for Generated Image */}
              {generatedImage && !isLoading && (
                <div className="pt-3 border-t border-slate-100 mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-slate-500 truncate max-w-xs">
                    {generatedImage.title}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownload(generatedImage.url, generatedImage.title)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Unduh file gambar"
                    >
                      <Download size={13} />
                      <span>Unduh PNG</span>
                    </button>
                    {onInsertToChat && (
                      <button
                        onClick={() => handleInsert(generatedImage.url, generatedImage.title)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Sisipkan ke dokumen modul ajar atau chat"
                      >
                        <FolderPlus size={13} />
                        <span>Sisipkan ke Dokumen</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(generatedImage.url)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Salin tautan gambar"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History Strip */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
                <span className="block text-[11px] font-bold text-slate-600 mb-2">
                  Riwayat Gambar Sesi Ini ({history.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => setGeneratedImage({ url: h.url, type: "ai-generated", title: h.title, prompt: "" })}
                      className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition-all relative group"
                    >
                      <img
                        src={h.url}
                        alt={h.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
