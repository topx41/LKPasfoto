import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  FolderKanban,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Users,
  Camera,
  Copy,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { StudioSession, Customer, PhotoRecord } from '../types';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudioSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (
    newSessionData: Omit<StudioSession, 'id' | 'createdAt' | 'updatedAt'>,
    copyCustomersFromSessionId?: string
  ) => void;
  onUpdateSession: (sessionId: string, updates: Partial<StudioSession>) => void;
  onDeleteSession: (sessionId: string) => void;
  customers: Customer[];
  photos: PhotoRecord[];
  initialEditSessionId?: string | null;
  initialIsCreating?: boolean;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  customers,
  photos,
  initialEditSessionId = null,
  initialIsCreating = false,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(initialEditSessionId);
  const [searchQuery, setSearchQuery] = useState('');

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPrefix, setNewSessionPrefix] = useState('STUDIO_');
  const [newSessionStartNum, setNewSessionStartNum] = useState(1);
  const [newSessionDigitCount, setNewSessionDigitCount] = useState<number>(3);
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [copyCustomers, setCopyCustomers] = useState(true);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editDigitCount, setEditDigitCount] = useState<number>(3);
  const [editCurrentNumber, setEditCurrentNumber] = useState<number>(1);
  const [editNotes, setEditNotes] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialIsCreating) {
        handleStartCreate();
      } else {
        setIsCreating(false);
      }
      if (initialEditSessionId) {
        const sess = sessions.find((s) => s.id === initialEditSessionId);
        if (sess) {
          handleStartEdit(sess);
        }
      }
    }
  }, [isOpen, initialIsCreating, initialEditSessionId]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const matchSess =
        s.name.toLowerCase().includes(q) ||
        (s.prefix && s.prefix.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.date && s.date.includes(q));
      if (matchSess) return true;
      const sessCusts = customers.filter((c) => c.sessionId === s.id);
      return sessCusts.some(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.queueNumber && c.queueNumber.toLowerCase().includes(q))
      );
    });
  }, [sessions, searchQuery, customers]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
    setNewSessionName(`Sesi Foto (${todayStr}) - #${sessions.length + 1}`);
    setNewSessionPrefix(`SESI${sessions.length + 1}_`);
    setNewSessionStartNum(1);
    setNewSessionDigitCount(3);
    setNewSessionNotes('');
    setCopyCustomers(false);
    setIsCreating(true);
  };

  const handleSaveNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    onCreateSession(
      {
        name: newSessionName.trim(),
        date: new Date().toISOString().split('T')[0],
        prefix: newSessionPrefix.trim() || 'STUDIO_',
        currentNumber: Math.max(1, newSessionStartNum),
        numberDigitCount: newSessionDigitCount,
        notes: newSessionNotes.trim(),
      },
      copyCustomers ? activeSessionId : undefined
    );

    setIsCreating(false);
  };

  const handleStartEdit = (session: StudioSession) => {
    setEditingSessionId(session.id);
    setEditName(session.name);
    setEditPrefix(session.prefix);
    setEditDigitCount(session.numberDigitCount || 3);
    setEditCurrentNumber(session.currentNumber || 1);
    setEditNotes(session.notes || '');
  };

  const handleSaveEdit = (sessionId: string) => {
    if (!editName.trim()) return;
    onUpdateSession(sessionId, {
      name: editName.trim(),
      prefix: editPrefix.trim() || 'STUDIO_',
      numberDigitCount: editDigitCount,
      currentNumber: Math.max(1, editCurrentNumber),
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingSessionId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-4">
        {/* MODAL HEADER */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2">
                <span>Managemen Sesi Foto</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                  {sessions.length} Sesi
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Kelola sesi foto secara terpisah dengan antrean dan nomor urut independen.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-3 sm:p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          {/* ACTION BUTTON: CREATE NEW SESSION */}
          {!isCreating && (
            <div className="flex items-center justify-between bg-slate-950/60 p-2.5 sm:p-3 border border-slate-800/80 rounded-xl">
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-200 block">
                  Butuh Sesi Foto Baru?
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Sesi baru dengan prefix file, penomoran, dan rekap foto tersendiri.
                </span>
              </div>
              <button
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-lg shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Sesi Baru</span>
              </button>
            </div>
          )}

          {/* FORM: CREATE NEW SESSION */}
          {isCreating && (
            <form
              onSubmit={handleSaveNewSession}
              className="bg-sky-950/20 border border-sky-500/30 rounded-xl p-3.5 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <h3 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Buat Sesi Foto Baru</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Nama Sesi / Lokasi / Event:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sesi Wisuda UI Batch 1, Pas Foto Kelas A"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Prefix File Sesi Ini:
                  </label>
                  <input
                    type="text"
                    required
                    value={newSessionPrefix}
                    onChange={(e) => setNewSessionPrefix(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sky-400 font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Span Digit Kamera:
                  </label>
                  <select
                    value={newSessionDigitCount}
                    onChange={(e) => setNewSessionDigitCount(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-amber-300 font-bold focus:outline-none focus:border-sky-500"
                  >
                    <option value={2}>2 Digit (01)</option>
                    <option value={3}>3 Digit (001)</option>
                    <option value={4}>4 Digit (0001)</option>
                    <option value={5}>5 Digit (00001)</option>
                    <option value={6}>6 Digit (000001)</option>
                    <option value={7}>7 Digit (0000001)</option>
                    <option value={8}>8 Digit (00000001)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Mulai Nomor Counter Dari:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSessionStartNum}
                    onChange={(e) => setNewSessionStartNum(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg font-mono text-slate-100 font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Catatan Sesi (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Studio B - Kategori Wisuda"
                    value={newSessionNotes}
                    onChange={(e) => setNewSessionNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="copyCustomersCheck"
                    checked={copyCustomers}
                    onChange={(e) => setCopyCustomers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-900"
                  />
                  <label htmlFor="copyCustomersCheck" className="text-slate-300 text-[11px] font-medium cursor-pointer">
                    Salin daftar customer dari sesi aktif ke sesi baru ini
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-sky-500/20">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Aktifkan</span>
                </button>
              </div>
            </form>
          )}

          {/* SESSIONS LIST */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Daftar Sesi ({filteredSessions.length}/{sessions.length}):
              </h3>

              {/* Search Bar Sesi */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari sesi, prefix, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-lg focus:outline-none focus:border-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <FolderKanban className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Sesi tidak ditemukan</p>
                <p className="text-[11px] text-slate-500">
                  Tidak ada sesi yang cocok dengan kata kunci "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-1 text-xs text-sky-400 hover:underline font-medium"
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const sessionCustomers = customers.filter((c) => c.sessionId === session.id);
              const sessionPhotos = photos.filter((p) => p.sessionId === session.id);
              const isEditingThis = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-500/50 shadow-md shadow-sky-500/10'
                      : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {isEditingThis ? (
                    /* EDIT FORM INLINE */
                    <div className="space-y-2 text-xs bg-slate-900/90 p-2.5 rounded-lg border border-sky-500/30">
                      <div className="font-bold text-sky-400 flex items-center justify-between text-xs">
                        <span>Edit Pengaturan Sesi</span>
                        <span className="text-[10px] text-slate-400">Prefix &amp; digit counter</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-3">
                          <label className="text-slate-400 block mb-0.5 text-[11px]">Nama Sesi:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5 text-[11px]">Prefix Sesi:</label>
                          <input
                            type="text"
                            value={editPrefix}
                            onChange={(e) => setEditPrefix(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-sky-400 font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5 text-[11px]">Span Digit:</label>
                          <select
                            value={editDigitCount}
                            onChange={(e) => setEditDigitCount(parseInt(e.target.value) || 3)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-amber-300 font-bold text-xs"
                          >
                            <option value={2}>2 Digit (01)</option>
                            <option value={3}>3 Digit (001)</option>
                            <option value={4}>4 Digit (0001)</option>
                            <option value={5}>5 Digit (00001)</option>
                            <option value={6}>6 Digit (000001)</option>
                            <option value={7}>7 Digit (0000001)</option>
                            <option value={8}>8 Digit (00000001)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5 text-[11px]">Nomor Counter:</label>
                          <input
                            type="number"
                            min="1"
                            value={editCurrentNumber}
                            onChange={(e) => setEditCurrentNumber(parseInt(e.target.value) || 1)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-slate-100 font-bold text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-slate-400 block mb-0.5 text-[11px]">Keterangan:</label>
                          <input
                            type="text"
                            placeholder="Catatan tambahan untuk sesi..."
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 font-medium text-[11px]"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(session.id)}
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded text-[11px] shadow"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL SESSION CARD VIEW */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              SESI AKTIF
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                              ID: {session.id}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {session.date}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-100 tracking-tight leading-snug">
                          {session.name}
                        </h4>

                        {session.notes && (
                          <p className="text-[11px] text-amber-300/90 italic bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-block">
                            💬 {session.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-sky-300">
                            Prefix: <strong className="text-sky-400">{session.prefix}</strong>
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-amber-300">
                            Span: <strong className="text-amber-400">{session.numberDigitCount || 3} Digit</strong>
                          </span>
                          <span className="font-mono text-slate-300">
                            #Next: #{String(session.currentNumber || 1).padStart(session.numberDigitCount || 3, '0')}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            {sessionCustomers.length} Customer
                          </span>
                          <span className="text-sky-400 font-semibold flex items-center gap-1 font-mono">
                            <Camera className="w-3 h-3 text-sky-400" />
                            {sessionPhotos.length} Foto
                          </span>
                        </div>
                      </div>

                      {/* SESSION ACTION BUTTONS */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleStartEdit(session)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Pengaturan Sesi Ini"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {!isActive ? (
                          <button
                            onClick={() => onSelectSession(session.id)}
                            className="px-2.5 py-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-lg shadow flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Pilih Sesi</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </div>
                        )}

                        {sessions.length > 1 && (
                          <button
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Sesi Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <p className="text-[11px]">⚡ Pilih sesi foto untuk mengaktifkan antrean &amp; penomoran foto.</p>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
