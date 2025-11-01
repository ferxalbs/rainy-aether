import { useSyncExternalStore } from 'react';
import { defaultTheme, Theme, allThemes } from '../themes';
import { saveToStore, loadFromStore } from './app-store';
import { validateThemeAccessibility } from '../themes/themeValidator';
import {
  detectSystemTheme,
  systemThemeToAppTheme,
  onSystemThemeChange,
  SystemTheme
} from '../utils/systemTheme';
import { getThemeStatistics } from './themeManager';

const THEME_STORAGE_KEY = 'rainy-coder-theme';
const THEME_PREF_STORAGE_KEY = 'rainy-coder-theme-preference';
const THEME_BASE_STORAGE_KEY = 'rainy-coder-theme-base';

const defaultBaseThemeName = defaultTheme.name.split('-')[0];

// Unified theme mode: system (follow OS), day, night
export type ThemeMode = 'system' | 'day' | 'night';

interface ThemeState {
  currentTheme: Theme;
  baseTheme: string;
  systemTheme: 'day' | 'night';
  userPreference: ThemeMode;
  isInitialized: boolean;
}

const initialState: ThemeState = {
  currentTheme: defaultTheme,
  baseTheme: defaultBaseThemeName,
  systemTheme: 'day',
  userPreference: 'system',
  isInitialized: false,
};

const themeState: ThemeState = { ...initialState };

type ThemeStateListener = () => void;

const themeStateListeners = new Set<ThemeStateListener>();

const themeListeners = new Set<(theme: Theme) => void>();

const notifyStateListeners = () => {
  themeStateListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Theme state listener error:', error);
    }
  });
};

const notifyThemeListeners = (theme: Theme) => {
  themeListeners.forEach((listener) => {
    try {
      listener(theme);
    } catch (error) {
      console.error('Theme listener error:', error);
    }
  });
};

const getBaseThemeName = (theme: Theme | undefined) =>
  theme ? theme.name.split('-')[0] : defaultBaseThemeName;

const persistThemeSelection = (baseName: string, themeName: string, persistVariant: boolean) => {
  void saveToStore(THEME_BASE_STORAGE_KEY, baseName);
  if (persistVariant) {
    void saveToStore(THEME_STORAGE_KEY, themeName);
  }
};

const updateThemeState = (partial: Partial<ThemeState>) => {
  Object.assign(themeState, partial);
  notifyStateListeners();
};

export const subscribeToThemeState = (listener: ThemeStateListener) => {
  themeStateListeners.add(listener);
  return () => {
    themeStateListeners.delete(listener);
  };
};

export const subscribeToThemeChanges = (listener: (theme: Theme) => void) => {
  themeListeners.add(listener);
  listener(themeState.currentTheme);
  return () => {
    themeListeners.delete(listener);
  };
};

const getThemeSnapshot = () => themeState;

export const useThemeState = () =>
  useSyncExternalStore(subscribeToThemeState, getThemeSnapshot, getThemeSnapshot);

export { themeState };

// Actions
interface SetCurrentThemeOptions {
  persistVariant?: boolean;
}

export const setCurrentTheme = (theme: Theme, options: SetCurrentThemeOptions = {}) => {
  // Validate theme accessibility before applying
  const validation = validateThemeAccessibility(theme.variables);
  if (!validation.isWCAGAACompliant) {
    console.warn(`Theme "${theme.displayName}" fails WCAG AA accessibility standards:`, validation.issues);
  }

  const baseName = getBaseThemeName(theme);
  const persistVariant = options.persistVariant ?? themeState.userPreference !== 'system';

  updateThemeState({ currentTheme: theme, baseTheme: baseName });
  applyTheme(theme);
  persistThemeSelection(baseName, theme.name, persistVariant);
  notifyThemeListeners(theme);
};

export const setUserPreference = async (preference: ThemeMode) => {
  updateThemeState({ userPreference: preference });
  await saveToStore(THEME_PREF_STORAGE_KEY, preference);

  // Apply the preference immediately
  if (preference === 'system') {
    try {
      const systemTheme = await detectSystemTheme();
      const systemMode = systemThemeToAppTheme(systemTheme);
      updateThemeState({ systemTheme: systemMode });
      applySystemTheme();
    } catch (error) {
      console.error('Failed to detect system theme for system mode:', error);
      applySystemTheme();
    }
  } else {
    const activeBase = themeState.baseTheme || getBaseThemeName(themeState.currentTheme);
    const candidateNames = [
      `${activeBase}-${preference}`,
      `${defaultBaseThemeName}-${preference}`
    ];

    let newTheme = candidateNames
      .map(name => allThemes.find(t => t.name === name))
      .find((themeCandidate): themeCandidate is Theme => Boolean(themeCandidate));

    if (!newTheme) {
      newTheme = allThemes.find(t => t.mode === preference);
    }

    if (newTheme) {
      setCurrentTheme(newTheme, { persistVariant: true });
    }
  }
};

