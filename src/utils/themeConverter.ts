/**
 * VS Code Theme to Rainy Aether Theme Converter
 *
 * Converts VS Code color themes (200+ tokens) to Rainy Aether themes (15 variables).
 * Maps editor colors, sidebar, status bar, etc. to our CSS variable system.
 */

import { Theme } from '@/themes';
import { VSCodeTheme, VSCodeThemeContribution, VSCodeTokenColor } from '@/types/vscodeTheme';

/**
 * Options for theme conversion
 */
export interface ConversionOptions {
  /** Extension ID (publisher.name) */
  extensionId: string;

  /** Extension display label (optional) */
  extensionLabel?: string;

  /** Preferred theme mode (overrides auto-detection) */
  preferredMode?: 'day' | 'night';

  /** Contribution data from package.json */
  contribution?: VSCodeThemeContribution;
}

/**
 * VS Code color token to Rainy Aether CSS variable mapping
 *
 * Priority order (higher priority first):
 * 1. Direct mapping (exact match)
 * 2. Fallback mapping (alternative tokens)
 * 3. Derived mapping (calculate from other tokens)
 */
const TOKEN_MAPPING: Record<string, {
  /** Primary token to use */
  primary: string;
  /** Fallback tokens (in priority order) */
  fallbacks?: string[];
}> = {
  // Editor background
  '--bg-editor': {
    primary: 'editor.background',
    fallbacks: ['panel.background', 'sideBar.background']
  },

  // Editor text
  '--text-editor': {
    primary: 'editor.foreground',
    fallbacks: ['foreground']
  },

  // Primary UI background
  '--bg-primary': {
    primary: 'sideBar.background',
    fallbacks: ['activityBar.background', 'editor.background']
  },

  // Secondary UI background (darker/lighter than primary)
  '--bg-secondary': {
    primary: 'editorGroupHeader.tabsBackground',
    fallbacks: ['tab.inactiveBackground', 'panel.background', 'sideBar.background']
  },

  // Tertiary UI background (hover states, etc.)
  '--bg-tertiary': {
    primary: 'list.hoverBackground',
    fallbacks: ['list.inactiveSelectionBackground', 'editorGroup.dropBackground']
  },

  // Sidebar background
  '--bg-sidebar': {
    primary: 'sideBar.background',
    fallbacks: ['activityBar.background', 'editor.background']
  },

  // Status bar background
  '--bg-status': {
    primary: 'statusBar.background',
    fallbacks: ['sideBar.background']
  },

  // Primary text color
  '--text-primary': {
    primary: 'sideBar.foreground',
    fallbacks: ['foreground', 'editor.foreground']
  },

  // Secondary text color (dimmer)
  '--text-secondary': {
    primary: 'sideBarSectionHeader.foreground',
    fallbacks: ['tab.inactiveForeground', 'sideBar.foreground']
  },

  // Primary accent color
  '--accent-primary': {
    primary: 'activityBarBadge.background',
    fallbacks: ['button.background', 'focusBorder', 'progressBar.background']
  },

  // Secondary accent color
  '--accent-secondary': {
    primary: 'button.hoverBackground',
    fallbacks: ['list.highlightForeground', 'activityBarBadge.background']
  },

  // Border color
  '--border-color': {
    primary: 'panel.border',
    fallbacks: ['editorGroup.border', 'sideBar.border', 'contrastBorder']
  },

  // Git added/inserted color
  '--diff-added': {
    primary: 'gitDecoration.addedResourceForeground',
    fallbacks: ['diffEditor.insertedTextBackground', 'terminal.ansiGreen']
  },

  // Git removed/deleted color
  '--diff-removed': {
    primary: 'gitDecoration.deletedResourceForeground',
    fallbacks: ['diffEditor.removedTextBackground', 'terminal.ansiRed']
  },

  // Git modified/hunk color
  '--diff-hunk': {
    primary: 'gitDecoration.modifiedResourceForeground',
    fallbacks: ['diffEditor.border', 'activityBarBadge.background']
  },
};

