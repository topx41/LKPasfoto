import React, { useState, useMemo } from 'react';
import { Users, UserPlus, CheckCircle2, ChevronRight, Sparkles, Trash2, ArrowRight, Search, X } from 'lucide-react';
import { Customer } from '../types';

interface CustomerQueueProps {
  customers: Customer[];
  activeCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onNextCustomer: () => void;
  onOpenImportModal: () => void;
  onOpenSearchModal: () => void;
  onAddCustomer: (name: string, category?: string) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomerQueue: React.FC<CustomerQueueProps> = ({
  customers,
  activeCustomerId,
  onSelectCustomer,
  onNextCustomer,
  onOpenImportModal,
  onOpenSearchModal,
  onAddCustomer,
  onDeleteCustomer,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeCustomer = customers.find((c) => c.id === activeCustomerId);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const pendingCustomers = filteredCustomers.filter((c) => c.id !== activeCustomerId && c.status !== 'completed');
  const completedCustomers = filteredCustomers.filter((c) => c.status === 'completed');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onAddCustomer(nameInput.trim(), categoryInput.trim() || undefined);
    setNameInput('');
    setCategoryInput('');
    setIsAdding(false);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-100">Antrean Customer</h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenImportModal}
            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
            title="Import dari Excel"
          >
            + Excel
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            title="Tambah Customer Manual"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Search Input Bar in Queue */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari customer dalam sesi ini..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl focus:outline-none focus:border-sky-500"
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
      </div>

      {/* Inline Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleQuickAdd} className="p-3 bg-slate-950/60 border-b border-slate-800 space-y-2 text-xs">
          <input
            type="text"
            required
            autoFocus
            placeholder="Nama Customer *"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Kategori (opsional)"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-sky-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg shadow"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      {/* Customer List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Active Customer Highlight Card */}
        <div>
          <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Customer Aktif (Sedang Difoto)</span>
            {activeCustomer && (
              <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full">
                📷 {activeCustomer.photoCount} foto
              </span>
            )}
          </div>

          {activeCustomer ? (
            <div className="p-3 bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-500/40 rounded-xl shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100 truncate">{activeCustomer.name}</span>
                {activeCustomer.code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {activeCustomer.code}
                  </span>
                )}
              </div>
              {activeCustomer.category && (
                <p className="text-[11px] text-sky-300/80">{activeCustomer.category}</p>
              )}

              {/* Action Bar */}
              <div className="pt-2 border-t border-sky-500/20 flex items-center justify-between">
                <button
                  onClick={onNextCustomer}
                  className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg shadow flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <span>Lanjut Customer Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl text-center text-slate-400">
              Belum ada customer aktif dipilih
            </div>
          )}
        </div>

        {/* Pending Queue List */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Antrean Berikutnya ({pendingCustomers.length})</span>
            <button
              onClick={onOpenSearchModal}
              className="text-sky-400 hover:underline text-[10px] font-medium"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-1.5">
            {pendingCustomers.length === 0 ? (
              <p className="text-slate-500 italic text-[11px] py-2 text-center">
                Tidak ada antrean tersisa
              </p>
            ) : (
              pendingCustomers.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-200 truncate group-hover:text-sky-400">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {c.category || 'Customer Regular'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomer(c.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Customers */}
        {completedCustomers.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesai Difoto ({completedCustomers.length})</span>
            </div>
            <div className="space-y-1">
              {completedCustomers.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-slate-300 flex items-center justify-between text-[11px] cursor-pointer hover:bg-emerald-500/10"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono shrink-0">
                    {c.photoCount} foto
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900 text-center">
        <button
          onClick={onOpenSearchModal}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Kelola & Cari Customer</span>
        </button>
      </div>
    </div>
  );
};
