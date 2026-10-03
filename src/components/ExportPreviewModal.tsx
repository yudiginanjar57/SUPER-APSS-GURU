import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText, Printer } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'xlsx' | 'pdf' | 'print', includeSignatures?: boolean) => void;
  data: any[];
  title: string;
  columns: string[];
}

export default function ExportPreviewModal({ isOpen, onClose, onConfirm, data, title, columns }: PreviewModalProps) {
  const [includeSignatures, setIncludeSignatures] = React.useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Preview: {title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-400 whitespace-nowrap">
                  <tr>
                    <th className="p-3 text-center w-10">No</th>
                    {columns.map(col => <th key={col} className="p-3 text-left whitespace-nowrap">{col}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                  {data.slice(0, 15).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      {columns.map(col => {
                        const val = row[col] ?? '-';
                        let badgeClass = "";
                        if (val === "H") badgeClass = "bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded";
                        else if (val === "S") badgeClass = "bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded";
                        else if (val === "I") badgeClass = "bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded";
                        else if (val === "A") badgeClass = "bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded";
                        else if (val === "TM") badgeClass = "bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded";

                        return (
                          <td key={col} className="p-3 whitespace-nowrap">
                            {badgeClass ? <span className={badgeClass}>{val}</span> : val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 15 && <p className="text-slate-400 text-xs mt-4">... dan {data.length - 15} baris siswa lainnya</p>}
          </div>
          <div className="p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            {/* Opsi TTD */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors" id="preview-ttd-toggle-label">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                id="preview-include-signatures-checkbox"
              />
              <span className="font-bold text-slate-800">Sertakan Tanda Tangan (TTD / TTE)</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${includeSignatures ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                {includeSignatures ? "Ada TTD" : "Tanpa TTD"}
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl cursor-pointer">Batal</button>
              <button onClick={() => onConfirm('xlsx', includeSignatures)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-sm">
                <FileSpreadsheet size={14} /> Unduh Excel (.XLSX)
              </button>
              <button onClick={() => onConfirm('pdf', includeSignatures)} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer shadow-sm">
                <FileText size={14} /> Unduh File PDF (.PDF)
              </button>
              <button onClick={() => onConfirm('print', includeSignatures)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-sm">
                <Printer size={14} /> Cetak Langsung
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