/**
 * Convert VS Code theme to Rainy Aether theme
 */
export function convertVSCodeThemeToRainy(
  vsCodeTheme: VSCodeTheme,
  options: ConversionOptions
): Theme {
  const colors = vsCodeTheme.colors || {};

  // Build Rainy Aether variables
  const variables: Record<string, string> = {};

  // Map each Rainy variable to VS Code tokens
  for (const [rainyVar, mapping] of Object.entries(TOKEN_MAPPING)) {
    const color = resolveColor(colors, mapping.primary, mapping.fallbacks);
    if (color) {
      variables[rainyVar] = color;
    }
  }

  // Fill in any missing variables with intelligent defaults
  fillMissingVariables(variables, colors);

  // Infer theme mode
  const mode = options.preferredMode || inferThemeMode(vsCodeTheme, options.contribution);

  // Generate unique theme name
  const themeName = generateThemeName(vsCodeTheme, options);

  // Create Rainy theme
  const theme: Theme = {
    name: themeName,
    mode,
    displayName: vsCodeTheme.name || options.contribution?.label || 'Extension Theme',
    variables,

    // Extension metadata
    source: 'extension',
    extensionId: options.extensionId,
    extensionLabel: options.extensionLabel,

    // Preserve original VS Code data (for Monaco integration)
    vsCodeColors: vsCodeTheme.colors,
    vsCodeTokenColors: vsCodeTheme.tokenColors,
  };

  return theme;
}

/**
 * Resolve color from primary token or fallbacks
 */
function resolveColor(
  colors: Record<string, string>,
  primary: string,
  fallbacks?: string[]
): string | null {
  // Try primary token
  if (colors[primary]) {
    return normalizeColor(colors[primary]);
  }

  // Try fallbacks in order
  if (fallbacks) {
    for (const fallback of fallbacks) {
      if (colors[fallback]) {
        return normalizeColor(colors[fallback]);
      }
    }
  }

  return null;
}

/**
 * Normalize color value (handle transparency, etc.)
 */
function normalizeColor(color: string): string {
  // Remove transparency channel if present (take only RGB)
  // Example: #FFFFFF80 -> #FFFFFF
  if (color.match(/^#[0-9A-Fa-f]{8}$/)) {
    return color.substring(0, 7);
  }

  // Handle short hex
  if (color.match(/^#[0-9A-Fa-f]{3}$/)) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return color;
}

/**
 * Fill missing variables with intelligent defaults
 */
function fillMissingVariables(
  variables: Record<string, string>,
  _vsCodeColors: Record<string, string>
): void {
  // Determine if theme is dark or light based on editor background
  const bgColor = variables['--bg-editor'] || variables['--bg-primary'] || '#1e1e1e';
  const isDark = isColorDark(bgColor);

  // Default values for dark themes
  const darkDefaults = {
    '--bg-primary': '#1e1e1e',
    '--bg-secondary': '#252526',
    '--bg-tertiary': '#2d2d2d',
    '--bg-sidebar': '#1e1e1e',
    '--bg-editor': '#1e1e1e',
    '--bg-status': '#007acc',
    '--text-primary': '#cccccc',
    '--text-secondary': '#969696',
    '--text-editor': '#d4d4d4',
    '--accent-primary': '#007acc',
    '--accent-secondary': '#0098ff',
    '--border-color': '#454545',
    '--diff-added': '#487e02',
    '--diff-removed': '#f14c4c',
    '--diff-hunk': '#1b81a8',
  };

  // Default values for light themes
  const lightDefaults = {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f3f3f3',
    '--bg-tertiary': '#e8e8e8',
    '--bg-sidebar': '#ffffff',
    '--bg-editor': '#ffffff',
    '--bg-status': '#007acc',
    '--text-primary': '#000000',
    '--text-secondary': '#6c6c6c',
    '--text-editor': '#000000',
    '--accent-primary': '#007acc',
    '--accent-secondary': '#0098ff',
    '--border-color': '#dddddd',
    '--diff-added': '#008000',
    '--diff-removed': '#ff0000',
    '--diff-hunk': '#007acc',
  };

  const defaults = isDark ? darkDefaults : lightDefaults;

  // Fill in missing variables
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!variables[key]) {
      variables[key] = defaultValue;
    }
  }

  // Ensure all required variables are present
  const requiredVars = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--bg-sidebar',
    '--bg-editor',
    '--bg-status',
    '--text-primary',
    '--text-secondary',
    '--text-editor',
    '--accent-primary',
    '--accent-secondary',
    '--border-color',
    '--diff-added',
    '--diff-removed',
    '--diff-hunk',
  ];

  for (const varName of requiredVars) {
    if (!variables[varName]) {
      console.warn(`[ThemeConverter] Missing variable ${varName}, using default`);
      variables[varName] = (defaults as Record<string, string>)[varName] || '#000000';
    }
  }
}

