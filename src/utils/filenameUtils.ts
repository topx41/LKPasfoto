import { StudioSettings } from '../types';

export function formatFileNumber(num: number, digitsCount: number): string {
  const safeNum = typeof num === 'number' && !isNaN(num) ? num : (parseInt(String(num)) || 1);
  const safeDigits = typeof digitsCount === 'number' && digitsCount >= 1 ? digitsCount : 3;
  return String(safeNum).padStart(safeDigits, '0');
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '_');
}

export function generateFileName(
  settings: StudioSettings,
  customerName: string
): string {
  const formattedNum = formatFileNumber(settings.currentNumber, settings.numberDigitCount);
  const cleanName = sanitizeName(customerName) || 'General';
  const prefix = settings.prefix.trim();
  const ext = settings.includeExtension === false ? '' : '.jpg';

  switch (settings.fileNameFormat) {
    case 'PREFIX_NUM_NAME':
      return `${prefix}${formattedNum}_${cleanName}${ext}`;
    case 'PREFIX_NUM':
      return `${prefix}${formattedNum}${ext}`;
    case 'NAME_PREFIX_NUM':
      return `${cleanName}_${prefix}${formattedNum}${ext}`;
    default:
      return `${prefix}${formattedNum}${ext}`;
  }
}
