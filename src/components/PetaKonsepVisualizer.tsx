import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  Download, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Image as ImageIcon, 
  Share2, 
  Check, 
  Layers, 
  Network, 
  Palette,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";

export interface ConceptNode {
  id: string;
  title: string;
  description?: string;
  children?: ConceptNode[];
  color?: string;
  icon?: string;
}

interface PetaKonsepVisualizerProps {
  rawContent?: string;
  topic?: string;
  subMateri?: string[];
  mapel?: string;
  kelas?: string;
  onInsertImageToDoc?: (imageUrl: string, altText: string) => void;
}

const PALETTES = [
  {
    name: "indigo",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    header: "from-indigo-600 to-blue-600 text-white",
    cardBg: "bg-indigo-50/40 border-indigo-200/80 hover:border-indigo-400",
    nodeBorder: "border-indigo-500",
    dot: "bg-indigo-500",
    stroke: "#6366f1"
  },
  {
    name: "emerald",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    header: "from-emerald-600 to-teal-600 text-white",
    cardBg: "bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400",
    nodeBorder: "border-emerald-500",
    dot: "bg-emerald-500",
    stroke: "#10b981"
  },
  {
    name: "violet",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    header: "from-violet-600 to-purple-600 text-white",
    cardBg: "bg-violet-50/40 border-violet-200/80 hover:border-violet-400",
    nodeBorder: "border-violet-500",
    dot: "bg-violet-500",
    stroke: "#8b5cf6"
  },
  {
    name: "amber",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    header: "from-amber-500 to-orange-500 text-white",
    cardBg: "bg-amber-50/40 border-amber-200/80 hover:border-amber-400",
    nodeBorder: "border-amber-500",
    dot: "bg-amber-500",
    stroke: "#f59e0b"
  },
  {
    name: "rose",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    header: "from-rose-600 to-pink-600 text-white",
    cardBg: "bg-rose-50/40 border-rose-200/80 hover:border-rose-400",
    nodeBorder: "border-rose-500",
    dot: "bg-rose-500",
    stroke: "#f43f5e"
  },
  {
    name: "sky",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    header: "from-sky-600 to-cyan-600 text-white",
    cardBg: "bg-sky-50/40 border-sky-200/80 hover:border-sky-400",
    nodeBorder: "border-sky-500",
    dot: "bg-sky-500",
    stroke: "#0ea5e9"
  }
];

// Helper to parse hierarchical markdown bullets into tree nodes
export function parseConceptMapText(text: string, defaultTopic: string = "Peta Konsep Pembelajaran"): { rootTitle: string; branches: ConceptNode[] } {
  if (!text) {
    return { rootTitle: defaultTopic, branches: [] };
  }

  // Look for section like "PETA KONSEP"
  const lines = text.split("\n");
  let capturing = false;
  let capturedLines: string[] = [];
  let detectedTitle = defaultTopic;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:^|\s)(?:#+\s*)?(?:\d+\.\s*)?PETA\s+KONSEP/i.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing) {
      // If we encounter another major heading (# 6. or ## MATERI INTI), stop
      if (/^#{1,3}\s+(?:\d+\.|\b[A-Z]\.)\s+/i.test(line)) {
        break;
      }
      if (line.trim().length > 0) {
        capturedLines.push(line);
      }
    }
  }

  if (capturedLines.length === 0) {
    // If not found inside specific header, try searching bullet lines
    capturedLines = lines.filter(l => /^\s*[-*•]\s+/.test(l));
  }

  const branches: ConceptNode[] = [];
  let currentBranch: ConceptNode | null = null;

  for (const line of capturedLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check indentation level
    const matchIndent = line.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1].length : 0;
    const cleanText = trimmed.replace(/^[-*•●\d.]+\s*/, "").replace(/\*\*/g, "").trim();
    if (!cleanText) continue;

    if (indent <= 2 && branches.length < 8) {
      // Main branch
      const parts = cleanText.split(/[:-]\s+/);
      const title = parts[0]?.trim();
      const desc = parts.slice(1).join(": ").trim();

      currentBranch = {
        id: `branch-${branches.length + 1}`,
        title,
        description: desc,
        children: []
      };
      branches.push(currentBranch);
    } else if (currentBranch && currentBranch.children && currentBranch.children.length < 6) {
      // Sub-node
      currentBranch.children.push({
        id: `sub-${currentBranch.id}-${currentBranch.children.length + 1}`,
        title: cleanText
      });
    }
  }

  return {
    rootTitle: detectedTitle,
    branches: branches.slice(0, 6)
  };
}

