import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MonitorPlay, 
  Tv, 
  Presentation, 
  FileVideo, 
  FileText, 
  Link as LinkIcon, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  HardDrive, 
  Sparkles, 
  Edit3, 
  Trash2, 
  Play, 
  Clock, 
  CheckCircle2, 
  Info, 
  Eye, 
  BookOpen, 
  X, 
  Save, 
  HelpCircle, 
  Share2, 
  Zap,
  ArrowRight,
  Layers,
  ChevronRight,
  Target,
  FolderTree,
  ListTree,
  ChevronDown,
  Bookmark,
  FileCode,
  FolderOpen,
  ShieldAlert
} from "lucide-react";
import { LearningMaterial, MaterialType, LearningMaterialNote, Student } from "../types";
import { CLASSES } from "../data/presets";
import { convertToEmbedUrl, extractGoogleDriveId } from "../lib/driveUtils";

interface RuangBelajarProps {
  materials: LearningMaterial[];
  onAddMaterial: (newMat: LearningMaterial) => void;
  onEditMaterial: (updatedMat: LearningMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onAddMaterialNote?: (materialId: string, noteText: string, timestamp?: string) => void;
  classList?: string[];
  students?: Student[];
  teacherName?: string;
  subject?: string;
  currentUserRole?: 'admin' | 'guru' | 'siswa';
}

export default function RuangBelajar({
  materials,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onAddMaterialNote,
  classList,
  students = [],
  teacherName = "YUDI GINANJAR",
  subject = "EKONOMI",
  currentUserRole = "guru"
}: RuangBelajarProps) {
  const isStudent = currentUserRole === "siswa";
  const availableClasses = classList && classList.length > 0 ? classList : CLASSES;

  // Navigation & View Mode
  const [activeTabMode, setActiveTabMode] = useState<"catalog" | "studio" | "student">(
    isStudent ? "student" : "catalog"
  );
  const [catalogViewMode, setCatalogViewMode] = useState<"bab" | "grid">("bab"); // "bab" = Urutkan per BAB & Sub-BAB
  const [collapsedBabs, setCollapsedBabs] = useState<Record<string, boolean>>({});
  
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Currently playing material in Studio
  const [activeStudioMaterial, setActiveStudioMaterial] = useState<LearningMaterial | null>(null);

  // Studio Interactive Tools
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLaserPointerActive, setIsLaserPointerActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [noteInputText, setNoteInputText] = useState("");
  const [noteTimestampInput, setNoteTimestampInput] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<LearningMaterial | null>(null);
  const [isDriveGuideModalOpen, setIsDriveGuideModalOpen] = useState(false);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    description: string;
    subject: string;
    targetClasses: string[];
    type: MaterialType;
    driveUrl: string;
    topic: string;
    bab: string;
    subBab: string;
    tags: string;
  }>({
    title: "",
    description: "",
    subject: subject || "EKONOMI",
    targetClasses: [availableClasses[0] || "XII-C2"],
    type: "presentation",
    driveUrl: "",
    topic: "",
    bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
    subBab: "1.1 Masalah Ekonomi & Sistem Ekonomi",
    tags: ""
  });

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (selectedClassFilter !== "all") {
        const isAll = m.className === "Semua Kelas" || m.className === "Semua";
        const hasTarget = m.targetClasses && m.targetClasses.includes(selectedClassFilter);
        const hasClassName = m.className.split(",").map(c => c.trim()).includes(selectedClassFilter);
        if (!isAll && !hasTarget && !hasClassName) return false;
      }
      if (selectedTypeFilter !== "all" && m.type !== selectedTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchTopic = (m.topic || "").toLowerCase().includes(q);
        const matchBab = (m.bab || "").toLowerCase().includes(q);
        const matchSubBab = (m.subBab || "").toLowerCase().includes(q);
        const matchSubject = m.subject.toLowerCase().includes(q);
        const matchClass = m.className.toLowerCase().includes(q);
        const matchTags = (m.tags || []).some(t => t.toLowerCase().includes(q));
        return matchTitle || matchTopic || matchBab || matchSubBab || matchSubject || matchClass || matchTags;
      }
      return true;
    });
  }, [materials, selectedClassFilter, selectedTypeFilter, searchQuery]);

  // Grouped by BAB & Sub-BAB for structured hierarchy
  const groupedByBab = useMemo(() => {
    const babMap: Record<string, Record<string, LearningMaterial[]>> = {};

    filteredMaterials.forEach(m => {
      const babName = (m.bab || m.topic || "BAB Pembelajaran Umum").trim();
      const subBabName = (m.subBab || "Materi Utama BAB").trim();

      if (!babMap[babName]) {
        babMap[babName] = {};
      }
      if (!babMap[babName][subBabName]) {
        babMap[babName][subBabName] = [];
      }
      babMap[babName][subBabName].push(m);
    });

    return babMap;
  }, [filteredMaterials]);

  // Unique list of BABs across all materials for autocomplete suggestions
  const existingBabList = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => {
      if (m.bab) set.add(m.bab);
      else if (m.topic) set.add(m.topic);
    });
    return Array.from(set);
  }, [materials]);

  const toggleBabCollapse = (babName: string) => {
    setCollapsedBabs(prev => ({
      ...prev,
      [babName]: !prev[babName]
    }));
  };

  // Handle open Studio player
  const handleLaunchStudio = (material: LearningMaterial) => {
    setActiveStudioMaterial(material);
    setActiveTabMode("studio");
  };

  // Multi-Class selection helper functions
  const toggleClassSelection = (cls: string) => {
    setFormData(prev => {
      const exists = prev.targetClasses.includes(cls);
      let nextClasses: string[];
      if (exists) {
        nextClasses = prev.targetClasses.filter(c => c !== cls);
      } else {
        nextClasses = [...prev.targetClasses, cls];
      }
      return { ...prev, targetClasses: nextClasses };
    });
  };

  const selectAllClasses = () => {
    setFormData(prev => ({
      ...prev,
      targetClasses: [...availableClasses]
    }));
  };

  const deselectAllClasses = () => {
    setFormData(prev => ({
      ...prev,
      targetClasses: []
    }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setFormData({
      title: "",
      description: "",
      subject: subject || "EKONOMI",
      targetClasses: [availableClasses[0] || "XII-C2"],
      type: "presentation",
      driveUrl: "",
      topic: "",
      bab: "BAB 1: Konsep Dasar Ilmu Ekonomi",
      subBab: "1.1 Masalah Ekonomi & Sistem Ekonomi",
      tags: ""
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (mat: LearningMaterial) => {
    setEditingMaterial(mat);

    let initialClasses: string[] = [];
    if (mat.targetClasses && mat.targetClasses.length > 0) {
      initialClasses = mat.targetClasses;
    } else if (mat.className === "Semua Kelas" || mat.className === "Semua") {
      initialClasses = [...availableClasses];
    } else {
      initialClasses = mat.className.split(",").map(c => c.trim()).filter(Boolean);
    }
    if (initialClasses.length === 0 && availableClasses.length > 0) {
      initialClasses = [availableClasses[0]];
    }

    setFormData({
      id: mat.id,
      title: mat.title,
      description: mat.description || "",
      subject: mat.subject,
      targetClasses: initialClasses,
      type: mat.type,
      driveUrl: mat.driveUrl,
      topic: mat.topic || "",
      bab: mat.bab || mat.topic || "BAB 1: Konsep Dasar Ilmu Ekonomi",
      subBab: mat.subBab || "1.1 Masalah Utama",
      tags: (mat.tags || []).join(", ")
    });
    setIsAddModalOpen(true);
  };

  // Save Add/Edit Material
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.driveUrl) {
      alert("Harap isi Judul dan Link Google Drive / Media!");
      return;
    }
    if (formData.targetClasses.length === 0) {
      alert("Harap pilih setidaknya 1 Target Kelas!");
      return;
    }

    const { embedUrl, detectedType } = convertToEmbedUrl(formData.driveUrl, formData.type);
    const tagsArray = formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    
    const isAllSelected = availableClasses.length > 0 && formData.targetClasses.length === availableClasses.length;
    const classNameStr = isAllSelected ? "Semua Kelas" : formData.targetClasses.join(", ");

    const finalBab = formData.bab.trim() || formData.topic.trim() || "BAB Pembelajaran Umum";
    const finalSubBab = formData.subBab.trim() || "1.1 Pembelajaran";

    if (editingMaterial) {
      const updated: LearningMaterial = {
        ...editingMaterial,
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        className: classNameStr,
        targetClasses: formData.targetClasses,
        type: detectedType || formData.type,
        driveUrl: formData.driveUrl,
        embedUrl: embedUrl,
        topic: finalBab,
        bab: finalBab,
        subBab: finalSubBab,
        tags: tagsArray
      };
      onEditMaterial(updated);
      if (activeStudioMaterial?.id === updated.id) {
        setActiveStudioMaterial(updated);
      }
    } else {
      const newMat: LearningMaterial = {
        id: `mat-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        className: classNameStr,
        targetClasses: formData.targetClasses,
        type: detectedType || formData.type,
        driveUrl: formData.driveUrl,
        embedUrl: embedUrl,
        topic: finalBab,
        bab: finalBab,
        subBab: finalSubBab,
        createdAt: new Date().toISOString().split("T")[0],
        fileSize: detectedType === "video" ? "Streaming Video" : "Google Drive Media",
        tags: tagsArray,
        notes: []
      };
      onAddMaterial(newMat);
    }

    setIsAddModalOpen(false);
  };

  // Add note in Studio
  const handleAddNoteInStudio = () => {
    if (!noteInputText.trim() || !activeStudioMaterial) return;
    
    const newNoteObj: LearningMaterialNote = {
      id: `n-${Date.now()}`,
      timestamp: noteTimestampInput.trim() || "Catatan Mengajar",
      content: noteInputText.trim(),
      createdAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };

    const updatedNotes = [...(activeStudioMaterial.notes || []), newNoteObj];
    const updatedMat = { ...activeStudioMaterial, notes: updatedNotes };

    onEditMaterial(updatedMat);
    setActiveStudioMaterial(updatedMat);
    if (onAddMaterialNote) {
      onAddMaterialNote(activeStudioMaterial.id, noteInputText.trim(), noteTimestampInput.trim());
    }

    setNoteInputText("");
    setNoteTimestampInput("");
  };

  // Laser Pointer Handler
  const handleMouseMoveStudio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLaserPointerActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setLaserPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Stats calculation
  const totalCount = materials.length;
  const pptCount = materials.filter(m => m.type === "presentation").length;
  const videoCount = materials.filter(m => m.type === "video").length;
  const docCount = materials.filter(m => m.type === "document" || m.type === "link").length;

  return (
    <div className="space-y-6" id="ruang-belajar-container">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden" id="ruang-belajar-header">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <HardDrive size={280} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-indigo-200 border border-white/10 flex items-center gap-1.5">
                <HardDrive size={12} className="text-emerald-400" />
                {isStudent ? "Portal Belajar Digital Siswa" : "E-Learning & Google Drive Storage Integration"}
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-400/30">
                {isStudent ? "Akses Interaktif" : "0% Beban Database"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
              <MonitorPlay className="text-indigo-400" size={32} />
              {isStudent ? "Ruang Belajar Interaktif Siswa" : "Ruang Belajar Interaktif Guru"}
            </h1>
            <p className="text-xs md:text-sm text-indigo-100/90 max-w-2xl leading-relaxed font-medium">
              {isStudent 
                ? "Selamat datang di Ruang Belajar! Silakan pelajari materi PowerPoint, Google Slides, modul dokumen, dan video pembelajaran interaktif yang disediakan oleh guru."
                : "Studio tayang PowerPoint, Google Slides, dan Video pembelajaran interaktif. Seluruh media tersimpan di **Google Drive** Anda sehingga ruang penyimpanan database tetap hemat & ringan!"}
            </p>
          </div>

          {!isStudent && (
            <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpenAddModal}
                className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer border border-indigo-400/30"
                id="btn-add-material-drive"
              >
                <Plus size={16} />
                <span>Tambah Materi Google Drive</span>
              </motion.button>

              <button
                onClick={() => setIsDriveGuideModalOpen(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-indigo-100 font-bold text-xs rounded-xl flex items-center gap-1.5 justify-center cursor-pointer transition-colors border border-white/10"
                id="btn-drive-guide"
              >
                <HelpCircle size={14} className="text-emerald-400" />
                <span>Panduan Link Google Drive</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats Counter */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Total Media</span>
              <span className="text-xl font-black font-display text-white">{totalCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Layers size={18} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">PowerPoint & Slides</span>
              <span className="text-xl font-black font-display text-amber-300">{pptCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Presentation size={18} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Video Pembelajaran</span>
              <span className="text-xl font-black font-display text-rose-300">{videoCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
              <FileVideo size={18} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Modul & Dokumen</span>
              <span className="text-xl font-black font-display text-emerald-300">{docCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <FileText size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Bar */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTabMode("catalog")}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "catalog"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-ruang-catalog"
          >
            <BookOpen size={15} />
            <span>Katalog & Pustaka Media ({filteredMaterials.length})</span>
          </button>

          <button
            onClick={() => {
              if (!activeStudioMaterial && materials.length > 0) {
                setActiveStudioMaterial(materials[0]);
              }
              setActiveTabMode("studio");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "studio"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-ruang-studio"
          >
            <Tv size={15} />
            <span>Studio Mengajar Interaktif</span>
            {activeStudioMaterial && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTabMode("student")}
            className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === "student"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            id="tab-btn-ruang-student"
          >
            <Eye size={15} />
            <span>Mode Tampilan Siswa</span>
          </button>

          
        </div>

        {/* Class selector quick indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Kelas Aktif:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-indigo-700 outline-none focus:border-indigo-500"
          >
            <option value="all">Semua Kelas</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: MEDIA CATALOG & LIBRARY */}
      {activeTabMode === "catalog" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari materi, BAB, Sub-BAB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-400"
                  id="search-materials-input"
                />
              </div>

              {/* View Mode Switcher Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCatalogViewMode("bab")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogViewMode === "bab"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Urutkan & Kelompokkan berdasarkan BAB dan Sub-BAB"
                  id="view-mode-bab-btn"
                >
                  <FolderTree size={14} className="text-indigo-600" />
                  <span className="hidden sm:inline">Urutkan BAB & Sub-BAB</span>
                  <span className="sm:hidden">BAB</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogViewMode("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogViewMode === "grid"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilan Kartu Grid"
                  id="view-mode-grid-btn"
                >
                  <Layers size={14} className="text-slate-500" />
                  <span className="hidden sm:inline">Kartu Grid</span>
                  <span className="sm:hidden">Grid</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter size={12} /> Tipe:
              </span>
              {[
                { id: "all", label: "Semua" },
                { id: "presentation", label: "PPT / Slides" },
                { id: "video", label: "Video" },
                { id: "document", label: "Dokumen" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTypeFilter === t.id
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* MODE 1: HIERARCHICAL BAB & SUB-BAB VIEW */}
          {catalogViewMode === "bab" ? (
            Object.keys(groupedByBab).length > 0 ? (
              <div className="space-y-6" id="bab-grouped-view">
                {Object.entries(groupedByBab).map(([babTitle, subBabMap]) => {
                  const isCollapsed = !!collapsedBabs[babTitle];
                  const totalMatCount = Object.values(subBabMap).reduce((sum, arr) => sum + arr.length, 0);

                  return (
                    <div 
                      key={babTitle} 
                      className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                    >
                      {/* BAB Header Banner */}
                      <div 
                        onClick={() => toggleBabCollapse(babTitle)}
                        className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold shrink-0">
                            <FolderTree size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                                BAB Pembelajaran
                              </span>
                              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                                {totalMatCount} Materi Tersedia
                              </span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black font-display tracking-tight text-white mt-0.5 group-hover:text-indigo-200 transition-colors">
                              {babTitle}
                            </h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-200/80 hidden sm:inline">
                            {isCollapsed ? "Tampilkan Isi BAB" : "Sembunyikan"}
                          </span>
                          <div className={`p-2 rounded-xl bg-white/10 text-slate-300 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}>
                            <ChevronDown size={18} />
                          </div>
                        </div>
                      </div>

                      {/* Sub-BAB & Materials List Container */}
                      {!isCollapsed && (
                        <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50">
                          {Object.entries(subBabMap).map(([subBabTitle, matList]) => (
                            <div key={subBabTitle} className="space-y-3">
                              {/* Sub-BAB Badge Line */}
                              <div className="flex items-center gap-3">
                                <div className="px-3 py-1 bg-white border border-indigo-200 rounded-xl shadow-2xs flex items-center gap-2 text-indigo-800 font-extrabold text-xs">
                                  <Bookmark size={14} className="text-indigo-600 fill-indigo-100" />
                                  <span>Sub-BAB: {subBabTitle}</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  <span className="text-[11px] font-bold text-slate-500">{matList.length} Media</span>
                                </div>
                                <div className="h-px bg-slate-200 flex-1" />
                              </div>

                              {/* Materials Cards Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {matList.map((mat) => {
                                  const isPPT = mat.type === "presentation";
                                  const isVid = mat.type === "video";

                                  return (
                                    <div 
                                      key={mat.id}
                                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                                      id={`material-bab-card-${mat.id}`}
                                    >
                                      <div className="space-y-2.5">
                                        {/* Header Type & Target Classes */}
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                            isPPT 
                                              ? "bg-amber-100 text-amber-900 border border-amber-200" 
                                              : isVid 
                                              ? "bg-rose-100 text-rose-900 border border-rose-200"
                                              : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                          }`}>
                                            {isPPT ? <Presentation size={11} /> : isVid ? <FileVideo size={11} /> : <FileText size={11} />}
                                            <span>{isPPT ? "PowerPoint / Slides" : isVid ? "Video" : "Dokumen"}</span>
                                          </span>

                                          <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                            {mat.className}
                                          </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xs sm:text-sm font-black text-slate-800 line-clamp-2 leading-snug font-display group-hover:text-indigo-600 transition-colors">
                                          {mat.title}
                                        </h3>

                                        {/* Description */}
                                        {mat.description && (
                                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                            {mat.description}
                                          </p>
                                        )}

                                        {/* Drive link */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono truncate">
                                          <HardDrive size={12} className="text-emerald-500 shrink-0" />
                                          <span className="truncate">{mat.driveUrl}</span>
                                        </div>
                                      </div>

                                      {/* Card Actions */}
                                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                          onClick={() => handleLaunchStudio(mat)}
                                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                        >
                                          <Tv size={13} />
                                          <span>{isStudent ? "Pelajari Materi" : "Tayangkan Studio"}</span>
                                        </button>

                                        <div className="flex items-center gap-1">
                                          {!isStudent ? (
                                            <>
                                              <button
                                                onClick={() => handleOpenEditModal(mat)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                title="Edit Materi"
                                              >
                                                <Edit3 size={14} />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (confirm(`Hapus materi "${mat.title}"?`)) {
                                                    onDeleteMaterial(mat.id);
                                                  }
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Hapus Materi"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </>
                                          ) : (
                                            <a
                                              href={mat.driveUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                                              title="Buka File Asli Google Drive"
                                            >
                                              <ExternalLink size={13} /> Drive
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                <FolderTree size={40} className="mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-700">Tidak Ada Materi Ditemukan</h3>
                <p className="text-xs text-slate-500">Silakan sesuaikan filter kelas atau kata kunci pencarian Anda.</p>
              </div>
            )
          ) : (
            /* MODE 2: CLASSIC GRID CARDS */
            filteredMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="materials-grid">
                {filteredMaterials.map((mat) => {
                  const isPPT = mat.type === "presentation";
                  const isVid = mat.type === "video";

                  return (
                    <motion.div
                      key={mat.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      id={`material-card-${mat.id}`}
                    >
                      <div>
                        {/* Media Header Banner */}
                        <div className={`p-4 relative flex items-start justify-between ${
                          isPPT 
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white" 
                            : isVid 
                            ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white"
                            : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white"
                        }`}>
                          <div className="space-y-1 pr-8">
                            <span className="px-2 py-0.5 bg-black/20 text-white rounded-md text-[9px] font-black uppercase tracking-wider inline-block">
                              {mat.className} • {mat.subject}
                            </span>
                            <h3 className="text-sm font-black line-clamp-2 leading-snug font-display">
                              {mat.title}
                            </h3>
                          </div>

                          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                            {isPPT ? <Presentation size={20} /> : isVid ? <FileVideo size={20} /> : <FileText size={20} />}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {mat.bab && (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                <FolderTree size={12} className="text-indigo-600" />
                                <span className="truncate">{mat.bab}</span>
                              </div>
                            )}

                            {mat.subBab && (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                                <Bookmark size={11} className="text-indigo-500" />
                                <span className="truncate">{mat.subBab}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {mat.description || "Tidak ada deskripsi tambahan."}
                          </p>

                          {/* Google Drive Link Preview Pill */}
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                            <HardDrive size={14} className="text-emerald-600 shrink-0" />
                            <span className="text-slate-500 truncate font-mono text-[10px]">
                              {mat.driveUrl}
                            </span>
                          </div>

                          {/* Tags */}
                          {mat.tags && mat.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mat.tags.map((t, i) => (
                                <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="p-4 pt-0 border-t border-slate-100/80 flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          {!isStudent && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(mat)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                title="Edit Materi"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus materi "${mat.title}"?`)) {
                                    onDeleteMaterial(mat.id);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="Hapus Materi"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                          <a
                            href={mat.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Buka Langsung di Google Drive"
                          >
                            <ExternalLink size={15} />
                          </a>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleLaunchStudio(mat)}
                          className={`px-3.5 py-2 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer ${
                            isPPT 
                              ? "bg-amber-600 hover:bg-amber-700" 
                              : isVid 
                              ? "bg-rose-600 hover:bg-rose-700"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                          id={`btn-launch-studio-${mat.id}`}
                        >
                          <Play size={14} />
                          <span>{isStudent ? "Pelajari Sekarang" : "Mulai Tayang"}</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <HardDrive size={32} />
                </div>
                <h3 className="text-base font-bold text-slate-700">Belum Ada Materi Pembelajaran</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tambahkan link Google Drive (PowerPoint, Google Slides, Video, atau Dokumen PDF) untuk memulai mengajar di kelas.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Tambah Materi Baru</span>
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* VIEW 2: INTERACTIVE TEACHING STUDIO (STUDIO MENGAJAR) */}
      {activeTabMode === "studio" && (
        <div className="space-y-4" id="studio-teaching-view">
          {activeStudioMaterial ? (
            <div className={`bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col ${
              isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : ""
            }`}>
              {/* Studio Top Control Header */}
              <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-white flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    activeStudioMaterial.type === "presentation" 
                      ? "bg-amber-500 text-slate-950" 
                      : activeStudioMaterial.type === "video"
                      ? "bg-rose-500 text-white"
                      : "bg-indigo-500 text-white"
                  }`}>
                    {activeStudioMaterial.type === "presentation" ? "PowerPoint / Slides" : activeStudioMaterial.type}
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-white font-display">
                      {activeStudioMaterial.title}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Kelas {activeStudioMaterial.className} • {activeStudioMaterial.subject} • {activeStudioMaterial.topic || "Media Mengajar"}
                    </p>
                  </div>
                </div>

                {/* Studio Tools Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLaserPointerActive(!isLaserPointerActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLaserPointerActive 
                        ? "bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50" 
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    title="Aktifkan Pointer Laser Merah di Layar Presentasi"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Laser Pointer</span>
                  </button>

                  <a
                    href={activeStudioMaterial.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <HardDrive size={14} className="text-emerald-400" />
                    <span>Drive</span>
                  </a>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer"
                    title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh (Fullscreen)"}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Main Embed Display Canvas */}
              <div 
                className="relative bg-black w-full min-h-[480px] md:min-h-[560px] flex items-center justify-center overflow-hidden"
                onMouseMove={handleMouseMoveStudio}
              >
                {/* Laser Pointer Render Overlay */}
                {isLaserPointerActive && (
                  <div 
                    className="absolute z-40 pointer-events-none w-6 h-6 rounded-full bg-rose-500/80 blur-[2px] shadow-[0_0_15px_#f43f5e] transform -translate-x-1/2 -translate-y-1/2 border-2 border-white"
                    style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
                  />
                )}

                {/* IFrame Container */}
                {activeStudioMaterial.embedUrl ? (
                  <iframe
                    src={activeStudioMaterial.embedUrl}
                    title={activeStudioMaterial.title}
                    className="w-full h-full absolute inset-0 border-none"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center text-slate-400 p-8 space-y-2">
                    <Info size={32} className="mx-auto text-amber-400" />
                    <p className="text-sm font-bold">Link Embed Tidak Valid</p>
                    <p className="text-xs">Pastikan link Google Drive sudah diatur publik ("Siapa saja yang memiliki link").</p>
                  </div>
                )}
              </div>

              {/* Studio Bottom Toolbar & Live Teacher Note Drawer */}
              <div className="bg-slate-950 p-4 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Quick Material Switcher Rail */}
                <div className="lg:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pilihan Materi Kelas {activeStudioMaterial.className}:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {materials.filter(m => m.className === activeStudioMaterial.className).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setActiveStudioMaterial(m)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer border ${
                          activeStudioMaterial.id === m.id
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {m.type === "presentation" ? <Presentation size={14} className="text-amber-400" /> : <FileVideo size={14} className="text-rose-400" />}
                        <span className="max-w-[140px] truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Live Teaching Notes */}
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    <Edit3 size={12} /> Catatan Momen Mengajar
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Timestamp (Contoh: Slide 4 / 05:20)"
                      value={noteTimestampInput}
                      onChange={(e) => setNoteTimestampInput(e.target.value)}
                      className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Tulis instruksi / pertanyaan siswa..."
                      value={noteInputText}
                      onChange={(e) => setNoteInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddNoteInStudio()}
                      className="w-2/3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddNoteInStudio}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
                    >
                      Simpan
                    </button>
                  </div>

                  {/* Display notes list */}
                  {activeStudioMaterial.notes && activeStudioMaterial.notes.length > 0 && (
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pt-1">
                      {activeStudioMaterial.notes.map((n) => (
                        <div key={n.id} className="text-[11px] bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex items-start justify-between text-slate-300">
                          <div>
                            <span className="font-bold text-indigo-400 mr-1 font-mono">[{n.timestamp}]:</span>
                            <span>{n.content}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 shrink-0 ml-2">{n.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
              <Tv size={40} className="mx-auto text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800">Pilih Materi Untuk Ditayangkan</h3>
              <p className="text-xs text-slate-500">Pilih salah satu media PowerPoint atau Video dari Katalog Media.</p>
              <button
                onClick={() => setActiveTabMode("catalog")}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Buka Katalog Media
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MODE TAMPILAN SISWA (STUDENT PREVIEW PORTAL) */}
      {activeTabMode === "student" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6" id="student-preview-view">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Eye size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950">Simulasi Tampilan Portal Siswa</h3>
                <p className="text-xs text-emerald-800">
                  Berikut adalah antarmuka e-learning yang diakses siswa untuk menyimak slide PowerPoint dan video tayangan Anda.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black">
              Mode Siswa Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMaterials.map((mat) => (
              <div key={mat.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded-md">
                    {mat.subject} • {mat.className}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{mat.createdAt}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{mat.title}</h4>
                <p className="text-xs text-slate-600">{mat.description}</p>
                <button
                  onClick={() => handleLaunchStudio(mat)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Play size={14} /> Simak Materi Pembelajaran (Google Drive)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      

      {/* MODAL: TAMBAH / EDIT MATERI GOOGLE DRIVE */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 font-display">
                      {editingMaterial ? "Edit Materi E-Learning" : "Tambah Materi Pembelajaran Baru"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Integrasi media pembelajaran via Google Drive</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Judul Materi / Slide PowerPoint: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PowerPoint Bab 1 - Masalah Ekonomi Interaktif"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Target Kelas (Multi-Select) & Mata Pelajaran */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        <span>Target Kelas (Bisa Pilih Lebih dari 1): *</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllClasses}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllClasses}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
                        >
                          Bersihkan
                        </button>
                      </div>
                    </div>

                    {/* Class Pills Grid */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {availableClasses.map(cls => {
                          const isSelected = formData.targetClasses.includes(cls);
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleClassSelection(cls)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-xs border border-indigo-600"
                                  : "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                              }`}
                            >
                              <CheckCircle2 size={13} className={isSelected ? "text-emerald-300" : "text-slate-300"} />
                              <span>{cls}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
                        {formData.targetClasses.length === 0 ? (
                          <span className="text-rose-500 font-bold">⚠️ Belum ada kelas dipilih (minimal 1)</span>
                        ) : formData.targetClasses.length === availableClasses.length ? (
                          <span className="text-emerald-600 font-bold">✨ Ditargetkan ke Semua Kelas</span>
                        ) : (
                          <span>Target: <strong className="text-indigo-600 font-bold">{formData.targetClasses.length} kelas</strong> ({formData.targetClasses.join(", ")})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Mata Pelajaran: *</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Media Type */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tipe Media: *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as MaterialType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="presentation">PowerPoint / Google Slides</option>
                    <option value="video">Video Pembelajaran (YouTube / Drive)</option>
                    <option value="document">Modul PDF / Google Docs</option>
                  </select>
                </div>

                {/* BAB & Sub-BAB Hierarchical Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                  <div>
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1 mb-1">
                      <FolderTree size={13} className="text-indigo-600" />
                      <span>BAB Pembelajaran: *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: BAB 1: Konsep Dasar Ekonomi"
                      value={formData.bab}
                      onChange={(e) => setFormData({ ...formData, bab: e.target.value, topic: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1 mb-1">
                      <Bookmark size={13} className="text-indigo-600" />
                      <span>Sub-BAB Pembelajaran: *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 1.1 Kelangkaan & Kebutuhan"
                      value={formData.subBab}
                      onChange={(e) => setFormData({ ...formData, subBab: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Google Drive Link */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <HardDrive size={14} className="text-emerald-600" /> Link Google Drive / YouTube: *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDriveGuideModalOpen(true)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      Cara ambil link Drive?
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="Tempelkan URL Google Drive / Slides / YouTube (https://docs.google.com/presentation/...)"
                    value={formData.driveUrl}
                    onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sistem akan mengkonversi link bagikan Google Drive/Slides Anda secara otomatis ke format tayangan iFrame.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Singkat Materi:</label>
                  <textarea
                    rows={3}
                    placeholder="Tulis ringkasan cakupan materi pembelajaran ini..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tag (pisahkan dengan koma):</label>
                  <input
                    type="text"
                    placeholder="PowerPoint, Interaktif, Kelangkaan"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} /> Simpan Materi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PANDUAN LINK GOOGLE DRIVE */}
      <AnimatePresence>
        {isDriveGuideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsDriveGuideModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 w-full max-w-lg relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-base font-display">
                  <HardDrive size={20} className="text-emerald-600" />
                  <span>Panduan Integrasi Google Drive</span>
                </div>
                <button
                  onClick={() => setIsDriveGuideModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <p>
                  Untuk memastikan database tidak cepat penuh oleh file besar (seperti PowerPoint .pptx atau Video HD), gunakan akun Google Drive Anda:
                </p>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Upload file PowerPoint (.pptx), Google Slides, atau Video ke **Google Drive** Anda.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Klik kanan file di Drive → **Bagikan (Share)** → Ubah akses menjadi **"Siapa saja yang memiliki link" (Anyone with link)**.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Salin link tersebut dan tempelkan ke kolom form **Link Google Drive** di aplikasi ini.</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-semibold">
                  <strong>Otomatisasi Sistem:</strong> Sistem akan mengkonversi URL bagikan Anda menjadi pemutar embed interaktif secara instan!
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsDriveGuideModalOpen(false)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Saya Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
