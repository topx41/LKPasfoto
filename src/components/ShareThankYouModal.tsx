import React from 'react';
import { CheckCircle2, FileSpreadsheet, FileText, ArrowRight, ShieldCheck, Share2, Bug, X } from 'lucide-react';

interface ShareThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  receivedTime?: string;
  onProceedToMapping: () => void;
  onOpenDebugLogs: () => void;
}

export const ShareThankYouModal: React.FC<ShareThankYouModalProps> = ({
  isOpen,
  onClose,
  fileName,
  receivedTime,
  onProceedToMapping,
  onOpenDebugLogs,
}) => {
  if (!isOpen) return null;

  const displayTime = receivedTime || new Date().toLocaleTimeString('id-ID');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-6 text-center">
          {/* Hero Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          {/* Main Headline */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Terima Kasih!
            </h2>
            <p className="text-sm text-emerald-300 font-medium">
              File / Data dari Share Intent Berhasil Diterima oleh Node 1 Receiver
            </p>
          </div>

          {/* Card Info Node 1 */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Status Node 1 (Receiver)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                SUKSES
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 shrink-0">Nama File:</span>
                <span className="font-mono text-slate-200 font-semibold truncate max-w-[220px] text-right">
                  {fileName || 'Excel_Share_WA.xlsx'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Waktu Terima:</span>
                <span className="font-mono text-slate-300">{displayTime}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Status Pemrosesan:</span>
                <span className="text-amber-300 font-medium">Dihentikan di Node 1 (Testing)</span>
              </div>
            </div>
          </div>

          {/* Testing Note */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs text-left leading-relaxed">
            💡 <strong>Sistem Isosiasi Node:</strong> Data telah berhasil ditangkap oleh Android Intent & Express Server tanpa crash. Pemrosesan data otomatis sengaja ditahan di Node 1 ini.
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                onClose();
                onProceedToMapping();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Lanjutkan ke Node 2 (Olah Pemetaan Kolom)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenDebugLogs();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <Bug className="w-4 h-4 text-sky-400" />
              <span>Lihat Detail Diagnostic Log & Tracing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
