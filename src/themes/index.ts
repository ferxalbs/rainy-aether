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

  // Extension metadata (for themes loaded from extensions)
  /** Theme source: built-in or from extension */
  source?: 'builtin' | 'extension';
  /** Extension ID (publisher.name) if from extension */
  extensionId?: string;
  /** Extension display label if from extension */
  extensionLabel?: string;
  /** Monaco Editor theme ID (sanitized name for Monaco) */
  monacoThemeId?: string;

  // VS Code compatibility (preserve original theme data)
  /** Original VS Code colors object (for Monaco integration) */
  vsCodeColors?: Record<string, string>;
  /** Original VS Code tokenColors (for syntax highlighting) */
  vsCodeTokenColors?: any[] | string;
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
    '--diff-hunk': '#3b82f6',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#f59e0b',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#d97706',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#3b82f6',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#2563eb',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#10b981',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#d1d5db'
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
    '--diff-hunk': '#60a5fa',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#ef4444',
    '--statusBarItem-warningForeground': '#ffffff',
    '--statusBarItem-warningBackground': '#d97706',
    '--statusBarItem-warningHoverForeground': '#ffffff',
    '--statusBarItem-warningHoverBackground': '#f59e0b',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#2563eb',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#3b82f6',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#059669',
    '--statusBarItem-offlineForeground': '#666666',
    '--statusBarItem-offlineBackground': '#4b5563'
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
    '--diff-hunk': '#a855f7',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#f59e0b',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#d97706',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#a855f7',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#9333ea',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#10b981',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#d1d5db'
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
    '--diff-hunk': '#c084fc',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#ef4444',
    '--statusBarItem-warningForeground': '#ffffff',
    '--statusBarItem-warningBackground': '#d97706',
    '--statusBarItem-warningHoverForeground': '#ffffff',
    '--statusBarItem-warningHoverBackground': '#f59e0b',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#9333ea',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#a855f7',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#059669',
    '--statusBarItem-offlineForeground': '#666666',
    '--statusBarItem-offlineBackground': '#4b5563'
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
    '--diff-hunk': '#2563eb',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#f59e0b',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#d97706',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#2563eb',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#1d4ed8',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#10b981',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#d1d5db'
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
    '--diff-hunk': '#3b82f6',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#f59e0b',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#d97706',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#2563eb',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#1d4ed8',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#10b981',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#cbd5e1'
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
    '--diff-hunk': '#66d9ef',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#f92672',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#e81f5f',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#e6db74',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#ddd354',
    '--statusBarItem-prominentForeground': '#000000',
    '--statusBarItem-prominentBackground': '#66d9ef',
    '--statusBarItem-prominentHoverForeground': '#000000',
    '--statusBarItem-prominentHoverBackground': '#53cbe9',
    '--statusBarItem-remoteForeground': '#000000',
    '--statusBarItem-remoteBackground': '#a6e22e',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#d1d5db'
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
    '--diff-hunk': '#66d9ef',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#f92672',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#ff4081',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#e6db74',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#f1e78e',
    '--statusBarItem-prominentForeground': '#000000',
    '--statusBarItem-prominentBackground': '#66d9ef',
    '--statusBarItem-prominentHoverForeground': '#000000',
    '--statusBarItem-prominentHoverBackground': '#7fddee',
    '--statusBarItem-remoteForeground': '#000000',
    '--statusBarItem-remoteBackground': '#a6e22e',
    '--statusBarItem-offlineForeground': '#666666',
    '--statusBarItem-offlineBackground': '#49483e'
  }
};

// Aurora Theme (Cool, focus-friendly palette)
export const auroraDayTheme: Theme = {
  name: 'aurora-day',
  mode: 'day',
  displayName: 'Aurora (Day)',
  variables: {
    '--bg-primary': '#f0f9ff',
    '--bg-secondary': '#e0f2fe',
    '--bg-tertiary': '#bae6fd',
    '--bg-sidebar': '#f8fafc',
    '--bg-editor': '#e0f2fe',
    '--bg-status': '#dbeafe',
    '--text-primary': '#0f172a',
    '--text-secondary': '#1e293b',
    '--text-editor': '#0f172a',
    '--accent-primary': '#0284c7',
    '--accent-secondary': '#0ea5e9',
    '--border-color': '#bfdbfe',
    '--diff-added': '#15803d',
    '--diff-removed': '#dc2626',
    '--diff-hunk': '#0ea5e9',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#f59e0b',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#d97706',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#0284c7',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#0369a1',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#15803d',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#bfdbfe'
  }
};

