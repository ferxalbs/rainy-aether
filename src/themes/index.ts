import { validateThemeAccessibility, validateThemeConsistency } from './themeValidator';

// Re-export for use in themeManager
export { validateThemeConsistency };

export interface Theme {
  name: string;
  mode: 'day' | 'night';
  displayName: string;
  variables: Record<string, string>;
  contrastRatio?: {
    primaryText: number;
    secondaryText: number;
    editorText: number;
  };
}

// Navy Blue Theme (Default)
export const navyDayTheme: Theme = {
  name: 'navy-day',
  mode: 'day',
  displayName: 'Navy Blue (Day)',
  variables: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#e2e8f0',
    '--bg-sidebar': '#ffffff',
    '--bg-editor': '#ffffff',
    '--bg-status': '#f1f5f9',
    '--text-primary': '#0a1929',
    '--text-secondary': '#334155',
    '--text-editor': '#0a1929',
    '--accent-primary': '#3b82f6',
    '--accent-secondary': '#60a5fa',
    '--border-color': '#e2e8f0',
    '--diff-added': '#16a34a',
    '--diff-removed': '#ef4444',
    '--diff-hunk': '#3b82f6'
  }
};

export const navyNightTheme: Theme = {
  name: 'navy-night',
  mode: 'night',
  displayName: 'Navy Blue (Night)',
  variables: {
    '--bg-primary': '#020617',
    '--bg-secondary': '#0f172a',
    '--bg-tertiary': '#1e293b',
    '--bg-sidebar': '#020617',
    '--bg-editor': '#0f172a',
    '--bg-status': '#0f172a',
    '--text-primary': '#f8fafc',
    '--text-secondary': '#e2e8f0',
    '--text-editor': '#f8fafc',
    '--accent-primary': '#3b82f6',
    '--accent-secondary': '#60a5fa',
    '--border-color': '#1e293b',
    '--diff-added': '#22c55e',
    '--diff-removed': '#f87171',
    '--diff-hunk': '#60a5fa'
  }
};

// Dark Theme
export const darkDayTheme: Theme = {
  name: 'dark-day',
  mode: 'day',
  displayName: 'Dark (Day)',
  variables: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#fafaf9',
    '--bg-tertiary': '#e7e5e4',
    '--bg-sidebar': '#ffffff',
    '--bg-editor': '#ffffff',
    '--bg-status': '#f5f5f4',
    '--text-primary': '#1c1917',
    '--text-secondary': '#3f3f46',
    '--text-editor': '#1c1917',
    '--accent-primary': '#a855f7',
    '--accent-secondary': '#c084fc',
    '--border-color': '#e7e5e4',
    '--diff-added': '#16a34a',
    '--diff-removed': '#ef4444',
    '--diff-hunk': '#a855f7'
  }
};

export const darkNightTheme: Theme = {
  name: 'dark-night',
  mode: 'night',
  displayName: 'Dark (Night)',
  variables: {
    '--bg-primary': '#0c0a09',
    '--bg-secondary': '#1c1917',
    '--bg-tertiary': '#292524',
    '--bg-sidebar': '#0c0a09',
    '--bg-editor': '#1c1917',
    '--bg-status': '#1c1917',
    '--text-primary': '#fafaf9',
    '--text-secondary': '#e7e5e4',
    '--text-editor': '#fafaf9',
    '--accent-primary': '#a855f7',
    '--accent-secondary': '#c084fc',
    '--border-color': '#292524',
    '--diff-added': '#22c55e',
    '--diff-removed': '#f87171',
    '--diff-hunk': '#c084fc'
  }
};

