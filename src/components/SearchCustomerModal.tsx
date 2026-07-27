import React, { useState, useMemo } from 'react';
import { Search, X, UserCheck, Plus, User, CheckCircle2, Clock } from 'lucide-react';
import { Customer } from '../types';

interface SearchCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  activeCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (name: string, category?: string) => void;
}

export const SearchCustomerModal: React.FC<SearchCustomerModalProps> = ({
  isOpen,
  onClose,
  customers,
  activeCustomerId,
  onSelectCustomer,
  onAddCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [customers, query]);

  if (!isOpen) return null;

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomer(newName.trim(), newCategory.trim() || undefined);
    setNewName('');
    setNewCategory('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Cari Customer</h3>
              <p className="text-xs text-slate-400">Pilih customer untuk sesi foto aktif</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama, kode, atau kategori customer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 text-sm rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
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

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        {/* Quick Add Form if toggled */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewSubmit}
            className="p-4 bg-sky-950/30 border-b border-sky-500/20 flex flex-col gap-3"
          >
            <div className="text-xs font-semibold text-sky-300">Tambah Customer Baru</div>
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
                placeholder="Kategori (misal: Wisuda)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg focus:outline-none focus:border-sky-500"
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
                className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg shadow"
              >
                Simpan & Pilih
              </button>
            </div>
          </form>
        )}

        {/* Customer List Result */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak menemukan customer "{query}"</p>
              <button
                onClick={() => {
                  setNewName(query);
                  setShowAddForm(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah "{query}" sebagai customer baru
              </button>
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isActive = c.id === activeCustomerId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/50 text-slate-100 shadow-sm'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
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
                        {c.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {c.code}
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

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {isActive ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500 text-white shadow-sm">
                        <UserCheck className="w-3.5 h-3.5" />
                        Sedang Aktif
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
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400 flex justify-between items-center">
          <span>Total: {filteredCustomers.length} Customer</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
