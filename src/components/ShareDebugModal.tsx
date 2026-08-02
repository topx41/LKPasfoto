import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, CheckCircle2, Info, RefreshCw, Copy, Check, 
  Upload, FileText, Smartphone, Server, HelpCircle, ShieldAlert
} from 'lucide-react';

interface ShareDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDebugLog?: any;
  onOpenManualUpload?: () => void;
  onOpenPasteText?: () => void;
}

export const ShareDebugModal: React.FC<ShareDebugModalProps> = ({
  isOpen,
  onClose,
  initialDebugLog,
  onOpenManualUpload,
  onOpenPasteText,
}) => {
  const [serverLog, setServerLog] = useState<any>(initialDebugLog || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [pwaStatus, setPwaStatus] = useState({
    swRegistered: false,
    isPwaStandalone: false,
    canShare: false,
  });

  const fetchServerDebugLog = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share-debug');
      if (res.ok) {
        const data = await res.json();
        if (data.lastLog) {
          setServerLog(data.lastLog);
        }
      }
    } catch (err) {
      console.error('Failed to fetch share debug log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialDebugLog) {
        setServerLog(initialDebugLog);
      } else {
        fetchServerDebugLog();
      }

      // Check client PWA features
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      const swActive = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
      const canShareApi = 'canShare' in navigator;

      setPwaStatus({
        swRegistered: swActive,
        isPwaStandalone: isStandalone,
        canShare: canShareApi,
      });
    }
  }, [isOpen, initialDebugLog]);

  if (!isOpen) return null;

  const copyLogToClipboard = () => {
    const report = {
      clientPwaStatus: pwaStatus,
      urlParams: window.location.search,
      userAgent: navigator.userAgent,
      serverDebugLog: serverLog,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWarningEmpty = serverLog?.status === 'WARNING_EMPTY' || serverLog?.isWarningEmpty;
  const isError = serverLog?.status === 'ERROR' || window.location.search.includes('share_error');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Diagnostik & Troubleshoot Share Intent
              </h3>
              <p className="text-xs text-slate-400">
                Analisa penerimaan file Excel / Teks dari Android Share Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Status Banner */}
          {isError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-rose-300">Gagal Memproses Share Target (Error)</div>
                <p className="mt-1 text-slate-300">
                  Request dari Android Share Sheet mengalami kendala atau koneksi terputus saat mengirimkan file.
                </p>
              </div>
            </div>
          ) : isWarningEmpty ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-300">Request Diterima Server (Tetapi File Kosong)</div>
                <p className="mt-1 text-slate-300">
                  Android Share Sheet berhasil membuka Liankhay Capture, tetapi sistem Android ROM tidak menyertakan attachment file dalam form data multipart.
                </p>
              </div>
            </div>
          ) : serverLog?.status === 'SUCCESS' ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-300">Share Intent Berhasil Diterima Server</div>
                <p className="mt-1 text-slate-300">
                  File Excel atau Teks telah diterima dan diproses oleh server Express.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 flex items-start gap-3">
              <Info className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-sky-300">Monitoring Log Share Target</div>
                <p className="mt-1 text-slate-300">
                  Menampilkan log riwayat request penerimaan file dari Android Share Sheet.
                </p>
              </div>
            </div>
          )}

          {/* Client & PWA Health Checklist */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>Status PWA & Browser Device</span>
              <button
                onClick={fetchServerDebugLog}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Log</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/40 flex items-center justify-between">
                <span className="text-slate-300">PWA Mode:</span>
                <span className={pwaStatus.isPwaStandalone ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                  {pwaStatus.isPwaStandalone ? "Installed (PWA)" : "Standard Web"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/40 flex items-center justify-between">
                <span className="text-slate-300">Service Worker:</span>
                <span className={pwaStatus.swRegistered ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                  {pwaStatus.swRegistered ? "Active" : "Bypassed"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/40 flex items-center justify-between">
                <span className="text-slate-300">Share Target API:</span>
                <span className="text-emerald-400 font-semibold">Supported</span>
              </div>
            </div>
          </div>

          {/* Server Received Log Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 font-sans font-semibold text-slate-200">
                <Server className="w-4 h-4 text-sky-400" />
                Catatan Server Terakhir
              </span>
              <span className="text-[11px] text-slate-500">{serverLog?.time || 'Belum ada log'}</span>
            </div>

            {serverLog ? (
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">HTTP Method:</span>
                  <span className="text-sky-400 font-semibold">{serverLog.method} {serverLog.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Content-Type:</span>
                  <span className="text-slate-300 truncate max-w-[280px]" title={serverLog.contentType}>
                    {serverLog.contentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Terlampir (Multer):</span>
                  <span className={serverLog.files?.length > 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {serverLog.files?.length || 0} file
                  </span>
                </div>

                {serverLog.files && serverLog.files.length > 0 && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    {serverLog.files.map((f: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-slate-200">
                        <span>📄 {f.originalname || f.fieldname}</span>
                        <span className="text-slate-400">({Math.round(f.sizeBytes / 1024)} KB, {f.mimetype})</span>
                      </div>
                    ))}
                  </div>
                )}

                {serverLog.bodyTextSnippet && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                    <span className="text-slate-500 block">Teks / Title Body:</span>
                    <span className="text-slate-300 break-words">{serverLog.bodyTextSnippet}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-slate-300">Keterangan Server:</strong> {serverLog.details}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 font-sans">
                Belum ada data share yang masuk ke server.
              </div>
            )}
          </div>

          {/* Explanation & Troubleshooting Steps */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Mengapa Log Server Menunjukkan "Belum Ada Log"?
            </h4>
            
            {!pwaStatus.isPwaStandalone && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  Mode Browser: Standard Web (Belum Di-Install sebagai PWA)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Android Share Sheet <strong>hanya dapat mendeteksi dan mengirim file ke aplikasi web</strong> jika aplikasi ini sudah <strong>di-Install ke Home Screen Android</strong> sebagai PWA.
                </p>
                <div className="pt-1 text-[11px] text-amber-300 font-medium">
                  👉 Cara Install: Buka Chrome di HP → Klik menu titik tiga (⋮) → Pilih <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                </div>
              </div>
            )}

            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong>Mode PWA/WebAPK Installed:</strong> Saat file di-share dari WhatsApp, Android akan mengarahkan request ke <code className="text-sky-300 bg-slate-800 px-1 rounded">/share-target</code> di server dan log request akan langsung tercatat.
              </li>
              <li>
                <strong>Restriksi Sistem Android ROM (MIUI / Samsung / Realme):</strong> Jika file di-share via Android Share Sheet namun permission file dibatasi oleh ROM, Android hanya akan membuka layar aplikasi tanpa mengirimkan isi attachment file.
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-2">
              {onOpenManualUpload && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenManualUpload();
                  }}
                  className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Manual File Excel
                </button>
              )}

              {onOpenPasteText && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPasteText();
                  }}
                  className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Paste Teks Customer
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700/60 flex items-center justify-between gap-3">
          <button
            onClick={copyLogToClipboard}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Tersalin ke Clipboard' : 'Salin Detail Log Error'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