// Light Theme
export const lightDayTheme: Theme = {
  name: 'light-day',
  mode: 'day',
  displayName: 'Light (Day)',
  variables: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--bg-tertiary': '#f1f5f9',
    '--bg-sidebar': '#ffffff',
    '--bg-editor': '#ffffff',
    '--bg-status': '#f1f5f9',
    '--text-primary': '#0f172a',
    '--text-secondary': '#64748b',
    '--text-editor': '#0f172a',
    '--accent-primary': '#2563eb',
    '--accent-secondary': '#3b82f6',
    '--border-color': '#e2e8f0',
    '--diff-added': '#16a34a',
    '--diff-removed': '#ef4444',
    '--diff-hunk': '#2563eb'
  }
};

export const lightNightTheme: Theme = {
  name: 'light-night',
  mode: 'night',
  displayName: 'Light (Night)',
  variables: {
    '--bg-primary': '#f8fafc',
    '--bg-secondary': '#f1f5f9',
    '--bg-tertiary': '#e2e8f0',
    '--bg-sidebar': '#f8fafc',
    '--bg-editor': '#ffffff',
    '--bg-status': '#f1f5f9',
    '--text-primary': '#334155',
    '--text-secondary': '#475569',
    '--text-editor': '#0f172a',
    '--accent-primary': '#2563eb',
    '--accent-secondary': '#3b82f6',
    '--border-color': '#cbd5e1',
    '--diff-added': '#22c55e',
    '--diff-removed': '#f87171',
    '--diff-hunk': '#3b82f6'
  }
};

// Monokai Theme (Inspired by popular editors)
export const monokaiDayTheme: Theme = {
  name: 'monokai-day',
  mode: 'day',
  displayName: 'Monokai (Day)',
  variables: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8f8f2',
    '--bg-tertiary': '#e7e5e4',
    '--bg-sidebar': '#ffffff',
    '--bg-editor': '#f8f8f2',
    '--bg-status': '#f5f5f4',
    '--text-primary': '#2d2a26',
    '--text-secondary': '#49483e',
    '--text-editor': '#2d2a26',
    '--accent-primary': '#66d9ef',
    '--accent-secondary': '#a6e22e',
    '--border-color': '#e7e5e4',
    '--diff-added': '#a6e22e',
    '--diff-removed': '#f92672',
    '--diff-hunk': '#66d9ef'
  }
};

export const monokaiNightTheme: Theme = {
  name: 'monokai-night',
  mode: 'night',
  displayName: 'Monokai (Night)',
  variables: {
    '--bg-primary': '#1e1e1e',
    '--bg-secondary': '#2d2a26',
    '--bg-tertiary': '#49483e',
    '--bg-sidebar': '#1e1e1e',
    '--bg-editor': '#2d2a26',
    '--bg-status': '#2d2a26',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#d6d3d1',
    '--text-editor': '#f8f8f2',
    '--accent-primary': '#66d9ef',
    '--accent-secondary': '#a6e22e',
    '--border-color': '#49483e',
    '--diff-added': '#a6e22e',
    '--diff-removed': '#f92672',
    '--diff-hunk': '#66d9ef'
  }
};

// Validate and enhance themes with contrast ratios
function enhanceThemeWithValidation(theme: Theme): Theme {
  const validation = validateThemeAccessibility(theme.variables);
  return {
    ...theme,
    contrastRatio: validation.contrastRatios
  };
}

// All available themes with validation
export const allThemes: Theme[] = [
  enhanceThemeWithValidation(navyDayTheme),
  enhanceThemeWithValidation(navyNightTheme),
  enhanceThemeWithValidation(darkDayTheme),
  enhanceThemeWithValidation(darkNightTheme),
  enhanceThemeWithValidation(lightDayTheme),
  enhanceThemeWithValidation(lightNightTheme),
  enhanceThemeWithValidation(monokaiDayTheme),
  enhanceThemeWithValidation(monokaiNightTheme)
];

// Validate theme consistency
const consistencyValidation = validateThemeConsistency(
  navyDayTheme.variables,
  navyNightTheme.variables
);

if (!consistencyValidation.isConsistent) {
  console.warn('Theme consistency issues detected:', consistencyValidation.issues);
}

// Default theme
export const defaultTheme = enhanceThemeWithValidation(navyDayTheme);
