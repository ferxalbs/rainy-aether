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

// Icon lookup cache for O(1) repeated lookups
// Key format: "file:{themeId}:{fileName}" or "folder:{themeId}:{folderName}:{isExpanded}:{isRoot}"
const iconCache = new Map<string, IconDefinition | null>();
const MAX_CACHE_SIZE = 2000;

// Clear cache when it gets too large (LRU-like behavior without tracking order)
const maintainCacheSize = () => {
  if (iconCache.size > MAX_CACHE_SIZE) {
    // Clear half the cache when limit is reached
    const keysToDelete = Array.from(iconCache.keys()).slice(0, MAX_CACHE_SIZE / 2);
    keysToDelete.forEach(key => iconCache.delete(key));
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

// Map common file extensions to language IDs for fallback lookup
// Some icon themes (like Material Icon Theme) use languageIds instead of fileExtensions
const extensionToLanguageId: Record<string, string> = {
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'jsx': 'javascriptreact',
  'ts': 'typescript',
  'mts': 'typescript',
  'cts': 'typescript',
  'tsx': 'typescriptreact',
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'json': 'json',
  'jsonc': 'jsonc',
  'md': 'markdown',
  'mdx': 'mdx',
  'py': 'python',
  'rb': 'ruby',
  'rs': 'rust',
  'go': 'go',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  'cs': 'csharp',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  'vue': 'vue',
  'svelte': 'svelte',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'svg': 'xml',
  'sql': 'sql',
  'sh': 'shellscript',
  'bash': 'shellscript',
  'zsh': 'shellscript',
};

/**
 * Get icon for a file based on the active theme
 * Uses caching for O(1) repeated lookups
 */
export const getFileIcon = (fileName: string, languageId?: string): IconDefinition | null => {
  const activeTheme = state.activeThemeId ? state.themes.get(state.activeThemeId) : null;
  if (!activeTheme) {
    return null;
  }

  // Check cache first
  const cacheKey = `file:${state.activeThemeId}:${fileName.toLowerCase()}:${languageId || ''}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const { iconDefinitions } = activeTheme;
  let iconId: string | undefined;
  let result: IconDefinition | null = null;
  const fileNameLower = fileName.toLowerCase();

  // 1. Check exact file name match
  if (activeTheme.fileNames) {
    iconId = activeTheme.fileNames[fileNameLower];
    if (iconId && iconDefinitions[iconId]) {
      result = iconDefinitions[iconId];
    }
  }

  // 2. Check file extension match (multi-part extensions first)
  if (!result && activeTheme.fileExtensions) {
    const parts = fileNameLower.split('.');
    for (let i = 1; i < parts.length && !result; i++) {
      const ext = parts.slice(i).join('.');
      iconId = activeTheme.fileExtensions[ext];
      if (iconId && iconDefinitions[iconId]) {
        result = iconDefinitions[iconId];
      }
    }
  }

  // 3. Check language ID match (use provided or infer from extension)
  if (!result && activeTheme.languageIds) {
    // Try provided languageId first
    if (languageId) {
      iconId = activeTheme.languageIds[languageId];
      if (iconId && iconDefinitions[iconId]) {
        result = iconDefinitions[iconId];
      }
    }

    // If no match, try to infer language ID from file extension
    // This is important for themes like Material Icon Theme that use languageIds
    if (!result) {
      const ext = fileNameLower.split('.').pop() || '';
      const inferredLangId = extensionToLanguageId[ext];
      if (inferredLangId) {
        iconId = activeTheme.languageIds[inferredLangId];
        if (iconId && iconDefinitions[iconId]) {
          result = iconDefinitions[iconId];
        }
      }
    }
  }

  // 4. Fall back to default file icon
  if (!result && activeTheme.file && iconDefinitions[activeTheme.file]) {
    result = iconDefinitions[activeTheme.file];
  }

  // Cache the result
  maintainCacheSize();
  iconCache.set(cacheKey, result);

  return result;
};

/**
 * Get icon for a folder based on the active theme
 * Uses caching for O(1) repeated lookups
 */
export const getFolderIcon = (folderName: string, isExpanded: boolean, isRoot: boolean = false): IconDefinition | null => {
  const activeTheme = state.activeThemeId ? state.themes.get(state.activeThemeId) : null;
  if (!activeTheme) return null;

  // Check cache first
  const cacheKey = `folder:${state.activeThemeId}:${folderName.toLowerCase()}:${isExpanded}:${isRoot}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const { iconDefinitions } = activeTheme;
  let iconId: string | undefined;
  let result: IconDefinition | null = null;

  // 1. Check root folder name match (if this is a root folder)
  if (isRoot) {
    const rootFolderMap = isExpanded ? activeTheme.rootFolderNamesExpanded : activeTheme.rootFolderNames;
    if (rootFolderMap) {
      iconId = rootFolderMap[folderName.toLowerCase()];
      if (iconId && iconDefinitions[iconId]) {
        result = iconDefinitions[iconId];
      }
    }

    // Fall back to root folder default
    if (!result) {
      iconId = isExpanded ? activeTheme.rootFolderExpanded : activeTheme.rootFolder;
      if (iconId && iconDefinitions[iconId]) {
        result = iconDefinitions[iconId];
      }
    }
  }

  // 2. Check regular folder name match
  if (!result) {
    const folderMap = isExpanded ? activeTheme.folderNamesExpanded : activeTheme.folderNames;
    if (folderMap) {
      iconId = folderMap[folderName.toLowerCase()];
      if (iconId && iconDefinitions[iconId]) {
        result = iconDefinitions[iconId];
      }
    }
  }

  // 3. Fall back to default folder icon
  if (!result) {
    iconId = isExpanded ? activeTheme.folderExpanded : activeTheme.folder;
    if (iconId && iconDefinitions[iconId]) {
      result = iconDefinitions[iconId];
    }
  }

  // Cache the result
  maintainCacheSize();
  iconCache.set(cacheKey, result);

  return result;
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

  // Clear the icon cache when theme changes
  iconCache.clear();

  setState({
    ...state,
    activeThemeId: themeId,
  });

  // Save user preference
  if (savePreference) {
    try {
      const { setIconThemeId } = await import('./settingsStore');
      await setIconThemeId(themeId);
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