/**
 * Determine if a color is dark or light
 */
function isColorDark(hexColor: string): boolean {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Dark if luminance < 0.5
  return luminance < 0.5;
}

/**
 * Infer theme mode from VS Code theme data
 */
export function inferThemeMode(
  vsCodeTheme: VSCodeTheme,
  contribution?: VSCodeThemeContribution
): 'day' | 'night' {
  // 1. Check explicit type
  if (vsCodeTheme.type === 'light') {
    return 'day';
  }
  if (vsCodeTheme.type === 'dark' || vsCodeTheme.type === 'hc') {
    return 'night';
  }

  // 2. Check uiTheme from contribution
  if (contribution?.uiTheme === 'vs') {
    return 'day';
  }
  if (contribution?.uiTheme === 'vs-dark' || contribution?.uiTheme === 'hc-black') {
    return 'night';
  }

  // 3. Analyze editor background color
  const bgColor = vsCodeTheme.colors?.['editor.background'];
  if (bgColor) {
    return isColorDark(bgColor) ? 'night' : 'day';
  }

  // 4. Default to night (most themes are dark)
  return 'night';
}

/**
 * Generate unique theme name for Rainy Aether
 */
export function generateThemeName(
  vsCodeTheme: VSCodeTheme,
  options: ConversionOptions
): string {
  // Use extension ID + theme name
  const extensionPart = options.extensionId.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const themeName = (vsCodeTheme.name || options.contribution?.label || 'theme')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return `ext-${extensionPart}-${themeName}`;
}

/**
 * Convert VS Code tokenColors to Monaco format
 * (Used by monacoExtensionHost for syntax highlighting)
 */
export function convertTokenColorsToMonaco(
  tokenColors: VSCodeTokenColor[] | string | undefined
): any[] {
  if (!tokenColors) {
    return [];
  }

  // If it's a string, it references an external file (not supported yet)
  if (typeof tokenColors === 'string') {
    console.warn('[ThemeConverter] TextMate file references not yet supported:', tokenColors);
    return [];
  }

  // Convert VS Code format to Monaco format
  return tokenColors
    .filter(rule => rule.scope && rule.settings)
    .map(rule => {
      const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];

      return {
        token: scopes.join(','),
        foreground: rule.settings.foreground?.replace('#', ''),
        background: rule.settings.background?.replace('#', ''),
        fontStyle: rule.settings.fontStyle || '',
      };
    });
}

/**
 * Validate that all required Rainy variables are present
 */
export function validateThemeVariables(variables: Record<string, string>): {
  valid: boolean;
  missingVariables: string[];
} {
  const requiredVars = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--bg-sidebar',
    '--bg-editor',
    '--bg-status',
    '--text-primary',
    '--text-secondary',
    '--text-editor',
    '--accent-primary',
    '--accent-secondary',
    '--border-color',
    '--diff-added',
    '--diff-removed',
    '--diff-hunk',
  ];

  const missingVariables = requiredVars.filter(varName => !variables[varName]);

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}
