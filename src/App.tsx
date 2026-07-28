import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Settings,
  FileSpreadsheet,
  Share2,
  Search,
  ArrowRight,
  RotateCcw,
  Sparkles,
  FolderKanban,
  Plus,
  Layers,
  Users,
} from 'lucide-react';

import { Customer, PhotoRecord, StudioSettings, StudioSession } from './types';
import {
  loadSettings,
  saveSettings,
  loadCustomers,
  saveCustomers,
  loadPhotos,
  savePhotos,
  loadActiveCustomerId,
  saveActiveCustomerId,
  loadSessions,
  saveSessions,
  loadActiveSessionId,
  saveActiveSessionId,
  DEFAULT_SESSIONS,
  DEFAULT_SETTINGS,
  INITIAL_CUSTOMERS,
  clearAllAppData,
} from './utils/storageUtils';
import { generateFileName, formatFileNumber } from './utils/filenameUtils';
import { downloadOrShareExcel, parseCustomerExcel, ImportedCustomer } from './utils/excelUtils';

import { CaptureControl } from './components/CaptureControl';
import { CustomerQueue } from './components/CustomerQueue';
import { PhotoHistoryList } from './components/PhotoHistoryList';
import { SearchCustomerModal } from './components/SearchCustomerModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { SettingsModal } from './components/SettingsModal';
import { SessionModal } from './components/SessionModal';
import { ExportShareModal } from './components/ExportShareModal';

