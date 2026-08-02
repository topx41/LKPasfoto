import React, { useState } from 'react';
import {
  Image,
  Download,
  Trash2,
  Eye,
  FileSpreadsheet,
  Share2,
  Search,
  X,
  Edit3,
  Save,
  Star,
  Plus,
  Check,
  List,
  Grid,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { PhotoRecord } from '../types';

interface PhotoHistoryListProps {
  photos: PhotoRecord[];
  onDeletePhoto: (photoId: string) => void;
  onDeleteAllPhotos?: () => void;
  onUpdatePhoto: (
    photoId: string,
    updates: {
      fileName?: string;
      fileNumber?: number;
      customerName?: string;
      customerCode?: string;
      absenceNumber?: string;
      isMarked?: boolean;
      notes?: string;
    }
  ) => void;
  onExportExcel: () => void;
  isSharing: boolean;
}

export const PhotoHistoryList: React.FC<PhotoHistoryListProps> = ({
  photos,
  onDeletePhoto,
  onDeleteAllPhotos,
  onUpdatePhoto,
  onExportExcel,
  isSharing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMarkedOnly, setFilterMarkedOnly] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

  // Modal view for showing all records when > 10
  const [showAllRecordsModal, setShowAllRecordsModal] = useState(false);

  // POPUP EDIT MODAL State
  const [editingPhoto, setEditingPhoto] = useState<PhotoRecord | null>(null);
  const [editFileName, setEditFileName] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editAbsenceNumber, setEditAbsenceNumber] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsMarked, setEditIsMarked] = useState<boolean>(false);

  // Confirm Delete All Photos Modal
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const filteredPhotos = photos.filter((p) => {
    if (filterMarkedOnly && !p.isMarked) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const absence = p.absenceNumber || p.customerCode || '';
    const notes = p.notes || '';
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.fileName.toLowerCase().includes(q) ||
      p.prefix.toLowerCase().includes(q) ||
      absence.toLowerCase().includes(q) ||
      notes.toLowerCase().includes(q)
    );
  });

  const markedCount = photos.filter((p) => p.isMarked).length;

  const handleToggleMark = (photo: PhotoRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdatePhoto(photo.id, { isMarked: !photo.isMarked });

    if (selectedPhoto && selectedPhoto.id === photo.id) {
      setSelectedPhoto({
        ...selectedPhoto,
        isMarked: !photo.isMarked,
      });
    }
  };

  // Open Edit Popup Modal
  const handleOpenEditPopup = (photo: PhotoRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhoto(photo);
    setEditFileName(photo.fileName);
    setEditCustomerName(photo.customerName);
    setEditAbsenceNumber(photo.absenceNumber || photo.customerCode || '');
    setEditNotes(photo.notes || '');
    setEditIsMarked(Boolean(photo.isMarked));
  };

  // Save Edit Popup
  const handleSaveEditPopup = () => {
    if (!editingPhoto) return;
    if (!editFileName.trim()) return;

    const absence = editAbsenceNumber.trim();
    onUpdatePhoto(editingPhoto.id, {
      fileName: editFileName.trim(),
      customerName: editCustomerName.trim() || 'Customer Studio',
      absenceNumber: absence,
      customerCode: absence,
      notes: editNotes.trim(),
      isMarked: editIsMarked,
    });

    if (selectedPhoto && selectedPhoto.id === editingPhoto.id) {
      setSelectedPhoto({
        ...selectedPhoto,
        fileName: editFileName.trim(),
        customerName: editCustomerName.trim() || 'Customer Studio',
        absenceNumber: absence,
        customerCode: absence,
        notes: editNotes.trim(),
        isMarked: editIsMarked,
      });
    }

    setEditingPhoto(null);
  };

  const handleDownloadSingle = (photo: PhotoRecord) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = photo.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Display all filtered photos in the scrollable list
  const frontDisplayPhotos = filteredPhotos;
  const remainingCount = 0;

  // Render photo rows helper function
  const renderPhotoTableRows = (photoList: PhotoRecord[], isModal: boolean = false) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-2.5 px-3 w-12 text-center">Edit</th>
              <th className="py-2.5 px-3 w-10 text-center">No</th>
              <th className="py-2.5 px-3">Nama Customer &amp; Keterangan</th>
              <th className="py-2.5 px-3">No. Absen / ID</th>
              <th className="py-2.5 px-3 w-16 text-center">Tandai</th>
              <th className="py-2.5 px-3 text-right">Hapus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {photoList.map((photo, idx) => {
              const absence = photo.absenceNumber || photo.customerCode;
              return (
                <tr
                  key={photo.id}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    photo.isMarked ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {/* EDIT BUTTON ON FAR LEFT */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => handleOpenEditPopup(photo, e)}
                      title="Edit Data Rekap (Popup Modal)"
                      className="p-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-slate-950 rounded-lg transition-colors font-bold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[10px]">Edit</span>
                    </button>
                  </td>

                  {/* No */}
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-medium">
                    {idx + 1}
                  </td>

                  {/* Nama Customer & Keterangan di bawahnya */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-100 text-xs sm:text-sm">
                      {photo.customerName}
                    </div>
                    {photo.notes ? (
                      <p className="text-[11px] text-amber-300/90 italic mt-0.5 leading-tight font-normal">
                        💬 {photo.notes}
                      </p>
                    ) : null}
                  </td>

                  {/* Absence Number */}
                  <td className="py-2.5 px-3">
                    {absence ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30">
                        {absence}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">-</span>
                    )}
                  </td>

                  {/* Tandai Button */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => handleToggleMark(photo, e)}
                      title={photo.isMarked ? 'Hapus Tanda ⭐' : 'Tandai Foto ⭐'}
                      className={`p-1.5 rounded-full transition-all ${
                        photo.isMarked
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md scale-110'
                          : 'bg-slate-800 text-slate-500 hover:text-amber-400'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${photo.isMarked ? 'fill-slate-950' : ''}`} />
                    </button>
                  </td>

                  {/* Hapus Action */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      title="Hapus Record Foto"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <List className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Rekap Foto LK Shooter</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-xs">
                {photos.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Pencatatan Nama, No. Absen, Tandai &amp; Keterangan (di bawah nama)</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Filter Marked */}
          <button
            onClick={() => setFilterMarkedOnly(!filterMarkedOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              filterMarkedOnly
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Filter foto yang ditandai"
          >
            <Star className={`w-3.5 h-3.5 ${filterMarkedOnly ? 'fill-slate-950' : 'text-amber-400'}`} />
            <span>⭐ Ditandai ({markedCount})</span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, absen, file..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:border-sky-500"
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

          {/* Export Excel Button */}
          <button
            onClick={onExportExcel}
            disabled={isSharing || photos.length === 0}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-xs shadow flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim Rekap Excel</span>
          </button>

          {/* Hapus Semua Rekap Foto Sesi Ini Button */}
          {onDeleteAllPhotos && photos.length > 0 && (
            <button
              onClick={() => setShowConfirmDeleteAll(true)}
              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              title="Hapus Semua Rekap Foto Sesi Ini"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Hapus Semua Rekap</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Front Display List (Up to 10 records) */}
      <div className="p-4 flex-1 overflow-y-auto">
        {filteredPhotos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Image className="w-12 h-12 mx-auto opacity-20" />
            <p className="text-xs font-medium">
              {filterMarkedOnly
                ? 'Belum ada foto yang ditandai (⭐).'
                : searchQuery
                ? `Tidak menemukan foto untuk "${searchQuery}"`
                : 'Belum ada rekap foto pada sesi ini.'}
            </p>
            <p className="text-[11px] text-slate-600">
              Tekan tombol <strong className="text-sky-400">CAPTURE / TAMBAH NOMOR</strong> untuk merekap foto.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {renderPhotoTableRows(frontDisplayPhotos)}

            {/* Button Lihat Record Lainnya if > 10 */}
            {remainingCount > 0 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowAllRecordsModal(true)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                >
                  <span>Lihat Record Lainnya ({remainingCount} Foto)</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL RECORD MODAL (When clicking Lihat Record Lainnya) */}
      {showAllRecordsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Daftar Lengkap Rekap Foto</h3>
                  <p className="text-xs text-slate-400">Total {filteredPhotos.length} record foto tercatat</p>
                </div>
              </div>

              <button
                onClick={() => setShowAllRecordsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {renderPhotoTableRows(filteredPhotos, true)}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Menampilkan {filteredPhotos.length} dari {photos.length} total foto</span>
              <button
                onClick={() => setShowAllRecordsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PHOTO POPUP MODAL (Clean Non-Inline Modal) */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Edit Data Rekap Foto</h3>
                  <p className="text-xs text-slate-400">Perbarui informasi customer & file kamera</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4 text-xs">
              {/* Photo Thumbnail Banner */}
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <img
                  src={editingPhoto.dataUrl}
                  alt={editingPhoto.fileName}
                  className="w-14 h-14 object-cover rounded-lg border border-slate-800 shrink-0"
                />
                <div>
                  <p className="font-bold text-slate-100 text-sm">{editingPhoto.customerName}</p>
                  <p className="text-sky-400 font-mono font-bold">{editingPhoto.fileName}</p>
                  <p className="text-[10px] text-slate-500">
                    Waktu: {new Date(editingPhoto.timestamp).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nama Customer:
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm rounded-xl focus:outline-none focus:border-sky-500"
                  placeholder="Nama Customer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    No. Absen / ID:
                  </label>
                  <input
                    type="text"
                    value={editAbsenceNumber}
                    onChange={(e) => setEditAbsenceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-sm rounded-xl focus:outline-none focus:border-sky-500"
                    placeholder="cth: 12"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nomor File Kamera:
                  </label>
                  <input
                    type="text"
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-sky-400 font-mono font-bold text-sm rounded-xl focus:outline-none focus:border-sky-500"
                    placeholder="cth: DSC0012.JPG"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Status Tandai Foto (⭐):
                </label>
                <button
                  type="button"
                  onClick={() => setEditIsMarked(!editIsMarked)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                    editIsMarked
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${editIsMarked ? 'fill-slate-950' : ''}`} />
                  <span>{editIsMarked ? '⭐ Foto Ditandai' : 'Biasa (Tidak Ditandai)'}</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Keterangan / Catatan:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-sky-500"
                  placeholder="Tambah catatan keterangan foto..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditPopup}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-100 text-base">{selectedPhoto.customerName}</p>
                    {(selectedPhoto.absenceNumber || selectedPhoto.customerCode) && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-xs rounded">
                        {selectedPhoto.absenceNumber || selectedPhoto.customerCode}
                      </span>
                    )}
                  </div>
                  <p className="text-sky-400 font-mono font-semibold text-xs mt-0.5">
                    Nomor File: {selectedPhoto.fileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleMark(selectedPhoto, e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    selectedPhoto.isMarked
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${selectedPhoto.isMarked ? 'fill-slate-950' : ''}`} />
                  <span>{selectedPhoto.isMarked ? 'Ditandai ⭐' : 'Tandai Foto'}</span>
                </button>

                <button
                  onClick={(e) => handleOpenEditPopup(selectedPhoto, e)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Data</span>
                </button>

                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.fileName}
                className="max-h-[55vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            {selectedPhoto.notes && (
              <div className="px-5 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="font-bold text-sky-400 shrink-0">💬 Keterangan:</span>
                <span className="italic">{selectedPhoto.notes}</span>
              </div>
            )}

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-mono">
                Waktu: {new Date(selectedPhoto.timestamp).toLocaleString('id-ID')}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ALL PHOTOS MODAL */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Hapus Semua Rekap Foto?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus <strong>semua {photos.length} rekap foto</strong> pada sesi ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDeleteAllPhotos) onDeleteAllPhotos();
                  setShowConfirmDeleteAll(false);
                }}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
