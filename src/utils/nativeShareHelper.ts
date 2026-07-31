import { Share as CapacitorShare } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Universal Native Share Helper
 * Triggers Capacitor ShareSheet on Android/iOS native app, or Web Share API in modern browsers.
 */
export async function shareFileNative(file: File, title: string, text: string): Promise<boolean> {
  // 1. Capacitor Native Platform (Android / iOS APK)
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web') {
    try {
      // Convert File to Data URL for Capacitor Share plugin
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await CapacitorShare.share({
        title,
        text,
        url: dataUrl,
        dialogTitle: `Bagikan ${file.name} (WhatsApp / Drive / Quick Share)`,
      });
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        return false;
      }
      console.warn('Capacitor native share error, falling back to browser share:', err);
    }
  }

  // 2. Web Share API (Mobile Web Browsers)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('Web Share API error:', err);
    }
  }

  // 3. Fallback: Share Text via Web Share
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text: `${text}\n\n📁 File ${file.name} siap di folder Download.`,
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
    }
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
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
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
