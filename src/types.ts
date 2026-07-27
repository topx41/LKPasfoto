export interface Customer {
  id: string;
  sessionId?: string;
  name: string;
  code?: string;
  category?: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed';
  photoCount: number;
  createdAt?: string;
}

export interface PhotoRecord {
  id: string;
  sessionId?: string;
  customerId: string;
  customerName: string;
  fileName: string;
  prefix: string;
  fileNumber: number;
  dataUrl: string;
  timestamp: string;
}

export interface StudioSettings {
  prefix: string;
  currentNumber: number;
  numberDigitCount: number;
  fileNameFormat: 'PREFIX_NUM_NAME' | 'PREFIX_NUM' | 'NAME_PREFIX_NUM';
  autoAdvanceOnCapture: boolean;
  saveQuality: number;
}

export interface StudioSession {
  id: string;
  name: string;
  date: string;
  notes?: string;
  prefix: string;
  currentNumber: number;
  numberDigitCount?: number;
  fileNameFormat?: 'PREFIX_NUM_NAME' | 'PREFIX_NUM' | 'NAME_PREFIX_NUM';
  createdAt: string;
  updatedAt: string;
}
