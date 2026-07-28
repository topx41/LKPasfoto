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
} from 'lucide-react';
import { Customer } from '../types';

interface SearchCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  activeCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (name: string, absenceNumber?: string) => void;
  onDeleteCustomer?: (id: string) => void;
  onDeleteMultipleCustomers?: (ids: string[]) => void;
  onDeleteAllCustomers?: () => void;
}

export const SearchCustomerModal: React.FC<SearchCustomerModalProps> = ({
  isOpen,
  onClose,
  customers,
  activeCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onDeleteCustomer,
  onDeleteMultipleCustomers,
  onDeleteAllCustomers,
}) => {
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAbsenceNumber, setNewAbsenceNumber] = useState('');

  // Bulk Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

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

        {/* Customer List Result */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
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
            filteredCustomers.map((c) => {
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
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/40 text-slate-100'
                      : isActive
                      ? 'bg-sky-500/15 border-sky-500/50 text-slate-100 shadow-sm'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelect(c.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer shrink-0"
                    />

                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : c.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-slate-100">
                          {c.name}
                        </span>
                        {absence && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Absen #{absence}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {c.category && <span>{c.category}</span>}
                        <span className="flex items-center gap-1 text-sky-400 font-mono">
                          📷 {c.photoCount} foto
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500 text-slate-950 font-bold shadow-sm">
                        <UserCheck className="w-3.5 h-3.5" />
                        Aktif
                      </span>
                    ) : c.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        <Clock className="w-3.5 h-3.5" />
                        Antrean
                      </span>
                    )}

                    {onDeleteCustomer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomer(c.id);
                        }}
                        title="Hapus Customer Ini"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
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
