import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Share2,
  X,
  Download,
  Mail,
  Smartphone,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Customer, PhotoRecord, StudioSession } from '../types';
import { generateExcelWorkbook } from '../utils/excelUtils';

interface ExportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoRecord[];
  customers: Customer[];
  activeSession: StudioSession;
}

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  isOpen,
  onClose,
  photos,
  customers,
  activeSession,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharingNative, setIsSharingNative] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const cleanSessionName = activeSession.name.trim().replace(/[/\\?%*:|"<>]/g, '_');
  const cleanDate = dateFormatted.trim().replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `Rekap Foto - ${cleanSessionName} - ${cleanDate}.xlsx`;

  const markedPhotosCount = photos.filter((p) => p.isMarked).length;

  // Summary Text
  const summaryText = `*REKAP FOTO LIANKHAY CAPTURE MANAGER*
*Nama Sesi:* ${activeSession.name}
*Tanggal:* ${dateFormatted} (${timeFormatted})
*Total Foto:* ${photos.length} file ${markedPhotosCount > 0 ? `(⭐ ${markedPhotosCount} Ditandai)` : ''}
*Total Customer:* ${customers.length} orang
*Prefix Sesi:* ${activeSession.prefix}
`;

  // Helper to get Excel File object
  const getExcelFile = () => {
    const bytes = generateExcelWorkbook(photos, customers, activeSession.name, dateFormatted, activeSession.prefix);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // 1. Implicit Intent via Web Share API (Android / OS Share Sheet)
  const handleNativeShare = async () => {
    setIsSharingNative(true);
    try {
      const file = getExcelFile();

      // Attempt 1: Native Share with File Attachment
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Rekap Foto Studio - ${activeSession.name}`,
            text: summaryText,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return; // User clicked cancel in native share dialog
          }
          console.log('Direct file sharing not accepted by browser/OS, falling back to download + text share:', shareErr);
        }
      }

      // Fallback: Direct Download .XLSX file FIRST
      handleDirectDownload();

      // Attempt 2: Native Share with Text Summary
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `Rekap Foto Studio - ${activeSession.name}`,
            text: `${summaryText}\n\n📁 File Excel (${fileName}) telah diunduh. Silakan lampirkan file Excel ini dalam pesan.`,
          });
        } catch (textShareErr: any) {
          if (textShareErr.name !== 'AbortError') {
            console.log('Text share error:', textShareErr);
          }
        }
      } else {
        alert(`File Excel (${fileName}) telah berhasil diunduh ke folder Download HP/Laptop Anda.\n\nSilakan buka aplikasi tujuan (WhatsApp, Email, Drive) dan pilih lampirkan file.`);
      }
    } catch (err: any) {
      console.error('Share process error:', err);
      handleDirectDownload();
    } finally {
      setIsSharingNative(false);
    }
  };

  // 2. Direct Browser Download
  const handleDirectDownload = () => {
    const bytes = generateExcelWorkbook(photos, customers);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 3. Share to WhatsApp
  const handleWhatsAppShare = () => {
    // First trigger file download so user has the xlsx ready to attach
    handleDirectDownload();
    const encodedText = encodeURIComponent(
      `${summaryText}\n\n📁 *File Excel (${fileName})* telah diunduh. Silakan lampirkan file Excel tersebut dalam pesan WhatsApp ini.`
    );
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  // 4. Share to Email
  const handleEmailShare = () => {
    handleDirectDownload();
    const subject = encodeURIComponent(`Rekap Foto Studio - ${activeSession.name} (${dateFormatted})`);
    const body = encodeURIComponent(
      `${summaryText}\n\nFile Excel: ${fileName} telah diunduh di perangkat Anda untuk dilampirkan.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // 5. Copy Text Summary
  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWebShareSupported = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Bagikan File Rekap Excel</h3>
              <p className="text-[11px] text-slate-400">Implicit Intent untuk WhatsApp, Email & Aplikasi Lain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* File Card Preview */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{fileName}</p>
                <p className="text-[11px] text-slate-400">
                  {photos.length} foto &bull; {customers.length} customer &bull; Sheet Rekap + Daftar
                </p>
              </div>
            </div>
          </div>

          {/* Implicit Intent Action: Native Share Sheet */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Bagikan File via Aplikasi HP / Laptop (Implicit Share)
            </label>
            <button
              onClick={handleNativeShare}
              disabled={isSharingNative}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {isWebShareSupported
                  ? 'Buka Menu Bagikan (WhatsApp, Email, Drive, dll)'
                  : 'Unduh & Buka Menu Bagikan'}
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Memanggil dialog sistem Android / OS untuk memilih aplikasi tujuan secara langsung.
            </p>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-semibold">Atau Bagikan Spesifik</span>
            </div>
          </div>

          {/* Quick Direct Integrations */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="p-3 bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-500/40 border border-slate-700/80 rounded-xl text-left space-y-1 transition-all group"
            >
              <div className="flex items-center justify-between text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-bold text-slate-200">WhatsApp</p>
              <p className="text-[10px] text-slate-400">Unduh & kirim pesan ringkasan ke WA</p>
            </button>

            {/* Email */}
            <button
              onClick={handleEmailShare}
              className="p-3 bg-slate-800 hover:bg-sky-950/60 hover:border-sky-500/40 border border-slate-700/80 rounded-xl text-left space-y-1 transition-all group"
            >
              <div className="flex items-center justify-between text-sky-400">
                <Mail className="w-4 h-4" />
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-bold text-slate-200">Email (Gmail/Mail)</p>
              <p className="text-[10px] text-slate-400">Buka aplikasi email dengan draf rekap</p>
            </button>
          </div>

          {/* Direct Download & Copy Summary */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleDirectDownload}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download .XLSX</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-sky-400" />
                  <span>Salin Teks Rekap</span>
                </>
              )}
            </button>
          </div>

          {/* Summary Box Preview */}
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Preview Ringkasan Teks:
            </span>
            <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
              {summaryText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
