import { Share as CapacitorShare } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Universal Native Share Helper
 * Triggers Capacitor ShareSheet on Android/iOS native app, or Web Share API in modern browsers.
 */
export async function shareFileNative(file: File, title: string, text: string): Promise<boolean> {
  // 1. Capacitor Native Platform (Android / iOS APK)
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web') {
    try {
      // Read file as base64 for Filesystem
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const commaIdx = res.indexOf(',');
          resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let fileUri: string | null = null;
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const saved = await Filesystem.writeFile({
          path: cleanName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        fileUri = saved.uri;
      } catch (fsErr) {
        console.warn('Filesystem cache write error, attempting raw share fallback:', fsErr);
      }

      await CapacitorShare.share({
        title,
        text,
        url: fileUri || undefined,
        dialogTitle: `Bagikan ${file.name} (WhatsApp / Drive / Quick Share)`,
      });
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return false;
      }
      console.warn('Capacitor native share error, falling back to text share:', err);
    }
  }

  // 2. Web Share API (Mobile Web Browsers)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        return true;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.message?.includes('canceled')) return false;
    console.warn('Web Share API file error:', err);
  }

  // 3. Fallback: Share Text via Web Share / Native Text Share
  try {
    return await shareTextNative(title, `${text}\n\n📁 File ${file.name} telah dibuat.`);
  } catch (err: any) {
    if (err?.name === 'AbortError') return false;
    console.warn('Web Share API text error:', err);
  }

  return false;
}

/**
 * Share pure text natively via Capacitor Share or Web Share
 */
export async function shareTextNative(title: string, text: string, dialogTitle: string = 'Bagikan Rekap Teks'): Promise<boolean> {
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web') {
    try {
      await CapacitorShare.share({
        title,
        text,
        dialogTitle,
      });
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return false;
      }
      console.warn('Capacitor text share error:', err);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
  }

  return false;
}

/**
 * Check if app is running in Capacitor Native Environment
 */
export function isCapacitorNative(): boolean {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
}

