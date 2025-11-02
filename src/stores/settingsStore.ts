import { useSyncExternalStore } from "react";
import { saveToStore, loadFromStore } from "./app-store";

export type FileIconColorMode = 'theme' | 'custom';

interface SettingsState {
  fileIconColorMode: FileIconColorMode;
  customFileColors: Record<string, string>; // extension -> color (hex or CSS var)
}

const defaultColors: Record<string, string> = {
  ts: '#3b82f6',
  tsx: '#3b82f6',
  js: '#f59e0b',
  jsx: '#f59e0b',
  rs: '#dea584',
  json: '#10b981',
  md: '#64748b',
  css: '#22c55e',
  scss: '#22c55e',
  html: '#ef4444',
  svg: '#16a34a'
};

const initialState: SettingsState = {
  fileIconColorMode: 'theme',
  customFileColors: defaultColors
};

let settingsState: SettingsState = initialState;
let cachedSnapshot: SettingsState = { ...initialState };

type SettingsListener = () => void;

const listeners = new Set<SettingsListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Settings listener error:", error);
    }
  });
};

const setState = (updater: (prev: SettingsState) => SettingsState) => {
  settingsState = updater(settingsState);
  cachedSnapshot = settingsState;
  notify();
  return settingsState;
};

const subscribe = (listener: SettingsListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const useSettingsState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getSettingsState = () => settingsState;

export async function initializeSettings() {
  const mode = await loadFromStore<FileIconColorMode>("rainy-coder-file-icon-mode", "theme");
  const colors = await loadFromStore<Record<string, string>>("rainy-coder-custom-file-colors", defaultColors);

  setState((prev) => ({
    ...prev,
    fileIconColorMode: mode,
    customFileColors: { ...prev.customFileColors, ...colors },
  }));
}

export async function setFileIconColorMode(mode: FileIconColorMode) {
  setState((prev) => ({ ...prev, fileIconColorMode: mode }));
  await saveToStore("rainy-coder-file-icon-mode", mode);
}

export async function setCustomFileColor(ext: string, color: string) {
  const normalized = ext.replace(/^\./, "").toLowerCase();
  setState((prev) => ({
    ...prev,
    customFileColors: { ...prev.customFileColors, [normalized]: color },
  }));
  await saveToStore("rainy-coder-custom-file-colors", settingsState.customFileColors);
}

export function fileIconColorForExt(ext: string): string {
  const normalized = ext.replace(/^\./, "").toLowerCase();
  if (settingsState.fileIconColorMode === "custom") {
    const custom = settingsState.customFileColors[normalized];
    if (custom) return custom;
  }
  switch (normalized) {
    case "ts":
    case "tsx":
      return "var(--accent-primary)";
    case "js":
    case "jsx":
      return "var(--accent-secondary)";
    case "json":
    case "md":
      return "var(--text-secondary)";
    case "rs":
      return "var(--accent-primary)";
    case "html":
    case "css":
    case "scss":
      return "var(--accent-secondary)";
    default:
      return "var(--text-secondary)";
  }
}