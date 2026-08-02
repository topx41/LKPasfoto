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
  Users,
  CheckCircle2,
  Trash2,
  Edit2,
  Save,
  X,
  Sliders,
  Bug,
  Smartphone,
} from 'lucide-react';

import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { isCapacitorNative } from './utils/nativeShareHelper';
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
import {
  downloadOrShareExcel,
  parseCustomerExcel,
  extractRawExcelFromFile,
  autoDetectColumnMapping,
  RawExcelSheetData,
  ColumnMappingConfig,
  ImportedCustomer,
} from './utils/excelUtils';

import { CaptureControl } from './components/CaptureControl';
import { CustomerQueue } from './components/CustomerQueue';
import { PhotoHistoryList } from './components/PhotoHistoryList';
import { SearchCustomerModal } from './components/SearchCustomerModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { SettingsModal } from './components/SettingsModal';
import { SessionModal } from './components/SessionModal';
import { ExportShareModal } from './components/ExportShareModal';
import { ShareDebugModal } from './components/ShareDebugModal';
import { PasteTextModal } from './components/PasteTextModal';
import { ShareThankYouModal } from './components/ShareThankYouModal';

export type MainTabType = 'HOME' | 'CUSTOMER' | 'SESI' | 'REKAP' | 'SETTING';

