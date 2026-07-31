import express from "express";
import path from "path";
import multer from "multer";
import * as XLSX from "xlsx";
import { createServer as createViteServer } from "vite";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Foto Studio Manager Server Ready" });
  });

  // WEB SHARE TARGET API ENDPOINT (Receives Excel files shared from WhatsApp / Telegram / File Manager)
  const handleShareTargetRequest = (req: express.Request, res: express.Response) => {
    try {
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

      if (!file || !file.buffer) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Batal Impor - File Tidak Ditemukan</title>
            <style>
              body { background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .card { background: #0f172a; border: 1px solid #334155; padding: 24px; border-radius: 16px; max-width: 400px; }
              a { color: #38bdf8; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>⚠️ File Excel Tidak Terbaca</h2>
              <p>Pastikan Anda memilih file berformat .xlsx atau .xls saat membagikan dari WhatsApp.</p>
              <a href="/">Kembali ke Aplikasi Studio</a>
            </div>
          </body>
          </html>
        `);
      }

      // Parse Excel Buffer
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      if (!workbook.SheetNames || !workbook.SheetNames.length) {
        throw new Error("File Excel kosong.");
      }

      const sheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: "" });
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

      if (jsonRows.length === 0 && rawRows.length === 0) {
        throw new Error("Tidak ada data dalam sheet Excel.");
      }

      // Detect columns
      const sampleRow = jsonRows[0] || {};
      const keys = Object.keys(sampleRow);

      let nameKey = keys.find((k) => /nama|customer|client|orang|peserta|name/i.test(k)) || keys[0] || "";
      let codeKey = keys.find((k) => /kode|code|id|no|nomor|absen/i.test(k) && k !== nameKey);
      let categoryKey = keys.find((k) => /kategori|category|kelompok|kelas|grup/i.test(k));
      let notesKey = keys.find((k) => /catatan|note|keterangan/i.test(k));

      const parsedCustomers = jsonRows
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

      let maxCols = 0;
      if (Array.isArray(rawRows)) {
        rawRows.forEach((r) => {
          if (Array.isArray(r) && r.length > maxCols) maxCols = r.length;
        });
      }

      const rawSheetData = {
        sheetName,
        rawRows: Array.isArray(rawRows) ? rawRows : [],
        maxCols,
      };

      const fileName = file.originalname || "Excel_WhatsApp.xlsx";

      // HTML Response that sets pending shared import in localStorage and redirects to app
      res.send(`
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
            <h2>⚡ File Excel Diterima!</h2>
            <p>Membuka ${parsedCustomers.length} customer di Liankhay Capture Manager...</p>
          </div>
          <script>
            try {
              const payload = {
                customers: ${JSON.stringify(parsedCustomers)},
                rawSheetData: ${JSON.stringify(rawSheetData)},
                fileName: ${JSON.stringify(fileName)},
                timestamp: Date.now()
              };
              localStorage.setItem('foto_studio_pending_shared_import', JSON.stringify(payload));
            } catch(e) {
              console.error('Local storage write error:', e);
            }
            setTimeout(() => {
              window.location.href = '/?shared_import=success';
            }, 500);
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