const applySystemTheme = () => {
  if (themeState.userPreference !== 'system') {
    return;
  }

  const activeBase = themeState.baseTheme || getBaseThemeName(themeState.currentTheme);
  const candidateNames = [
    `${activeBase}-${themeState.systemTheme}`,
    `${defaultBaseThemeName}-${themeState.systemTheme}`
  ];

  let newTheme = candidateNames
    .map(name => allThemes.find(t => t.name === name))
    .find((themeCandidate): themeCandidate is Theme => Boolean(themeCandidate));

  if (!newTheme) {
    newTheme = allThemes.find(t => t.mode === themeState.systemTheme);
  }

  if (newTheme) {
    setCurrentTheme(newTheme, { persistVariant: false });
  }
};

export const toggleDayNight = async () => {
  // Toggle user preference, not just the current theme, for consistency
  const newPref: ThemeMode = themeState.currentTheme.mode === 'day' ? 'night' : 'day';
  await setUserPreference(newPref);
};

export const switchBaseTheme = (baseName: string, mode: 'day' | 'night' = 'day') => {
  const targetMode = themeState.userPreference === 'system' ? themeState.systemTheme : mode;
  const newTheme = allThemes.find(t => t.name === `${baseName}-${targetMode}`);
  if (newTheme) {
    const persistVariant = themeState.userPreference !== 'system';
    setCurrentTheme(newTheme, { persistVariant });
  }
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  // Apply theme variables
  Object.entries(theme.variables).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });

  // Helper: convert hex (#rrggbb) to H S L string (e.g., "210 40% 98%")
  const hexToHslStr = (hex: string): string => {
    // strip #
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.substring(0, 2), 16) / 255;
    const g = parseInt(normalized.substring(2, 4), 16) / 255;
    const b = parseInt(normalized.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    const H = Math.round(h * 360);
    const S = Math.round(s * 100);
    const L = Math.round(l * 100);
    return `${H} ${S}% ${L}%`;
  };

  // Map our CSS variables to Tailwind v4 tokens used by UI components
  const bgPrimary = theme.variables['--bg-primary'];
  const bgSecondary = theme.variables['--bg-secondary'];
  const bgTertiary = theme.variables['--bg-tertiary'];
  const textPrimary = theme.variables['--text-primary'];
  const textSecondary = theme.variables['--text-secondary'];
  const accentPrimary = theme.variables['--accent-primary'];
  const accentSecondary = theme.variables['--accent-secondary'];
  const borderColor = theme.variables['--border-color'];

  if (bgPrimary && textPrimary && bgSecondary && bgTertiary && accentPrimary && borderColor) {
    // Base surfaces and text
    root.style.setProperty('--background', hexToHslStr(bgPrimary));
    root.style.setProperty('--foreground', hexToHslStr(textPrimary));
    root.style.setProperty('--card', hexToHslStr(bgSecondary));
    root.style.setProperty('--card-foreground', hexToHslStr(textPrimary));
    root.style.setProperty('--popover', hexToHslStr(bgSecondary));
    root.style.setProperty('--popover-foreground', hexToHslStr(textPrimary));

    // Primary/secondary accents
    root.style.setProperty('--primary', hexToHslStr(accentPrimary));
    root.style.setProperty('--primary-foreground', hexToHslStr(bgPrimary));
    root.style.setProperty('--secondary', hexToHslStr(bgTertiary));
    root.style.setProperty('--secondary-foreground', hexToHslStr(textPrimary));

    // Muted + accent util tokens
    root.style.setProperty('--muted', hexToHslStr(bgSecondary));
    root.style.setProperty('--muted-foreground', hexToHslStr(textSecondary || textPrimary));
    root.style.setProperty('--accent', hexToHslStr(accentSecondary || accentPrimary));
    root.style.setProperty('--accent-foreground', hexToHslStr(bgPrimary));

    // Feedback + controls
    // Keep destructive consistent; can be adjusted later for accessibility
    root.style.setProperty('--destructive', '0 84% 60%');
    root.style.setProperty('--destructive-foreground', '210 40% 98%');

    // Borders, inputs, rings
    root.style.setProperty('--border', hexToHslStr(borderColor));
    root.style.setProperty('--input', hexToHslStr(borderColor));
    root.style.setProperty('--ring', hexToHslStr(accentPrimary));

    // Sidebar-specific variables (map to IDE theme colors)
    const bgSidebar = theme.variables['--bg-sidebar'] || bgPrimary;
    root.style.setProperty('--sidebar', hexToHslStr(bgSidebar));
    root.style.setProperty('--sidebar-foreground', hexToHslStr(textPrimary));
    root.style.setProperty('--sidebar-primary', hexToHslStr(accentPrimary));
    root.style.setProperty('--sidebar-primary-foreground', hexToHslStr(bgPrimary));
    root.style.setProperty('--sidebar-accent', hexToHslStr(bgTertiary));
    root.style.setProperty('--sidebar-accent-foreground', hexToHslStr(textPrimary));
    root.style.setProperty('--sidebar-border', hexToHslStr(borderColor));
    root.style.setProperty('--sidebar-ring', hexToHslStr(accentPrimary));
  }

  // Remove data-theme attribute to avoid conflicts
  root.removeAttribute('data-theme');
};

