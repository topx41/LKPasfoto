import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  X,
  Check,
  AlertCircle,
  FileCheck2,
  Share2,
  Smartphone,
  SlidersHorizontal,
  Hash,
  UserCheck,
  Tag,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  ImportedCustomer,
  RawExcelSheetData,
  ColumnMappingConfig,
  extractRawExcelData,
  autoDetectColumnMapping,
  processMappedExcelCustomers,
} from '../utils/excelUtils';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (customers: ImportedCustomer[], replaceExisting: boolean) => void;
  initialParsedData?: ImportedCustomer[] | null;
  initialFileName?: string;
}

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers,
  initialParsedData,
  initialFileName,
}) => {
  const [rawSheetData, setRawSheetData] = useState<RawExcelSheetData | null>(null);
  const [mappingConfig, setMappingConfig] = useState<ColumnMappingConfig>({
    startRow: 2,
    headerRow: 1,
    nameColIndex: -1,
    absenColIndex: -1,
    categoryColIndex: -1,
    notesColIndex: -1,
  });
  const [fileName, setFileName] = useState<string>(initialFileName || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [showWhatsAppGuide, setShowWhatsAppGuide] = useState<boolean>(false);

  // Reset / Sync State when isOpen or initialParsedData changes
  useEffect(() => {
    if (isOpen) {
      if (initialParsedData && initialParsedData.length > 0) {
        const header = ['Nomor Absen', 'Nama Customer', 'Kategori / Kelas', 'Catatan'];
        const rows = initialParsedData.map((c) => [
          String(c?.code || ''),
          String(c?.name || ''),
          String(c?.category || ''),
          String(c?.notes || ''),
        ]);
        const synthesizedRows = [header, ...rows];
        setRawSheetData({
          sheetName: 'Imported_Excel',
          rawRows: synthesizedRows,
          maxCols: 4,
        });
        setMappingConfig({
          startRow: 2,
          headerRow: 1,
          absenColIndex: 0,
          nameColIndex: 1,
          categoryColIndex: 2,
          notesColIndex: 3,
        });
        if (initialFileName) setFileName(initialFileName);
      } else {
        // Reset state on clean open
        setRawSheetData(null);
        setErrorMsg(null);
        setFileName('');
        setIsLoading(false);
        setMappingConfig({
          startRow: 2,
          headerRow: 1,
          nameColIndex: -1,
          absenColIndex: -1,
          categoryColIndex: -1,
          notesColIndex: -1,
        });
      }
    }
  }, [isOpen, initialParsedData, initialFileName]);

  const columnOptions = useMemo(() => {
    if (!rawSheetData || !Array.isArray(rawSheetData.rawRows)) return [];
    try {
      const options = [];
      const headerRowIdx = Math.max(0, mappingConfig.headerRow - 1);
      const headerRow = rawSheetData.rawRows[headerRowIdx] || [];

      for (let c = 0; c < (rawSheetData.maxCols || 0); c++) {
        const colLetter = getColumnLetter(c);
        const cellVal = headerRow[c] !== undefined && headerRow[c] !== null ? String(headerRow[c]).trim() : '';
        const label = cellVal ? cellVal : `[Kosong]`;
        options.push({ index: c, colLetter, label });
      }
      return options;
    } catch (err) {
      console.error('Error in columnOptions:', err);
      return [];
    }
  }, [rawSheetData, mappingConfig.headerRow]);

  const mappedResult = useMemo(() => {
    if (!rawSheetData || !Array.isArray(rawSheetData.rawRows)) return null;
    try {
      return processMappedExcelCustomers(rawSheetData.rawRows, mappingConfig);
    } catch (err) {
      console.error('Error in mappedResult:', err);
      return null;
    }
  }, [rawSheetData, mappingConfig]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sheetData = extractRawExcelData(arrayBuffer);
      setRawSheetData(sheetData);
      const autoConfig = autoDetectColumnMapping(sheetData.rawRows, sheetData.maxCols);
      setMappingConfig(autoConfig);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membaca file Excel. Pastikan format .xlsx atau .xls valid.');
      setRawSheetData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isRequirementMet = mappingConfig.nameColIndex >= 0;
  const validCustomers = mappedResult ? mappedResult.validCustomers : [];

  const handleConfirmImport = () => {
    if (validCustomers.length > 0 && isRequirementMet) {
      onImportCustomers(validCustomers, replaceExisting);
      onClose();
      setRawSheetData(null);
      setFileName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Import Data Customer Excel</h3>
              <p className="text-xs text-slate-400">Penyesuaian format kolom & requirement field</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* WhatsApp / Share Info Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Petunjuk Menerima &amp; Impor File Excel di Android (APK)
              </span>
              <button
                onClick={() => setShowWhatsAppGuide(!showWhatsAppGuide)}
                className="text-[11px] text-sky-400 hover:underline font-semibold cursor-pointer"
              >
                {showWhatsAppGuide ? 'Sembunyikan Petunjuk' : 'Lihat Petunjuk'}
              </button>
            </div>
            {showWhatsAppGuide && (
              <div className="pt-2 border-t border-emerald-500/20 text-slate-300 space-y-2 text-[11px] leading-relaxed">
                <p className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">1.</span>
                  <span>
                    <strong className="text-emerald-300">Impor Langsung dari HP (Rekomendasi Utama):</strong> Unduh file Excel dari chat WhatsApp ke HP Anda. Lalu tekan area kotak <strong className="text-sky-300">"Upload File Excel"</strong> di bawah ini untuk memilih file tersebut dari folder <strong className="text-amber-300">Download / Dokumen</strong> HP Anda.
                  </span>
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold shrink-0">2.</span>
                  <span>
                    <strong className="text-emerald-300">Penyebab Aplikasi Tidak Muncul di Menu Share WhatsApp (Build APK):</strong> Jika dibuild menjadi APK (menggunakan Capacitor/Webview Wrapper), Android memerlukan konfigurasi <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono text-[10px]">android.intent.action.SEND</code> di file <strong className="text-slate-200">AndroidManifest.xml</strong> project APK agar sistem Android mendaftarkan aplikasi sebagai penerima file dari WhatsApp.
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* File Picker / Upload Box */}
          <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center transition-all bg-slate-950/40 group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-200">
                  {fileName ? fileName : 'Klik atau Drag & Drop file Excel ke sini'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Mendukung format .xlsx, .xls, .csv dari WhatsApp & File Manager
                </p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="py-6 text-center text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 animate-spin text-emerald-400" />
              Menganalisis kolom dan baris Excel...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* DYNAMIC COLUMN & ROW MAPPING SECTION */}
          {rawSheetData && (
            <div className="space-y-4 pt-1">
              {/* CONFIGURATION CARD */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                    Penyesuaian Format & Requirement Field
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Total: {rawSheetData.rawRows.length} baris di Sheet
                  </span>
                </div>

                {/* START ROW SELECTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Baris Awal Data Record:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={mappingConfig.startRow}
                        onChange={(e) =>
                          setMappingConfig({ ...mappingConfig, startRow: parseInt(e.target.value) || 2 })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-sky-500"
                      >
                        {Array.from({ length: Math.min(20, rawSheetData.rawRows.length) }, (_, i) => i + 1).map(
                          (r) => (
                            <option key={r} value={r}>
                              Baris ke-{r} {r === 1 ? '(Termasuk Header)' : r === 2 ? '(Default setelah Header)' : ''}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      Baris Judul Header (Kolom):
                    </label>
                    <select
                      value={mappingConfig.headerRow}
                      onChange={(e) => {
                        const hRow = parseInt(e.target.value) || 1;
                        setMappingConfig({
                          ...mappingConfig,
                          headerRow: hRow,
                          startRow: Math.max(hRow + 1, mappingConfig.startRow),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                    >
                      {Array.from({ length: Math.min(10, rawSheetData.rawRows.length) }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>
                          Baris ke-{r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* MANDATORY FIELD SELECTORS (REQUIREMENT FIELDS) */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2.5">
                  <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider block">
                    REQUIREMENT FIELDS (WAJIB DIMALIKAN):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* NOMOR ABSEN (MANDATORY/AUTO) */}
                    <div>
                      <label className="block text-slate-200 font-bold mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-amber-400" />
                          Kolom Nomor Absen:
                        </span>
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded text-[10px]">
                          WAJIB / AUTO
                        </span>
                      </label>
                      <select
                        value={mappingConfig.absenColIndex}
                        onChange={(e) =>
                          setMappingConfig({ ...mappingConfig, absenColIndex: parseInt(e.target.value) })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-medium text-slate-100 focus:outline-none focus:border-sky-500"
                      >
                        <option value={-1}>✨ Auto-generate Nomor Absen (01, 02, 03...)</option>
                        {columnOptions.map((opt) => (
                          <option key={opt.index} value={opt.index}>
                            [Kolom {opt.colLetter}] {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* NAMA CUSTOMER (MANDATORY) */}
                    <div>
                      <label className="block text-slate-200 font-bold mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                          Kolom Nama Customer:
                        </span>
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded text-[10px]">
                          WAJIB
                        </span>
                      </label>
                      <select
                        value={mappingConfig.nameColIndex}
                        onChange={(e) =>
                          setMappingConfig({ ...mappingConfig, nameColIndex: parseInt(e.target.value) })
                        }
                        className={`w-full bg-slate-900 border rounded-lg px-3 py-1.5 font-medium text-slate-100 focus:outline-none ${
                          mappingConfig.nameColIndex >= 0
                            ? 'border-emerald-500/60 text-emerald-300'
                            : 'border-rose-500 text-rose-300'
                        }`}
                      >
                        <option value={-1}>-- Pilih Kolom Nama Customer --</option>
                        {columnOptions.map((opt) => (
                          <option key={opt.index} value={opt.index}>
                            [Kolom {opt.colLetter}] {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* OPTIONAL FIELD SELECTORS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5 text-[11px]">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Kode / Kelas / Group (Opsional):
                    </label>
                    <select
                      value={mappingConfig.categoryColIndex}
                      onChange={(e) =>
                        setMappingConfig({ ...mappingConfig, categoryColIndex: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
                    >
                      <option value={-1}>- Tidak Dipakai -</option>
                      {columnOptions.map((opt) => (
                        <option key={opt.index} value={opt.index}>
                          [Kolom {opt.colLetter}] {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Catatan / No HP (Opsional):
                    </label>
                    <select
                      value={mappingConfig.notesColIndex}
                      onChange={(e) =>
                        setMappingConfig({ ...mappingConfig, notesColIndex: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
                    >
                      <option value={-1}>- Tidak Dipakai -</option>
                      {columnOptions.map((opt) => (
                        <option key={opt.index} value={opt.index}>
                          [Kolom {opt.colLetter}] {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* REQUIREMENT STATUS BANNER */}
              {!isRequirementMet ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-semibold">
                    SYARAT WAJIB: Silakan tentukan Kolom Nomor Absen dan Nama Customer di atas!
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    {validCustomers.length} Customer Valid Siap Di-import
                  </span>
                  {mappedResult && mappedResult.skippedCount > 0 && (
                    <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      {mappedResult.skippedCount} baris inkomplit/dilewati
                    </span>
                  )}
                </div>
              )}

              {/* LIVE PREVIEW TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-bold text-slate-300">
                    Pratinjau Hasil Pembacaan (Mulai Baris ke-{mappingConfig.startRow}):
                  </span>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Ganti antrean saat ini</span>
                  </label>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-950/80 text-[11px]">
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-300 sticky top-0 font-bold border-b border-slate-700">
                      <tr>
                        <th className="px-3 py-2 w-10">#</th>
                        <th className="px-3 py-2">No Absen (Wajib)</th>
                        <th className="px-3 py-2">Nama Customer (Wajib)</th>
                        <th className="px-3 py-2">Kode/Kelas</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {rawSheetData.rawRows.slice(Math.max(0, mappingConfig.startRow - 1), Math.max(0, mappingConfig.startRow - 1) + 40).map((row, idx) => {
                        const rawAbsenCell = mappingConfig.absenColIndex >= 0 && row[mappingConfig.absenColIndex] !== undefined
                          ? String(row[mappingConfig.absenColIndex]).trim()
                          : '';
                        const rawName = mappingConfig.nameColIndex >= 0 && row[mappingConfig.nameColIndex] !== undefined
                          ? String(row[mappingConfig.nameColIndex]).trim()
                          : '';
                        const rawCat = mappingConfig.categoryColIndex >= 0 && row[mappingConfig.categoryColIndex] !== undefined
                          ? String(row[mappingConfig.categoryColIndex]).trim()
                          : '';

                        const displayAbsen = rawAbsenCell.length > 0
                          ? rawAbsenCell
                          : `${String(idx + 1).padStart(2, '0')} (Auto)`;

                        const isValid = rawName.length > 0;

                        return (
                          <tr key={idx} className={isValid ? 'hover:bg-slate-800/40' : 'bg-rose-950/20 text-slate-500'}>
                            <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono font-bold text-amber-300">
                              {displayAbsen}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-100">
                              {rawName || <span className="text-rose-400 italic">Kosong</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-400">{rawCat || '-'}</td>
                            <td className="px-3 py-2 font-mono">
                              {isValid ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                  Valid
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                  Kosong
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Batal
          </button>
          <button
            disabled={!isRequirementMet || validCustomers.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Import {validCustomers.length} Customer Valid</span>
          </button>
        </div>
      </div>
    </div>
  );
};

