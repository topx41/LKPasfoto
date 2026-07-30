import * as XLSX from 'xlsx';
import { Customer, PhotoRecord } from '../types';

export interface ImportedCustomer {
  name: string;
  code?: string;
  category?: string;
  notes?: string;
}

export interface RawExcelSheetData {
  sheetName: string;
  rawRows: any[][];
  maxCols: number;
}

export interface ColumnMappingConfig {
  startRow: number; // 1-indexed (e.g. 2 means start reading data from row 2)
  headerRow: number; // 1-indexed (e.g. 1 means row 1 has column labels)
  nameColIndex: number; // -1 if not selected
  absenColIndex: number; // -1 if not selected
  categoryColIndex: number; // -1 if not selected
  notesColIndex: number; // -1 if not selected
}

export interface MappedCustomerResult {
  validCustomers: ImportedCustomer[];
  skippedCount: number;
  totalDataRows: number;
}

export function extractRawExcelData(data: ArrayBuffer | Uint8Array): RawExcelSheetData {
  try {
    const workbook = XLSX.read(data, { type: 'array' });

    if (!workbook.SheetNames || !workbook.SheetNames.length) {
      throw new Error('File Excel tidak memiliki sheet yang valid.');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error('Sheet dalam file Excel kosong atau tidak terbaca.');
    }

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    let maxCols = 0;
    if (Array.isArray(rawRows)) {
      rawRows.forEach((r) => {
        if (Array.isArray(r) && r.length > maxCols) {
          maxCols = r.length;
        }
      });
    }

    return { sheetName, rawRows: Array.isArray(rawRows) ? rawRows : [], maxCols };
  } catch (err: any) {
    throw new Error(err.message || 'Gagal mengekstrak data dari file Excel.');
  }
}

export function autoDetectColumnMapping(rawRows: any[][], maxCols: number): ColumnMappingConfig {
  let headerRowIndex = 0;
  let startRowIndex = 1;

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (Array.isArray(row) && row.some((cell) => String(cell).trim().length > 0)) {
      headerRowIndex = i;
      startRowIndex = i + 1;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];

  let nameColIndex = -1;
  let absenColIndex = -1;
  let categoryColIndex = -1;
  let notesColIndex = -1;

  for (let c = 0; c < Math.max(headerRow.length, maxCols); c++) {
    const val = String(headerRow[c] || '').toLowerCase().trim();
    if (!val) continue;

    if (nameColIndex === -1 && /nama|customer|siswa|peserta|client|name/i.test(val)) {
      nameColIndex = c;
    } else if (
      absenColIndex === -1 &&
      /absen|id|nis|no|nomor|number|urut/i.test(val) &&
      !/nama|file|foto/i.test(val)
    ) {
      absenColIndex = c;
    } else if (
      categoryColIndex === -1 &&
      /kelas|kategori|kelompok|grup|category|code/i.test(val)
    ) {
      categoryColIndex = c;
    } else if (
      notesColIndex === -1 &&
      /catatan|keterangan|note|hp|phone|telepon/i.test(val)
    ) {
      notesColIndex = c;
    }
  }

  if (nameColIndex === -1 && maxCols > 1) nameColIndex = 1;
  if (nameColIndex === -1 && maxCols > 0) nameColIndex = 0;

  if (absenColIndex === -1 && maxCols > 0 && nameColIndex !== 0) absenColIndex = 0;
  if (absenColIndex === -1 && maxCols > 1 && nameColIndex !== 1) absenColIndex = 1;

  return {
    headerRow: headerRowIndex + 1,
    startRow: startRowIndex + 1,
    nameColIndex,
    absenColIndex,
    categoryColIndex,
    notesColIndex,
  };
}

export function processMappedExcelCustomers(
  rawRows: any[][],
  config: ColumnMappingConfig
): MappedCustomerResult {
  const startRowIdx = Math.max(0, config.startRow - 1);
  const dataRows = Array.isArray(rawRows) ? rawRows.slice(startRowIdx) : [];

  const validCustomers: ImportedCustomer[] = [];
  let skippedCount = 0;

  dataRows.forEach((row) => {
    if (!Array.isArray(row)) return;

    const rawName =
      config.nameColIndex >= 0 && row[config.nameColIndex] !== undefined
        ? String(row[config.nameColIndex]).trim()
        : '';

    const rawAbsen =
      config.absenColIndex >= 0 && row[config.absenColIndex] !== undefined
        ? String(row[config.absenColIndex]).trim()
        : '';

    const rawCategory =
      config.categoryColIndex >= 0 && row[config.categoryColIndex] !== undefined
        ? String(row[config.categoryColIndex]).trim()
        : undefined;

    const rawNotes =
      config.notesColIndex >= 0 && row[config.notesColIndex] !== undefined
        ? String(row[config.notesColIndex]).trim()
        : undefined;

    if (rawName.length > 0) {
      // If absen is empty or no column mapped, auto-generate sequential absen number
      const finalAbsen = rawAbsen.length > 0
        ? rawAbsen
        : String(validCustomers.length + 1).padStart(2, '0');

      validCustomers.push({
        name: rawName,
        code: finalAbsen,
        category: rawCategory,
        notes: rawNotes,
      });
    } else if (rawAbsen.length > 0) {
      skippedCount++;
    }
  });

  return {
    validCustomers,
    skippedCount,
    totalDataRows: dataRows.length,
  };
}

export function parseArrayBufferExcel(data: ArrayBuffer | Uint8Array): ImportedCustomer[] {
  const rawData = extractRawExcelData(data);
  const config = autoDetectColumnMapping(rawData.rawRows, rawData.maxCols);
  const result = processMappedExcelCustomers(rawData.rawRows, config);
  return result.validCustomers;
}

