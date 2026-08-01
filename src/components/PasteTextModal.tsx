import React, { useState } from 'react';
import { X, FileText, Check, ArrowRight } from 'lucide-react';

interface PasteTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportParsedText: (text: string) => void;
}

export const PasteTextModal: React.FC<PasteTextModalProps> = ({
  isOpen,
  onClose,
  onImportParsedText,
}) => {
  const [pastedText, setPastedText] = useState('');

  if (!isOpen) return null;

  const handleProcess = () => {
    if (pastedText.trim().length > 0) {
      onImportParsedText(pastedText.trim());
      setPastedText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Paste Teks Daftar Customer</h3>
              <p className="text-xs text-slate-400">Tempelkan teks nama/nomor customer dari WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <strong>Format yang didukung:</strong>
            <p className="mt-1 text-slate-400">
              Setiap baris berisi satu customer. Contoh:<br />
              <code className="text-emerald-300">1. Budi Santoso (Wisuda)</code><br />
              <code className="text-emerald-300">2. Siti Rahma - Keluarga</code>
            </p>
          </div>

          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Tempelkan list customer dari WhatsApp di sini..."
            rows={8}
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleProcess}
            disabled={!pastedText.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <span>Proses Teks</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
