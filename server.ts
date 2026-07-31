import express from "express";
import path from "path";
import multer from "multer";
import * as XLSX from "xlsx";
import { createServer as createViteServer } from "vite";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Temporary in-memory store for shared imports (expires after 30 mins)
const tempImportStore = new Map<string, { rawSheetData: any; fileName: string; customers: any[]; timestamp: number }>();

function cleanupTempImports() {
  const now = Date.now();
  for (const [id, item] of tempImportStore.entries()) {
    if (now - item.timestamp > 30 * 60 * 1000) {
      tempImportStore.delete(id);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const data = tempImportStore.get(id);
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

      // Generate unique token for this share import
      const tempId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      tempImportStore.set(tempId, {
        rawSheetData,
        fileName,
        customers: parsedCustomers,
        timestamp: Date.now(),
      });

      if (req.headers.accept?.includes('application/json') || req.xhr) {
        return res.json({
          success: true,
          tempId,
          fileName,
          rawSheetData,
          customersCount: parsedCustomers.length,
        });
      }

      // HTML Response that sets pending import ID and redirects to app
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Menerima File Excel...</title>
          <style>
            body { background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
            .card { background: #0f172a; border: 1px solid #0284c7; padding: 28px; border-radius: 20px; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(14, 165, 233, 0.25); }
            .spinner { width: 40px; height: 40px; border: 4px solid #1e293b; border-top: 4px solid #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { font-size: 18px; margin: 0 0 8px 0; color: #38bdf8; }
            p { font-size: 13px; color: #94a3b8; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>⚡ Data Excel Diterima!</h2>
            <p>Membuka preview & mapping kolom customer di Liankhay Capture Manager...</p>
          </div>
          <script>
            const tempId = ${JSON.stringify(tempId)};
            try {
              localStorage.setItem('foto_studio_pending_import_id', tempId);
            } catch(e) {
              console.error('Local storage write error:', e);
            }
            setTimeout(() => {
              window.location.replace('/?shared_import_id=' + tempId + '&t=' + Date.now());
            }, 150);
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Share target processing error:", err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gagal Memproses File</title>
          <style>
            body { background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
            .card { background: #0f172a; border: 1px solid #e11d48; padding: 24px; border-radius: 16px; max-width: 400px; }
            a { color: #38bdf8; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>❌ Gagal Mengimpor Excel</h2>
            <p>${err.message || "Format file tidak didukung."}</p>
            <a href="/">Kembali ke Aplikasi Studio</a>
          </div>
        </body>
        </html>
      `);
    }
  };

  app.post("/api/share-target", upload.any(), handleShareTargetRequest);
  app.post("/share-target", upload.any(), handleShareTargetRequest);
  app.post("/", upload.any(), handleShareTargetRequest);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
