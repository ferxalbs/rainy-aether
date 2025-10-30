import { invoke } from '@tauri-apps/api/core';

/**
 * Gets the application version from Tauri
 * @returns Promise<string> The application version
 */
export const getAppVersion = async (): Promise<string> => {
  try {
    const version = await invoke<string>('plugin:app|version');
    return version;
  } catch (error) {
    console.error('Failed to get app version:', error);
    // Fallback to a default version if Tauri API fails
    return '0.0.0';
  }
};