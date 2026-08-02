import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as XLSX from "xlsx";
import { createServer as createViteServer } from "vite";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Temporary store for shared imports with disk fallback
const TEMP_SHARES_DIR = path.join(process.cwd(), ".tmp_shares");
if (!fs.existsSync(TEMP_SHARES_DIR)) {
  try { fs.mkdirSync(TEMP_SHARES_DIR, { recursive: true }); } catch (e) {}
}

const tempImportStore = new Map<string, { rawSheetData: any; fileName: string; customers: any[]; timestamp: number; debugLog?: any; isWarningEmpty?: boolean }>();
const shareDebugLogs: any[] = [];

function addShareDebugLog(entry: any) {
  shareDebugLogs.unshift(entry);
  if (shareDebugLogs.length > 20) shareDebugLogs.pop();
  try {
    fs.writeFileSync(path.join(TEMP_SHARES_DIR, "debug_history.json"), JSON.stringify(shareDebugLogs, null, 2));
  } catch (e) {}
}

function getShareDebugLogs() {
  if (shareDebugLogs.length === 0) {
    try {
      const debugFile = path.join(TEMP_SHARES_DIR, "debug_history.json");
      if (fs.existsSync(debugFile)) {
        const content = fs.readFileSync(debugFile, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          shareDebugLogs.push(...parsed);
        }
      }
    } catch (e) {}
  }
  return shareDebugLogs;
}

