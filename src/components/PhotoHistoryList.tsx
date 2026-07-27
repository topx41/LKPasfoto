import React, { useState } from 'react';
import { Image, Download, Trash2, Eye, FileSpreadsheet, Share2, Search, X, Edit3, Check, Save } from 'lucide-react';
import { PhotoRecord } from '../types';

interface PhotoHistoryListProps {
  photos: PhotoRecord[];
  onDeletePhoto: (photoId: string) => void;
  onUpdatePhoto: (
    photoId: string,
    updates: { fileName?: string; fileNumber?: number; customerName?: string }
  ) => void;
  onExportExcel: () => void;
  isSharing: boolean;
}

export const PhotoHistoryList: React.FC<PhotoHistoryListProps> = ({
  photos,
  onDeletePhoto,
  onUpdatePhoto,
  onExportExcel,
  isSharing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

  // Edit State
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editFileNumber, setEditFileNumber] = useState<number>(1);

  const filteredPhotos = photos.filter(
    (p) =>
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prefix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEdit = (photo: PhotoRecord) => {
    setEditingPhotoId(photo.id);
    setEditFileName(photo.fileName);
    setEditCustomerName(photo.customerName);
    setEditFileNumber(photo.fileNumber);
  };

  const handleSaveEdit = (photoId: string) => {
    if (!editFileName.trim()) return;
    onUpdatePhoto(photoId, {
      fileName: editFileName.trim(),
      customerName: editCustomerName.trim() || 'General Customer',
      fileNumber: Number(editFileNumber) || 1,
    });
    setEditingPhotoId(null);

    // Update selectedPhoto if currently open in lightbox
    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto({
        ...selectedPhoto,
        fileName: editFileName.trim(),
        customerName: editCustomerName.trim() || 'General Customer',
        fileNumber: Number(editFileNumber) || 1,
      });
    }
  };

  const handleDownloadSingle = (photo: PhotoRecord) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = photo.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Image className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Hasil Rekap Foto</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-xs">
                {photos.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Daftar file foto studio yang telah di-capture</p>
          </div>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari file / customer..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onExportExcel}
            disabled={isSharing || photos.length === 0}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow flex items-center gap-1.5 transition-all shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim Rekap Excel</span>
          </button>
        </div>
      </div>

      {/* Photos Grid Container */}
      <div className="p-4 flex-1 overflow-y-auto">
        {filteredPhotos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Image className="w-12 h-12 mx-auto opacity-20" />
            <p className="text-xs font-medium">Belum ada foto yang diambil.</p>
            <p className="text-[11px] text-slate-600">
              Tekan tombol <strong className="text-sky-400">CAPTURE FOTO</strong> untuk mulai memfoto customer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-xl overflow-hidden transition-all shadow-md flex flex-col"
              >
                {/* Thumbnail Image */}
                <div
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-4/3 bg-slate-900 cursor-pointer overflow-hidden"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-1.5 bg-slate-900/80 rounded-full text-slate-100">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Meta info */}
                <div className="p-2.5 flex-1 flex flex-col justify-between text-xs space-y-2">
                  {editingPhotoId === photo.id ? (
                    /* Inline Editing Mode */
                    <div className="space-y-1.5 p-1 bg-slate-900 rounded-lg border border-sky-500/50">
                      <div>
                        <label className="text-[9px] text-slate-400 font-medium block">Nomor File Kamera:</label>
                        <input
                          type="text"
                          value={editFileName}
                          onChange={(e) => setEditFileName(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-sky-400 font-mono font-bold text-xs rounded focus:outline-none focus:border-sky-500"
                          placeholder="cth: DSC0012.JPG"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 font-medium block">Nama Customer:</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs rounded focus:outline-none focus:border-sky-500"
                          placeholder="Nama Customer"
                        />
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => handleSaveEdit(photo.id)}
                          className="flex-1 py-1 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded text-[10px] flex items-center justify-center gap-1 shadow"
                        >
                          <Save className="w-3 h-3" />
                          <span>Simpan</span>
                        </button>
                        <button
                          onClick={() => setEditingPhotoId(null)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-slate-100 truncate text-[11px]" title={photo.customerName}>
                            {photo.customerName}
                          </p>
                          <button
                            onClick={() => handleStartEdit(photo)}
                            title="Edit Nomor File Kamera / Nama"
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="mt-1 p-1 bg-slate-900 border border-slate-800/80 rounded-lg">
                          <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Nomor File Kamera:</span>
                          <p className="text-[11px] text-sky-400 font-mono font-bold truncate" title={photo.fileName}>
                            {photo.fileName}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {new Date(photo.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadSingle(photo)}
                            title="Download Foto"
                            className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeletePhoto(photo.id)}
                            title="Hapus Foto"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-bold text-slate-100 text-sm">{selectedPhoto.customerName}</p>
                  <p className="text-sky-400 font-mono font-semibold">Nomor File: {selectedPhoto.fileName}</p>
                </div>
                <button
                  onClick={() => handleStartEdit(selectedPhoto)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Nomor File</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[65vh] overflow-hidden">
              <img
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.fileName}
                className="max-h-[60vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-mono">
                Waktu: {new Date(selectedPhoto.timestamp).toLocaleString('id-ID')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingle(selectedPhoto)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Foto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
