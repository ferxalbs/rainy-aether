/**
 * Icon Theme Store
 *
 * Manages file and folder icon themes similar to VS Code's Material Icon Theme.
 * Extensions can register custom icon themes that provide icons based on file extensions,
 * file names, folder names, and language IDs.
 */

import { useSyncExternalStore } from 'react';

/**
 * Icon definition - VS Code compatible
 * Can specify either an icon path (SVG/PNG) or a React component (for built-in themes)
 */
export interface IconDefinition {
  /** Path to icon file (SVG or PNG) - relative to extension root */
  iconPath?: string;
  /** React component (Rainy Aether extension - not in VS Code) */
  iconComponent?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  /** Font character (for font-based icons - future support) */
  fontCharacter?: string;
  /** Font color */
  fontColor?: string;
  /** Font ID */
  fontId?: string;
}

/**
 * Complete icon theme definition - VS Code compatible structure
 */
export interface IconTheme {
  /** Unique theme ID */
  id: string;
  /** Display name */
  label: string;
  /** Extension that provides this theme */
  extensionId?: string;
  /** Icon definitions - maps icon ID to icon definition */
  iconDefinitions: Record<string, IconDefinition>;

  // VS Code standard properties
  /** Default file icon ID */
  file?: string;
  /** Default folder icon ID (collapsed) */
  folder?: string;
  /** Default folder icon ID (expanded) */
  folderExpanded?: string;
  /** Root folder icon (collapsed) */
  rootFolder?: string;
  /** Root folder icon (expanded) */
  rootFolderExpanded?: string;

  // File associations (map extension/name to icon ID)
  /** Map file extensions to icon IDs (e.g., { "ts": "typescript" }) */
  fileExtensions?: Record<string, string>;
  /** Map exact file names to icon IDs (e.g., { "package.json": "nodejs" }) */
  fileNames?: Record<string, string>;
  /** Map language IDs to icon IDs (e.g., { "typescript": "typescript" }) */
  languageIds?: Record<string, string>;

  // Folder associations (map folder name to icon ID)
  /** Map folder names to icon IDs (collapsed) */
  folderNames?: Record<string, string>;
  /** Map folder names to icon IDs (expanded) */
  folderNamesExpanded?: Record<string, string>;
  /** Map root folder names to icon IDs (collapsed) */
  rootFolderNames?: Record<string, string>;
  /** Map root folder names to icon IDs (expanded) */
  rootFolderNamesExpanded?: Record<string, string>;

  /** Whether this is a built-in theme */
  builtIn?: boolean;

  // Light/High Contrast variants (future support)
  light?: Partial<IconTheme>;
  highContrast?: Partial<IconTheme>;
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
  if (!activeTheme) {
    console.log('[IconTheme] No active theme');
    return null;
  }

  console.log(`[IconTheme] Looking up icon for file: "${fileName}"`);
  console.log(`[IconTheme] Active theme: ${state.activeThemeId}`);
  console.log(`[IconTheme] Available fileExtensions:`, Object.keys(activeTheme.fileExtensions || {}).slice(0, 20));
  console.log(`[IconTheme] Available fileNames:`, Object.keys(activeTheme.fileNames || {}).slice(0, 20));

  const { iconDefinitions } = activeTheme;
  let iconId: string | undefined;

  // 1. Check exact file name match
  if (activeTheme.fileNames) {
    iconId = activeTheme.fileNames[fileName.toLowerCase()];
    if (iconId && iconDefinitions[iconId]) {
      console.log(`[IconTheme] ✅ Found icon for file "${fileName}" via fileNames: ${iconId}`);
      return iconDefinitions[iconId];
    }
  }

