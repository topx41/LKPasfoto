import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  UserCheck,
  Plus,
  User,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  Share2,
  Edit2,
  Save,
} from 'lucide-react';
import { Customer } from '../types';
import { downloadOrShareCustomersExcel } from '../utils/excelUtils';

interface SearchCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  activeCustomerId: string | null;
  activeSessionName?: string;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (name: string, absenceNumber?: string) => void;
  onUpdateCustomer?: (id: string, updates: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
  onDeleteMultipleCustomers?: (ids: string[]) => void;
  onDeleteAllCustomers?: () => void;
}

export const SearchCustomerModal: React.FC<SearchCustomerModalProps> = ({
  isOpen,
  onClose,
  customers,
  activeCustomerId,
  activeSessionName = 'Sesi Utama',
  onSelectCustomer,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onDeleteMultipleCustomers,
  onDeleteAllCustomers,
}) => {
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAbsenceNumber, setNewAbsenceNumber] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editAbsence, setEditAbsence] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Bulk Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const handleStartEditCustomer = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditAbsence(customer.absenceNumber || customer.code || '');
    setEditCategory(customer.category || '');
    setEditNotes(customer.notes || '');
  };

  const handleSaveEditCustomer = () => {
    if (!editingCustomer || !onUpdateCustomer) return;
    if (!editName.trim()) return;

    onUpdateCustomer(editingCustomer.id, {
      name: editName.trim(),
      absenceNumber: editAbsence.trim() || undefined,
      code: editAbsence.trim() || undefined,
      category: editCategory.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });

    setEditingCustomer(null);
  };

  const handleTransferShare = async () => {
    setIsSharing(true);
    try {
      await downloadOrShareCustomersExcel(customers, activeSessionName);
    } catch (e) {
      console.error('Error sharing customer excel:', e);
    } finally {
      setIsSharing(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => {
      const code = c.absenceNumber || c.code || '';
      return (
        c.name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    });
  }, [customers, query]);

  if (!isOpen) return null;

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomer(newName.trim(), newAbsenceNumber.trim() || undefined);
    setNewName('');
    setNewAbsenceNumber('');
    setShowAddForm(false);
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map((c) => c.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCustomerIds.length === 0) return;
    if (onDeleteMultipleCustomers) {
      onDeleteMultipleCustomers(selectedCustomerIds);
    } else if (onDeleteCustomer) {
      selectedCustomerIds.forEach((id) => onDeleteCustomer(id));
    }
    setSelectedCustomerIds([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Kelola & Cari Customer</h3>
              <p className="text-xs text-slate-400">Total {customers.length} customer terdaftar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar & Multi-Select Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, absen/ID, atau kategori..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:border-sky-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {filteredCustomers.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
              >
                {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Pilih Semua</span>
              </button>
            )}

            {selectedCustomerIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedCustomerIds.length})</span>
              </button>
            )}

            <button
              onClick={handleTransferShare}
              disabled={isSharing}
              className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow shrink-0"
              title="Transfer Data Customer ke File Excel via Popup Android"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Transfer .xlsx</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Customer</span>
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewSubmit}
            className="p-4 bg-sky-950/30 border-b border-sky-500/20 flex flex-col gap-3"
          >
            <div className="text-xs font-semibold text-sky-300">Tambah Customer Baru (LK Shooter)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Nama Customer *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                placeholder="No ID / Absen (cth: 12)"
                value={newAbsenceNumber}
                onChange={(e) => setNewAbsenceNumber(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-amber-300 font-mono font-semibold text-xs rounded-lg focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg shadow"
              >
                Simpan & Pilih
              </button>
            </div>
          </form>
        )}

        {/* Customer List Result - Table/List View */}
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <User className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">Tidak menemukan customer "{query}"</p>
              <button
                onClick={() => {
                  setNewName(query);
                  setShowAddForm(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah "{query}" sebagai customer baru
              </button>
            </div>
          ) : (
            <div>
              {/* List Table Header */}
              <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 flex items-center justify-between uppercase tracking-wider sticky top-0 z-10">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-4 shrink-0 text-center">Edit</span>
                  <span className="w-4 shrink-0 text-center">Cek</span>
                  <span className="w-12 text-center shrink-0">Absen</span>
                  <span>Nama Customer</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline">Foto</span>
                  <span>Status</span>
                  <span className="w-6 text-center">Aksi</span>
                </div>
              </div>

              {/* List Rows */}
              <div className="divide-y divide-slate-800/60">
                {filteredCustomers.map((c, index) => {
                  const isActive = c.id === activeCustomerId;
                  const isSelected = selectedCustomerIds.includes(c.id);
                  const absence = c.absenceNumber || c.code;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        onClose();
                      }}
                      className={`py-2.5 px-3 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-rose-500/10 text-slate-100'
                          : isActive
                          ? 'bg-sky-500/15 text-slate-100 font-bold'
                          : index % 2 === 0
                          ? 'bg-slate-900/40 hover:bg-slate-800/80 text-slate-200'
                          : 'bg-slate-950/40 hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      {/* Left side: Edit, Checkbox, Absen, Name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* EDIT BUTTON ON FAR LEFT */}
                        {onUpdateCustomer ? (
                          <button
                            onClick={(e) => handleStartEditCustomer(c, e)}
                            title="Edit Data Customer (Paling Kiri)"
                            className="p-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 rounded-md transition-colors shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="w-5 shrink-0" />
                        )}

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(c.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer shrink-0"
                        />

                        {/* Absen / ID Badge */}
                        {absence ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] sm:text-xs border border-amber-500/30 shrink-0 text-center min-w-[36px]">
                            #{absence}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono text-[10px] shrink-0 text-center min-w-[36px]">
                            #-
                          </span>
                        )}

                        {/* Name & Category */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm break-words leading-tight text-slate-100">
                              {c.name}
                            </span>
                            {c.category && (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                {c.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Foto Count, Status, Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-sky-400 font-mono font-bold shrink-0 hidden sm:inline">
                          📷 {c.photoCount}
                        </span>

                        {isActive ? (
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 flex items-center gap-1 shrink-0">
                            <UserCheck className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        ) : c.status === 'completed' ? (
                          <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>Antrean</span>
                          </span>
                        )}

                        {onDeleteCustomer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCustomer(c.id);
                            }}
                            title="Hapus Customer Ini"
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400 flex flex-wrap justify-between items-center gap-2">
          <span>Menampilkan {filteredCustomers.length} Customer</span>

          <div className="flex items-center gap-2">
            {onDeleteAllCustomers && customers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(true)}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Customer Dalam Sesi</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* EDIT CUSTOMER POPUP MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Edit Data Customer</h3>
                  <p className="text-xs text-slate-400">Perbarui nama, nomor absen, &amp; kategori</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nama Customer:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nomor Absen / ID Customer:</label>
                <input
                  type="text"
                  placeholder="cth: 12"
                  value={editAbsence}
                  onChange={(e) => setEditAbsence(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Kategori / Paket:</label>
                <input
                  type="text"
                  placeholder="cth: Wisuda, Pas Foto, Kelas A"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Catatan / Keterangan:</label>
                <input
                  type="text"
                  placeholder="Catatan khusus customer..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditCustomer}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete All Modal */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Hapus Semua Customer?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus <strong>semua {customers.length} customer</strong> pada sesi ini?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (onDeleteAllCustomers) onDeleteAllCustomers();
                  setShowConfirmDeleteAll(false);
                }}
                className="px-5 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs shadow"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
