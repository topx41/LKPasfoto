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

      // Directly render 200 OK HTML with inlined window.__INITIAL_SHARED_DATA__
      // This eliminates 303 Redirects which cause blank screen crashes on Android Chrome WebAPK Share Target
      return renderAppHtmlWithPayload(req, res, sharedPayload);
    } catch (err: any) {
      console.error("Share target processing error:", err);
      debugEntry.status = 'ERROR';
      debugEntry.details = `Error server: ${err?.message || err}`;
      addShareDebugLog(debugEntry);

      const errorPayload = {
        isError: true,
        errorMessage: err?.message || 'Server error',
        debugLog: debugEntry,
        timestamp: Date.now(),
      };
      return renderAppHtmlWithPayload(req, res, errorPayload);
    }
  };

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
      return renderAppHtmlWithPayload(req, res, sharedPayload);
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
