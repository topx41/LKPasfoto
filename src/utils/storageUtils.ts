import { Customer, PhotoRecord, StudioSettings, StudioSession } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'foto_studio_settings_v1',
  CUSTOMERS: 'foto_studio_customers_v1',
  PHOTOS: 'foto_studio_photos_v1',
  ACTIVE_CUSTOMER_ID: 'foto_studio_active_customer_id_v1',
  SESSIONS: 'foto_studio_sessions_v1',
  ACTIVE_SESSION_ID: 'foto_studio_active_session_id_v1',
};

export const DEFAULT_SETTINGS: StudioSettings = {
  prefix: 'STUDIO_',
  currentNumber: 1,
  numberDigitCount: 3,
  fileNameFormat: 'PREFIX_NUM_NAME',
  autoAdvanceOnCapture: false,
  saveQuality: 0.9,
};

export const DEFAULT_SESSIONS: StudioSession[] = [
  {
    id: 'session_default',
    name: 'Sesi Utama (Pagi)',
    date: new Date().toISOString().split('T')[0],
    prefix: 'STUDIO_',
    currentNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Sesi foto reguler studio',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust_1', sessionId: 'session_default', name: 'Ahmad Fauzi', code: 'CST-001', category: 'Pas Foto 4x6', status: 'in_progress', photoCount: 0 },
  { id: 'cust_2', sessionId: 'session_default', name: 'Siti Nurhaliza', code: 'CST-002', category: 'Wisuda', status: 'pending', photoCount: 0 },
  { id: 'cust_3', sessionId: 'session_default', name: 'Budi Santoso', code: 'CST-003', category: 'Family Portrait', status: 'pending', photoCount: 0 },
];

export function loadSessions(): StudioSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return DEFAULT_SESSIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SESSIONS;
  } catch {
    return DEFAULT_SESSIONS;
  }
}

export function saveSessions(sessions: StudioSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save sessions:', err);
  }
}

export function loadActiveSessionId(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    return val || 'session_default';
  } catch {
    return 'session_default';
  }
}

export function saveActiveSessionId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
  } catch (err) {
    console.error('Failed to save active session id:', err);
  }
}

export function loadSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: StudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return INITIAL_CUSTOMERS;
    const parsed: Customer[] = JSON.parse(raw);
    // Ensure sessionId fallback
    return parsed.map((c) => ({ ...c, sessionId: c.sessionId || 'session_default' }));
  } catch {
    return INITIAL_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to save customers:', err);
  }
}

export function loadPhotos(): PhotoRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PHOTOS);
    if (!raw) return [];
    const parsed: PhotoRecord[] = JSON.parse(raw);
    return parsed.map((p) => ({ ...p, sessionId: p.sessionId || 'session_default' }));
  } catch {
    return [];
  }
}

export function savePhotos(photos: PhotoRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
  } catch (err) {
    console.warn('Failed to save photos to localStorage (possibly size limit):', err);
  }
}

export function loadActiveCustomerId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID) || 'cust_1';
  } catch {
    return 'cust_1';
  }
}

export function saveActiveCustomerId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CUSTOMER_ID);
    }
  } catch (err) {
    console.error('Failed to save active customer id:', err);
  }
}
