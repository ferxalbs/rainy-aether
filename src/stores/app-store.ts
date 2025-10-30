import { Store } from '@tauri-apps/plugin-store';

const isTauriEnv = () => {
  try {
    return typeof window !== 'undefined' && !!(window as any).__TAURI__;
  } catch {
    return false;
  }
};

/**
 * Saves a key-value pair to the persistent store.
 * @param key The key under which to store the value.
 * @param value The value to store.
 */
export const saveToStore = async <T>(key: string, value: T): Promise<void> => {
  try {
    if (isTauriEnv()) {
      const store = await Store.load('.app-settings.dat');
      await store.set(key, value);
      await store.save(); // Explicitly save the store to disk
    } else {
      // Browser dev fallback: persist in localStorage
      const existing = localStorage.getItem('rainy-coder-store');
      const data = existing ? JSON.parse(existing) : {};
      data[key] = value;
      localStorage.setItem('rainy-coder-store', JSON.stringify(data));
    }
  } catch (error) {
    console.error(`Failed to save to store [${key}]:`, error);
  }
};

/**
 * Loads a value from the persistent store.
 * @param key The key of the value to load.
 * @param defaultValue The default value to return if the key is not found.
 * @returns The loaded value or the default value.
 */
export const loadFromStore = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    if (isTauriEnv()) {
      const store = await Store.load('.app-settings.dat');
      const value = await store.get<T>(key);
      return value === null || value === undefined ? defaultValue : value;
    } else {
      // Browser dev fallback: read from localStorage
      const existing = localStorage.getItem('rainy-coder-store');
      if (!existing) return defaultValue;
      const data = JSON.parse(existing);
      const value = data[key];
      return value === null || value === undefined ? defaultValue : value as T;
    }
  } catch (error) {
    console.error(`Failed to load from store [${key}]:`, error);
    return defaultValue;
  }
};