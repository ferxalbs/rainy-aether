import { useSyncExternalStore } from "react";
import { saveToStore, loadFromStore } from "./app-store";

export type FileIconColorMode = 'theme' | 'custom';

export type ProblemsSortOrder = 'severity' | 'position' | 'name';

export type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';

interface EditorSettings {
  // Format settings
  formatOnSave: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;

  // Auto-save settings
  autoSaveMode: AutoSaveMode;
  autoSaveDelay: number; // milliseconds

  // Visual settings
  stickyScroll: boolean;
  bracketPairColorization: boolean;
  indentGuides: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';

  // Behavior settings
  autoClosingBrackets: boolean;
  autoClosingQuotes: boolean;
  autoSurround: boolean;
  linkedEditing: boolean;

  // Minimap settings
  minimapEnabled: boolean;
  minimapScale: number;
  minimapShowSlider: 'always' | 'mouseover';

  // Font settings
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;

  // Tab settings
  tabSize: number;
  insertSpaces: boolean;
  detectIndentation: boolean;

  // Cursor settings
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorSmoothCaretAnimation: 'off' | 'explicit' | 'on';

  // Scroll settings
  smoothScrolling: boolean;
  mouseWheelZoom: boolean;
}

interface SettingsState {
  fileIconColorMode: FileIconColorMode;
  customFileColors: Record<string, string>; // extension -> color (hex or CSS var)
  iconThemeId: string | null; // Preferred icon theme ID

  // Problems panel settings
  problems: {
    showCurrentInStatus: boolean;   // Show current problem at cursor in status bar
    sortOrder: ProblemsSortOrder;   // How to sort problems in panel
    autoReveal: boolean;             // Auto-reveal problem when cursor moves to it
  };

  // Editor settings
  editor: EditorSettings;
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

const defaultEditorSettings: EditorSettings = {
  // Format settings
  formatOnSave: false,
  formatOnPaste: false,
  formatOnType: false,

  // Auto-save settings
  autoSaveMode: 'off',
  autoSaveDelay: 1000,

  // Visual settings
  stickyScroll: true,
  bracketPairColorization: true,
  indentGuides: true,
  renderWhitespace: 'selection',

  // Behavior settings
  autoClosingBrackets: true,
  autoClosingQuotes: true,
  autoSurround: true,
  linkedEditing: true,

  // Minimap settings
  minimapEnabled: true,
  minimapScale: 1,
  minimapShowSlider: 'mouseover',

  // Font settings
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  lineHeight: 1.5,
  letterSpacing: 0,

  // Tab settings
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: true,

  // Cursor settings
  cursorStyle: 'line',
  cursorBlinking: 'blink',
  cursorSmoothCaretAnimation: 'off',

  // Scroll settings
  smoothScrolling: true,
  mouseWheelZoom: false,
};

const initialState: SettingsState = {
  fileIconColorMode: 'theme',
  customFileColors: defaultColors,
  iconThemeId: null, // null means use default theme
  problems: {
    showCurrentInStatus: true,
    sortOrder: 'severity',
    autoReveal: false,
  },
  editor: defaultEditorSettings,
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
  const iconThemeId = await loadFromStore<string | null>("rainy-coder-icon-theme-id", null);

  // Load problems settings
  const showCurrentInStatus = await loadFromStore<boolean>("rainy-coder-problems-show-current", true);
  const sortOrder = await loadFromStore<ProblemsSortOrder>("rainy-coder-problems-sort-order", "severity");
  const autoReveal = await loadFromStore<boolean>("rainy-coder-problems-auto-reveal", false);

  // Load editor settings
  const editorSettings = await loadFromStore<EditorSettings>("rainy-coder-editor-settings", defaultEditorSettings);

  setState((prev) => ({
    ...prev,
    fileIconColorMode: mode,
    customFileColors: { ...prev.customFileColors, ...colors },
    iconThemeId,
    problems: {
      showCurrentInStatus,
      sortOrder,
      autoReveal,
    },
    editor: { ...defaultEditorSettings, ...editorSettings },
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

export async function setIconThemeId(themeId: string | null) {
  setState((prev) => ({ ...prev, iconThemeId: themeId }));
  await saveToStore("rainy-coder-icon-theme-id", themeId);
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

// Problems settings actions
export async function setShowCurrentProblemInStatus(show: boolean) {
  setState((prev) => ({
    ...prev,
    problems: { ...prev.problems, showCurrentInStatus: show },
  }));
  await saveToStore("rainy-coder-problems-show-current", show);
}

export async function setProblemsSortOrder(order: ProblemsSortOrder) {
  setState((prev) => ({
    ...prev,
    problems: { ...prev.problems, sortOrder: order },
  }));
  await saveToStore("rainy-coder-problems-sort-order", order);
}

export async function setProblemsAutoReveal(autoReveal: boolean) {
  setState((prev) => ({
    ...prev,
    problems: { ...prev.problems, autoReveal },
  }));
  await saveToStore("rainy-coder-problems-auto-reveal", autoReveal);
}

// Editor settings actions
export async function updateEditorSetting<K extends keyof EditorSettings>(
  key: K,
  value: EditorSettings[K]
) {
  setState((prev) => ({
    ...prev,
    editor: { ...prev.editor, [key]: value },
  }));
  await saveToStore("rainy-coder-editor-settings", settingsState.editor);
}

export async function updateEditorSettings(settings: Partial<EditorSettings>) {
  setState((prev) => ({
    ...prev,
    editor: { ...prev.editor, ...settings },
  }));
  await saveToStore("rainy-coder-editor-settings", settingsState.editor);
}

export function getEditorSettings(): EditorSettings {
  return settingsState.editor;
}

// Convenience functions for common editor settings
export async function setFormatOnSave(enabled: boolean) {
  await updateEditorSetting('formatOnSave', enabled);
}

export async function setStickyScroll(enabled: boolean) {
  await updateEditorSetting('stickyScroll', enabled);
}

export async function setBracketPairColorization(enabled: boolean) {
  await updateEditorSetting('bracketPairColorization', enabled);
}

export async function setAutoClosingBrackets(enabled: boolean) {
  await updateEditorSetting('autoClosingBrackets', enabled);
}

export async function setAutoClosingQuotes(enabled: boolean) {
  await updateEditorSetting('autoClosingQuotes', enabled);
}

export async function setMinimapEnabled(enabled: boolean) {
  await updateEditorSetting('minimapEnabled', enabled);
}

export async function setEditorFontSize(size: number) {
  await updateEditorSetting('fontSize', size);
}

export async function setEditorFontFamily(family: string) {
  await updateEditorSetting('fontFamily', family);
}

export async function setTabSize(size: number) {
  await updateEditorSetting('tabSize', size);
}

export async function setInsertSpaces(enabled: boolean) {
  await updateEditorSetting('insertSpaces', enabled);
}

export async function setAutoSaveMode(mode: AutoSaveMode) {
  await updateEditorSetting('autoSaveMode', mode);
}

export async function setRenderWhitespace(mode: EditorSettings['renderWhitespace']) {
  await updateEditorSetting('renderWhitespace', mode);
}

export async function setCursorStyle(style: EditorSettings['cursorStyle']) {
  await updateEditorSetting('cursorStyle', style);
}

export async function setSmoothScrolling(enabled: boolean) {
  await updateEditorSetting('smoothScrolling', enabled);
}