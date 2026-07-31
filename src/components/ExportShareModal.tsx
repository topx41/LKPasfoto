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
  Users,
} from 'lucide-react';
import { Customer, PhotoRecord, StudioSession } from '../types';
import {
  generateExcelWorkbook,
  generateCustomerExcelWorkbook,
  downloadOrShareCustomersExcel,
} from '../utils/excelUtils';
import { shareFileNative, shareTextNative, isCapacitorNative } from '../utils/nativeShareHelper';

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
  const [copiedTable, setCopiedTable] = useState(false);

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
  const customerFileName = `Transfer Customer - ${cleanSessionName}.xlsx`;

  const markedPhotosCount = photos.filter((p) => p.isMarked).length;

  // Summary Text
  const summaryText = `*REKAP FOTO LIANKHAY CAPTURE MANAGER*
*Nama Sesi:* ${activeSession.name}
*Tanggal:* ${dateFormatted} (${timeFormatted})
*Total Foto:* ${photos.length} file ${markedPhotosCount > 0 ? `(⭐ ${markedPhotosCount} Ditandai)` : ''}
*Total Customer:* ${customers.length} orang
*Prefix Sesi:* ${activeSession.prefix}
`;

  // Helper to get Rekap Excel File object
  const getExcelFile = () => {
    const bytes = generateExcelWorkbook(photos, customers, activeSession.name, dateFormatted, activeSession.prefix);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // Helper to get Customer Excel File object
  const getCustomerExcelFile = () => {
    const bytes = generateCustomerExcelWorkbook(customers, activeSession.name);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return new File([blob], customerFileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  // 1. Native Share Sheet for Rekap Excel File
  const handleNativeShare = async () => {
    setIsSharingNative(true);
    try {
      const file = getExcelFile();
      const success = await shareFileNative(
        file,
        `Rekap Foto Studio - ${activeSession.name}`,
        summaryText
      );

      if (!success) {
        handleDirectDownload();
      }
    } catch (err: any) {
      console.error('Share process error:', err);
      handleDirectDownload();
    } finally {
      setIsSharingNative(false);
    }
  };

  // 2. Native Share Sheet for Customer Transfer Excel File
  const handleShareCustomersNative = async () => {
    setIsSharingNative(true);
    try {
      await downloadOrShareCustomersExcel(customers, activeSession.name);
    } catch (err) {
      console.error('Customer share error:', err);
    } finally {
      setIsSharingNative(false);
    }
  };

  // 3. Direct Browser Download
  const handleDirectDownload = () => {
    const bytes = generateExcelWorkbook(photos, customers, activeSession.name, dateFormatted, activeSession.prefix);
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

  // 4. Share to WhatsApp (1-Click Auto Download + Copy Text + Launch WhatsApp)
  const handleWhatsAppShare = () => {
    handleDirectDownload();
    handleCopySummary();
    const encodedText = encodeURIComponent(
      `${summaryText}\n\n📁 *File Excel: ${fileName}*\n_(File .xlsx telah diunduh di folder Download HP Anda. Tinggal tekan ikon klip 📎 untuk melampirkan file)_`
    );
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  // 5. Share to Email
  const handleEmailShare = () => {
    handleDirectDownload();
    const subject = encodeURIComponent(`Rekap Foto Studio - ${activeSession.name} (${dateFormatted})`);
    const body = encodeURIComponent(
      `${summaryText}\n\nFile Excel: ${fileName} telah diunduh di perangkat Anda untuk dilampirkan.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // 6. Copy Text Summary
  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to build TSV table
  const getTSVTable = () => {
    const lines = ['No Absen\tNama Customer\tFile Foto\tKategori\tCatatan'];
    if (customers.length > 0) {
      customers.forEach((c) => {
        const custPhotos = photos
          .filter((p) => p.customerId === c.id || (p.code && p.code.toLowerCase() === (c.code || '').toLowerCase()))
          .map((p) => p.filename)
          .join(', ');
        lines.push(`${c.code || '-'}\t${c.name}\t${custPhotos || '-'}\t${c.category || '-'}\t${c.notes || '-'}`);
      });
    } else {
      photos.forEach((p, idx) => {
        lines.push(`${p.code || idx + 1}\t${p.customerName || '-'}\t${p.filename}\t-\t${p.notes || '-'}`);
      });
    }
    return lines.join('\n');
  };

  const handleCopyTableTSV = () => {
    const tsv = getTSVTable();
    navigator.clipboard.writeText(tsv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
  };

  // Helper to build formatted WhatsApp List Text
  const getWhatsAppListText = () => {
    let text = `${summaryText}\n*DAFTAR CUSTOMER & FILE FOTO:*\n`;
    if (customers.length > 0) {
      customers.forEach((c, i) => {
        const custPhotos = photos
          .filter((p) => p.customerId === c.id || (p.code && p.code.toLowerCase() === (c.code || '').toLowerCase()))
          .map((p) => p.filename)
          .join(', ');
        text += `${i + 1}. *${c.name}* (${c.code ? `#${c.code}` : 'No Absen -'}) ${custPhotos ? `➔ Foto: ${custPhotos}` : ''} ${c.notes ? `[${c.notes}]` : ''}\n`;
      });
    } else {
      photos.forEach((p, i) => {
        text += `${i + 1}. *${p.filename}* ➔ ${p.customerName || 'Tanpa Nama'} (${p.code ? `#${p.code}` : ''})\n`;
      });
    }
    return text;
  };

  // Share formatted list text to WhatsApp / Native Share Sheet
  const handleWhatsAppShareList = async () => {
    const text = getWhatsAppListText();
    navigator.clipboard.writeText(text);

    const shared = await shareTextNative(`Rekap Foto - ${activeSession.name}`, text, 'Bagikan Rekap ke WhatsApp');
    if (!shared) {
      const encoded = encodeURIComponent(text);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Transfer &amp; Export Data Excel</h3>
              <p className="text-[11px] text-slate-400">Popup Share Bawaan Android (Quick Share, WhatsApp, Drive, dll)</p>
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
        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
          {/* File Card Preview */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{fileName}</p>
                <p className="text-[11px] text-slate-400">
                  {photos.length} foto &bull; {customers.length} customer &bull; Sheet Rekap &amp; Tabel
                </p>
              </div>
            </div>
            <button
              onClick={handleDirectDownload}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.XLSX</span>
            </button>
          </div>

          {/* SOLUSI 1: KIRIM TEKS REKAP LANGSUNG KE WHATSAPP (PALING PRAKTIS) */}
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Solusi 1: Kirim Teks Rekap Rapi ke WhatsApp (Tanpa File)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Rekomendasi
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Penerima di WhatsApp bisa langsung membaca daftar nama customer, nomor absen, dan nama file foto tanpa perlu download/buka file Excel!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleWhatsAppShareList}
                className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Kirim Daftar ke WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>

              <button
                onClick={handleCopyTableTSV}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold border border-slate-700 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedTable ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Tabel Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-sky-400" />
                    <span>Salin Tabel (Paste ke Excel)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SOLUSI 2: EXPORT & BAGIKAN FILE EXCEL (.XLSX) */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Solusi 2: Export &amp; Bagikan File Excel (.XLSX)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleNativeShare}
                disabled={isSharingNative}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Bagikan Rekap (.xlsx)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                onClick={handleShareCustomersNative}
                disabled={isSharingNative}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Transfer Customer (.xlsx)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>

          {/* CATATAN PENTING TARGET SHARE & CAPACITOR ANDROID */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Solusi Native ShareSheet Android (Capacitor Integration)</span>
            </div>
            <p className="text-slate-300">
              Aplikasi ini sudah terintegrasi dengan <strong className="text-sky-300">@capacitor/share</strong>! Saat di-build menjadi APK Android Native dengan Capacitor (`npm run cap`), tombol <strong>Bagikan Rekap (.xlsx)</strong> akan otomatis memicu <strong>Native Android Share Chooser / ShareSheet</strong> resmi yang menampilkan WhatsApp, Drive, Quick Share, Gmail, dan aplikasi terinstall lainnya.
            </p>
            <p className="text-slate-400 pt-1 border-t border-slate-800/80">
              💡 <strong className="text-slate-200">Di Web Browser / PWA:</strong> Gunakan <strong>Solusi 1 (Teks WA Instant)</strong> atau klik <strong>.XLSX</strong> lalu di WhatsApp pilih Lampirkan 📎 &rarr; Dokumen.
            </p>
          </div>

          {/* Preview Text Box */}
          <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Preview Teks Rekap WhatsApp:
              </span>
              <button
                onClick={handleCopySummary}
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {summaryText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
