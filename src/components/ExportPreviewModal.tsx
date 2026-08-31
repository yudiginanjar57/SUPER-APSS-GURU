import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'xlsx' | 'pdf') => void;
  data: any[];
  title: string;
  columns: string[];
}

export default function ExportPreviewModal({ isOpen, onClose, onConfirm, data, title, columns }: PreviewModalProps) {
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
            <table className="w-full text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-400">
                <tr>
                  {columns.map(col => <th key={col} className="p-3 text-left">{col}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {columns.map(col => <td key={col} className="p-3">{row[col] ?? '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && <p className="text-slate-400 text-xs mt-4">... dan {data.length - 10} baris lainnya</p>}
          </div>
          <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-xl">Batal</button>
            <button onClick={() => onConfirm('xlsx')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
              <FileSpreadsheet size={14} /> Download XLSX
            </button>
            <button onClick={() => onConfirm('pdf')} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700">
              <FileText size={14} /> Download PDF
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