  // 2. Check file extension match (can match multiple for files like lib.d.ts)
  if (activeTheme.fileExtensions) {
    const parts = fileName.toLowerCase().split('.');
    console.log(`[IconTheme] File parts:`, parts);

    // Try multi-part extensions first (e.g., 'd.ts' before 'ts')
    for (let i = 1; i < parts.length; i++) {
      const ext = parts.slice(i).join('.');
      console.log(`[IconTheme] Trying extension: "${ext}"`);
      iconId = activeTheme.fileExtensions[ext];
      if (iconId) {
        console.log(`[IconTheme] Found iconId: ${iconId}, checking if definition exists...`);
        if (iconDefinitions[iconId]) {
          console.log(`[IconTheme] ✅ Found icon for file "${fileName}" via extension ".${ext}": ${iconId}`);
          return iconDefinitions[iconId];
        } else {
          console.warn(`[IconTheme] IconId ${iconId} not found in iconDefinitions!`);
        }
      }
    }
  }

  // 3. Check language ID match
  if (languageId && activeTheme.languageIds) {
    iconId = activeTheme.languageIds[languageId];
    if (iconId && iconDefinitions[iconId]) {
      console.log(`[IconTheme] ✅ Found icon for file "${fileName}" via languageId "${languageId}": ${iconId}`);
      return iconDefinitions[iconId];
    }
  }

  // 4. Fall back to default file icon
  if (activeTheme.file && iconDefinitions[activeTheme.file]) {
    console.log(`[IconTheme] ⚠️ Using default file icon for "${fileName}": ${activeTheme.file}`);
    return iconDefinitions[activeTheme.file];
  }

  console.error(`[IconTheme] ❌ No icon found for file "${fileName}"`);
  console.log(`[IconTheme] Total icon definitions loaded: ${Object.keys(iconDefinitions).length}`);
  return null;
};

/**
 * Get icon for a folder based on the active theme
 */
export const getFolderIcon = (folderName: string, isExpanded: boolean, isRoot: boolean = false): IconDefinition | null => {
  const activeTheme = state.activeThemeId ? state.themes.get(state.activeThemeId) : null;
  if (!activeTheme) return null;

  const { iconDefinitions } = activeTheme;
  let iconId: string | undefined;

  // 1. Check root folder name match (if this is a root folder)
  if (isRoot) {
    const rootFolderMap = isExpanded ? activeTheme.rootFolderNamesExpanded : activeTheme.rootFolderNames;
    if (rootFolderMap) {
      iconId = rootFolderMap[folderName.toLowerCase()];
      if (iconId && iconDefinitions[iconId]) {
        return iconDefinitions[iconId];
      }
    }

    // Fall back to root folder default
    iconId = isExpanded ? activeTheme.rootFolderExpanded : activeTheme.rootFolder;
    if (iconId && iconDefinitions[iconId]) {
      return iconDefinitions[iconId];
    }
  }

  // 2. Check regular folder name match
  const folderMap = isExpanded ? activeTheme.folderNamesExpanded : activeTheme.folderNames;
  if (folderMap) {
    iconId = folderMap[folderName.toLowerCase()];
    if (iconId && iconDefinitions[iconId]) {
      return iconDefinitions[iconId];
    }
  }

  // 3. Fall back to default folder icon
  iconId = isExpanded ? activeTheme.folderExpanded : activeTheme.folder;
  if (iconId && iconDefinitions[iconId]) {
    return iconDefinitions[iconId];
  }

  return null;
};

/**
 * Register a new icon theme
 */
export const registerIconTheme = (theme: IconTheme, autoActivate: boolean = false): void => {
  setState({
    ...state,
    themes: new Map(state.themes).set(theme.id, theme),
  });

  // Optionally auto-activate if no theme is active
  if (autoActivate && !state.activeThemeId) {
    // Don't save preference for auto-activation
    setActiveIconTheme(theme.id, false);
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
export const setActiveIconTheme = async (themeId: string | null, savePreference: boolean = true): Promise<void> => {
  if (themeId && !state.themes.has(themeId)) {
    console.warn(`[IconTheme] Theme not found: ${themeId}`);
    return;
  }

  setState({
    ...state,
    activeThemeId: themeId,
  });

  console.log(`[IconTheme] Active theme set to: ${themeId}`);

  // Save user preference
  if (savePreference) {
    try {
      const { setIconThemeId } = await import('./settingsStore');
      await setIconThemeId(themeId);
      console.log(`[IconTheme] Saved theme preference: ${themeId}`);
    } catch (error) {
      console.error('[IconTheme] Failed to save theme preference:', error);
    }
  }
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
