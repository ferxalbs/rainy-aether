/**
 * Icon Theme Store
 *
 * Manages file and folder icon themes similar to VS Code's Material Icon Theme.
 * Extensions can register custom icon themes that provide icons based on file extensions,
 * file names, folder names, and language IDs.
 */

import { useSyncExternalStore } from 'react';

/**
 * Icon definition - can be either:
 * - A string path to an icon file (relative to extension)
 * - An SVG string
 * - A React component (for built-in icons)
 */
export type IconDefinition = string | React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

/**
 * Icon associations for different file types
 */
export interface IconAssociations {
  /** Map file extensions to icon names (e.g., { "ts": "typescript" }) */
  fileExtensions?: Record<string, string>;
  /** Map exact file names to icon names (e.g., { "package.json": "nodejs" }) */
  fileNames?: Record<string, string>;
  /** Map language IDs to icon names (e.g., { "typescript": "typescript" }) */
  languageIds?: Record<string, string>;
  /** Map folder names to icon names (e.g., { "src": "folder-src" }) */
  folderNames?: Record<string, string>;
  /** Map folder names when expanded (e.g., { "src": "folder-src-open" }) */
  folderNamesExpanded?: Record<string, string>;
}

/**
 * Complete icon theme definition
 */
export interface IconTheme {
  /** Unique theme ID */
  id: string;
  /** Display name */
  label: string;
  /** Extension that provides this theme */
  extensionId?: string;
  /** Icon definitions - maps icon name to icon definition */
  iconDefinitions: Record<string, IconDefinition>;
  /** Associations between files/folders and icons */
  associations: IconAssociations;
  /** Default file icon */
  defaultFileIcon?: string;
  /** Default folder icon */
  defaultFolderIcon?: string;
  /** Default folder icon when expanded */
  defaultFolderIconExpanded?: string;
  /** Whether this is a built-in theme */
  builtIn?: boolean;
}

/**
 * Store state
 */
interface IconThemeState {
  /** All registered icon themes */
  themes: Map<string, IconTheme>;
  /** Currently active theme ID */
  activeThemeId: string | null;
}

let state: IconThemeState = {
  themes: new Map(),
  activeThemeId: null,
};

const listeners = new Set<() => void>();

const setState = (newState: IconThemeState) => {
  state = newState;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

/**
 * Get icon for a file based on the active theme
 */
export const getFileIcon = (fileName: string, languageId?: string): IconDefinition | null => {
  const activeTheme = state.activeThemeId ? state.themes.get(state.activeThemeId) : null;
  if (!activeTheme) return null;

  const { associations, iconDefinitions, defaultFileIcon } = activeTheme;

  // 1. Check exact file name match
  if (associations.fileNames) {
    const iconName = associations.fileNames[fileName.toLowerCase()];
    if (iconName && iconDefinitions[iconName]) {
      return iconDefinitions[iconName];
    }
  }

  // 2. Check file extension match
  if (associations.fileExtensions) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext) {
      const iconName = associations.fileExtensions[ext];
      if (iconName && iconDefinitions[iconName]) {
        return iconDefinitions[iconName];
      }
    }
  }

  // 3. Check language ID match
  if (languageId && associations.languageIds) {
    const iconName = associations.languageIds[languageId];
    if (iconName && iconDefinitions[iconName]) {
      return iconDefinitions[iconName];
    }
  }

  // 4. Fall back to default file icon
  if (defaultFileIcon && iconDefinitions[defaultFileIcon]) {
    return iconDefinitions[defaultFileIcon];
  }

  return null;
};

/**
 * Get icon for a folder based on the active theme
 */
export const getFolderIcon = (folderName: string, isExpanded: boolean): IconDefinition | null => {
  const activeTheme = state.activeThemeId ? state.themes.get(state.activeThemeId) : null;
  if (!activeTheme) return null;

  const { associations, iconDefinitions, defaultFolderIcon, defaultFolderIconExpanded } = activeTheme;

  // 1. Check folder name match
  const folderMap = isExpanded ? associations.folderNamesExpanded : associations.folderNames;
  if (folderMap) {
    const iconName = folderMap[folderName.toLowerCase()];
    if (iconName && iconDefinitions[iconName]) {
      return iconDefinitions[iconName];
    }
  }

  // 2. Fall back to default folder icon
  const defaultIcon = isExpanded ? defaultFolderIconExpanded : defaultFolderIcon;
  if (defaultIcon && iconDefinitions[defaultIcon]) {
    return iconDefinitions[defaultIcon];
  }

  return null;
};

/**
 * Register a new icon theme
 */
export const registerIconTheme = (theme: IconTheme): void => {
  setState({
    ...state,
    themes: new Map(state.themes).set(theme.id, theme),
  });

  // If this is the first theme or no theme is active, activate it
  if (!state.activeThemeId) {
    setActiveIconTheme(theme.id);
  }
};

/**
 * Unregister an icon theme
 */
export const unregisterIconTheme = (themeId: string): void => {
  const newThemes = new Map(state.themes);
  newThemes.delete(themeId);

  setState({
    ...state,
    themes: newThemes,
    activeThemeId: state.activeThemeId === themeId ? null : state.activeThemeId,
  });
};

/**
 * Set the active icon theme
 */
export const setActiveIconTheme = (themeId: string | null): void => {
  if (themeId && !state.themes.has(themeId)) {
    console.warn(`[IconTheme] Theme not found: ${themeId}`);
    return;
  }

  setState({
    ...state,
    activeThemeId: themeId,
  });

  console.log(`[IconTheme] Active theme set to: ${themeId}`);
};

/**
 * Get all registered themes
 */
export const getAllIconThemes = (): IconTheme[] => {
  return Array.from(state.themes.values());
};

/**
 * Get the active icon theme
 */
export const getActiveIconTheme = (): IconTheme | null => {
  return state.activeThemeId ? state.themes.get(state.activeThemeId) || null : null;
};

/**
 * React hook to use icon theme store
 */
export const useIconThemeStore = () => {
  return useSyncExternalStore(subscribe, getSnapshot);
};

/**
 * Hook to get the active theme
 */
export const useActiveIconTheme = () => {
  const state = useIconThemeStore();
  return state.activeThemeId ? state.themes.get(state.activeThemeId) || null : null;
};

/**
 * Actions object for convenience
 */
export const iconThemeActions = {
  registerTheme: registerIconTheme,
  unregisterTheme: unregisterIconTheme,
  setActiveTheme: setActiveIconTheme,
  getAllThemes: getAllIconThemes,
  getActiveTheme: getActiveIconTheme,
  getFileIcon,
  getFolderIcon,
};
