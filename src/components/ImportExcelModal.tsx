import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, X, Check, AlertCircle, FileCheck2, Share2, Smartphone } from 'lucide-react';
import { parseCustomerExcel, ImportedCustomer } from '../utils/excelUtils';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (customers: ImportedCustomer[], replaceExisting: boolean) => void;
  initialParsedData?: ImportedCustomer[] | null;
  initialFileName?: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers,
  initialParsedData,
  initialFileName,
}) => {
  const [parsedData, setParsedData] = useState<ImportedCustomer[] | null>(initialParsedData || null);
  const [fileName, setFileName] = useState<string>(initialFileName || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [showWhatsAppGuide, setShowWhatsAppGuide] = useState<boolean>(false);

  useEffect(() => {
    if (initialParsedData && initialParsedData.length > 0) {
      setParsedData(initialParsedData);
      if (initialFileName) setFileName(initialFileName);
    }
  }, [initialParsedData, initialFileName]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const result = await parseCustomerExcel(file);
      if (result.length === 0) {
        setErrorMsg('Tidak ditemukan data nama customer pada file Excel ini.');
        setParsedData(null);
      } else {
        setParsedData(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca file Excel. Pastikan format .xlsx atau .xls valid.');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedData && parsedData.length > 0) {
      onImportCustomers(parsedData, replaceExisting);
      onClose();
      setParsedData(null);
      setFileName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Import Data Customer Excel</h3>
              <p className="text-xs text-slate-400">Muat daftar nama dari file .xlsx / .xls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* WhatsApp / Share Info Banner */}
          <div className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Menerima File dari WhatsApp / Aplikasi Lain
              </span>
              <button
                onClick={() => setShowWhatsAppGuide(!showWhatsAppGuide)}
                className="text-[11px] text-sky-400 hover:underline font-semibold"
              >
                {showWhatsAppGuide ? 'Sembunyikan Petunjuk' : 'Lihat Cara Pakai'}
              </button>
            </div>
            {showWhatsAppGuide && (
              <div className="pt-2 border-t border-emerald-500/20 text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
                <p>
                  <strong className="text-emerald-300">1. Bagikan Langsung (Share Sheet):</strong> Di WhatsApp HP, tekan lama file Excel &rarr; klik ikon <Share2 className="w-3 h-3 inline" /> <strong>Bagikan</strong> &rarr; Pilih "Foto Studio Manager".
                </p>
                <p>
                  <strong className="text-emerald-300">2. Drag & Drop:</strong> Jika membuka dari WhatsApp Web / Desktop, Anda bisa langsung <strong>menarik (drag) file Excel dan melepaskannya</strong> di layar mana saja dalam aplikasi ini.
                </p>
                <p>
                  <strong className="text-emerald-300">3. Unduh & Pilih:</strong> Atau simpan file Excel dari WhatsApp ke HP/Laptop, lalu gunakan area unggah di bawah ini.
                </p>
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition-all bg-slate-950/40 group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {fileName ? fileName : 'Klik atau Drag & Drop file Excel ke sini'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Kolom nama customer akan terdeteksi otomatis (Format .xlsx, .xls, .csv)
            </p>
          </div>

          {isLoading && (
            <div className="py-6 text-center text-slate-400 text-sm animate-pulse flex justify-center items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 animate-spin text-emerald-400" />
              Memproses file Excel...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4" />
                  Berhasil membaca {parsedData.length} customer
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

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-950/60 text-xs">
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 sticky top-0 font-medium">
                    <tr>
                      <th className="px-3 py-2 w-12">No</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Kode</th>
                      <th className="px-3 py-2">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parsedData.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="px-3 py-2 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-100">{item.name}</td>
                        <td className="px-3 py-2 text-slate-400">{item.code || '-'}</td>
                        <td className="px-3 py-2 text-slate-400">{item.category || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 50 && (
                  <div className="p-2 text-center text-slate-500 text-[11px] bg-slate-900">
                    ...dan {parsedData.length - 50} data lainnya
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl"
          >
            Batal
          </button>
          <button
            disabled={!parsedData || parsedData.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Import {parsedData ? parsedData.length : 0} Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