function saveTempImport(id: string, payload: any) {
  tempImportStore.set(id, payload);
  try {
    fs.writeFileSync(path.join(TEMP_SHARES_DIR, `${id}.json`), JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to write temp share file:", e);
  }
}

function getTempImport(id: string) {
  if (tempImportStore.has(id)) {
    return tempImportStore.get(id);
  }
  try {
    const filePath = path.join(TEMP_SHARES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      tempImportStore.set(id, parsed);
      return parsed;
    }
  } catch (e) {
    console.error("Failed to read temp share file:", e);
  }
  return null;
}

function cleanupTempImports() {
  const now = Date.now();
  for (const [id, item] of tempImportStore.entries()) {
    if (now - item.timestamp > 30 * 60 * 1000) {
      tempImportStore.delete(id);
      try {
        const filePath = path.join(TEMP_SHARES_DIR, `${id}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
    }
  }
}

const safeMulterUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.warn("Multer parse error (non-fatal, continuing):", err);
    }
    next();
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  let viteInstance: any = null;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Foto Studio Manager Server Ready" });
  });

  // GET API to retrieve pending shared import payload by ID
  app.get("/api/pending-import/:id", (req, res) => {
    cleanupTempImports();
    const id = req.params.id;
    const data = getTempImport(id);
    if (!data) {
      return res.status(404).json({ error: "Import data expired or not found" });
    }
    // Keep data in store so multi-fetch or page refocus won't break
    res.json(data);
  });

  // GET API to inspect Share Target debug logs for troubleshooting
  app.get("/api/share-debug", (req, res) => {
    const logs = getShareDebugLogs();
    res.json({
      status: "ok",
      count: logs.length,
      lastLog: logs[0] || null,
      logs,
    });
  });

  function renderStandaloneThankYouHtml(payload: any, debugEntry: any) {
    const fileName = payload.fileName || 'Excel_Share_Sheet.xlsx';
    const receivedTime = new Date().toLocaleTimeString('id-ID');
    const tempId = payload.tempId || '';
    const isWarning = payload.isWarningEmpty;
    const fileSize = debugEntry?.files?.[0]?.sizeBytes || 0;
    const mimeType = debugEntry?.files?.[0]?.mimetype || debugEntry?.contentType || 'multipart/form-data';

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terima Kasih - Share Target Received</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
    
    <!-- Hero Checkmark Icon -->
    <div class="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
      </svg>
    </div>

    <!-- Title & Subtitle -->
    <div class="space-y-1">
      <h1 class="text-2xl font-extrabold text-white">Terima Kasih!</h1>
      <p class="text-sm font-semibold text-emerald-400">File / Data Berhasil Diterima di Node 1</p>
      <p class="text-xs text-slate-400 pt-0.5">Share Target Receiver & Express Server Handshake OK</p>
    </div>

    <!-- Status & File Info Box -->
    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="text-slate-400 font-medium">Status Node 1 (Receiver):</span>
        <span class="px-2.5 py-0.5 rounded-full ${isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'} font-bold">
          ${isWarning ? 'TERIMA (FORMAT TEKS)' : 'SUKSES (TERIMA EXCEL)'}
        </span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-slate-400">Nama File/Teks:</span>
        <span class="font-mono text-slate-200 font-bold truncate max-w-[190px] text-right">${fileName}</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-slate-400">Ukuran File:</span>
        <span class="font-mono text-slate-300">${fileSize ? fileSize.toLocaleString('id-ID') + ' bytes' : 'Stream Text'}</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-slate-400">Tipe Content:</span>
        <span class="font-mono text-slate-300 truncate max-w-[180px]">${mimeType}</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-slate-400">Waktu Ditangkap:</span>
        <span class="font-mono text-slate-300">${receivedTime}</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-slate-400">Log ID Server:</span>
        <span class="font-mono text-sky-400">${debugEntry?.id || tempId}</span>
      </div>
    </div>

    <!-- Testing Note -->
    <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-xs text-left leading-relaxed">
      🔒 <strong>Mode Pengujian Isosiasi (Node 1):</strong> Halaman ini sengaja ditampilkan tanpa menjalankan pemrosesan otomatis/React heavy script agar aplikasi tidak auto-close atau blank. Ini membuktikan bahwa file dari Share Sheet berhasil ditangkap 100%!
    </div>

    <!-- Action Buttons -->
    <div class="space-y-2.5 pt-1">
      <a href="/?shared_import_id=${tempId}" class="block w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all text-center">
        ⚡ Lanjutkan ke Olah Pemetaan (Node 2) →
      </a>

      <button onclick="shareDiagnosticReport()" class="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all flex items-center justify-center gap-2">
        <span>📤 Bagikan Detail Log Error / Tracing (WhatsApp)</span>
      </button>

      <a href="/" class="block text-xs text-slate-400 hover:text-white pt-1">
        ← Buka Halaman Utama Aplikasi
      </a>
    </div>

  </div>

  <script>
    function shareDiagnosticReport() {
      const report = \`📋 FOTO STUDIO - SHARE TARGET RECEIVER REPORT (NODE 1)
Waktu: ${receivedTime}
Log ID: ${debugEntry?.id || tempId}
File: ${fileName}
Ukuran: ${fileSize} bytes
Content-Type: ${mimeType}
Status: ${debugEntry?.status || 'OK'}
User Agent: \` + navigator.userAgent;

      if (navigator.share) {
        navigator.share({ title: 'Share Target Diagnostic Report', text: report }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(report).then(() => {
          alert('📋 Diagnostic Report disalin ke Clipboard! Anda dapat membagikannya ke WhatsApp.');
        });
      }
    }
  </script>
</body>
</html>`;
  }

  function renderStandaloneErrorHtml(errorMessage: string, debugEntry: any) {
    const receivedTime = new Date().toLocaleTimeString('id-ID');
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error Share Target - Foto Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
    
    <div class="mx-auto w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>

    <div class="space-y-1">
      <h1 class="text-2xl font-extrabold text-white">Terjadi Error Share Intent</h1>
      <p class="text-xs text-rose-300 font-medium">${errorMessage}</p>
    </div>

    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
      <div class="flex justify-between">
        <span class="text-slate-400">Waktu:</span>
        <span class="font-mono text-slate-300">${receivedTime}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">Path:</span>
        <span class="font-mono text-slate-300">${debugEntry?.path || '/share-target'}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-400">Log ID:</span>
        <span class="font-mono text-rose-400">${debugEntry?.id || '-'}</span>
      </div>
    </div>

    <div class="space-y-2 pt-1">
      <a href="/" class="block w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all text-center">
        ← Buka Halaman Utama Aplikasi
      </a>
    </div>
  </div>
</body>
</html>`;
  }

  async function renderAppHtmlWithPayload(req: express.Request, res: express.Response, payload: any) {
    try {
      let htmlPath = path.join(process.cwd(), "index.html");
      if (process.env.NODE_ENV === "production") {
        htmlPath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(htmlPath)) {
        return res.status(500).send("Index HTML file not found");
      }

      let html = fs.readFileSync(htmlPath, "utf-8");
      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl || "/", html);
      }

      const scriptToInject = `<script>window.__INITIAL_SHARED_DATA__ = ${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>`;
      html = html.replace("</head>", `${scriptToInject}\n</head>`);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (e: any) {
      console.error("Failed to render app HTML with payload:", e);
      return res.status(500).send("Server Error Rendering App");
    }
  }

  // WEB SHARE TARGET API ENDPOINT (Receives Excel files or shared text from WhatsApp / Telegram / Share Sheet)
  const handleShareTargetRequest = (req: express.Request, res: express.Response) => {
    const logId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const debugEntry: any = {
      id: logId,
      time: new Date().toLocaleTimeString('id-ID'),
      isoTime: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.path,
      contentType: req.headers['content-type'] || 'empty',
      userAgent: req.headers['user-agent'] || 'unknown',
      files: [],
      bodyKeys: Object.keys(req.body || {}),
      bodyTextSnippet: '',
      status: 'PENDING',
      details: ''
    };

    try {
      cleanupTempImports();
      let file: Express.Multer.File | undefined;

      let rawFilesList: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        rawFilesList = req.files;
      } else if (req.files && typeof req.files === 'object') {
        const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
        Object.values(filesObj).forEach(arr => {
          if (Array.isArray(arr)) rawFilesList.push(...arr);
        });
      }
      if ((req as any).file) {
        rawFilesList.push((req as any).file);
      }

      debugEntry.files = rawFilesList.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        sizeBytes: f.size,
        bufferLength: f.buffer ? f.buffer.length : 0
      }));

      if (rawFilesList.length > 0) {
        file = rawFilesList[0];
      }

      let rawSheetData: any = null;
      let parsedCustomers: any[] = [];
      let fileName = 'Excel_Diterima.xlsx';

      if (file && file.buffer && file.buffer.length > 0) {
        fileName = file.originalname || 'Excel_Diterima.xlsx';
        
        // 1. Try XLSX Excel parsing
        try {
          const workbook = XLSX.read(file.buffer, { type: "buffer" });
          if (workbook.SheetNames && workbook.SheetNames.length > 0) {
            const sheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: "" });
            const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

            let maxCols = 0;
            if (Array.isArray(rawRows)) {
              rawRows.forEach((r) => {
                if (Array.isArray(r) && r.length > maxCols) maxCols = r.length;
              });
            }

            rawSheetData = {
              sheetName,
              rawRows: Array.isArray(rawRows) ? rawRows : [],
              maxCols,
            };

            const sampleRow = jsonRows[0] || {};
            const keys = Object.keys(sampleRow);
            let nameKey = keys.find((k) => /nama|customer|client|orang|peserta|name/i.test(k)) || keys[0] || "";
            let codeKey = keys.find((k) => /kode|code|id|no|nomor|absen/i.test(k) && k !== nameKey);
            let categoryKey = keys.find((k) => /kategori|category|kelompok|kelas|grup/i.test(k));
            let notesKey = keys.find((k) => /catatan|note|keterangan/i.test(k));

            parsedCustomers = jsonRows
              .map((row) => {
                const rawName = String(row[nameKey] || "").trim();
                if (!rawName) return null;
                return {
                  name: rawName,
                  code: codeKey ? String(row[codeKey]).trim() : undefined,
                  category: categoryKey ? String(row[categoryKey]).trim() : undefined,
                  notes: notesKey ? String(row[notesKey]).trim() : undefined,
                };
              })
              .filter(Boolean);
          }
        } catch (xlsxErr) {
          console.warn("XLSX parsing failed, trying text/CSV fallback:", xlsxErr);
          
          // 2. Fallback text/CSV parsing
          try {
            const textContent = file.buffer.toString('utf-8');
            if (textContent && textContent.trim().length > 0) {
              const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              const parsedRows: string[][] = lines.map(line => {
                if (line.includes('\t')) return line.split('\t').map(p => p.trim());
                if (line.includes(';')) return line.split(';').map(p => p.trim());
                if (line.includes(',')) return line.split(',').map(p => p.trim());
                return ['', line, '', ''];
              });
              
              rawSheetData = {
                sheetName: 'Hasil_Import_Text',
                rawRows: [['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'], ...parsedRows],
                maxCols: 4,
              };
            }
          } catch (textErr) {
            console.error("Text fallback parsing failed:", textErr);
          }
        }
      }

      // Check if text/URL was shared instead of binary file
      const sharedText = req.body?.text || req.body?.title || req.body?.url || '';
      debugEntry.bodyTextSnippet = String(sharedText).slice(0, 150);

      if (!rawSheetData && sharedText && String(sharedText).trim().length > 0) {
        fileName = 'Teks_Share_WA.txt';
        const lines = String(sharedText).split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const parsedRows: string[][] = [];
        lines.forEach((line) => {
          if (line.includes('\t')) {
            parsedRows.push(line.split('\t').map((p) => p.trim()));
          } else if (line.includes(';')) {
            parsedRows.push(line.split(';').map((p) => p.trim()));
          } else {
            const numMatch = line.match(/^(\d+|[A-Za-z0-9_-]+)[\s.|\-)\]]+(.*)$/);
            if (numMatch && numMatch[2].trim()) {
              parsedRows.push([numMatch[1].trim(), numMatch[2].trim(), '', '']);
            } else {
              parsedRows.push(['', line, '', '']);
            }
          }
        });
        const header = ['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'];
        rawSheetData = {
          sheetName: 'Hasil_Share_Teks',
          rawRows: [header, ...parsedRows],
          maxCols: 4,
        };
      }

      const isDataReceived = Boolean(rawSheetData);

      if (!rawSheetData) {
        // Diagnostic fallback
        rawSheetData = {
          sheetName: 'Diagnostic_Share_Kosong',
          rawRows: [
            ['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'],
            ['', 'Panduan: Upload Manual File Excel Jika Share Intent Kosong', 'Troubleshoot', 'Gunakan Tombol Upload File Excel Manual'],
          ],
          maxCols: 4,
        };
        debugEntry.status = 'WARNING_EMPTY';
        debugEntry.details = 'Request POST dari Android Share Sheet diterima oleh server Express, tetapi tidak ada file atau teks terdeteksi di multipart body.';
      } else {
        debugEntry.status = 'SUCCESS';
        debugEntry.details = `Berhasil menerima data (${fileName}), customer parsed: ${parsedCustomers.length}.`;
      }

      const tempId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sharedPayload = {
        rawSheetData,
        fileName,
        customers: parsedCustomers,
        tempId,
        timestamp: Date.now(),
        debugLog: debugEntry,
        isWarningEmpty: !isDataReceived,
      };

      saveTempImport(tempId, sharedPayload);
      addShareDebugLog(debugEntry);

      try {
        res.cookie('foto_studio_pending_import_id', tempId, {
          path: '/',
          maxAge: 10 * 60 * 1000, // 10 mins
          sameSite: 'lax',
        });
      } catch (e) {}

      if (req.headers.accept?.includes('application/json') || req.xhr || req.path.startsWith('/api/')) {
        return res.json({
          success: true,
          tempId,
          fileName,
          rawSheetData,
          customersCount: parsedCustomers.length,
          debugLog: debugEntry,
        });
      }

      // Return HTTP 303 See Other redirect to /thank-you?tempId=${tempId}
      // W3C Web Share Target API Spec requires 303 See Other redirect for POST requests.
      // This converts POST to GET page navigation, PREVENTING Android WebAPK / Share Intent Activity from auto-closing!
      return res.redirect(303, `/thank-you?tempId=${tempId}`);
    } catch (err: any) {
      console.error("Share target processing error:", err);
      debugEntry.status = 'ERROR';
      debugEntry.details = `Error server: ${err?.message || err}`;
      addShareDebugLog(debugEntry);

      const errorHtml = renderStandaloneErrorHtml(err?.message || 'Server error', debugEntry);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(500).send(errorHtml);
    }
  };

  // Dedicated GET /thank-you endpoint for Node 1 Isolated Thank You Page
  app.get("/thank-you", (req: express.Request, res: express.Response) => {
    const tempId = (req.query.tempId || req.cookies?.foto_studio_pending_import_id || '') as string;
    const payload = getTempImport(tempId) || {
      fileName: 'Excel_Share_WhatsApp.xlsx',
      tempId: tempId || 'unknown',
      timestamp: Date.now(),
      isWarningEmpty: false
    };
    const debugLogs = getShareDebugLogs();
    const debugEntry = debugLogs.find(l => l.id === tempId) || debugLogs[0] || null;

    const thankYouHtml = renderStandaloneThankYouHtml(payload, debugEntry);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(thankYouHtml);
  });

  app.get("/share-target", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const text = (req.query.text || req.query.title || req.query.url || "") as string;
    if (text && text.trim().length > 0) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const parsedRows: string[][] = lines.map(line => {
        if (line.includes('\t')) return line.split('\t').map(p => p.trim());
        if (line.includes(';')) return line.split(';').map(p => p.trim());
        const numMatch = line.match(/^(\d+|[A-Za-z0-9_-]+)[\s.|\-)\]]+(.*)$/);
        if (numMatch && numMatch[2].trim()) {
          return [numMatch[1].trim(), numMatch[2].trim(), '', ''];
        }
        return ['', line, '', ''];
      });

      const tempId = `share_get_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sharedPayload = {
        rawSheetData: {
          sheetName: 'Hasil_Share_Teks',
          rawRows: [['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'], ...parsedRows],
          maxCols: 4,
        },
        fileName: 'Teks_Share_WA.txt',
        customers: [],
        tempId,
        timestamp: Date.now(),
      };
      saveTempImport(tempId, sharedPayload);
      const debugEntry = { id: tempId, path: '/share-target', contentType: 'text/query', files: [] };
      addShareDebugLog(debugEntry);
      return res.redirect(303, `/thank-you?tempId=${tempId}`);
    }
    next();
  });

  app.post("/api/share-target", safeMulterUpload, handleShareTargetRequest);
  app.post("/share-target", safeMulterUpload, handleShareTargetRequest);
  app.post("/", safeMulterUpload, handleShareTargetRequest);

  // HTML Payload Injector Middleware: directly inject window.__INITIAL_SHARED_DATA__ when redirected from share target
  app.get(["/", "/index.html", "/share-target"], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sharedId = (req.query.shared_import_id as string) || req.cookies?.foto_studio_pending_import_id;
    if (!sharedId) {
      return next();
    }

    const payload = getTempImport(sharedId);
    if (!payload) {
      return next();
    }

    try {
      let htmlPath = path.join(process.cwd(), "index.html");
      if (process.env.NODE_ENV === "production") {
        htmlPath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(htmlPath)) {
        return next();
      }

      let html = fs.readFileSync(htmlPath, "utf-8");
      if (process.env.NODE_ENV !== "production" && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }

      const scriptToInject = `<script>window.__INITIAL_SHARED_DATA__ = ${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>`;
      html = html.replace("</head>", `${scriptToInject}\n</head>`);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e) {
      console.error("Failed to inject initial shared data into HTML:", e);
      return next();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Foto Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