export async function parseCustomerExcel(file: File): Promise<ImportedCustomer[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          resolve([]);
          return;
        }
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const customers = parseArrayBufferExcel(data);
        resolve(customers);
      } catch (err) {
        console.error('Failed to parse customer excel:', err);
        resolve([]);
      }
    };

    reader.onerror = () => resolve([]);
    reader.readAsArrayBuffer(file);
  });
}

export function generateExcelWorkbook(
  photos: PhotoRecord[],
  customers: Customer[],
  sessionName: string = 'Sesi Utama',
  sessionDate: string = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  prefix: string = ''
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap Foto
  const photoAOA: any[][] = [
    ['REKAP FOTO STUDIO - LIANKHAY CAPTURE MANAGER'],
    [`Nama Sesi: ${sessionName}`, `Tanggal: ${sessionDate}`, `Prefix: ${prefix || '-'}`],
    [`Total Foto: ${photos.length}`, `Total Customer: ${customers.length}`],
    [],
    ['No', 'Nama Customer', 'Nomor Absen / No ID', 'Nomor File', 'Tandai', 'Keterangan', 'Waktu Capture'],
  ];

  if (photos.length > 0) {
    photos.forEach((p, index) => {
      photoAOA.push([
        index + 1,
        p.customerName,
        p.absenceNumber || p.customerCode || '-',
        p.fileName,
        p.isMarked ? '⭐ Ya' : 'Tidak',
        p.notes || '-',
        new Date(p.timestamp).toLocaleString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      ]);
    });
  } else {
    photoAOA.push(['-', 'Belum ada data foto', '-', '-', '-', '-', '-']);
  }

  const photoSheet = XLSX.utils.aoa_to_sheet(photoAOA);
  photoSheet['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
    { wch: 12 },
    { wch: 30 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, photoSheet, 'Rekap Foto');

  // Sheet 2: Daftar Customer
  const customerAOA: any[][] = [
    ['DAFTAR CUSTOMER - LIANKHAY CAPTURE MANAGER'],
    [`Nama Sesi: ${sessionName}`, `Tanggal: ${sessionDate}`],
    [`Total Customer: ${customers.length}`],
    [],
    ['No', 'Nama Customer', 'Nomor Absen / No ID', 'Kategori / Kelas', 'Jumlah Foto', 'Status'],
  ];

  if (customers.length > 0) {
    customers.forEach((c, index) => {
      customerAOA.push([
        index + 1,
        c.name,
        c.absenceNumber || c.code || '-',
        c.category || '-',
        c.photoCount,
        c.status === 'completed' ? 'Selesai' : c.status === 'in_progress' ? 'Sedang Difoto' : 'Belum Difoto',
      ]);
    });
  } else {
    customerAOA.push(['-', 'Belum ada customer', '-', '-', 0, '-']);
  }

  const customerSheet = XLSX.utils.aoa_to_sheet(customerAOA);
  customerSheet['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, customerSheet, 'Daftar Customer');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export function generateCustomerExcelWorkbook(
  customers: Customer[],
  sessionName: string = 'Sesi Utama'
): Uint8Array {
  const wb = XLSX.utils.book_new();

  const customerAOA: any[][] = [
    ['DAFTAR CUSTOMER - TRANSFER DATA LIANKHAY CAPTURE'],
    [`Sesi: ${sessionName}`, `Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
    [`Total Customer: ${customers.length}`],
    [],
    ['Nomor Absen / No ID', 'Nama Customer', 'Kategori / Kelas', 'Jumlah Foto', 'Catatan / Keterangan'],
  ];

  if (customers.length > 0) {
    customers.forEach((c) => {
      customerAOA.push([
        c.absenceNumber || c.code || '',
        c.name,
        c.category || '',
        c.photoCount || 0,
        c.notes || '',
      ]);
    });
  } else {
    customerAOA.push(['1', 'Contoh Nama Customer', 'Kelas 10A', 0, 'Contoh Catatan']);
  }

  const customerSheet = XLSX.utils.aoa_to_sheet(customerAOA);
  customerSheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 20 },
    { wch: 15 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, customerSheet, 'Data Customer');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export async function downloadOrShareCustomersExcel(
  customers: Customer[],
  sessionName: string = 'Sesi Utama'
): Promise<{ method: 'share' | 'download'; success: boolean }> {
  const bytes = generateCustomerExcelWorkbook(customers, sessionName);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanSession = sessionName ? sessionName.trim().replace(/[/\\?%*:|"<>]/g, '_') : 'Sesi';
  const fileName = `Transfer Customer - ${cleanSession}.xlsx`;

  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Transfer Data Customer - ${sessionName}`,
        text: `File Excel Data Customer (${customers.length} customer) Sesi ${sessionName} untuk Transfer Data.`,
      });
      return { method: 'share', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { method: 'download', success: true };
}

export async function downloadOrShareExcel(
  photos: PhotoRecord[],
  customers: Customer[],
  sessionName: string = 'Sesi Utama',
  sessionDate: string = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  prefix: string = ''
): Promise<{ method: 'share' | 'download'; success: boolean }> {
  const excelArray = generateExcelWorkbook(photos, customers, sessionName, sessionDate, prefix);
  const blob = new Blob([excelArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanSession = sessionName ? sessionName.trim().replace(/[/\\?%*:|"<>]/g, '_') : 'Sesi';
  const cleanDate = sessionDate.trim().replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `Rekap Foto - ${cleanSession} - ${cleanDate}.xlsx`;

  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Rekap Foto - ${sessionName}`,
        text: `Rekap foto studio ${sessionName} (${sessionDate}). Total foto: ${photos.length}.`,
      });
      return { method: 'share', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { method: 'download', success: true };
}


