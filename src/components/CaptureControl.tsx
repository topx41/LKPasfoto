import React from 'react';
import { Camera, PlusCircle, ArrowRight, Sparkles, Hash, Tag, UserCheck, ShieldCheck, RotateCcw } from 'lucide-react';
import { StudioSettings, Customer } from '../types';
import { generateFileName, formatFileNumber } from '../utils/filenameUtils';

interface CaptureControlProps {
  onCapture: () => void;
  activeCustomer: Customer | null;
  settings: StudioSettings;
  onNextCustomer: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onResetCounter?: (startFromNumber?: number) => void;
  totalCapturedToday: number;
}

export const CaptureControl: React.FC<CaptureControlProps> = ({
  onCapture,
  activeCustomer,
  settings,
  onNextCustomer,
  onOpenSearch,
  onOpenSettings,
  onResetCounter,
  totalCapturedToday,
}) => {
  const activeName = activeCustomer ? activeCustomer.name : 'Customer General';
  const nextFileName = generateFileName(settings, activeName);
  const formattedNumber = formatFileNumber(settings.currentNumber, settings.numberDigitCount);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Active Customer Banner */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Camera className="w-32 h-32 text-sky-400" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Customer Sedang Difoto
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {activeCustomer ? activeCustomer.name : 'Belum Ada Customer Selected'}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              {activeCustomer?.code && (
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">
                  ID: {activeCustomer.code}
                </span>
              )}
              {activeCustomer?.category && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                  {activeCustomer.category}
                </span>
              )}
              <span className="text-sky-400 font-semibold font-mono">
                📷 Total Foto Customer Ini: {activeCustomer ? activeCustomer.photoCount : 0}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSearch}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Ganti Customer
            </button>
            <button
              onClick={onNextCustomer}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>Next Customer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Target File Preview Card */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Format Nama File Hasil Capture Berikutnya:
            </span>
            <span className="text-lg sm:text-xl font-mono font-bold text-sky-300 truncate block">
              {nextFileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 shrink-0">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            Prefix: <strong className="text-slate-100">{settings.prefix}</strong>
          </div>
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
            <span>Nomor: <strong className="text-slate-100">#{formattedNumber}</strong></span>
            {onResetCounter && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onResetCounter(1);
                }}
                title="Reset nomor counter ke #1"
                className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset #1</span>
              </button>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className="text-sky-400 hover:underline text-[11px] font-sans font-medium"
          >
            Ubah Pengaturan
          </button>
        </div>
      </div>

      {/* MAIN ACTION BUTTONS: NEXT CUSTOMER (LEFT) & CAPTURE (RIGHT) */}
      <div className="flex flex-col items-center justify-center py-2 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
          {/* BIG NEXT CUSTOMER BUTTON (LEFT) */}
          <button
            onClick={onNextCustomer}
            type="button"
            className="group relative w-full sm:flex-1 px-6 py-4 sm:py-5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 border-2 border-sky-500/40 hover:border-sky-400 font-extrabold rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 text-base sm:text-lg cursor-pointer"
          >
            <UserCheck className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>NEXT CUSTOMER</span>
            <ArrowRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* BIG CAPTURE BUTTON (RIGHT) */}
          <button
            onClick={onCapture}
            type="button"
            className="group relative w-full sm:flex-1 px-6 py-4 sm:py-5 bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white font-extrabold rounded-2xl shadow-xl shadow-sky-500/25 active:scale-95 flex items-center justify-center gap-2.5 text-base sm:text-lg cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <span>CAPTURE / TAMBAH</span>
            <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded text-sky-100 font-normal hidden lg:inline-block">
              (Space)
            </span>
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>
            Klik <strong>NEXT CUSTOMER</strong> untuk ganti antrian customer, atau <strong>CAPTURE</strong> untuk rekap foto (+1).
          </span>
        </p>
      </div>
    </div>
  );
};