export default function App() {
  const [sessions, setSessions] = useState<StudioSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(loadActiveSessionId);

  const [settings, setSettings] = useState<StudioSettings>(loadSettings);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [photos, setPhotos] = useState<PhotoRecord[]>(loadPhotos);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(loadActiveCustomerId);
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('HOME');

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportShareOpen, setIsExportShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isShareDebugModalOpen, setIsShareDebugModalOpen] = useState(false);
  const [isPasteTextModalOpen, setIsPasteTextModalOpen] = useState(false);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
  const [thankYouFileName, setThankYouFileName] = useState('');
  const [thankYouTime, setThankYouTime] = useState('');
  const [shareDebugData, setShareDebugData] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pending Shared Excel from WhatsApp / Share Target / Drag Drop
  const [sharedImportData, setSharedImportData] = useState<ImportedCustomer[] | null>(null);
  const [sharedRawSheetData, setSharedRawSheetData] = useState<RawExcelSheetData | null>(null);
  const [sharedMappingConfig, setSharedMappingConfig] = useState<ColumnMappingConfig | null>(null);
  const [sharedImportFileName, setSharedImportFileName] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Editing session state in SESI tab
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState<string>('');
  const [editSessionNotes, setEditSessionNotes] = useState<string>('');

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Check for shared Excel file from WhatsApp Share Target Endpoint, Service Worker Cache, or Capacitor Intent
  useEffect(() => {
    const processCapacitorShareUrl = async (targetUrl: string) => {
      try {
        let blob: Blob;
        if (targetUrl.startsWith('content://') || targetUrl.startsWith('file://')) {
          try {
            const convertedUrl = Capacitor.convertFileSrc(targetUrl);
            const response = await fetch(convertedUrl);
            blob = await response.blob();
          } catch (convErr) {
            const fileData = await Filesystem.readFile({ path: targetUrl });
            const base64Content = typeof fileData.data === 'string' ? fileData.data : '';
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
          }
        } else {
          const response = await fetch(targetUrl);
          blob = await response.blob();
        }

        const file = new File([blob], 'Excel_Android_Share.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const extracted = await extractRawExcelFromFile(file);
        if (extracted) {
          setSharedRawSheetData(extracted.rawSheetData);
          setSharedMappingConfig(extracted.mappingConfig);
          setSharedImportFileName(file.name);
          setThankYouFileName(file.name);
          setThankYouTime(new Date().toLocaleTimeString('id-ID'));
          setIsThankYouModalOpen(true);
          showToast('⚡ Terima Kasih! File Excel dari Share Android diterima di Node 1.');
        } else {
          const customers = await parseCustomerExcel(file);
          if (customers.length > 0) {
            setSharedImportData(customers);
            setSharedImportFileName(file.name);
            setThankYouFileName(file.name);
            setThankYouTime(new Date().toLocaleTimeString('id-ID'));
            setIsThankYouModalOpen(true);
            showToast(`⚡ Terima Kasih! File Excel dari Share Android diterima (${customers.length} customer).`);
          } else {
            showToast('⚠️ File dari Share Sheet tidak memiliki data customer.');
          }
        }
      } catch (err) {
        console.error('Gagal memproses file dari Android Share Sheet:', err);
        showToast('⚠️ Gagal membaca file dari Android Share Sheet.');
      }
    };

    const checkPendingSharedImport = async () => {
      try {
        // 0a. Check Android Native Cache via Capacitor Filesystem
        let capPayload: any = null;
        try {
          const cacheRes = await Filesystem.readFile({
            path: 'shared_sheet_data.json',
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          if (cacheRes && cacheRes.data) {
            capPayload = typeof cacheRes.data === 'string' ? JSON.parse(cacheRes.data) : cacheRes.data;
            // Delete cache file after reading so it isn't reprocessed
            await Filesystem.deleteFile({
              path: 'shared_sheet_data.json',
              directory: Directory.Cache,
            }).catch((err) => console.warn('Cache file delete warning:', err));
          }
        } catch (e) {
          // Cache file does not exist or not natively shared yet
        }

        // 0b. Fallback to Window / Local Storage bridge if Filesystem cache wasn't found
        if (!capPayload) {
          const capWindowData = (window as any).__CAPACITOR_SHARED_DATA__;
          const capStorageData = localStorage.getItem('capacitor_shared_data') || localStorage.getItem('capacitor_shared_import');
          capPayload = capWindowData || (capStorageData ? JSON.parse(capStorageData) : null);
        }

        if (capPayload) {
          try {
            delete (window as any).__CAPACITOR_SHARED_DATA__;
            localStorage.removeItem('capacitor_shared_data');
            localStorage.removeItem('capacitor_shared_import');

            if (capPayload.base64) {
              const byteCharacters = atob(capPayload.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const fn = capPayload.fileName || 'Android_Share_Sheet.xlsx';
              const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const file = new File([blob], fn, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const extracted = await extractRawExcelFromFile(file);
              if (extracted) {
                setSharedRawSheetData(extracted.rawSheetData);
                setSharedMappingConfig(extracted.mappingConfig);
                setSharedImportFileName(fn);
                setThankYouFileName(fn);
                setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                setIsThankYouModalOpen(true);
                showToast(`⚡ Terima Kasih! File Excel (${fn}) dari Android Native Share Sheet diterima di Node 1.`);
                return;
              } else {
                const customers = await parseCustomerExcel(file);
                if (customers.length > 0) {
                  setSharedImportData(customers);
                  setSharedImportFileName(fn);
                  setThankYouFileName(fn);
                  setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                  setIsThankYouModalOpen(true);
                  showToast(`⚡ Terima Kasih! File Excel (${fn}) berhasil diterima (${customers.length} customer).`);
                  return;
                }
              }
            } else if (capPayload.rawSheetData) {
              const autoConfig = autoDetectColumnMapping(capPayload.rawSheetData.rawRows, capPayload.rawSheetData.maxCols);
              setSharedRawSheetData(capPayload.rawSheetData);
              setSharedMappingConfig(autoConfig);
              const fn = capPayload.fileName || 'Capacitor_Share_Sheet.xlsx';
              setSharedImportFileName(fn);
              setThankYouFileName(fn);
              setThankYouTime(new Date().toLocaleTimeString('id-ID'));
              setIsThankYouModalOpen(true);
              showToast(`⚡ Terima Kasih! Data dari Capacitor Native Local Storage (${fn}) diterima di Node 1.`);
              return;
            } else if (Array.isArray(capPayload.customers) && capPayload.customers.length > 0) {
              setSharedImportData(capPayload.customers);
              const fn = capPayload.fileName || 'Capacitor_Share_Sheet.xlsx';
              setSharedImportFileName(fn);
              setThankYouFileName(fn);
              setThankYouTime(new Date().toLocaleTimeString('id-ID'));
              setIsThankYouModalOpen(true);
              showToast(`⚡ Terima Kasih! Data (${capPayload.customers.length} customer) dari Capacitor Local Storage diterima.`);
              return;
            }
          } catch (capErr) {
            console.error('Error parsing Capacitor Local Storage data:', capErr);
          }
        }

        // 1. Check Service Worker cache from PWA Web Share Target API first
        if ('caches' in window) {
          try {
            const cache = await caches.open('shared-files-cache');

            // Check for cached binary Excel file
            const excelResp = await cache.match('/shared-excel-file');
            if (excelResp) {
              const nameHeader = excelResp.headers.get('x-file-name');
              const fileName = nameHeader ? decodeURIComponent(nameHeader) : 'Excel_Diterima.xlsx';
              const blob = await excelResp.blob();
              const file = new File([blob], fileName, {
                type: excelResp.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });
              const extracted = await extractRawExcelFromFile(file);
              await cache.delete('/shared-excel-file');
              if (extracted) {
                setSharedRawSheetData(extracted.rawSheetData);
                setSharedMappingConfig(extracted.mappingConfig);
                setSharedImportFileName(fileName);
                setThankYouFileName(fileName);
                setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                setIsThankYouModalOpen(true);
                showToast(`⚡ Terima Kasih! File Excel (${fileName}) dari Share Sheet diterima di Node 1.`);
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              } else {
                const customers = await parseCustomerExcel(file);
                if (customers.length > 0) {
                  setSharedImportData(customers);
                  setSharedImportFileName(fileName);
                  setThankYouFileName(fileName);
                  setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                  setIsThankYouModalOpen(true);
                  showToast(`⚡ Terima Kasih! File Excel (${fileName}) berhasil diterima (${customers.length} customer).`);
                  window.history.replaceState({}, document.title, window.location.pathname);
                  return;
                }
              }
            }

            // Check for cached text list
            const textResp = await cache.match('/shared-text-data');
            if (textResp) {
              const sharedText = await textResp.text();
              await cache.delete('/shared-text-data');
              if (sharedText && sharedText.trim()) {
                const lines = sharedText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
                const parsedRows: string[][] = [];
                lines.forEach((line) => {
                  if (line.includes('\t')) {
                    parsedRows.push(line.split('\t').map((p) => p.trim()));
                  } else if (line.includes(';')) {
                    parsedRows.push(line.split(';').map((p) => p.trim()));
                  } else {
                    const numMatch = line.match(/^(\d+|[A-Za-z0-9_-]+)[\s.|\-)\]]+(.*)$/);
                    if (numMatch && numMatch[2].trim()) {
                      parsedRows.push([numMatch[1].trim(), numMatch[2].trim(), '', '']);
                    } else {
                      parsedRows.push(['', line, '', '']);
                    }
                  }
                });
                const header = ['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'];
                const rawSheetData = {
                  sheetName: 'Hasil_Share_WA',
                  rawRows: [header, ...parsedRows],
                  maxCols: 4,
                };
                const autoConfig = autoDetectColumnMapping(rawSheetData.rawRows, rawSheetData.maxCols);
                setSharedRawSheetData(rawSheetData);
                setSharedMappingConfig(autoConfig);
                setSharedImportFileName('Teks_Share_WA.txt');
                setThankYouFileName('Teks_Share_WA.txt');
                setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                setIsThankYouModalOpen(true);
                showToast('⚡ Terima Kasih! Teks daftar customer dari Share Sheet diterima di Node 1.');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              }
            }
          } catch (cacheErr) {
            console.error('Error checking SW cache:', cacheErr);
          }
        }

        // 2. Check inlined server payload injected directly into window.__INITIAL_SHARED_DATA__
        const initialSharedData = (window as any).__INITIAL_SHARED_DATA__;
        if (initialSharedData) {
          try {
            delete (window as any).__INITIAL_SHARED_DATA__;
            localStorage.removeItem('foto_studio_pending_import_id');
            if (initialSharedData.debugLog) {
              setShareDebugData(initialSharedData.debugLog);
            }
            if (initialSharedData.isError) {
              setIsShareDebugModalOpen(true);
              showToast(`⚠️ Error Share Sheet: ${initialSharedData.errorMessage || 'Terjadi kesalahan server.'}`);
            } else if (initialSharedData.isWarningEmpty) {
              setIsShareDebugModalOpen(true);
              showToast('⚠️ Request Share Sheet diterima, tetapi Android tidak mengirimkan attachment file.');
            } else {
              const sheetData = initialSharedData.rawSheetData || {
                sheetName: 'File_Share_Diterima',
                rawRows: [['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan']],
                maxCols: 4,
              };
              const autoConfig = autoDetectColumnMapping(sheetData.rawRows, sheetData.maxCols);
              setSharedRawSheetData(sheetData);
              setSharedMappingConfig(autoConfig);
              const fn = initialSharedData.fileName || 'Excel_Share_Sheet.xlsx';
              setSharedImportFileName(fn);
              setThankYouFileName(fn);
              setThankYouTime(new Date().toLocaleTimeString('id-ID'));
              if (Array.isArray(initialSharedData.customers) && initialSharedData.customers.length > 0) {
                setSharedImportData(initialSharedData.customers);
              }
              setIsThankYouModalOpen(true);
              showToast(`⚡ Terima Kasih! Data Excel (${fn}) berhasil diterima di Node 1.`);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } catch (initErr) {
            console.error('Error reading window.__INITIAL_SHARED_DATA__:', initErr);
          }
        }

        // 3. Check server pending import ID via URL query, cookie, or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const shareError = urlParams.get('share_error');
        const shareStatus = urlParams.get('share_status');

        if (shareError) {
          setIsShareDebugModalOpen(true);
          showToast('⚠️ Gagal/Terjadi kendala saat menerima file dari Share Sheet.');
        } else if (shareStatus === 'warning_empty') {
          setIsShareDebugModalOpen(true);
          showToast('⚠️ Request Share Sheet diterima, tetapi Android tidak menyertakan attachment file.');
        }

        const matchCookie = document.cookie.match(/(?:^|; )foto_studio_pending_import_id=([^;]*)/);
        const cookieTempId = matchCookie ? decodeURIComponent(matchCookie[1]) : null;
        if (cookieTempId) {
          document.cookie = 'foto_studio_pending_import_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }

        const tempId = urlParams.get('shared_import_id') || localStorage.getItem('foto_studio_pending_import_id') || cookieTempId;
        const isShareQuery = urlParams.get('shared_import') || urlParams.get('imported_share') || urlParams.get('imported_text_share');

        if (tempId) {
          localStorage.removeItem('foto_studio_pending_import_id');
          try {
            const res = await fetch(`/api/pending-import/${tempId}`);
            if (res.ok) {
              const data = await res.json();
              if (data) {
                if (data.debugLog) {
                  setShareDebugData(data.debugLog);
                }
                if (data.isWarningEmpty) {
                  setIsShareDebugModalOpen(true);
                } else {
                  const sheetData = data.rawSheetData || {
                    sheetName: 'File_Share_Diterima',
                    rawRows: [['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan']],
                    maxCols: 4,
                  };
                  const autoConfig = autoDetectColumnMapping(sheetData.rawRows, sheetData.maxCols);
                  setSharedRawSheetData(sheetData);
                  setSharedMappingConfig(autoConfig);
                  const fn = data.fileName || 'Excel_Share_Sheet.xlsx';
                  setSharedImportFileName(fn);
                  setThankYouFileName(fn);
                  setThankYouTime(new Date().toLocaleTimeString('id-ID'));
                  if (Array.isArray(data.customers) && data.customers.length > 0) {
                    setSharedImportData(data.customers);
                  }
                  setIsThankYouModalOpen(true);
                  showToast(`⚡ Terima Kasih! Data Excel (${fn}) berhasil diterima di Node 1.`);
                }
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              }
            }
          } catch (fetchErr) {
            console.error('Failed to fetch pending import by ID:', fetchErr);
          }
        }

        if (isShareQuery) {
          setIsImportOpen(true);
          showToast('⚡ Aplikasi dibuka dari Share Sheet! Silakan pilih / periksa data customer.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 4. Auto check recent server share debug log (if within last 3 minutes and was empty/error)
        try {
          const debugRes = await fetch('/api/share-debug');
          if (debugRes.ok) {
            const debugJson = await debugRes.json();
            if (debugJson.lastLog) {
              setShareDebugData(debugJson.lastLog);
              const logTime = new Date(debugJson.lastLog.isoTime || 0).getTime();
              const isRecent = Date.now() - logTime < 3 * 60 * 1000;
              if (isRecent && (debugJson.lastLog.status === 'WARNING_EMPTY' || debugJson.lastLog.status === 'ERROR')) {
                setIsShareDebugModalOpen(true);
              }
            }
          }
        } catch (debugErr) {
          console.error('Failed to auto check share debug log:', debugErr);
        }

        // 4. Check localStorage raw shared payload fallback
        const raw = localStorage.getItem('foto_studio_pending_shared_import');
        if (raw) {
          localStorage.removeItem('foto_studio_pending_shared_import');
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.rawSheetData) {
              const autoConfig = autoDetectColumnMapping(parsed.rawSheetData.rawRows, parsed.rawSheetData.maxCols);
              setSharedRawSheetData(parsed.rawSheetData);
              setSharedMappingConfig(autoConfig);
              setSharedImportFileName(parsed.fileName || 'Excel_WhatsApp.xlsx');
              if (Array.isArray(parsed.customers) && parsed.customers.length > 0) {
                setSharedImportData(parsed.customers);
              }
              setIsImportOpen(true);
              showToast(`⚡ File Excel (${parsed.fileName || 'WhatsApp'}) berhasil diterima! Siap dipreview & diimpor.`);
              return;
            }
          } catch (e) {
            console.error('Error parsing raw shared import:', e);
          }
        }

        // 4. Check Capacitor cold launch intent
        if (isCapacitorNative()) {
          const launchUrl = await CapacitorApp.getLaunchUrl();
          if (launchUrl?.url) {
            await processCapacitorShareUrl(launchUrl.url);
          }
        }
      } catch (e) {
        console.error('Failed to parse pending shared import:', e);
      }
    };

    checkPendingSharedImport();
    window.addEventListener('focus', checkPendingSharedImport);
    window.addEventListener('storage', checkPendingSharedImport);
    window.addEventListener('capacitor_share_received', checkPendingSharedImport as any);

    // Listen for Capacitor Native App Url / File Open Intent on warm launch
    let capSub: any = null;
    if (isCapacitorNative()) {
      capSub = CapacitorApp.addListener('appUrlOpen', async (data) => {
        if (data?.url) {
          await processCapacitorShareUrl(data.url);
        }
      });
    }

    return () => {
      window.removeEventListener('focus', checkPendingSharedImport);
      window.removeEventListener('storage', checkPendingSharedImport);
      window.removeEventListener('capacitor_share_received', checkPendingSharedImport as any);
      if (capSub && typeof capSub.remove === 'function') {
        capSub.remove();
      }
    };
  }, [showToast]);

  // Capture unhandled runtime crashes or promise rejections to diagnose page blank/close
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const errorInfo = {
        message: event.message || 'Window Runtime Error',
        filename: event.filename || '',
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || '',
        time: new Date().toLocaleTimeString('id-ID'),
        type: 'RUNTIME_ERROR'
      };
      try {
        localStorage.setItem('last_app_crash_log', JSON.stringify(errorInfo));
      } catch (e) {}
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorInfo = {
        message: String(event.reason?.message || event.reason || 'Unhandled Promise Rejection'),
        stack: event.reason?.stack || '',
        time: new Date().toLocaleTimeString('id-ID'),
        type: 'PROMISE_REJECTION'
      };
      try {
        localStorage.setItem('last_app_crash_log', JSON.stringify(errorInfo));
      } catch (e) {}
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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
            const extracted = await extractRawExcelFromFile(file);
            if (extracted) {
              setSharedRawSheetData(extracted.rawSheetData);
              setSharedMappingConfig(extracted.mappingConfig);
              setSharedImportFileName(file.name);
              setIsImportOpen(true);
              showToast(`📥 File Excel (${file.name}) dilepaskan! Siap dipreview & diimpor.`);
            } else {
              const customers = await parseCustomerExcel(file);
              if (customers.length > 0) {
                setSharedImportData(customers);
                setSharedImportFileName(file.name);
                setIsImportOpen(true);
                showToast(`📥 File Excel (${file.name}) dilepaskan & siap diimpor!`);
              } else {
                showToast('⚠️ File Excel tidak memiliki data nama customer.');
              }
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
            const extracted = await extractRawExcelFromFile(file);
            if (extracted) {
              setSharedRawSheetData(extracted.rawSheetData);
              setSharedMappingConfig(extracted.mappingConfig);
              setSharedImportFileName(file.name);
              setIsImportOpen(true);
              showToast(`📥 File Excel (${file.name}) ditempel! Siap dipreview & diimpor.`);
            } else {
              const customers = await parseCustomerExcel(file);
              if (customers.length > 0) {
                setSharedImportData(customers);
                setSharedImportFileName(file.name);
                setIsImportOpen(true);
                showToast(`📥 File Excel (${file.name}) ditempel dari clipboard & siap diimpor!`);
              } else {
                showToast('⚠️ File Excel tidak memiliki data nama customer.');
              }
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

  // UPDATE CUSTOMER
  const handleUpdateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              code: updates.absenceNumber !== undefined ? updates.absenceNumber : c.code,
            }
          : c
      )
    );
    showToast('Data customer berhasil diperbarui.');
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

  // HANDLE PASTED TEXT CUSTOMERS
  const handleImportParsedText = (text: string) => {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const parsedRows: string[][] = [];
    lines.forEach((line) => {
      if (line.includes('\t')) {
        parsedRows.push(line.split('\t').map((p) => p.trim()));
      } else if (line.includes(';')) {
        parsedRows.push(line.split(';').map((p) => p.trim()));
      } else {
        const numMatch = line.match(/^(\d+|[A-Za-z0-9_-]+)[\s.|\-)\]]+(.*)$/);
        if (numMatch && numMatch[2].trim()) {
          parsedRows.push([numMatch[1].trim(), numMatch[2].trim(), '', '']);
        } else {
          parsedRows.push(['', line, '', '']);
        }
      }
    });
    const header = ['Nomor Absen', 'Nama Customer', 'Kategori', 'Catatan'];
    const rawSheetData = {
      sheetName: 'Hasil_Paste_Teks',
      rawRows: [header, ...parsedRows],
      maxCols: 4,
    };
    const autoConfig = autoDetectColumnMapping(rawSheetData.rawRows, rawSheetData.maxCols);
    setSharedRawSheetData(rawSheetData);
    setSharedMappingConfig(autoConfig);
    setSharedImportFileName('Teks_Dipaste.txt');
    setIsImportOpen(true);
    showToast('⚡ Teks customer berhasil diproses! Siap dipreview & diimpor.');
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

  // EXPORT / SHARE REKAP EXCEL
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
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-2 py-2 sm:px-4 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base md:text-lg text-slate-100 leading-tight truncate max-w-[120px] sm:max-w-none">
                Liankhay Capture
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                Rekap Foto Studio • No. Absen & File Kamera
              </p>
            </div>
          </div>

          {/* DESKTOP MAIN NAVIGATION TABS */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveMainTab('HOME')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainTab === 'HOME'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveMainTab('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainTab === 'CUSTOMER'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer</span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full text-[10px]">
                {sessionCustomers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('SESI')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainTab === 'SESI'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Sesi</span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full text-[10px]">
                {sessions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('REKAP')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainTab === 'REKAP'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Rekap</span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full text-[10px]">
                {sessionPhotos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('SETTING')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMainTab === 'SETTING'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Setting</span>
            </button>
          </div>

          {/* QUICK ACTIONS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* SESSION SELECTOR PILL */}
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-sky-950 to-slate-900 hover:from-sky-900 hover:to-slate-800 border border-sky-500/40 rounded-lg text-[11px] sm:text-xs font-bold text-sky-300 flex items-center gap-1.5 shadow-sm transition-all"
              title="Klik untuk Kelola / Ganti Sesi Foto"
            >
              <FolderKanban className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-[140px]">
                {activeSession ? activeSession.name : 'Sesi Utama'}
              </span>
            </button>

            {/* Import Excel */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Import Data Customer dari Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Import</span>
            </button>

            {/* Share Target Debug / Diagnostic button */}
            <button
              onClick={() => setIsShareDebugModalOpen(true)}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Cek Status & Log Diagnostik Share Target PWA"
            >
              <Bug className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Diagnostik Share</span>
            </button>

            {/* Export / Share */}
            <button
              onClick={() => setIsExportShareOpen(true)}
              disabled={isSharing}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow transition-all cursor-pointer"
              title="Kirim / Share Hasil Rekap Foto & Customer via Excel"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* ACTIVE CUSTOMER QUICK STRIP BAR */}
      <section className="bg-slate-900/60 border-b border-slate-800 px-2 py-1.5 sm:px-4 sm:py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30 shrink-0 text-[10px] sm:text-xs">
              Customer:
            </span>
            <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[120px] sm:max-w-xs">
              {activeCustomer ? activeCustomer.name : 'Belum Dipilih'}
            </span>
            {activeCustomer?.category && (
              <span className="hidden md:inline px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                {activeCustomer.category}
              </span>
            )}
            <span className="text-sky-400 font-mono text-[10px] sm:text-[11px]">
              (📷 {activeCustomer ? activeCustomer.photoCount : 0})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors"
            >
              <Search className="w-3 h-3 text-sky-400" />
              <span>Cari</span>
            </button>

            <button
              onClick={handleNextCustomer}
              className="px-2.5 py-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-lg shadow flex items-center gap-1 text-[11px] transition-all"
            >
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT VIEWS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 pb-20 sm:pb-8 flex flex-col min-h-0">
        {/* 1. HOME VIEW */}
        {activeMainTab === 'HOME' && (
          <div className="flex-1 flex flex-col space-y-3 sm:space-y-4 min-h-0">
            {/* CAPTURE CONTROL CARD (MODUL CAPTURE DITAMPILKAN DI HOME SAJA) */}
            <CaptureControl
              onCapture={handleCapture}
              activeCustomer={activeCustomer}
              settings={settings}
              onNextCustomer={handleNextCustomer}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenSettings={() => setIsSessionModalOpen(true)}
              onResetCounter={handleResetSessionCounter}
              totalCapturedToday={sessionPhotos.length}
            />

            {/* REKAP FOTO SCROLLABLE LIST */}
            <div className="flex-1 min-h-[350px] sm:min-h-[420px] max-h-[calc(100vh-280px)] overflow-hidden flex flex-col">
              <PhotoHistoryList
                photos={sessionPhotos}
                onDeletePhoto={handleDeletePhoto}
                onDeleteAllPhotos={handleDeleteAllSessionPhotos}
                onUpdatePhoto={handleUpdatePhoto}
                onExportExcel={handleExportExcel}
                isSharing={isSharing}
              />
            </div>
          </div>
        )}

        {/* 2. CUSTOMER TAB (LIST CUSTOMER) */}
        {activeMainTab === 'CUSTOMER' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl">
            <CustomerQueue
              customers={sessionCustomers}
              activeCustomerId={activeCustomerId}
              activeSessionName={activeSession ? activeSession.name : 'Sesi Utama'}
              onSelectCustomer={handleSelectCustomer}
              onNextCustomer={handleNextCustomer}
              onOpenImportModal={() => setIsImportOpen(true)}
              onOpenSearchModal={() => setIsSearchOpen(true)}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onDeleteMultipleCustomers={handleDeleteMultipleCustomers}
              onDeleteAllCustomers={handleDeleteAllCustomers}
            />
          </div>
        )}

        {/* 3. SESI TAB (LIST SESI FOTO) */}
        {activeMainTab === 'SESI' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-sky-400" />
                  <span>Daftar &amp; Manajemen Sesi Foto Studio</span>
                </h2>
                <p className="text-xs text-slate-400">Total {sessions.length} sesi foto tersimpan di aplikasi</p>
              </div>
              <button
                onClick={() => setIsSessionModalOpen(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Sesi Baru</span>
              </button>
            </div>

            {/* List of Sessions */}
            <div className="grid grid-cols-1 gap-2.5">
              {sessions.map((session) => {
                const isCurrent = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      isCurrent
                        ? 'bg-sky-950/40 border-sky-500/50 shadow-md shadow-sky-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-sky-500 rounded text-xs font-bold text-slate-100"
                          />
                        ) : (
                          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                            {session.name}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 font-extrabold text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                AKTIF
                              </span>
                            )}
                          </h3>
                        )}

                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                          Prefix: <strong className="text-sky-400">{session.prefix || 'STUDIO_'}</strong>
                        </span>

                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                          No: <strong className="text-amber-300">#{formatFileNumber(session.currentNumber || 1, settings.digits)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              if (editSessionName.trim()) {
                                handleUpdateSession(session.id, { name: editSessionName, notes: editSessionNotes });
                                setEditingSessionId(null);
                              }
                            }}
                            className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan</span>
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                handleSelectSession(session.id);
                                showToast(`Dipilih sesi: ${session.name}`);
                              }}
                              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Pilih Sesi Ini
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingSessionId(session.id);
                              setEditSessionName(session.name);
                              setEditSessionNotes(session.notes || '');
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="Edit Sesi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {sessions.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus sesi "${session.name}" beserta datanya?`)) {
                                  handleDeleteSession(session.id);
                                }
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                              title="Hapus Sesi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. REKAP TAB (LIST REKAP FOTO) */}
        {activeMainTab === 'REKAP' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl">
            <PhotoHistoryList
              photos={sessionPhotos}
              onDeletePhoto={handleDeletePhoto}
              onDeleteAllPhotos={handleDeleteAllSessionPhotos}
              onUpdatePhoto={handleUpdatePhoto}
              onExportExcel={handleExportExcel}
              isSharing={isSharing}
            />
          </div>
        )}

        {/* 5. SETTING TAB (PENGATURAN & RESET DATA) */}
        {activeMainTab === 'SETTING' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-sky-400" />
                  <span>Pengaturan &amp; Reset Aplikasi</span>
                </h2>
                <p className="text-xs text-slate-400">Konfigurasi prefix, format nomor file, dan reset data</p>
              </div>
            </div>

            {/* Prefix & Digit settings */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
              <span className="font-bold text-xs text-sky-300 block">Prefix &amp; Format File Foto</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prefix Sesi Foto:</label>
                  <input
                    type="text"
                    value={settings.prefix}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings({ ...settings, prefix: val });
                      updateActiveSessionSettings(val, settings.currentNumber);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Digit Nomor Urut (Digit Zero Padding):</label>
                  <select
                    value={settings.digits}
                    onChange={(e) => setSettings({ ...settings, digits: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value={2}>2 Digit (01, 02, 03...)</option>
                    <option value={3}>3 Digit (001, 002, 003...)</option>
                    <option value={4}>4 Digit (0001, 0002, 0003...)</option>
                  </select>
                </div>
              </div>

              {/* Sample preview */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 block font-semibold text-[11px]">Contoh Format Nama File Generasi:</span>
                <span className="font-mono text-emerald-400 font-bold block">
                  {generateFileName(
                    settings,
                    activeCustomer ? activeCustomer.name : 'Customer_Studio'
                  )}
                </span>
              </div>
            </div>

            {/* RESET DATA SECTION */}
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-3">
              <span className="font-bold text-xs text-rose-300 block flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Reset Data &amp; Bersihkan Aplikasi
              </span>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleResetSessionCounter(1)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Counter ke #1</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Hapus seluruh rekap foto di sesi aktif ini?')) {
                      handleDeleteAllSessionPhotos();
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hapus Foto Sesi Ini</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Hapus seluruh daftar customer di sesi aktif ini?')) {
                      handleDeleteAllCustomers();
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hapus Customer Sesi Ini</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('⚠️ PERINGATAN: Yakin ingin MENGHAPUS SEMUA DATA aplikasi (semua sesi, customer, dan foto)? Data yang dihapus tidak bisa dikembalikan.')) {
                      handleResetAllData();
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>RESET TOTAL SEMUA DATA APLIKASI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl px-1 py-1.5 flex items-center justify-around shadow-2xl sm:hidden">
        {/* Home: modul capture */}
        <button
          onClick={() => {
            setActiveMainTab('HOME');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'HOME' ? 'text-sky-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Customer */}
        <button
          onClick={() => {
            setActiveMainTab('CUSTOMER');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'CUSTOMER' ? 'text-sky-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Customer</span>
        </button>

        {/* Sesi */}
        <button
          onClick={() => setActiveMainTab('SESI')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'SESI' ? 'text-sky-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Sesi</span>
        </button>

        {/* Rekap */}
        <button
          onClick={() => setActiveMainTab('REKAP')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'REKAP' ? 'text-sky-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Rekap</span>
        </button>

        {/* Setting */}
        <button
          onClick={() => setActiveMainTab('SETTING')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeMainTab === 'SETTING' ? 'text-sky-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Setting</span>
        </button>
      </nav>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 px-4 bg-slate-900/40 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© Liankhay Capture Manager — Multi Sesi &amp; Auto Increment Foto Studio</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Affix Software</span>
          </div>
        </div>
      </footer>

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
        activeSessionName={activeSession ? activeSession.name : 'Sesi Utama'}
        onSelectCustomer={handleSelectCustomer}
        onAddCustomer={handleAddCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onDeleteMultipleCustomers={handleDeleteMultipleCustomers}
        onDeleteAllCustomers={handleDeleteAllCustomers}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setSharedImportData(null);
          setSharedRawSheetData(null);
          setSharedMappingConfig(null);
          setSharedImportFileName('');
        }}
        onImportCustomers={handleImportCustomers}
        initialParsedData={sharedImportData}
        initialRawSheetData={sharedRawSheetData}
        initialMappingConfig={sharedMappingConfig}
        initialFileName={sharedImportFileName}
        onOpenShareDebug={() => setIsShareDebugModalOpen(true)}
        onOpenPasteText={() => setIsPasteTextModalOpen(true)}
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

      <ShareDebugModal
        isOpen={isShareDebugModalOpen}
        onClose={() => setIsShareDebugModalOpen(false)}
        initialDebugLog={shareDebugData}
        onOpenManualUpload={() => {
          setIsShareDebugModalOpen(false);
          setIsImportOpen(true);
        }}
        onOpenPasteText={() => {
          setIsShareDebugModalOpen(false);
          setIsPasteTextModalOpen(true);
        }}
        onSimulateShareTarget={(rawSheetData, fileName) => {
          setIsShareDebugModalOpen(false);
          const autoConfig = autoDetectColumnMapping(rawSheetData.rawRows, rawSheetData.maxCols);
          setSharedRawSheetData(rawSheetData);
          setSharedMappingConfig(autoConfig);
          const fn = fileName || 'Simulasi_Share_WA.txt';
          setSharedImportFileName(fn);
          setThankYouFileName(fn);
          setThankYouTime(new Date().toLocaleTimeString('id-ID'));
          setIsThankYouModalOpen(true);
          showToast(`⚡ Terima Kasih! Simulasi Share Intent Diterima di Node 1.`);
        }}
      />

      <ShareThankYouModal
        isOpen={isThankYouModalOpen}
        onClose={() => setIsThankYouModalOpen(false)}
        fileName={thankYouFileName}
        receivedTime={thankYouTime}
        onProceedToMapping={() => setIsImportOpen(true)}
        onOpenDebugLogs={() => setIsShareDebugModalOpen(true)}
      />

      <PasteTextModal
        isOpen={isPasteTextModalOpen}
        onClose={() => setIsPasteTextModalOpen(false)}
        onImportParsedText={handleImportParsedText}
      />

      {/* Global File Drag Overlay (Share Intent Catching Zone) */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-[70] bg-emerald-950/80 backdrop-blur-md border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center text-white p-6 animate-fade-in pointer-events-none">
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
