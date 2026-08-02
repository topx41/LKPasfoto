import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, CheckCircle2, Info, RefreshCw, Copy, Check, 
  Upload, FileText, Smartphone, Server, HelpCircle, ShieldAlert, Zap, Play,
  Share2, FileSpreadsheet, Cpu, Sliders, Database, Layers
} from 'lucide-react';

interface ShareDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDebugLog?: any;
  onOpenManualUpload?: () => void;
  onOpenPasteText?: () => void;
  onSimulateShareTarget?: (rawSheetData: any, fileName: string) => void;
}

export const ShareDebugModal: React.FC<ShareDebugModalProps> = ({
  isOpen,
  onClose,
  initialDebugLog,
  onOpenManualUpload,
  onOpenPasteText,
  onSimulateShareTarget,
}) => {
  const [serverLog, setServerLog] = useState<any>(initialDebugLog || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [pwaStatus, setPwaStatus] = useState({
    swRegistered: false,
    isPwaStandalone: false,
    canShare: false,
  });

  const handleShareReportLog = async () => {
    const lastCrashLog = localStorage.getItem('last_app_crash_log');
    let parsedCrash = null;
    try {
      if (lastCrashLog) parsedCrash = JSON.parse(lastCrashLog);
    } catch (e) {}

    const diagnosticReport = `
========================================
📋 FOTO STUDIO - DIAGNOSTIC LOG & TRACING REPORT
========================================
Waktu Report: ${new Date().toLocaleString('id-ID')}
Mode Web: ${pwaStatus.isPwaStandalone ? 'PWA Standalone (Installed)' : 'Browser Standard (Web)'}
Service Worker: ${pwaStatus.swRegistered ? 'Aktif' : 'Bypassed/Inaktif'}
User Agent: ${navigator.userAgent}

----------------------------------------
📡 REKAMAN LOG SERVER EXPRESS TERAKHIR:
ID Request: ${serverLog?.id || '-'}
Waktu: ${serverLog?.time || '-'}
Path/Endpoint: ${serverLog?.path || '-'}
Method: ${serverLog?.method || '-'}
Status: ${serverLog?.status || 'Belum Ada Log'}
Detail Server: ${serverLog?.details || '-'}
Files Received: ${JSON.stringify(serverLog?.files || [])}
Body Snippet: ${serverLog?.bodyTextSnippet || '-'}

----------------------------------------
💥 LOG CRASH CLIENT TERAKHIR (PAGE BLANK/CLOSE):
${parsedCrash ? JSON.stringify(parsedCrash, null, 2) : 'Tidak terdeteksi crash runtime React window.'}

----------------------------------------
📍 TRACING ALUR JOURNEY DATA EXCEL:
1. File Sourcing (WhatsApp/File Mgr): OK
2. Android Intent Receiver: ${serverLog?.path ? 'OK' : 'Waiting'}
3. Server Multer & XLSX Parsing: ${serverLog?.status || 'Pending'}
4. Modal Pemetaan Column Mapping: ${serverLog?.status === 'SUCCESS' ? 'Ready' : 'Waiting'}
5. Integration DB Customer: ${serverLog?.status === 'SUCCESS' ? 'Ready' : 'Waiting'}
========================================
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Diagnostic Log Error - Foto Studio App',
          text: diagnosticReport,
        });
        return;
      } catch (e) {
        // user cancelled or share failed
      }
    }

    try {
      await navigator.clipboard.writeText(diagnosticReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      alert('📋 Report Log Error disalin ke Clipboard! Anda dapat membagikannya langsung ke WhatsApp.');
    } catch (err) {
      alert('Gagal menyalin log.');
    }
  };

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

  const handleSimulateShare = async () => {
    setSimulating(true);
    try {
      const formData = new FormData();
      formData.append('title', 'Daftar Customer Simulasi WA');
      formData.append('text', "1. Budi Santoso - VIP\n2. Siti Aminah - Regular\n3. Ahmad Fauzi - VVIP\n4. Dewi Lestari - Regular");
      
      const res = await fetch('/api/share-target', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rawSheetData && onSimulateShareTarget) {
          onClose();
          onSimulateShareTarget(data.rawSheetData, data.fileName || 'Simulasi_Share_WA.txt');
        } else {
          fetchServerDebugLog();
        }
      } else {
        alert('Simulasi gagal dikirim ke server.');
      }
    } catch (err) {
      console.error('Simulation error:', err);
      alert('Terjadi kesalahan saat uji simulasi.');
    } finally {
      setSimulating(false);
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

          {/* Interactive Data Tracing Pipeline */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Tracing Alur Perjalanan Data Excel
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">5 Tahap Eksekusi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              {/* Step 1 */}
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                serverLog ? 'bg-slate-900 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}>
                <div className="text-[10px] font-bold opacity-75">1. SOURCE</div>
                <FileSpreadsheet className="w-5 h-5 my-1.5 text-sky-400" />
                <div className="text-[11px] font-semibold">WA / Manager</div>
                <div className="text-[9px] mt-0.5 text-slate-400">Excel / Teks</div>
              </div>

              {/* Step 2 */}
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                serverLog?.path ? 'bg-slate-900 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}>
                <div className="text-[10px] font-bold opacity-75">2. INTENT</div>
                <Smartphone className="w-5 h-5 my-1.5 text-amber-400" />
                <div className="text-[11px] font-semibold">Android Intent</div>
                <div className="text-[9px] mt-0.5 text-slate-400">PWA / Capacitor</div>
              </div>

              {/* Step 3 */}
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                serverLog?.status === 'SUCCESS' 
                  ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                  : isWarningEmpty 
                  ? 'bg-slate-900 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}>
                <div className="text-[10px] font-bold opacity-75">3. PARSING</div>
                <Cpu className="w-5 h-5 my-1.5 text-indigo-400" />
                <div className="text-[11px] font-semibold">Server / Worker</div>
                <div className="text-[9px] mt-0.5 text-slate-400">Multer & XLSX</div>
              </div>

              {/* Step 4 */}
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                serverLog?.status === 'SUCCESS' ? 'bg-slate-900 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}>
                <div className="text-[10px] font-bold opacity-75">4. MAPPING</div>
                <Sliders className="w-5 h-5 my-1.5 text-emerald-400" />
                <div className="text-[11px] font-semibold">Pemetaan Modal</div>
                <div className="text-[9px] mt-0.5 text-slate-400">Baris & Kolom</div>
              </div>

              {/* Step 5 */}
              <div className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-between transition-all ${
                serverLog?.status === 'SUCCESS' ? 'bg-slate-900 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'
              }`}>
                <div className="text-[10px] font-bold opacity-75">5. DATABASE</div>
                <Database className="w-5 h-5 my-1.5 text-teal-400" />
                <div className="text-[11px] font-semibold">DB Customer</div>
                <div className="text-[9px] mt-0.5 text-slate-400">React State</div>
              </div>
            </div>
          </div>

          {/* Client & PWA Health Checklist */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span>Status PWA & Browser Device</span>
              <button
                onClick={fetchServerDebugLog}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 cursor-pointer"
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
              Mengapa Page Blank & Close Saat Terima Share di Capacitor Native?
            </h4>
            
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong>Out of Memory pada Mobile WebView:</strong> Parsing file Excel biner ukuran besar secara sinkron di thread utama WebView dapat menyebabkan heap RAM meluap, sehingga OS Android secara paksa menutup halaman (Blank & Close).
              </li>
              <li>
                <strong>URI Akses Terisolasi (<code className="text-amber-300 bg-slate-800 px-1 rounded">content://</code>):</strong> WhatsApp memberikan URI bertanda izin khusus. Jika Android ROM (MIUI, Samsung OneUI) memblokir stream baca file, intent akan gagal mengekstrak bytes.
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-700/50 space-y-2">
              <button
                onClick={handleShareReportLog}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-sky-200" />
                <span>📤 Bagikan Detail Log Error & Tracing (Share Sheet ke WhatsApp)</span>
              </button>

              <button
                onClick={handleSimulateShare}
                disabled={simulating}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 text-yellow-300 ${simulating ? 'animate-bounce' : ''}`} />
                <span>{simulating ? 'Mengirim Simulasi Share Intent...' : '⚡ Uji / Simulasi Share Intent Sekarang (Tes Sistem)'}</span>
              </button>

              <div className="flex flex-wrap gap-2 pt-1">
                {onOpenManualUpload && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenManualUpload();
                    }}
                    className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
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
                    className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Paste Teks Customer
                  </button>
                )}
              </div>
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