// Initialize theme
export const initializeTheme = async () => {
  try {
    // Log theme statistics for monitoring
    const stats = getThemeStatistics();
    console.log('Theme system initialized:', stats);

    // Load saved user preference
    const rawPreference = await loadFromStore<string>(THEME_PREF_STORAGE_KEY, 'system');
    // Map legacy values ('auto'|'light'|'dark') to unified ('system'|'day'|'night')
    const savedPreference: ThemeMode =
      rawPreference === 'auto' ? 'system' :
      rawPreference === 'light' ? 'day' :
      rawPreference === 'dark' ? 'night' :
      (['system','day','night'].includes(rawPreference) ? (rawPreference as ThemeMode) : 'system');

    // Detect system theme using our utility
    const systemTheme = await detectSystemTheme();
    const systemMode = systemThemeToAppTheme(systemTheme);

    const savedBaseTheme = await loadFromStore<string>(THEME_BASE_STORAGE_KEY, defaultBaseThemeName);

    updateThemeState({
      baseTheme: savedBaseTheme,
      systemTheme: systemMode,
      userPreference: savedPreference
    });

    if (savedPreference === 'system') {
      const candidateNames = [
        `${savedBaseTheme}-${systemMode}`,
        `${defaultBaseThemeName}-${systemMode}`
      ];

      let themeToApply = candidateNames
        .map(name => allThemes.find(t => t.name === name))
        .find((themeCandidate): themeCandidate is Theme => Boolean(themeCandidate));

      if (!themeToApply) {
        themeToApply = allThemes.find(t => t.mode === systemMode) || defaultTheme;
      }

      setCurrentTheme(themeToApply, { persistVariant: false });
    } else {
      const savedThemeName = await loadFromStore<string | null>(THEME_STORAGE_KEY, null);
      const candidateNames: string[] = [];

      if (savedThemeName) {
        candidateNames.push(savedThemeName);
      }

      candidateNames.push(
        `${savedBaseTheme}-${savedPreference}`,
        `${defaultBaseThemeName}-${savedPreference}`
      );

      let themeToApply = candidateNames
        .map(name => allThemes.find(t => t && t.name === name))
        .find((themeCandidate): themeCandidate is Theme => Boolean(themeCandidate));

      if (!themeToApply) {
        themeToApply = allThemes.find(t => t.mode === savedPreference) || defaultTheme;
      }

      setCurrentTheme(themeToApply, { persistVariant: true });
    }

    updateThemeState({ isInitialized: true });

    // Listen for system theme changes using our utility
    onSystemThemeChange((newSystemTheme: SystemTheme) => {
      try {
        const newAppTheme = systemThemeToAppTheme(newSystemTheme);
        updateThemeState({ systemTheme: newAppTheme });

        // Only apply system theme changes if user preference is 'system'
        if (themeState.userPreference === 'system') {
          applySystemTheme();
        }
      } catch (error) {
        console.error('Failed to handle system theme change:', error);
      }
    });
  } catch (error) {
    console.error('Failed to initialize theme:', error);
    // Fallback to default theme
    setCurrentTheme(defaultTheme, { persistVariant: false });
    updateThemeState({ isInitialized: true });
  }
};

// Utility functions
export const getCurrentTheme = () => themeState.currentTheme;
export const getAvailableThemes = () => allThemes;
export const isDayMode = () => themeState.currentTheme.mode === 'day';
export const isNightMode = () => themeState.currentTheme.mode === 'night';
export const getUserPreference = () => themeState.userPreference;
export const getSystemTheme = () => themeState.systemTheme;
export const isThemeInitialized = () => themeState.isInitialized;
