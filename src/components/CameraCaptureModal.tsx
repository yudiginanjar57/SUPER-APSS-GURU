import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraCaptureModal({ onCapture, onClose, title = "Ambil Foto" }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Peramban Anda tidak mendukung akses kamera langsung secara WebRTC.");
      }

      let mediaStream: MediaStream;
      try {
        // Try back / environment camera first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to default video device
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
        setError("Akses kamera ditolak oleh peramban/perangkat. Silakan izinkan akses kamera pada ikon gembok browser Anda, atau gunakan opsi 'Unggah / Ambil Foto File' di bawah.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Kamera tidak ditemukan pada perangkat ini. Silakan gunakan opsi 'Unggah / Ambil Foto File' di bawah.");
      } else {
        setError(err.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan atau pilih foto dari perangkat.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoDataUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (photoDataUrl) {
      fetch(photoDataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };

  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Camera size={18} className="text-indigo-600" />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors text-slate-600">
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[320px]">
          {error ? (
            <div className="p-6 text-center text-white flex flex-col items-center justify-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
                <AlertCircle size={24} />
              </div>
              <p className="text-xs text-slate-200 mb-5 leading-relaxed font-medium">{error}</p>
              
              <div className="flex flex-col gap-2.5 w-full">
                <label className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/30">
                  <Upload size={16} />
                  <span>Ambil / Pilih Foto dari Kamera File</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handleFallbackFileSelect} 
                    className="hidden" 
                  />
                </label>
                
                <button 
                  onClick={startCamera}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} /> Coba Akses Kamera Lagi
                </button>
              </div>
            </div>
          ) : photoDataUrl ? (
            <img src={photoDataUrl} alt="Captured" className="max-w-full max-h-full object-contain" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-5 bg-white border-t border-slate-100 flex justify-center gap-4">
          {photoDataUrl ? (
            <>
              <button 
                onClick={retakePhoto}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={18} /> Ulangi
              </button>
              <button 
                onClick={confirmPhoto}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Check size={18} /> Gunakan Foto
              </button>
            </>
          ) : !error ? (
            <button 
              onClick={takePhoto}
              disabled={!stream}
              className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 border-4 border-indigo-100 flex items-center justify-center text-white transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Camera size={26} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
