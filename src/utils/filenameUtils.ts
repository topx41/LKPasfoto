import { StudioSettings } from '../types';

export function formatFileNumber(num: number, digitsCount: number): string {
  return String(num).padStart(digitsCount, '0');
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

  switch (settings.fileNameFormat) {
    case 'PREFIX_NUM_NAME':
      return `${prefix}${formattedNum}_${cleanName}.jpg`;
    case 'PREFIX_NUM':
      return `${prefix}${formattedNum}.jpg`;
    case 'NAME_PREFIX_NUM':
      return `${cleanName}_${prefix}${formattedNum}.jpg`;
    default:
      return `${prefix}${formattedNum}_${cleanName}.jpg`;
  }
}
