import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  PenTool, 
  QrCode, 
  Check, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Image as ImageIcon,
  CheckCircle2,
  FileSignature
} from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { generateOfficialTteBadge, makeSignatureBackgroundTransparent } from '../lib/tteUtils';

export interface TteSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: 'guru' | 'kepsek';
  onTargetChange?: (target: 'guru' | 'kepsek') => void;
  signerName: string;
  signerNip: string;
  institution?: string;
  city?: string;
  currentTteImageUrl?: string;
  useTte?: boolean;
  onSave: (imageUrl: string, useTte: boolean, target: 'guru' | 'kepsek') => void;
}

export default function TteSignatureModal({
  isOpen,
  onClose,
  targetRole = 'guru',
  onTargetChange,
  signerName,
  signerNip,
  institution = 'SMA Negeri 2 Tasikmalaya',
  city = 'Tasikmalaya',
  currentTteImageUrl = '',
  useTte = true,
  onSave
}: TteSignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'draw' | 'qr'>('upload');
  const [currentTarget, setCurrentTarget] = useState<'guru' | 'kepsek'>(targetRole);
  const [previewImage, setPreviewImage] = useState<string>(currentTteImageUrl || '');
  const [enableTte, setEnableTte] = useState<boolean>(useTte);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoTransparent, setAutoTransparent] = useState(true);

  // Canvas drawing states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState<'#0f172a' | '#1e3a8a'>('#0f172a'); // Black or Blue Ink
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Synchronize when opened or props update
  useEffect(() => {
    if (isOpen) {
      setCurrentTarget(targetRole);
      setPreviewImage(currentTteImageUrl || '');
      setEnableTte(useTte);
      setHasDrawn(false);
      setHistory([]);
    }
  }, [isOpen, targetRole, currentTteImageUrl, useTte]);

  // Set up canvas context when drawing tab is selected
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = penColor;
      }
    }
  }, [activeTab, penColor]);

  if (!isOpen) return null;

  // Handle uploading signature image
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const compressed = await compressImage(file, 800, 0.9);
      let finalImg = compressed;
      if (autoTransparent) {
        finalImg = await makeSignatureBackgroundTransparent(compressed);
      }
      setPreviewImage(finalImg);
      setEnableTte(true);
    } catch (err) {
      console.error('Gagal memproses gambar TTE:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save history state for undo
    setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setPreviewImage(canvas.toDataURL('image/png'));
      setEnableTte(true);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    setPreviewImage('');
  };

  const undoCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevSnapshot = history[history.length - 1];
    ctx.putImageData(prevSnapshot, 0, 0);
    setHistory(prev => prev.slice(0, prev.length - 1));
    setPreviewImage(canvas.toDataURL('image/png'));
  };

  // Generate official QR Code TTE Badge
  const handleGenerateQrBadge = async () => {
    try {
      setIsProcessing(true);
      const roleLabel = currentTarget === 'guru' ? 'Guru Mata Pelajaran' : 'Kepala Sekolah';
      const badgeDataUrl = await generateOfficialTteBadge({
        signerName,
        nip: signerNip,
        role: roleLabel,
        institution,
        city
      });
      setPreviewImage(badgeDataUrl);
      setEnableTte(true);
    } catch (err) {
      console.error('Gagal generate QR TTE:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Save
  const handleSave = () => {
    onSave(previewImage, enableTte, currentTarget);
    onClose();
  };

  // Handle Remove TTE
  const handleRemove = () => {
    setPreviewImage('');
    setEnableTte(false);
    clearCanvas();
  };

  const roleTitle = currentTarget === 'guru' ? 'Guru Mata Pelajaran' : 'Kepala Sekolah';
  const todayFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
                <FileSignature size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide">Pengaturan Tanda Tangan Elektronik (TTE)</h3>
                <p className="text-[11px] text-indigo-100 font-medium">
                  Isi kolom tanda tangan pengesahan dengan gambar TTE resmi atau QR verifikasi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 max-h-[78vh]">
            {/* Target Switcher (Guru vs Kepala Sekolah) */}
            {onTargetChange && (
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTarget('guru');
                    onTargetChange('guru');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentTarget === 'guru'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🖋️ TTE Guru Mata Pelajaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTarget('kepsek');
                    onTargetChange('kepsek');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    currentTarget === 'kepsek'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏛️ TTE Kepala Sekolah
                </button>
              </div>
            )}

            {/* Toggle Switch: Enable TTE on Column */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  Aktifkan Gambar TTE pada Kolom Tanda Tangan
                </label>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Jika aktif, kolom tanda tangan akan menampilkan gambar TTE. Jika tidak, kolom dibiarkan kosong untuk tanda tangan basah.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={enableTte}
                  onChange={(e) => setEnableTte(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Method Tabs */}
            <div className="space-y-3">
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'upload'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload size={14} /> Unggah Berkas Gambar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'draw'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <PenTool size={14} /> Gores Tanda Tangan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className={`pb-2.5 px-3 text-xs font-extrabold flex items-center gap-1.5 border-b-2 transition-all ${
                    activeTab === 'qr'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <QrCode size={14} /> Barcode / QR TTE Resmi
                </button>
              </div>

              {/* Tab 1: Upload File */}
              {activeTab === 'upload' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-xl p-5 text-center transition-colors">
                    <input
                      type="file"
                      id="tte-file-input"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="tte-file-input" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {isProcessing ? 'Memproses Berkas...' : 'Klik atau Tarik Foto Tanda Tangan ke Sini'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Format PNG transparan atau foto kertas (JPG/PNG), maks 5 MB
                      </p>
                    </label>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={autoTransparent}
                        onChange={(e) => setAutoTransparent(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Otomatis hapus latar belakang putih (transparan)</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                      ✨ Rekomendasi
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Canvas Drawing */}
              {activeTab === 'draw' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Goreskan tanda tangan Anda:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPenColor('#0f172a')}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          penColor === '#0f172a' ? 'scale-110 border-indigo-600' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: '#0f172a' }}
                        title="Tinta Hitam Resmi"
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#1e3a8a')}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          penColor === '#1e3a8a' ? 'scale-110 border-indigo-600' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: '#1e3a8a' }}
                        title="Tinta Biru Pulpen"
                      />
                      <button
                        type="button"
                        onClick={undoCanvas}
                        disabled={history.length === 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs flex items-center gap-1"
                        title="Urungkan goresan terakhir"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs flex items-center gap-1 font-semibold"
                        title="Bersihkan kanvas"
                      >
                        <Trash2 size={12} /> Bersihkan
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={170}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[160px] cursor-crosshair touch-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-center">
                    Gunakan mouse di komputer atau jari/stylus di smartphone / tablet.
                  </p>
                </div>
              )}

              {/* Tab 3: Official QR / Barcode TTE Generator */}
              {activeTab === 'qr' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles size={14} className="text-emerald-600" />
                      TTE Resmi Standar BSrE & Kurikulum Merdeka
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-800 font-medium">
                      Menghasilkan segel digital ber-QR Code dengan data sertifikasi nama penandatangan, NIP, instansi sekolah, dan stempel verifikasi elektronik.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQrBadge}
                    disabled={isProcessing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <QrCode size={16} />
                    <span>{isProcessing ? 'Menghasilkan Segel TTE...' : 'Generate & Pasang QR Code TTE Resmi'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* LIVE PREVIEW SECTION (Matches the user's uploaded signature image exactly) */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-indigo-600" />
                  Pratinjau Tampilan Kolom Tanda Tangan:
                </span>
                {previewImage && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Hapus Gambar TTE
                  </button>
                )}
              </div>

              {/* Simulated Paper Signature Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-inner flex justify-center">
                <div className="text-center min-w-[240px] max-w-[320px]">
                  <p className="text-xs font-bold text-slate-800">
                    {city}, {todayFormatted}
                    <br />
                    <span className="font-bold">{roleTitle}</span>
                  </p>

                  {/* TTE Display or Manual Space */}
                  <div className="my-2 min-h-[70px] flex items-center justify-center">
                    {enableTte && previewImage ? (
                      <div className="relative group p-1 border border-indigo-200 bg-indigo-50/30 rounded-xl">
                        <img
                          src={previewImage}
                          alt="Tanda Tangan Elektronik"
                          className="max-h-[64px] max-w-[240px] object-contain mx-auto"
                        />
                        <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                          TTE Aktif
                        </span>
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center text-slate-300 text-xs italic border-b border-dashed border-slate-200 w-full">
                        (Kolom Tanda Tangan Manual)
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-900 underline mt-1">
                    {signerName || 'Nama Penandatangan'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    NIP. {signerNip || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <Check size={16} />
                <span>Simpan & Terapkan TTE</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