export const PetaKonsepVisualizer: React.FC<PetaKonsepVisualizerProps> = ({
  rawContent = "",
  topic = "Topik Pembelajaran",
  subMateri = [],
  mapel = "Mata Pelajaran",
  kelas = "",
  onInsertImageToDoc
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "ai-image">("diagram");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; type: string; prompt: string } | null>(null);
  const [imageStyle, setImageStyle] = useState<string>("mindmap");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [copied, setCopied] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse branches or synthesize from subMateri / rawContent
  const parsed = parseConceptMapText(rawContent, topic);
  const effectiveTitle = topic || parsed.rootTitle || "Peta Konsep Materi";

  // Build branches: fallback to subMateri if parsed text is minimal
  let effectiveBranches: ConceptNode[] = parsed.branches;
  if (effectiveBranches.length === 0 && subMateri && subMateri.length > 0) {
    effectiveBranches = subMateri.map((sm, idx) => ({
      id: `sm-${idx + 1}`,
      title: sm,
      description: `Konsep kunci & aplikasi pada materi ${sm}`,
      children: [
        { id: `c-${idx}-1`, title: "Prinsip Dasar & Konsep" },
        { id: `c-${idx}-2`, title: "Aplikasi Kontekstual & Praktik" }
      ]
    }));
  }

  if (effectiveBranches.length === 0) {
    effectiveBranches = [
      {
        id: "b1",
        title: "Konsep Dasar & Definisi",
        description: "Fondasi teoritis dan karakteristik esensial",
        children: [
          { id: "b1-1", title: "Terminologi & Kaidah Kunci" },
          { id: "b1-2", title: "Ciri & Batasan Materi" }
        ]
      },
      {
        id: "b2",
        title: "Prinsip & Mekanisme Kerja",
        description: "Alur prosedur, aturan perhitungan, atau siklus proses",
        children: [
          { id: "b2-1", title: "Hubungan Sebab-Akibat" },
          { id: "b2-2", title: "Penerapan Rumus & Metode" }
        ]
      },
      {
        id: "b3",
        title: "Aplikasi & Studi Kasus Nyata",
        description: "Relevansi dengan fenomena nyata dan dunia kerja",
        children: [
          { id: "b3-1", title: "Contoh Konkret Kehidupan Sehari-hari" },
          { id: "b3-2", title: "Analisis Kritis & Problem Solving" }
        ]
      }
    ];
  }

  // Handle Generate AI Image
  const handleGenerateAIImage = async () => {
    setIsGeneratingImage(true);
    setActiveTab("ai-image");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Peta konsep visual interaktif dan infografis materi ${effectiveTitle}`,
          materi: effectiveTitle,
          subMateri: subMateri.length > 0 ? subMateri : effectiveBranches.map(b => b.title),
          mapel,
          kelas,
          style: imageStyle,
          aspectRatio
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || "Gagal menghasilkan gambar AI.");

      setGeneratedImage({
        url: data.imageUrl,
        type: data.type || "ai-generated",
        prompt: data.prompt
      });
    } catch (err: any) {
      alert(`Pemberitahuan: ${err.message || "Gagal menghasilkan gambar. Silakan coba kembali."}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Download Image
  const handleDownload = () => {
    if (generatedImage?.url) {
      const link = document.createElement("a");
      link.href = generatedImage.url;
      link.download = `Peta-Konsep-${effectiveTitle.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.print();
    }
  };

  const handleCopyImage = async () => {
    if (generatedImage?.url) {
      try {
        await navigator.clipboard.writeText(generatedImage.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert("Gambar tersimpan di browser.");
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white shadow-sm overflow-hidden transition-all duration-300 my-4 ${
        isFullscreen ? "fixed inset-0 z-[100] m-0 rounded-none bg-slate-900/95 p-4 flex flex-col" : ""
      }`}
    >
      {/* Header & Controls Bar */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
            <Network size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Peta Konsep Visual & Grafis Pembelajaran
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                Interaktif & AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Topik: <span className="font-semibold text-slate-700">{effectiveTitle}</span>
              {mapel && ` • ${mapel}`}
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Tabs */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center mr-1">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "diagram"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={13} />
              <span>Bagan Vektor</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("ai-image");
                if (!generatedImage && !isGeneratingImage) {
                  handleGenerateAIImage();
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "ai-image"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles size={13} className={isGeneratingImage ? "animate-spin" : ""} />
              <span>Ilustrasi AI</span>
              {generatedImage && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>

          {/* Quick AI Image Generation Button */}
          <button
            onClick={handleGenerateAIImage}
            disabled={isGeneratingImage}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Buat gambar visual ilustrasi peta konsep dengan AI"
          >
            <Sparkles size={13} className={isGeneratingImage ? "animate-spin" : ""} />
            <span>{isGeneratingImage ? "Membuat Gambar..." : "Generasikan Gambar AI"}</span>
          </button>

          {/* Zoom Controls for Diagram */}
          {activeTab === "diagram" && (
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={() => setZoom(prev => Math.max(70, prev - 10))}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Perkecil (-)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[11px] font-mono font-medium text-slate-500 w-9 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Perbesar (+)"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset Ukuran"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Download button */}
          {generatedImage && (
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Unduh Gambar"
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`relative overflow-auto p-4 sm:p-6 flex-1 min-h-[360px] flex items-center justify-center ${isFullscreen ? "bg-slate-900" : "bg-slate-50/50"}`}>
        
        {/* Tab 1: Interactive Node-Based Concept Map */}
        {activeTab === "diagram" && (
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            className="w-full max-w-5xl py-4"
          >
            {/* Central Root Hub */}
            <div className="flex flex-col items-center mb-8 relative">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 rounded-2xl blur-xs opacity-60 group-hover:opacity-90 transition duration-300"></div>
                <div className="relative px-6 py-4 bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-2xl shadow-xl border border-indigo-400/40 text-center max-w-md">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase mb-1.5 backdrop-blur-xs text-indigo-100">
                    <Sparkles size={11} className="text-amber-300" />
                    <span>Topik Inti Pembelajaran</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug">
                    {effectiveTitle}
                  </h3>
                  {mapel && (
                    <p className="text-[11px] text-indigo-200 mt-1 font-medium">
                      Kurikulum Merdeka • {mapel} {kelas && `(${kelas})`}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Vertical Line */}
              <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500 to-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-100"></div>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
              {effectiveBranches.map((branch, idx) => {
                const palette = PALETTES[idx % PALETTES.length];
                return (
                  <div 
                    key={branch.id || idx}
                    className={`relative rounded-2xl border p-4 bg-white/95 backdrop-blur-xs shadow-xs hover:shadow-md transition-all duration-200 group flex flex-col justify-between ${palette.cardBg}`}
                  >
                    {/* Top Branch Accent Banner */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${palette.badge}`}>
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Cabang Konsep
                        </span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${palette.dot} animate-pulse`}></div>
                    </div>

                    {/* Branch Title & Description */}
                    <div className="mb-3">
                      <h5 className="text-sm font-bold text-slate-800 group-hover:text-indigo-900 transition-colors">
                        {branch.title}
                      </h5>
                      {branch.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {branch.description}
                        </p>
                      )}
                    </div>

                    {/* Sub-nodes / Key Points */}
                    {branch.children && branch.children.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-auto">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Poin Esensial:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {branch.children.map((sub, sIdx) => (
                            <div 
                              key={sub.id || sIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-medium text-slate-700 shadow-3xs"
                            >
                              <ChevronRight size={10} className="text-indigo-500 shrink-0" />
                              <span>{sub.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Recommendation Callout */}
            <div className="mt-8 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-indigo-600 shrink-0" />
                <span>
                  Ingin tampilan visual yang lebih artistik atau gambar poster untuk slide materi Anda?
                </span>
              </div>
              <button
                onClick={handleGenerateAIImage}
                disabled={isGeneratingImage}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {isGeneratingImage ? "Membuat..." : "Buat Gambar AI Sekarang"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: AI Generated Image / Visual Infographic */}
        {activeTab === "ai-image" && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center py-2">
            {isGeneratingImage ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 animate-spin flex items-center justify-center p-0.5">
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} className="text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Gemini AI Sedang Menggambar Peta Konsep...
                </h4>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Menyusun diagram konsep infografis beresolusi tinggi dengan tata letak visual, warna harmonis, dan label konsep materi {effectiveTitle}.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <span>Model Gemini Vision & Edu-Vector Synthesis aktif</span>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="w-full space-y-4">
                {/* Image Display Card */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white group">
                  <img
                    src={generatedImage.url}
                    alt={`Peta Konsep Visual ${effectiveTitle}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto max-h-[550px] object-contain mx-auto bg-slate-900/5 transition-transform duration-300"
                  />

                  {/* Overlay Controls */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-xs p-1.5 rounded-xl text-white">
                    <button
                      onClick={handleDownload}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Unduh file gambar"
                    >
                      <Download size={13} />
                      <span>Unduh PNG</span>
                    </button>
                    {onInsertImageToDoc && (
                      <button
                        onClick={() => onInsertImageToDoc(generatedImage.url, `Peta Konsep: ${effectiveTitle}`)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Sisipkan ke dokumen materi ajar"
                      >
                        <Check size={13} />
                        <span>Sisipkan ke Dokumen</span>
                      </button>
                    )}
                    <button
                      onClick={handleCopyImage}
                      className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                      title="Salin data gambar"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Regeneration & Style Bar */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Gaya Gambar:</span>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                    >
                      <option value="mindmap">Infografis Peta Konsep (Mind Map)</option>
                      <option value="infografis">Poster Edukatif Lengkap</option>
                      <option value="diagram">Diagram Alir / Proses Ilmiah</option>
                      <option value="3d">Visual 3D Isometrik Modern</option>
                      <option value="cartoon">Ilustrasi Edukasi Kartun</option>
                    </select>

                    <span className="font-bold text-slate-700 ml-2">Rasio:</span>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                    >
                      <option value="16:9">16:9 (Slide Presentasi)</option>
                      <option value="4:3">4:3 (Buku Siswa)</option>
                      <option value="1:1">1:1 (Persegi)</option>
                      <option value="3:4">3:4 (Poster Vertikal)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateAIImage}
                    disabled={isGeneratingImage}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Buat Ulang (Regenerasi)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Generasikan Gambar Ilustrasi Peta Konsep
                </h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Kecerdasan buatan Gemini akan merancang gambar infografis edukasi yang kaya visual, beresolusi tajam, dan siap digunakan dalam kegiatan belajar mengajar.
                </p>
                <button
                  onClick={handleGenerateAIImage}
                  disabled={isGeneratingImage}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Mulai Buat Gambar AI</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
