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

const tempImportStore = new Map<string, { rawSheetData: any; fileName: string; customers: any[]; timestamp: number }>();

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

  // WEB SHARE TARGET API ENDPOINT (Receives Excel files or shared text from WhatsApp / Telegram / Share Sheet)
  const handleShareTargetRequest = (req: express.Request, res: express.Response) => {
    try {
      cleanupTempImports();
      let file: Express.Multer.File | undefined;

      if (Array.isArray(req.files) && req.files.length > 0) {
        file = req.files[0];
      } else if (req.files && typeof req.files === 'object') {
        const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
        const allKeys = Object.keys(filesObj);
        if (allKeys.length > 0 && filesObj[allKeys[0]]?.length > 0) {
          file = filesObj[allKeys[0]][0];
        }
      }

      if (!file && (req as any).file) {
        file = (req as any).file;
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

      if (!rawSheetData) {
        // Fallback default sheet structure so the app always opens the import modal
        rawSheetData = {
          sheetName: 'File_Share_Diterima',
          rawRows: [
            ['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'],
          ],
          maxCols: 4,
        };
      }

      // Store payload for GET fallback
      const tempId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sharedPayload = {
        rawSheetData,
        fileName,
        customers: parsedCustomers,
        tempId,
        timestamp: Date.now(),
      };

      saveTempImport(tempId, sharedPayload);

      try {
        res.cookie('foto_studio_pending_import_id', tempId, {
          path: '/',
          maxAge: 10 * 60 * 1000, // 10 mins
          sameSite: 'lax',
        });
      } catch (e) {}

      if (req.headers.accept?.includes('application/json') || req.xhr) {
        return res.json({
          success: true,
          tempId,
          fileName,
          rawSheetData,
          customersCount: parsedCustomers.length,
        });
      }

      // MUST return HTTP 303 See Other Redirect for Chrome Android Web Share Target POST
      return res.redirect(303, `/?shared_import_id=${tempId}&t=${Date.now()}`);
    } catch (err: any) {
      console.error("Share target processing error:", err);
      return res.redirect(303, "/?share_error=true");
    }
  };

  app.get("/share-target", (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      return res.redirect(303, `/?shared_import_id=${tempId}&t=${Date.now()}`);
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
