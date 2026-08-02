import React from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface ShareThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  receivedTime?: string;
  onProceedToMapping: () => void;
  onOpenDebugLogs?: () => void;
}

export const ShareThankYouModal: React.FC<ShareThankYouModalProps> = ({
  isOpen,
  onClose,
  fileName,
  receivedTime,
  onProceedToMapping,
}) => {
  if (!isOpen) return null;

  const displayTime = receivedTime || new Date().toLocaleTimeString('id-ID');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-5 space-y-4 text-center">
          {/* Hero Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          {/* Main Headline */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white">
              File Excel Diterima!
            </h2>
            <p className="text-xs text-emerald-300 font-medium">
              File yang Anda bagikan berhasil dibuka dan siap untuk diproses.
            </p>
          </div>

          {/* Card Info File */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Status File Diterima
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                SUKSES
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 shrink-0">Nama File:</span>
                <span className="font-mono text-slate-200 font-semibold truncate max-w-[200px] text-right">
                  {fileName || 'Excel_Share_Aplikasi.xlsx'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Waktu Diterima:</span>
                <span className="font-mono text-slate-300">{displayTime}</span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-slate-400">Status Data:</span>
                <span className="text-emerald-400 font-medium">Siap Pemetaannya</span>
              </div>
            </div>
          </div>

          {/* User Note */}
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs text-left leading-relaxed">
            💡 File Excel daftar customer telah diterima. Silakan atur pemetaan kolom agar data dapat langsung dimasukkan ke dalam antrean studio.
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onProceedToMapping();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Lanjutkan ke Pemetaan Kolom Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-all cursor-pointer"
            >
              <span>Tutup &amp; Lihat Nanti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