export default function App() {
  const [sessions, setSessions] = useState<StudioSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(loadActiveSessionId);

  const [settings, setSettings] = useState<StudioSettings>(loadSettings);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [photos, setPhotos] = useState<PhotoRecord[]>(loadPhotos);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(loadActiveCustomerId);
  const [activeMainTab, setActiveMainTab] = useState<'REKAP' | 'ANTRIAN'>('REKAP');

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportShareOpen, setIsExportShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pending Shared Excel from WhatsApp / Share Target / Drag Drop
  const [sharedImportData, setSharedImportData] = useState<ImportedCustomer[] | null>(null);
  const [sharedImportFileName, setSharedImportFileName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Check for shared Excel file from WhatsApp Share Target Endpoint or Service Worker Cache
  useEffect(() => {
    const checkPendingSharedImport = async () => {
      try {
        const raw = localStorage.getItem('foto_studio_pending_shared_import');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.customers) && parsed.customers.length > 0) {
            localStorage.removeItem('foto_studio_pending_shared_import');
            setSharedImportData(parsed.customers);
            setSharedImportFileName(parsed.fileName || 'Excel_WhatsApp.xlsx');
            setIsImportOpen(true);
            showToast(`⚡ File Excel (${parsed.fileName || 'WhatsApp'}) berhasil diterima!`);
            return;
          }
        }

        // Check Service Worker cache from PWA Web Share Target API
        if ('caches' in window) {
          const cache = await caches.open('shared-files-cache');
          const response = await cache.match('/shared-excel-file');
          if (response) {
            const blob = await response.blob();
            const file = new File([blob], 'Excel_Bagikan.xlsx', {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const customers = await parseCustomerExcel(file);
            await cache.delete('/shared-excel-file');
            if (customers.length > 0) {
              setSharedImportData(customers);
              setSharedImportFileName('Excel_Diterima.xlsx');
              setIsImportOpen(true);
              showToast(`⚡ File Excel dari WhatsApp berhasil diterima (${customers.length} customer)!`);
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse pending shared import:', e);
      }
    };

    checkPendingSharedImport();
    window.addEventListener('focus', checkPendingSharedImport);
    return () => window.removeEventListener('focus', checkPendingSharedImport);
  }, [showToast]);

  // Handle Global Drag and Drop File anywhere on window
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDraggingFile(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
          try {
            const customers = await parseCustomerExcel(file);
            if (customers.length > 0) {
              setSharedImportData(customers);
              setSharedImportFileName(file.name);
              setIsImportOpen(true);
              showToast(`📥 File Excel (${file.name}) dilepaskan & siap diimpor!`);
            } else {
              showToast('⚠️ File Excel tidak memiliki data nama customer.');
            }
          } catch (err) {
            showToast('⚠️ Gagal membaca file Excel yang dilepaskan.');
          }
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
          try {
            const customers = await parseCustomerExcel(file);
            if (customers.length > 0) {
              setSharedImportData(customers);
              setSharedImportFileName(file.name);
              setIsImportOpen(true);
              showToast(`📥 File Excel (${file.name}) ditempel dari clipboard & siap diimpor!`);
            } else {
              showToast('⚠️ File Excel tidak memiliki data nama customer.');
            }
          } catch (err) {
            showToast('⚠️ Gagal membaca file Excel dari clipboard.');
          }
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handlePaste);
    };
  }, [showToast]);

  // Active Session computation
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSIONS[0];
  }, [sessions, activeSessionId]);

  // Sync state to storage
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    savePhotos(photos);
  }, [photos]);

  useEffect(() => {
    saveActiveCustomerId(activeCustomerId);
  }, [activeCustomerId]);

  // Filter Customers & Photos for Active Session
  const sessionCustomers = useMemo(() => {
    return customers.filter(
      (c) => c.sessionId === activeSessionId || (!c.sessionId && activeSessionId === 'session_default')
    );
  }, [customers, activeSessionId]);

  const sessionPhotos = useMemo(() => {
    return photos.filter(
      (p) => p.sessionId === activeSessionId || (!p.sessionId && activeSessionId === 'session_default')
    );
  }, [photos, activeSessionId]);

  // Active customer helper for active session
  const activeCustomer = useMemo(() => {
    const found = sessionCustomers.find((c) => c.id === activeCustomerId);
    return found || sessionCustomers[0] || null;
  }, [sessionCustomers, activeCustomerId]);

  // Synchronize Settings prefix & currentNumber when Active Session changes
  useEffect(() => {
    if (activeSession) {
      setSettings((prev) => ({
        ...prev,
        prefix: activeSession.prefix,
        currentNumber: activeSession.currentNumber,
      }));
    }
  }, [activeSessionId]);

  // Keep Session updated when settings prefix or currentNumber changes
  const updateActiveSessionSettings = (newPrefix: string, newNumber: number) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, prefix: newPrefix, currentNumber: newNumber, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  // CAPTURE / INCREMENT ACTION
  const handleCapture = useCallback(() => {
    const customerName = activeCustomer ? activeCustomer.name : 'General Customer';
    const customerId = activeCustomer ? activeCustomer.id : 'general';
    const fileName = generateFileName(settings, customerName);

    // Generate badge graphic for rekap
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 400);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 560, 360);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeSession.name.toUpperCase(), 300, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(customerName, 300, 180);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(fileName, 300, 250);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Recorded at: ${new Date().toLocaleTimeString('id-ID')}`, 300, 310);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const newPhoto: PhotoRecord = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: activeSessionId,
      customerId: customerId,
      customerName: customerName,
      customerCode: activeCustomer?.code || activeCustomer?.absenceNumber,
      absenceNumber: activeCustomer?.absenceNumber || activeCustomer?.code,
      fileName: fileName,
      prefix: settings.prefix,
      fileNumber: settings.currentNumber,
      dataUrl: dataUrl,
      timestamp: new Date().toISOString(),
      isMarked: false,
    };

    // 1. Add photo record
    setPhotos((prev) => [newPhoto, ...prev]);

    // 2. Increment counter number
    const nextNum = settings.currentNumber + 1;
    setSettings((prev) => ({
      ...prev,
      currentNumber: nextNum,
    }));
    updateActiveSessionSettings(settings.prefix, nextNum);

    // 3. Update customer photo count & status
    if (activeCustomer) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === activeCustomer.id) {
            return {
              ...c,
              photoCount: c.photoCount + 1,
              status: 'in_progress',
            };
          }
          return c;
        })
      );
    }

    showToast(`📸 Nomor #${settings.currentNumber} dicatat: ${fileName}`);

    // 4. Auto advance customer if configured
    if (settings.autoAdvanceOnCapture) {
      handleNextCustomer();
    }
  }, [activeCustomer, settings, activeSessionId, activeSession]);

  // Keyboard shortcut for capture (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isSearchOpen ||
        isImportOpen ||
        isSettingsOpen ||
        isSessionModalOpen ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isImportOpen, isSettingsOpen, isSessionModalOpen, handleCapture]);

  // SESSION MANAGEMENT HANDLERS
  const handleSelectSession = (sessionId: string) => {
    const selected = sessions.find((s) => s.id === sessionId);
    if (selected) {
      setActiveSessionId(sessionId);
      setSettings((prev) => ({
        ...prev,
        prefix: selected.prefix,
        currentNumber: selected.currentNumber,
      }));

      // Find first customer in selected session
      const custsInSession = customers.filter((c) => c.sessionId === sessionId);
      setActiveCustomerId(custsInSession.length > 0 ? custsInSession[0].id : null);

      showToast(`Switched ke Sesi: ${selected.name}`);
      setIsSessionModalOpen(false);
    }
  };

  const handleCreateSession = (
    newSessionData: Omit<StudioSession, 'id' | 'createdAt' | 'updatedAt'>,
    copyCustomersFromSessionId?: string
  ) => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: StudioSession = {
      ...newSessionData,
      id: newSessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);

    // Copy customers if requested
    if (copyCustomersFromSessionId) {
      const sourceCustomers = customers.filter((c) => c.sessionId === copyCustomersFromSessionId);
      const clonedCustomers: Customer[] = sourceCustomers.map((c, idx) => ({
        ...c,
        id: `cust_${Date.now()}_${idx}`,
        sessionId: newSessionId,
        status: 'pending',
        photoCount: 0,
      }));
      setCustomers((prev) => [...prev, ...clonedCustomers]);
    }

    // Switch to new session
    setActiveSessionId(newSessionId);
    setSettings((prev) => ({
      ...prev,
      prefix: newSession.prefix,
      currentNumber: newSession.currentNumber,
    }));
    setActiveCustomerId(null);

    showToast(`Sesi baru dibuat & diaktifkan: ${newSession.name}`);
  };

  const handleUpdateSession = (sessionId: string, updates: Partial<StudioSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
    );
    showToast('Info sesi berhasil diperbarui.');
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      alert('Tidak dapat menghapus sesi terakhir.');
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus sesi ini beserta data foto rekapnya?')) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(remainingSessions);
      setCustomers((prev) => prev.filter((c) => c.sessionId !== sessionId));
      setPhotos((prev) => prev.filter((p) => p.sessionId !== sessionId));

      if (activeSessionId === sessionId) {
        const fallback = remainingSessions[0];
        setActiveSessionId(fallback.id);
        setSettings((prev) => ({
          ...prev,
          prefix: fallback.prefix,
          currentNumber: fallback.currentNumber,
        }));
      }
      showToast('Sesi foto telah dihapus.');
    }
  };

  // NEXT CUSTOMER ACTION
  const handleNextCustomer = () => {
    if (!activeCustomer) return;

    setCustomers((prev) =>
      prev.map((c) => (c.id === activeCustomer.id ? { ...c, status: 'completed' } : c))
    );

    const currentIndex = sessionCustomers.findIndex((c) => c.id === activeCustomer.id);
    const remainingPending = sessionCustomers.filter(
      (c, idx) => idx > currentIndex && c.status !== 'completed'
    );

    if (remainingPending.length > 0) {
      setActiveCustomerId(remainingPending[0].id);
      showToast(`⏩ Lanjut ke customer: ${remainingPending[0].name}`);
    } else {
      const firstPending = sessionCustomers.find((c) => c.status === 'pending');
      if (firstPending) {
        setActiveCustomerId(firstPending.id);
        showToast(`⏩ Lanjut ke customer: ${firstPending.name}`);
      } else {
        showToast(`🎉 Semua customer dalam sesi ini telah selesai!`);
      }
    }
  };

  // SELECT CUSTOMER
  const handleSelectCustomer = (customer: Customer) => {
    setActiveCustomerId(customer.id);
    showToast(`Customer aktif diset: ${customer.name}`);
  };

  // ADD CUSTOMER
  const handleAddCustomer = (name: string, absenceNumber?: string) => {
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      sessionId: activeSessionId,
      name: name,
      absenceNumber: absenceNumber,
      code: absenceNumber,
      status: 'pending',
      photoCount: 0,
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) => [...prev, newCust]);
    setActiveCustomerId(newCust.id);
    showToast(`Customer ditambahkan ke sesi: ${name}`);
  };

  // DELETE CUSTOMER
  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (activeCustomerId === id) {
      const remaining = sessionCustomers.filter((c) => c.id !== id);
      setActiveCustomerId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('Customer dihapus dari daftar.');
  };

  // DELETE MULTIPLE CUSTOMERS
  const handleDeleteMultipleCustomers = (ids: string[]) => {
    setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)));
    if (activeCustomerId && ids.includes(activeCustomerId)) {
      const remaining = sessionCustomers.filter((c) => !ids.includes(c.id));
      setActiveCustomerId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast(`${ids.length} customer berhasil dihapus.`);
  };

  // DELETE ALL CUSTOMERS IN SESSION
  const handleDeleteAllCustomers = () => {
    const count = sessionCustomers.length;
    setCustomers((prev) => prev.filter((c) => c.sessionId !== activeSessionId));
    setActiveCustomerId(null);
    showToast(`Semua (${count}) customer pada sesi ini berhasil dihapus.`);
  };

  // DELETE ALL PHOTOS IN SESSION
  const handleDeleteAllSessionPhotos = () => {
    const count = sessionPhotos.length;
    setPhotos((prev) => prev.filter((p) => p.sessionId !== activeSessionId));
    showToast(`Semua (${count}) rekap foto pada sesi ini telah dihapus.`);
  };

  // RESET ALL APP DATA
  const handleResetAllData = () => {
    clearAllAppData();
    setSessions(DEFAULT_SESSIONS);
    setActiveSessionId('session_default');
    setSettings(DEFAULT_SETTINGS);
    setCustomers(INITIAL_CUSTOMERS);
    setPhotos([]);
    setActiveCustomerId('cust_1');
    showToast('⚡ Seluruh data aplikasi telah direset ke kondisi awal!');
  };

  // IMPORT CUSTOMERS FROM EXCEL
  const handleImportCustomers = (importedList: ImportedCustomer[], replaceExisting: boolean) => {
    const newCustomerObjects: Customer[] = importedList.map((item, index) => ({
      id: `cust_imp_${Date.now()}_${index}`,
      sessionId: activeSessionId,
      name: item.name,
      absenceNumber: item.code,
      code: item.code,
      category: item.category,
      notes: item.notes,
      status: 'pending',
      photoCount: 0,
    }));

    if (replaceExisting) {
      setCustomers((prev) => [
        ...prev.filter((c) => c.sessionId !== activeSessionId),
        ...newCustomerObjects,
      ]);
      if (newCustomerObjects.length > 0) {
        setActiveCustomerId(newCustomerObjects[0].id);
      }
    } else {
      setCustomers((prev) => [...prev, ...newCustomerObjects]);
      if (!activeCustomerId && newCustomerObjects.length > 0) {
        setActiveCustomerId(newCustomerObjects[0].id);
      }
    }

    showToast(`Berhasil mengimpor ${importedList.length} customer ke sesi ini!`);
  };

  // DELETE PHOTO
  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    showToast('Foto dihapus dari rekap sesi.');
  };

  // UPDATE PHOTO (Manual edit of photo details)
  const handleUpdatePhoto = (
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
  ) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId) {
          return {
            ...p,
            ...updates,
          };
        }
        return p;
      })
    );
    showToast('Data foto rekap berhasil diperbarui!');
  };

  // EXPORT / SHARE REKAP EXCEL (Implicit Intent Modal)
  const handleExportExcel = () => {
    setIsExportShareOpen(true);
  };

  // RESET CURRENT SESSION COUNTER
  const handleResetSessionCounter = (startNum?: number | unknown) => {
    const validNum = typeof startNum === 'number' && !isNaN(startNum) ? startNum : 1;
    setSettings((prev) => ({ ...prev, currentNumber: validNum }));
    updateActiveSessionSettings(settings.prefix, validNum);
    showToast(`🔄 Counter nomor sesi di-reset ke #${validNum}.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-sky-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-2xl flex items-center gap-2 border border-sky-400/50 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-100 leading-tight">
                Liankhay Capture Manager
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Rekap Foto Studio • No. Absen & File Kamera
              </p>
            </div>
          </div>

          {/* ACTIVE SESSION SELECTOR PILL & QUICK ACTIONS */}
          <div className="flex items-center gap-2">
            {/* SESSION SELECTOR PILL */}
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-sky-950 to-slate-900 hover:from-sky-900 hover:to-slate-800 border border-sky-500/40 rounded-xl text-xs font-bold text-sky-300 flex items-center gap-2 shadow-sm transition-all"
              title="Klik untuk Kelola / Ganti Sesi Foto"
            >
              <FolderKanban className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {activeSession ? activeSession.name : 'Sesi Utama'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] hidden md:inline-block">
                {sessions.length} Sesi
              </span>
            </button>

            {/* Import Excel */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Import Data Customer dari Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden md:inline">Import Excel</span>
            </button>

            {/* Share Rekap Excel */}
            <button
              onClick={handleExportExcel}
              disabled={isSharing || sessionPhotos.length === 0}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              title="Kirim / Share Hasil Rekap Foto Sesi Ini via Excel"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Pengaturan Prefix & Format"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ACTIVE CUSTOMER QUICK STRIP BAR */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30 shrink-0">
              Customer Aktif:
            </span>
            <span className="font-bold text-sm text-slate-100 truncate max-w-[180px] sm:max-w-xs">
              {activeCustomer ? activeCustomer.name : 'Belum Dipilih'}
            </span>
            {activeCustomer?.category && (
              <span className="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                {activeCustomer.category}
              </span>
            )}
            <span className="text-sky-400 font-mono text-[11px]">
              (📷 {activeCustomer ? activeCustomer.photoCount : 0} foto)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span>Cari Customer</span>
            </button>

            <button
              onClick={handleNextCustomer}
              className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow flex items-center gap-1.5 transition-all"
            >
              <span>Next Customer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* CAPTURE CONTROL CARD */}
        <CaptureControl
          onCapture={handleCapture}
          activeCustomer={activeCustomer}
          settings={settings}
          onNextCustomer={handleNextCustomer}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onResetCounter={handleResetSessionCounter}
          totalCapturedToday={sessionPhotos.length}
        />

        {/* QUICK PREFIX & FILE NUMBER CONTROL BAR FOR ACTIVE SESSION */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Prefix Sesi Ini:</span>
              <input
                type="text"
                value={settings.prefix}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings({ ...settings, prefix: val });
                  updateActiveSessionSettings(val, settings.currentNumber);
                }}
                className="px-3 py-1 bg-slate-800 border border-slate-700 font-mono text-sky-400 font-bold rounded-lg w-28 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block font-medium">Nomor Urut:</span>
              <input
                type="number"
                min="1"
                value={settings.currentNumber}
                onChange={(e) => {
                  const num = parseInt(e.target.value) || 1;
                  setSettings({ ...settings, currentNumber: num });
                  updateActiveSessionSettings(settings.prefix, num);
                }}
                className="px-3 py-1 bg-slate-800 border border-slate-700 font-mono text-slate-100 font-bold rounded-lg w-20 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Ganti Sesi ({sessions.length})</span>
            </button>

            <button
              onClick={handleResetSessionCounter}
              className="px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset counter nomor sesi ke #1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Counter</span>
            </button>
          </div>
        </div>

        {/* UNIFIED TABBED WRAPPER: REKAP FOTO & ANTRIAN CUSTOMER */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          {/* TAB HEADER BAR */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800/90 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveMainTab('REKAP')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'REKAP'
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Rekap Foto</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeMainTab === 'REKAP' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-sky-400'
                }`}>
                  {sessionPhotos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('ANTRIAN')}
                className={`px-4 sm:px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'ANTRIAN'
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Antrian Customer</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeMainTab === 'ANTRIAN' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-sky-400'
                }`}>
                  {sessionCustomers.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Sesi Aktif: <strong className="text-sky-300 font-bold">{activeSession.name}</strong>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeMainTab === 'REKAP' ? (
            <PhotoHistoryList
              photos={sessionPhotos}
              onDeletePhoto={handleDeletePhoto}
              onDeleteAllPhotos={handleDeleteAllSessionPhotos}
              onUpdatePhoto={handleUpdatePhoto}
              onExportExcel={handleExportExcel}
              isSharing={isSharing}
            />
          ) : (
            <CustomerQueue
              customers={sessionCustomers}
              activeCustomerId={activeCustomerId}
              onSelectCustomer={handleSelectCustomer}
              onNextCustomer={handleNextCustomer}
              onOpenImportModal={() => setIsImportOpen(true)}
              onOpenSearchModal={() => setIsSearchOpen(true)}
              onAddCustomer={handleAddCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onDeleteMultipleCustomers={handleDeleteMultipleCustomers}
              onDeleteAllCustomers={handleDeleteAllCustomers}
            />
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 px-4 bg-slate-900/40 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© Liankhay Capture Manager — Multi Sesi & Auto Increment Foto Studio</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Affix Software</span>
          </div>
        </div>
      </footer>

      {/* DRAG & DROP OVERLAY FOR EXCEL FILES (e.g. from WhatsApp Desktop) */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-sky-950/90 backdrop-blur-md border-4 border-dashed border-sky-400 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
          <div className="w-20 h-20 rounded-2xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 mb-4 animate-bounce">
            <FileSpreadsheet className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Lepaskan File Excel di Sini</h2>
          <p className="text-sm text-sky-200 max-w-md">
            File Excel dari WhatsApp / Laptop akan langsung diimpor ke antrean customer studio.
          </p>
        </div>
      )}

      {/* MODALS */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onUpdateSession={handleUpdateSession}
        onDeleteSession={handleDeleteSession}
        customers={customers}
        photos={photos}
      />

      <SearchCustomerModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        customers={sessionCustomers}
        activeCustomerId={activeCustomerId}
        onSelectCustomer={handleSelectCustomer}
        onAddCustomer={handleAddCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onDeleteMultipleCustomers={handleDeleteMultipleCustomers}
        onDeleteAllCustomers={handleDeleteAllCustomers}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setSharedImportData(null);
          setSharedImportFileName('');
        }}
        onImportCustomers={handleImportCustomers}
        initialParsedData={sharedImportData}
        initialFileName={sharedImportFileName}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          updateActiveSessionSettings(newSettings.prefix, newSettings.currentNumber);
        }}
        sampleCustomerName={activeCustomer ? activeCustomer.name : 'Customer_Studio'}
        onResetAllData={handleResetAllData}
      />

      <ExportShareModal
        isOpen={isExportShareOpen}
        onClose={() => setIsExportShareOpen(false)}
        photos={sessionPhotos}
        customers={sessionCustomers}
        activeSession={activeSession}
      />

      {/* Global File Drag Overlay (Share Intent Catching Zone) */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-md border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center text-white p-6 animate-fade-in pointer-events-none">
          <div className="p-4 bg-emerald-500/20 text-emerald-300 rounded-full mb-3 animate-bounce">
            <FileSpreadsheet className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-emerald-300 mb-1">TANGKAP FILE SHARE EXCEL</h2>
          <p className="text-sm text-slate-200 text-center max-w-md">
            Lepaskan file Excel (.xlsx / .xls) yang dibagikan dari WhatsApp, Email, atau Folder di sini untuk mengimpor data customer!
          </p>
        </div>
      )}
    </div>
  );
}