export const auroraNightTheme: Theme = {
  name: 'aurora-night',
  mode: 'night',
  displayName: 'Aurora (Night)',
  variables: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--bg-sidebar': '#0f172a',
    '--bg-editor': '#1e293b',
    '--bg-status': '#1e293b',
    '--text-primary': '#e2e8f0',
    '--text-secondary': '#cbd5f5',
    '--text-editor': '#e0f2fe',
    '--accent-primary': '#38bdf8',
    '--accent-secondary': '#22d3ee',
    '--border-color': '#334155',
    '--diff-added': '#22c55e',
    '--diff-removed': '#f87171',
    '--diff-hunk': '#38bdf8',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#ef4444',
    '--statusBarItem-warningForeground': '#ffffff',
    '--statusBarItem-warningBackground': '#d97706',
    '--statusBarItem-warningHoverForeground': '#ffffff',
    '--statusBarItem-warningHoverBackground': '#f59e0b',
    '--statusBarItem-prominentForeground': '#000000',
    '--statusBarItem-prominentBackground': '#38bdf8',
    '--statusBarItem-prominentHoverForeground': '#000000',
    '--statusBarItem-prominentHoverBackground': '#7dd3fc',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#16a34a',
    '--statusBarItem-offlineForeground': '#666666',
    '--statusBarItem-offlineBackground': '#334155'
  }
};

