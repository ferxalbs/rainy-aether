/**
 * Windows system theme detection and synchronization utilities
 * Provides robust detection of Windows light/dark mode preferences
 */

import { getCurrentWindow } from '@tauri-apps/api/window';

function isTauriEnv(): boolean {
  try {
    // Tauri injects __TAURI__ into window
    return typeof window !== 'undefined' && !!(window as any).__TAURI__;
  } catch {
    return false;
  }
}

export type SystemTheme = 'light' | 'dark';
export type AppTheme = 'day' | 'night';

/**
 * Detect the current Windows system theme
 * @returns Promise resolving to 'light' or 'dark'
 */
export async function detectSystemTheme(): Promise<SystemTheme> {
  try {
    if (isTauriEnv()) {
      const appWindow = getCurrentWindow();
      const theme = await appWindow.theme();
      // Tauri returns 'light', 'dark', or null
      return theme === 'dark' ? 'dark' : 'light';
    }
  } catch (error) {
    console.warn('Tauri theme detection failed, attempting web fallback:', error);
  }

  // Web fallback using prefers-color-scheme
  try {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      return prefersDark.matches ? 'dark' : 'light';
    }
  } catch (error) {
    console.warn('Web prefers-color-scheme detection failed:', error);
  }

  // Final fallback
  return 'light';
}

/**
 * Convert system theme to app theme
 * @param systemTheme - The detected system theme
 * @returns App theme ('day' for light, 'night' for dark)
 */
export function systemThemeToAppTheme(systemTheme: SystemTheme): AppTheme {
  return systemTheme === 'dark' ? 'night' : 'day';
}

/**
 * Convert app theme to system theme
 * @param appTheme - The app theme
 * @returns System theme ('dark' for night, 'light' for day)
 */
export function appThemeToSystemTheme(appTheme: AppTheme): SystemTheme {
  return appTheme === 'night' ? 'dark' : 'light';
}

/**
 * Listen for system theme changes
 * @param callback - Function called when system theme changes
 * @returns Cleanup function to remove the listener
 */
export function onSystemThemeChange(callback: (theme: SystemTheme) => void): () => void {
  let mediaQuery: MediaQueryList | null = null;

  // Tauri listener
  if (isTauriEnv()) {
    try {
      const appWindow = getCurrentWindow();
      const handleThemeChange = (event: { payload: string | null }) => {
        try {
          const systemTheme: SystemTheme = event.payload === 'dark' ? 'dark' : 'light';
          callback(systemTheme);
        } catch (error) {
          console.error('Error handling system theme change:', error);
        }
      };
      appWindow.onThemeChanged(handleThemeChange);
    } catch (error) {
      console.warn('Failed to register Tauri theme change listener:', error);
    }
  }

  // Web fallback listener
  try {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? 'dark' : 'light');
      };
      // Modern browsers
      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', handler);
      } else if ('addListener' in mediaQuery) {
        // Legacy
        (mediaQuery as any).addListener(handler);
      }
    }
  } catch (error) {
    console.warn('Failed to register web prefers-color-scheme listener:', error);
  }

  // Cleanup
  return () => {
    if (mediaQuery) {
      const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? 'dark' : 'light');
      };
      if ('removeEventListener' in mediaQuery) {
        mediaQuery.removeEventListener('change', handler);
      } else if ('removeListener' in mediaQuery) {
        (mediaQuery as any).removeListener(handler);
      }
    }
  };
}

/**
 * Check if the system supports theme detection
 * @returns Promise resolving to true if supported
 */
export async function isSystemThemeSupported(): Promise<boolean> {
  try {
    await detectSystemTheme();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get system theme preference with fallback
 * @param fallback - Fallback theme if detection fails
 * @returns Promise resolving to detected or fallback theme
 */
export async function getSystemThemeWithFallback(fallback: SystemTheme = 'light'): Promise<SystemTheme> {
  try {
    return await detectSystemTheme();
  } catch {
    console.warn(`System theme detection failed, using fallback: ${fallback}`);
    return fallback;
  }
}