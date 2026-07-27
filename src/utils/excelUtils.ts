import * as XLSX from 'xlsx';
import { Customer, PhotoRecord } from '../types';

export interface ImportedCustomer {
  name: string;
  code?: string;
  category?: string;
  notes?: string;
}

export function parseArrayBufferExcel(data: ArrayBuffer | Uint8Array): ImportedCustomer[] {
  const workbook = XLSX.read(data, { type: 'array' });
  
  if (!workbook.SheetNames.length) {
    throw new Error('File Excel tidak memiliki sheet.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (jsonRows.length === 0) {
    return [];
  }

  // Detect column header for Customer Name
  const sampleRow = jsonRows[0];
  const keys = Object.keys(sampleRow);

  let nameKey = keys.find((k) =>
    /nama|customer|client|orang|peserta|name/i.test(k)
  ) || keys[0];

  let codeKey = keys.find((k) => /kode|code|id|no|nomor/i.test(k) && k !== nameKey);
  let categoryKey = keys.find((k) => /kategori|category|kelompok|kelas|grup/i.test(k));
  let notesKey = keys.find((k) => /catatan|note|keterangan/i.test(k));

  const customers: ImportedCustomer[] = jsonRows
    .map((row): ImportedCustomer | null => {
      const rawName = String(row[nameKey] || '').trim();
      if (!rawName) return null;

      return {
        name: rawName,
        code: codeKey ? String(row[codeKey]).trim() : undefined,
        category: categoryKey ? String(row[categoryKey]).trim() : undefined,
        notes: notesKey ? String(row[notesKey]).trim() : undefined,
      };
    })
    .filter((c): c is ImportedCustomer => Boolean(c));

  return customers;
}

export async function parseCustomerExcel(file: File): Promise<ImportedCustomer[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const customers = parseArrayBufferExcel(data);
        resolve(customers);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export function generateExcelWorkbook(
  photos: PhotoRecord[],
  customers: Customer[]
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap Foto (List of photos taken)
  const photoData = photos.map((p, index) => ({
    'No': index + 1,
    'Nama Customer': p.customerName,
    'Nomor File Kamera': p.fileName,
    'Prefix': p.prefix,
    'Nomor Urut': p.fileNumber,
    'Waktu Capture': new Date(p.timestamp).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }));

  const photoSheet = XLSX.utils.json_to_sheet(
    photoData.length > 0
      ? photoData
      : [{'No': '-', 'Nama Customer': 'Belum ada data foto', 'Nomor File Kamera': '-', 'Prefix': '-', 'Nomor Urut': '-', 'Waktu Capture': '-'}]
  );
  
  // Set column widths
  photoSheet['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, photoSheet, 'Rekap Foto');

  // Sheet 2: Daftar Customer (Summary)
  const customerData = customers.map((c, index) => ({
    'No': index + 1,
    'Kode/ID': c.code || '-',
    'Nama Customer': c.name,
    'Kategori': c.category || '-',
    'Jumlah Foto Captured': c.photoCount,
    'Status': c.status === 'completed' ? 'Selesai' : c.status === 'in_progress' ? 'Sedang Difoto' : 'Belum Difoto',
  }));

  const customerSheet = XLSX.utils.json_to_sheet(
    customerData.length > 0
      ? customerData
      : [{'No': '-', 'Kode/ID': '-', 'Nama Customer': 'Belum ada customer', 'Kategori': '-', 'Jumlah Foto Captured': 0, 'Status': '-'}]
  );

  customerSheet['!cols'] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, customerSheet, 'Daftar Customer');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export async function downloadOrShareExcel(
  photos: PhotoRecord[],
  customers: Customer[],
  sessionName?: string
): Promise<{ method: 'share' | 'download'; success: boolean }> {
  const excelArray = generateExcelWorkbook(photos, customers);
  const blob = new Blob([excelArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const cleanSession = sessionName ? sessionName.replace(/[^a-zA-Z0-9]/g, '_') : 'Studio';
  const fileName = `Rekap_Foto_${cleanSession}_${dateStr}.xlsx`;

  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Try Web Share API if supported
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Rekap Foto Studio${sessionName ? ` - ${sessionName}` : ''}`,
        text: `Rekap foto studio ${sessionName ? `(${sessionName})` : ''} tanggal ${now.toLocaleDateString('id-ID')}. Total foto: ${photos.length}.`,
      });
      return { method: 'share', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
      // Fallback to direct download if share failed
    }
  }

  // Fallback direct browser download
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