// Ember Theme (Warm, high-focus palette)
export const emberDayTheme: Theme = {
  name: 'ember-day',
  mode: 'day',
  displayName: 'Ember (Day)',
  variables: {
    '--bg-primary': '#fff7ed',
    '--bg-secondary': '#ffedd5',
    '--bg-tertiary': '#fed7aa',
    '--bg-sidebar': '#fff7ed',
    '--bg-editor': '#fffbeb',
    '--bg-status': '#fde68a',
    '--text-primary': '#431407',
    '--text-secondary': '#9a3412',
    '--text-editor': '#431407',
    '--accent-primary': '#f97316',
    '--accent-secondary': '#fbbf24',
    '--border-color': '#fcd34d',
    '--diff-added': '#16a34a',
    '--diff-removed': '#dc2626',
    '--diff-hunk': '#f97316',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(0, 0, 0, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(0, 0, 0, 0.09)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#b91c1c',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#fbbf24',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#f59e0b',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#f97316',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#ea580c',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#16a34a',
    '--statusBarItem-offlineForeground': '#999999',
    '--statusBarItem-offlineBackground': '#fcd34d'
  }
};

export const emberNightTheme: Theme = {
  name: 'ember-night',
  mode: 'night',
  displayName: 'Ember (Night)',
  variables: {
    '--bg-primary': '#1c1917',
    '--bg-secondary': '#292524',
    '--bg-tertiary': '#3f3f46',
    '--bg-sidebar': '#1c1917',
    '--bg-editor': '#292524',
    '--bg-status': '#292524',
    '--text-primary': '#fef3c7',
    '--text-secondary': '#fde68a',
    '--text-editor': '#fef3c7',
    '--accent-primary': '#fb923c',
    '--accent-secondary': '#facc15',
    '--border-color': '#4a3526',
    '--diff-added': '#22c55e',
    '--diff-removed': '#f87171',
    '--diff-hunk': '#fb923c',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#dc2626',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#ef4444',
    '--statusBarItem-warningForeground': '#000000',
    '--statusBarItem-warningBackground': '#facc15',
    '--statusBarItem-warningHoverForeground': '#000000',
    '--statusBarItem-warningHoverBackground': '#fde047',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#fb923c',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#f97316',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#16a34a',
    '--statusBarItem-offlineForeground': '#666666',
    '--statusBarItem-offlineBackground': '#4a3526'
  }
};

// Dracula Theme (Official Palette)
export const draculaTheme: Theme = {
  name: 'dracula',
  mode: 'night',
  displayName: 'Dracula',
  variables: {
    '--bg-primary': '#282a36',
    '--bg-secondary': '#282a36', // Sidebar matches editor for seamless look
    '--bg-tertiary': '#44475a',
    '--bg-sidebar': '#282a36',
    '--bg-editor': '#282a36',
    '--bg-status': '#191a21', // Darker status bar
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#6272a4',
    '--text-editor': '#f8f8f2',
    '--accent-primary': '#bd93f9', // Purple
    '--accent-secondary': '#ff79c6', // Pink
    '--border-color': '#44475a',
    '--diff-added': '#50fa7b',
    '--diff-removed': '#ff5555',
    '--diff-hunk': '#bd93f9',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#f8f8f2',
    '--statusBarItem-errorBackground': '#ff5555',
    '--statusBarItem-errorHoverForeground': '#f8f8f2',
    '--statusBarItem-errorHoverBackground': '#ff6e6e',
    '--statusBarItem-warningForeground': '#282a36',
    '--statusBarItem-warningBackground': '#f1fa8c',
    '--statusBarItem-warningHoverForeground': '#282a36',
    '--statusBarItem-warningHoverBackground': '#ffffa5',
    '--statusBarItem-prominentForeground': '#282a36',
    '--statusBarItem-prominentBackground': '#bd93f9',
    '--statusBarItem-prominentHoverForeground': '#282a36',
    '--statusBarItem-prominentHoverBackground': '#d6acff',
    '--statusBarItem-remoteForeground': '#282a36',
    '--statusBarItem-remoteBackground': '#50fa7b',
    '--statusBarItem-offlineForeground': '#6272a4',
    '--statusBarItem-offlineBackground': '#21222c'
  },
  // Custom Monaco rules for Dracula
  vsCodeTokenColors: [
    { scope: ['comment'], settings: { foreground: '#6272a4', fontStyle: 'italic' } },
    { scope: ['string'], settings: { foreground: '#f1fa8c' } },
    { scope: ['constant.numeric'], settings: { foreground: '#bd93f9' } },
    { scope: ['keyword', 'storage', 'variable.language'], settings: { foreground: '#ff79c6', fontStyle: 'bold' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#50fa7b' } },
    { scope: ['entity.name.type', 'support.class', 'support.type'], settings: { foreground: '#8be9fd', fontStyle: 'italic' } },
    { scope: ['variable.parameter'], settings: { foreground: '#ffb86c', fontStyle: 'italic' } },
    { scope: ['variable.other'], settings: { foreground: '#f8f8f2' } },
    { scope: ['markup.heading'], settings: { foreground: '#bd93f9', fontStyle: 'bold' } },
    { scope: ['markup.link'], settings: { foreground: '#8be9fd' } }
  ]
};

// One Dark Pro (Atom-inspired)
export const oneDarkProTheme: Theme = {
  name: 'onedark',
  mode: 'night',
  displayName: 'One Dark Pro',
  variables: {
    '--bg-primary': '#282c34',
    '--bg-secondary': '#21252b',
    '--bg-tertiary': '#2c313a',
    '--bg-sidebar': '#21252b',
    '--bg-editor': '#282c34',
    '--bg-status': '#21252b',
    '--text-primary': '#abb2bf',
    '--text-secondary': '#5c6370',
    '--text-editor': '#abb2bf',
    '--accent-primary': '#61afef', // Blue
    '--accent-secondary': '#c678dd', // Purple
    '--border-color': '#181a1f',
    '--diff-added': '#98c379',
    '--diff-removed': '#e06c75',
    '--diff-hunk': '#61afef',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(255, 255, 255, 0.18)',
    '--statusBarItem-hoverBackground': 'rgba(255, 255, 255, 0.12)',
    '--statusBarItem-errorForeground': '#ffffff',
    '--statusBarItem-errorBackground': '#e06c75',
    '--statusBarItem-errorHoverForeground': '#ffffff',
    '--statusBarItem-errorHoverBackground': '#e55561',
    '--statusBarItem-warningForeground': '#282c34',
    '--statusBarItem-warningBackground': '#e5c07b',
    '--statusBarItem-warningHoverForeground': '#282c34',
    '--statusBarItem-warningHoverBackground': '#d19a66',
    '--statusBarItem-prominentForeground': '#282c34',
    '--statusBarItem-prominentBackground': '#61afef',
    '--statusBarItem-prominentHoverForeground': '#282c34',
    '--statusBarItem-prominentHoverBackground': '#4fa6ed',
    '--statusBarItem-remoteForeground': '#282c34',
    '--statusBarItem-remoteBackground': '#98c379',
    '--statusBarItem-offlineForeground': '#5c6370',
    '--statusBarItem-offlineBackground': '#21252b'
  },
  vsCodeTokenColors: [
    { scope: ['comment'], settings: { foreground: '#5c6370', fontStyle: 'italic' } },
    { scope: ['string'], settings: { foreground: '#98c379' } },
    { scope: ['constant.numeric'], settings: { foreground: '#d19a66' } },
    { scope: ['keyword'], settings: { foreground: '#c678dd' } },
    { scope: ['entity.name.function'], settings: { foreground: '#61afef' } },
    { scope: ['entity.name.type'], settings: { foreground: '#e5c07b' } },
    { scope: ['variable'], settings: { foreground: '#e06c75' } }
  ]
};

// GitHub Dark Dimmed
export const githubDarkDimmedTheme: Theme = {
  name: 'github-dimmed',
  mode: 'night',
  displayName: 'GitHub Dark Dimmed',
  variables: {
    '--bg-primary': '#22272e',
    '--bg-secondary': '#1c2128',
    '--bg-tertiary': '#2d333b',
    '--bg-sidebar': '#1c2128',
    '--bg-editor': '#22272e',
    '--bg-status': '#22272e',
    '--text-primary': '#adbac7',
    '--text-secondary': '#768390',
    '--text-editor': '#adbac7',
    '--accent-primary': '#539bf5',
    '--accent-secondary': '#3fb950',
    '--border-color': '#444c56',
    '--diff-added': '#57ab5a',
    '--diff-removed': '#e5534b',
    '--diff-hunk': '#539bf5',
    // StatusBar Item colors
    '--statusBarItem-activeBackground': 'rgba(173, 186, 199, 0.12)',
    '--statusBarItem-hoverBackground': 'rgba(173, 186, 199, 0.08)',
    '--statusBarItem-errorForeground': '#cdd9e5',
    '--statusBarItem-errorBackground': '#c93c37',
    '--statusBarItem-errorHoverForeground': '#cdd9e5',
    '--statusBarItem-errorHoverBackground': '#b62c24',
    '--statusBarItem-warningForeground': '#22272e',
    '--statusBarItem-warningBackground': '#d29922',
    '--statusBarItem-warningHoverForeground': '#22272e',
    '--statusBarItem-warningHoverBackground': '#ac7b15',
    '--statusBarItem-prominentForeground': '#ffffff',
    '--statusBarItem-prominentBackground': '#316dca',
    '--statusBarItem-prominentHoverForeground': '#ffffff',
    '--statusBarItem-prominentHoverBackground': '#255ab2',
    '--statusBarItem-remoteForeground': '#ffffff',
    '--statusBarItem-remoteBackground': '#46954a',
    '--statusBarItem-offlineForeground': '#636e7b',
    '--statusBarItem-offlineBackground': '#2d333b'
  },
  vsCodeTokenColors: [
    { scope: ['comment'], settings: { foreground: '#768390' } },
    { scope: ['string'], settings: { foreground: '#96d0ff' } },
    { scope: ['keyword'], settings: { foreground: '#f47067' } },
    { scope: ['entity.name.function'], settings: { foreground: '#dcbdfb' } },
    { scope: ['entity.name.type'], settings: { foreground: '#dcbdfb' } }
  ]
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
  enhanceThemeWithValidation(monokaiNightTheme),
  enhanceThemeWithValidation(auroraDayTheme),
  enhanceThemeWithValidation(auroraNightTheme),
  enhanceThemeWithValidation(emberDayTheme),
  enhanceThemeWithValidation(emberNightTheme),
  // Premium Themes
  enhanceThemeWithValidation(draculaTheme),
  enhanceThemeWithValidation(oneDarkProTheme),
  enhanceThemeWithValidation(githubDarkDimmedTheme)
];

// Validate theme consistency across pairs
const themePairs: Array<[Theme, Theme]> = [
  [navyDayTheme, navyNightTheme],
  [darkDayTheme, darkNightTheme],
  [lightDayTheme, lightNightTheme],
  [monokaiDayTheme, monokaiNightTheme],
  [auroraDayTheme, auroraNightTheme],
  [emberDayTheme, emberNightTheme]
];

for (const [dayTheme, nightTheme] of themePairs) {
  const consistency = validateThemeConsistency(dayTheme.variables, nightTheme.variables);
  if (!consistency.isConsistent) {
    console.warn(`Theme consistency issues detected for ${dayTheme.name}/${nightTheme.name}:`, consistency.issues);
  }
}

// Default theme (Dracula is a better default for developers)
export const defaultTheme = enhanceThemeWithValidation(draculaTheme);
