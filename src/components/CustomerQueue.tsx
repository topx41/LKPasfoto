import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Trash2,
  ArrowRight,
  Search,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerQueueProps {
  customers: Customer[];
  activeCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onNextCustomer: () => void;
  onOpenImportModal: () => void;
  onOpenSearchModal: () => void;
  onAddCustomer: (name: string, absenceNumber?: string) => void;
  onDeleteCustomer: (id: string) => void;
  onDeleteMultipleCustomers?: (ids: string[]) => void;
  onDeleteAllCustomers?: () => void;
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
  onDeleteMultipleCustomers,
  onDeleteAllCustomers,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [absenceInput, setAbsenceInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection State for Front View
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const activeCustomer = customers.find((c) => c.id === activeCustomerId);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => {
      const code = c.absenceNumber || c.code || '';
      return (
        c.name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    });
  }, [customers, searchQuery]);

  const pendingCustomers = filteredCustomers.filter((c) => c.id !== activeCustomerId && c.status !== 'completed');
  const completedCustomers = filteredCustomers.filter((c) => c.status === 'completed');

  // Limit front view to 10 pending customers
  const frontPendingCustomers = pendingCustomers.slice(0, 10);
  const remainingCount = pendingCustomers.length - 10;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onAddCustomer(nameInput.trim(), absenceInput.trim() || undefined);
    setNameInput('');
    setAbsenceInput('');
    setIsAdding(false);
  };

  const handleToggleSelectCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedCustomerIds.length === 0) return;
    if (onDeleteMultipleCustomers) {
      onDeleteMultipleCustomers(selectedCustomerIds);
    } else {
      selectedCustomerIds.forEach((id) => onDeleteCustomer(id));
    }
    setSelectedCustomerIds([]);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Antrean Customer</h3>
            <p className="text-[10px] text-slate-400">Total {customers.length} customer</p>
          </div>
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

      {/* Quick Search & Bulk Delete Bar */}
      <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari customer / absen..."
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

        {selectedCustomerIds.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus Pilihan ({selectedCustomerIds.length})</span>
          </button>
        )}
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
            placeholder="No ID / Absen (opsional, cth: 12)"
            value={absenceInput}
            onChange={(e) => setAbsenceInput(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 text-amber-300 font-mono font-semibold rounded-lg focus:outline-none focus:border-sky-500"
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
              className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg shadow"
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
                {(activeCustomer.absenceNumber || activeCustomer.code) && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Absen #{activeCustomer.absenceNumber || activeCustomer.code}
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
                  className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg shadow flex items-center justify-center gap-1.5 transition-all text-xs"
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

        {/* Pending Queue List (Front View: Max 10 Records) */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Antrean Berikutnya ({pendingCustomers.length})</span>
            <button
              onClick={onOpenSearchModal}
              className="text-sky-400 hover:underline text-[10px] font-medium"
            >
              Kelola & Lihat Semua
            </button>
          </div>

          <div className="space-y-1.5">
            {pendingCustomers.length === 0 ? (
              <p className="text-slate-500 italic text-[11px] py-2 text-center">
                Tidak ada antrean tersisa
              </p>
            ) : (
              frontPendingCustomers.map((c) => {
                const absence = c.absenceNumber || c.code;
                const isSelected = selectedCustomerIds.includes(c.id);

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCustomer(c)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all group ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50'
                        : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectCustomer(c.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate group-hover:text-sky-400">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-amber-300 font-mono">
                          {absence ? `Absen #${absence}` : c.category || 'Customer Studio'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomer(c.id);
                        }}
                        title="Hapus Customer"
                        className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    </div>
                  </div>
                );
              })
            )}

            {/* Button Lihat Record Lainnya if > 10 */}
            {remainingCount > 0 && (
              <div className="pt-1.5 text-center">
                <button
                  onClick={onOpenSearchModal}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>Lihat Record Lainnya ({remainingCount} Customer)</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
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
              {completedCustomers.slice(0, 5).map((c) => (
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

      {/* Footer / Action Controls */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
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
