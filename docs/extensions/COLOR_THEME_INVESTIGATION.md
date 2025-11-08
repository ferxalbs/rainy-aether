# Color Theme Extension System - Investigation Report

**Date:** 2025-11-08
**Status:** 🔬 Investigation Complete - Ready for Implementation
**Phase:** Extension System Phase 2 (Color Themes)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [VS Code Theme Extension Format](#vs-code-theme-extension-format)
3. [Current Rainy Aether Theme System](#current-rainy-aether-theme-system)
4. [Icon Theme System Analysis](#icon-theme-system-analysis)
5. [Gap Analysis](#gap-analysis)
6. [Implementation Strategy](#implementation-strategy)
7. [Architecture Design](#architecture-design)
8. [Token Mapping Strategy](#token-mapping-strategy)
9. [Integration Plan](#integration-plan)
10. [Testing Strategy](#testing-strategy)
11. [References](#references)

---

## Executive Summary

### Objective

Extend Rainy Aether's extension system to support **VS Code-compatible color themes**, allowing users to install and use popular themes like Monokai Pro, Dracula, One Dark Pro, etc.

### Key Findings

✅ **Extension infrastructure exists** - Icon themes already working via `monacoExtensionHost.ts`
✅ **Partial theme loading implemented** - `loadThemes()` method exists but incomplete
✅ **Monaco integration ready** - `monaco.editor.defineTheme()` already being called
❌ **Missing integration with themeStore** - Extension themes not accessible to UI
❌ **No token conversion** - VS Code colors → Rainy Aether CSS variables mapping needed
❌ **No persistence** - User's extension theme preference not saved

### Recommendation

**Proceed with implementation** following the icon theme pattern established in Phase 1. Estimated effort: 3-5 days.

---

## VS Code Theme Extension Format

### Package.json Structure

VS Code theme extensions use the `contributes.themes` array:

```json
{
  "name": "monokai-pro",
  "displayName": "Monokai Pro",
  "description": "Beautiful functionality for professional developers",
  "version": "1.2.3",
  "publisher": "monokai",
  "engines": {
    "vscode": "^1.89.0"
  },
  "categories": ["Themes"],
  "contributes": {
    "themes": [
      {
        "label": "Monokai Pro",
        "uiTheme": "vs-dark",
        "path": "./themes/monokai-pro-color-theme.json"
      },
      {
        "label": "Monokai Pro (Light)",
        "uiTheme": "vs",
        "path": "./themes/monokai-pro-light-color-theme.json"
      }
    ]
  }
}
```

**Key Properties:**
- `label` - Display name shown to users
- `uiTheme` - Base theme: `"vs"` (light), `"vs-dark"` (dark), or `"hc-black"` (high contrast)
- `path` - Relative path to theme JSON file

### Theme JSON Structure

The theme definition file contains two main sections:

```json
{
  "name": "Monokai Pro",
  "type": "dark",
  "colors": {
    "editor.background": "#2D2A2E",
    "editor.foreground": "#FCFCFA",
    "activityBar.background": "#221F22",
    "activityBar.foreground": "#FCFCFA",
    "sideBar.background": "#221F22",
    "sideBar.foreground": "#FCFCFA",
    "statusBar.background": "#221F22",
    "statusBar.foreground": "#FCFCFA",
    "panel.background": "#2D2A2E",
    "terminal.background": "#2D2A2E",
    "tab.activeBackground": "#2D2A2E",
    "tab.inactiveBackground": "#221F22"
  },
  "tokenColors": [
    {
      "name": "Comment",
      "scope": ["comment", "punctuation.definition.comment"],
      "settings": {
        "foreground": "#727072",
        "fontStyle": "italic"
      }
    },
    {
      "name": "Keyword",
      "scope": ["keyword", "storage.type", "storage.modifier"],
      "settings": {
        "foreground": "#FF6188"
      }
    },
    {
      "name": "String",
      "scope": ["string"],
      "settings": {
        "foreground": "#FFD866"
      }
    }
  ]
}
```

**Section 1: `colors`** (200+ tokens)
- Defines UI element colors (backgrounds, foregrounds, borders)
- Examples: `editor.background`, `sideBar.background`, `statusBar.foreground`
- Full reference: https://code.visualstudio.com/api/references/theme-color

**Section 2: `tokenColors`**
- Defines syntax highlighting colors
- Uses TextMate scopes (e.g., `keyword`, `string`, `comment`)
- Each rule has: `name`, `scope` (array), `settings` (foreground, fontStyle)

### Alternative TokenColors Format

TokenColors can also reference an external TextMate theme:

```json
{
  "colors": { ... },
  "tokenColors": "./Monokai.tmTheme"
}
```

---

## Current Rainy Aether Theme System

### Built-in Theme Architecture

**Location:** `src/themes/index.ts`, `src/stores/themeStore.ts`

**Theme Interface:**
```typescript
interface Theme {
  name: string;                    // e.g., "navy-day"
  mode: 'day' | 'night';
  displayName: string;             // e.g., "Navy Blue (Day)"
  variables: Record<string, string>; // CSS variable mappings
  contrastRatio?: {
    primaryText: number;
    secondaryText: number;
    editorText: number;
  };
}
```

**CSS Variables Used:**
```typescript
{
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
```

### Theme Application Process

**File:** `src/stores/themeStore.ts:265-362`

1. **Set CSS Variables** - Directly apply to `document.documentElement`
2. **Convert to HSL** - Use `hexToHslStr()` for Tailwind v4 compatibility
3. **Map to Tailwind Tokens** - Convert to `--background`, `--foreground`, etc.
4. **Apply to Root** - Update `:root` styles

```typescript
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;

  // Apply theme variables
  Object.entries(theme.variables).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });

  // Map to Tailwind tokens
  root.style.setProperty('--background', hexToHslStr(bgPrimary));
  root.style.setProperty('--foreground', hexToHslStr(textPrimary));
  root.style.setProperty('--primary', hexToHslStr(accentPrimary));
  // ... etc
};
```

### Theme Management

**Actions:**
- `setCurrentTheme(theme, options)` - Apply theme and persist
- `setUserPreference(mode)` - Set day/night/system mode
- `toggleDayNight()` - Switch between day and night
- `switchBaseTheme(baseName)` - Change theme family

**State:**
- `currentTheme` - Active theme object
- `baseTheme` - Theme family (navy, dark, monokai, etc.)
- `userPreference` - "system" | "day" | "night"
- `systemTheme` - Detected OS theme

---

## Icon Theme System Analysis

### Why Study Icon Themes?

Icon themes are **the template** for implementing color themes. Both follow the same pattern:
1. Load from VS Code extensions
2. Parse contribution data
3. Convert to internal format
4. Register with store
5. Auto-activate
6. Persist user preference

### Icon Theme Flow

**File:** `src/services/monacoExtensionHost.ts:357-502`

```typescript
private async loadIconThemes(
  extension: InstalledExtension,
  iconThemes: any[],
  loadedExtension: LoadedExtension
): Promise<void> {
  console.log(`[IconTheme] Extension ${extension.id} provides ${iconThemes.length} icon theme(s)`);

  // Import the icon theme store
  const { iconThemeActions } = await import('@/stores/iconThemeStore');

  for (const iconThemeContrib of iconThemes) {
    // 1. Resolve path to theme JSON
    const themePath = this.resolveExtensionPath(extension, iconThemeContrib.path);

    // 2. Load theme data
    const themeData = await this.loadJsonFile(themePath);

    // 3. Convert icon paths to data URLs
    const iconDefinitions: Record<string, any> = {};
    for (const [iconId, iconDef] of Object.entries(themeData.iconDefinitions)) {
      const iconPath = this.resolveExtensionPath(extension, iconDef.iconPath);
      const iconContent = await invoke<string>('read_extension_file', { path: iconPath });

      // Convert SVG to base64 data URL
      const dataUrl = `data:image/svg+xml;base64,${base64(iconContent)}`;
      iconDefinitions[iconId] = { iconPath: dataUrl };
    }

    // 4. Register with store
    iconThemeActions.registerTheme({
      id: iconThemeContrib.id,
      label: iconThemeContrib.label,
      extensionId: extension.id,
      iconDefinitions,
      fileExtensions: themeData.fileExtensions,
      // ... other mappings
    });

    // 5. Auto-activate
    await iconThemeActions.setActiveTheme(iconThemeContrib.id, true);
  }
}
```

### Key Patterns to Replicate

✅ **Dynamic Import** - `await import('@/stores/iconThemeStore')`
✅ **Path Resolution** - `resolveExtensionPath(extension, relativePath)`
✅ **File Loading** - `loadJsonFile(themePath)` via Tauri
✅ **Data Conversion** - SVG → Base64 (similar: VS Code colors → Rainy variables)
✅ **Store Registration** - `registerTheme()` action
✅ **Auto-Activation** - `setActiveTheme(id, true)`
✅ **Persistence** - Save to settings via `settingsStore`

---

## Gap Analysis

### What Exists ✅

1. **Extension Loading Infrastructure**
   - `monacoExtensionHost.ts` loads extensions
   - `loadThemes()` method exists (lines 269-295)
   - Path resolution works (`resolveExtensionPath`)
   - JSON file loading works (`loadJsonFile`)

2. **Monaco Integration**
   - `monaco.editor.defineTheme()` already called
   - Theme registered with Monaco editor
   - Syntax highlighting works

3. **Built-in Theme System**
   - `themeStore.ts` manages themes
   - Theme application logic exists
   - Tailwind token mapping works

### What's Missing ❌

1. **Color Theme Store**
   - No `colorThemeStore.ts` or extension to `themeStore.ts`
   - Extension themes not tracked separately
   - Can't list available extension themes

2. **Token Conversion**
   - VS Code `colors` → Rainy `variables` mapping not implemented
   - No `convertVSCodeColorsToRainyVariables()` function
   - HSL conversion not applied to extension themes

3. **Store Integration**
   - `loadThemes()` doesn't call any store actions
   - Extension themes not added to `themeStore`
   - No way to select extension theme in UI

4. **Persistence**
   - User's extension theme preference not saved
   - No distinction between built-in and extension themes
   - Theme doesn't persist across restarts

5. **UI Integration**
   - Theme selector doesn't show extension themes
   - No preview for extension themes
   - Can't switch to extension theme

### Current `loadThemes()` Implementation

**File:** `src/services/monacoExtensionHost.ts:269-295`

```typescript
private async loadThemes(
  extension: InstalledExtension,
  themes: any[],
  loadedExtension: LoadedExtension
): Promise<void> {
  for (const theme of themes) {
    try {
      const themePath = this.resolveExtensionPath(extension, theme.path);
      const themeData = await this.loadJsonFile(themePath);

      // Register theme with Monaco
      monaco.editor.defineTheme(theme.id || `theme-${extension.id}`, themeData);

      loadedExtension.disposables.push({
        dispose: () => {
          // Monaco doesn't provide a way to unregister themes
        }
      });

      console.log(`Loaded theme ${theme.label || theme.id} from ${extension.id}`);
    } catch (error) {
      console.warn(`Failed to load theme from ${extension.id}, skipping:`, error);
    }
  }
}
```

**Problems:**
- ❌ Only registers with Monaco (editor syntax highlighting)
- ❌ Doesn't add to Rainy theme system (UI theming)
- ❌ No token conversion
- ❌ No store integration
- ❌ No persistence

---

## Implementation Strategy

### Approach: Extend Existing ThemeStore

**Option 1: Create Separate ColorThemeStore** ❌
- Pros: Clean separation, no breaking changes
- Cons: Duplicate logic, confusing for users (two theme systems)

**Option 2: Extend Existing ThemeStore** ✅ **RECOMMENDED**
- Pros: Unified theme system, single source of truth
- Cons: Need to modify existing code carefully

### Design Decision: Unified Theme System

Treat extension themes as **first-class citizens** alongside built-in themes:

```typescript
interface Theme {
  name: string;
  mode: 'day' | 'night';
  displayName: string;
  variables: Record<string, string>;

  // NEW: Extension metadata
  source?: 'builtin' | 'extension';
  extensionId?: string;
  extensionLabel?: string;

  // NEW: VS Code compatibility
  vsCodeColors?: Record<string, string>;    // Original VS Code colors
  vsCodeTokenColors?: any[];                 // Original token colors

  contrastRatio?: {
    primaryText: number;
    secondaryText: number;
    editorText: number;
  };
}
```

---

## Architecture Design

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer                                                    │
│  - ThemeSelector.tsx (shows built-in + extension themes)    │
│  - ThemePreview.tsx (preview any theme)                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  State Management                                            │
│  - themeStore.ts (unified theme management)                 │
│  - Extended with extension theme support                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Service Layer                                               │
│  - monacoExtensionHost.ts (load extension themes)           │
│  - themeConverter.ts (VS Code → Rainy conversion) NEW       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Monaco Editor                                               │
│  - monaco.editor.defineTheme() (syntax highlighting)        │
└─────────────────────────────────────────────────────────────┘
```

### New Files to Create

1. **`src/utils/themeConverter.ts`** - Convert VS Code themes to Rainy format
2. **`src/types/vscodeTheme.ts`** - TypeScript interfaces for VS Code themes

### Files to Modify

1. **`src/services/monacoExtensionHost.ts`** - Enhance `loadThemes()`
2. **`src/stores/themeStore.ts`** - Add extension theme support
3. **`src/themes/index.ts`** - Export extended Theme interface

---

## Token Mapping Strategy

### VS Code → Rainy Aether Mapping

VS Code has **200+ color tokens**. We need to map the most important ones:

```typescript
const TOKEN_MAPPING: Record<string, string> = {
  // Editor
  'editor.background': '--bg-editor',
  'editor.foreground': '--text-editor',

  // UI Backgrounds
  'sideBar.background': '--bg-sidebar',
  'activityBar.background': '--bg-primary',
  'panel.background': '--bg-secondary',
  'statusBar.background': '--bg-status',
  'tab.activeBackground': '--bg-primary',
  'tab.inactiveBackground': '--bg-secondary',

  // UI Foregrounds
  'sideBar.foreground': '--text-primary',
  'activityBar.foreground': '--text-primary',
  'statusBar.foreground': '--text-secondary',

  // Accents
  'activityBarBadge.background': '--accent-primary',
  'button.background': '--accent-primary',
  'focusBorder': '--accent-primary',

  // Borders
  'panel.border': '--border-color',
  'sideBar.border': '--border-color',
  'editorGroup.border': '--border-color',

  // Terminal
  'terminal.background': '--bg-editor',
  'terminal.foreground': '--text-editor',

  // Diff colors
  'diffEditor.insertedTextBackground': '--diff-added',
  'diffEditor.removedTextBackground': '--diff-removed',
  'gitDecoration.addedResourceForeground': '--diff-added',
  'gitDecoration.deletedResourceForeground': '--diff-removed',
};
```

### Conversion Algorithm

```typescript
function convertVSCodeThemeToRainy(
  vsCodeTheme: VSCodeTheme,
  extensionId: string
): Theme {
  const variables: Record<string, string> = {};

  // Map known tokens
  for (const [vsToken, rainyVar] of Object.entries(TOKEN_MAPPING)) {
    if (vsCodeTheme.colors[vsToken]) {
      variables[rainyVar] = vsCodeTheme.colors[vsToken];
    }
  }

  // Fill in missing values with fallbacks
  if (!variables['--bg-primary']) {
    variables['--bg-primary'] = vsCodeTheme.colors['editor.background'] || '#1e1e1e';
  }

  if (!variables['--text-primary']) {
    variables['--text-primary'] = vsCodeTheme.colors['editor.foreground'] || '#d4d4d4';
  }

  // ... fallback logic for all required variables

  // Determine mode from base theme
  const mode: 'day' | 'night' = vsCodeTheme.type === 'light' ? 'day' : 'night';

  return {
    name: `ext-${extensionId}-${vsCodeTheme.name?.toLowerCase().replace(/\s+/g, '-')}`,
    mode,
    displayName: vsCodeTheme.name || 'Extension Theme',
    variables,
    source: 'extension',
    extensionId,
    vsCodeColors: vsCodeTheme.colors,
    vsCodeTokenColors: vsCodeTheme.tokenColors,
  };
}
```

### Fallback Strategy

If a VS Code theme doesn't define all required Rainy variables:

1. **Use VS Code defaults** - Check `editor.background`, `editor.foreground`
2. **Derive from base theme** - Calculate secondary colors from primary
3. **Use mode defaults** - Fallback to built-in dark/light theme values

---

## Integration Plan

### Step-by-Step Implementation

#### **Phase 1: Create Theme Converter** (Day 1)

**Create `src/utils/themeConverter.ts`:**

```typescript
import { Theme } from '@/themes';
import { VSCodeTheme, VSCodeThemeContribution } from '@/types/vscodeTheme';

export interface ConversionOptions {
  extensionId: string;
  extensionLabel?: string;
  preferredMode?: 'day' | 'night';
}

export function convertVSCodeThemeToRainy(
  vsCodeTheme: VSCodeTheme,
  options: ConversionOptions
): Theme {
  // Implementation
}

export function generateThemeName(
  vsCodeTheme: VSCodeTheme,
  extensionId: string
): string {
  // Generate unique theme name
}

export function inferThemeMode(
  vsCodeTheme: VSCodeTheme,
  uiTheme?: string
): 'day' | 'night' {
  // Determine day/night from type or uiTheme
}
```

**Create `src/types/vscodeTheme.ts`:**

```typescript
export interface VSCodeTheme {
  name?: string;
  type?: 'dark' | 'light' | 'hc';
  colors: Record<string, string>;
  tokenColors?: VSCodeTokenColor[] | string;
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, any>;
}

export interface VSCodeTokenColor {
  name?: string;
  scope: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

export interface VSCodeThemeContribution {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
  id?: string;
}
```

#### **Phase 2: Extend ThemeStore** (Day 2)

**Modify `src/themes/index.ts`:**

```typescript
export interface Theme {
  name: string;
  mode: 'day' | 'night';
  displayName: string;
  variables: Record<string, string>;

  // Extension metadata
  source?: 'builtin' | 'extension';
  extensionId?: string;
  extensionLabel?: string;

  // VS Code compatibility
  vsCodeColors?: Record<string, string>;
  vsCodeTokenColors?: any[];

  contrastRatio?: {
    primaryText: number;
    secondaryText: number;
    editorText: number;
  };
}
```

**Add to `src/stores/themeStore.ts`:**

```typescript
// Track extension themes separately
let extensionThemes: Theme[] = [];

// Actions
export const registerExtensionTheme = (theme: Theme) => {
  if (theme.source !== 'extension') {
    console.warn('Attempted to register non-extension theme as extension');
    return;
  }

  extensionThemes.push(theme);
  notifyStateListeners();
};

export const unregisterExtensionTheme = (themeId: string) => {
  extensionThemes = extensionThemes.filter(t => t.name !== themeId);

  // If currently active, switch to default
  if (themeState.currentTheme.name === themeId) {
    setCurrentTheme(defaultTheme);
  }

  notifyStateListeners();
};

export const getAllThemes = (): Theme[] => {
  return [...allThemes, ...extensionThemes];
};

export const getExtensionThemes = (): Theme[] => {
  return extensionThemes;
};
```

#### **Phase 3: Enhance Extension Loader** (Day 3)

**Modify `src/services/monacoExtensionHost.ts`:**

```typescript
private async loadThemes(
  extension: InstalledExtension,
  themes: any[],
  loadedExtension: LoadedExtension
): Promise<void> {
  console.log(`[ColorTheme] Extension ${extension.id} provides ${themes.length} color theme(s)`);

  try {
    // Import theme utilities
    const { convertVSCodeThemeToRainy } = await import('@/utils/themeConverter');
    const { registerExtensionTheme } = await import('@/stores/themeStore');

    for (const themeContrib of themes) {
      try {
        console.log(`[ColorTheme] Loading theme: ${themeContrib.label}`);

        // 1. Resolve path
        const themePath = this.resolveExtensionPath(extension, themeContrib.path);

        // 2. Load theme data
        const vsCodeTheme = await this.loadJsonFile(themePath);

        // 3. Convert to Rainy format
        const rainyTheme = convertVSCodeThemeToRainy(vsCodeTheme, {
          extensionId: extension.id,
          extensionLabel: themeContrib.label,
          preferredMode: themeContrib.uiTheme === 'vs' ? 'day' : 'night',
        });

        // 4. Register with Monaco (for syntax highlighting)
        const monacoThemeId = themeContrib.id || `theme-${extension.id}`;
        monaco.editor.defineTheme(monacoThemeId, {
          base: themeContrib.uiTheme === 'vs' ? 'vs' : 'vs-dark',
          inherit: true,
          rules: this.convertTokenColorsToMonaco(vsCodeTheme.tokenColors),
          colors: vsCodeTheme.colors,
        });

        // 5. Register with Rainy theme store
        registerExtensionTheme(rainyTheme);

        console.log(`[ColorTheme] Successfully registered theme: ${rainyTheme.displayName}`);

        // 6. Add disposal callback
        loadedExtension.disposables.push({
          dispose: () => {
            console.log(`[ColorTheme] Unregistering theme: ${rainyTheme.name}`);
            const { unregisterExtensionTheme } = require('@/stores/themeStore');
            unregisterExtensionTheme(rainyTheme.name);
          },
        });

      } catch (error) {
        console.error(`[ColorTheme] Failed to load theme ${themeContrib.label}:`, error);
      }
    }
  } catch (error) {
    console.error(`[ColorTheme] Failed to import theme utilities:`, error);
  }
}

private convertTokenColorsToMonaco(tokenColors: any): any[] {
  if (!tokenColors) return [];
  if (typeof tokenColors === 'string') {
    // TextMate file reference - would need to load separately
    console.warn('[ColorTheme] TextMate file references not yet supported');
    return [];
  }

  // Convert VS Code token colors to Monaco format
  return tokenColors.map((rule: any) => ({
    token: Array.isArray(rule.scope) ? rule.scope.join(',') : rule.scope,
    foreground: rule.settings.foreground?.replace('#', ''),
    background: rule.settings.background?.replace('#', ''),
    fontStyle: rule.settings.fontStyle || '',
  }));
}
```

#### **Phase 4: UI Integration** (Day 4)

**Update theme selector to show extension themes:**

```typescript
// In ThemeSelector or Settings component
import { getAllThemes, getExtensionThemes } from '@/stores/themeStore';

const allThemes = getAllThemes();
const extensionThemes = getExtensionThemes();

// Group themes
const builtInThemes = allThemes.filter(t => t.source !== 'extension');

// Render
<div>
  <h3>Built-in Themes</h3>
  {builtInThemes.map(theme => <ThemeOption theme={theme} />)}

  {extensionThemes.length > 0 && (
    <>
      <h3>Extension Themes</h3>
      {extensionThemes.map(theme => (
        <ThemeOption
          theme={theme}
          badge={theme.extensionLabel}
        />
      ))}
    </>
  )}
</div>
```

#### **Phase 5: Testing & Refinement** (Day 5)

1. Test with popular themes:
   - Monokai Pro
   - Dracula Official
   - One Dark Pro
   - Material Theme

2. Verify token mapping accuracy
3. Test theme switching
4. Verify persistence across restarts
5. Check Monaco editor syntax highlighting

---

## Testing Strategy

### Test Extensions

**Popular VS Code Themes to Test:**

1. **Monokai Pro** (`monokai.theme-monokai-pro-vscode`)
   - Well-structured, complete color definitions
   - Multiple variants (Standard, Classic, Spectrum)

2. **Dracula Official** (`dracula-theme.theme-dracula`)
   - Popular, widely used
   - Good test for icon + theme combination

3. **One Dark Pro** (`zhuangtongfa.Material-theme`)
   - VS Code default-like
   - Comprehensive token colors

4. **Material Theme** (`Equinusocio.vsc-material-theme`)
   - Multiple variants
   - Complex theme structure

### Test Cases

**Functional Tests:**

✅ Extension theme loads without errors
✅ Theme appears in theme selector
✅ Theme can be activated
✅ UI colors change correctly
✅ Editor syntax highlighting works
✅ Theme persists across app restart
✅ Multiple extension themes can coexist
✅ Uninstalling extension removes theme
✅ Disabling extension hides theme

**Visual Tests:**

✅ Sidebar background correct
✅ Editor background correct
✅ Status bar colors correct
✅ Text contrast acceptable (WCAG AA)
✅ Accent colors visible
✅ Border colors visible
✅ Syntax highlighting accurate

**Edge Cases:**

✅ Theme missing required colors (fallbacks work)
✅ Theme with invalid color values
✅ Theme with TextMate file reference
✅ Extension with multiple theme variants
✅ Theme name conflicts

---

## References

### Documentation

- **VS Code Color Theme API:** https://code.visualstudio.com/api/extension-guides/color-theme
- **VS Code Theme Color Reference:** https://code.visualstudio.com/api/references/theme-color
- **TextMate Scopes:** https://macromates.com/manual/en/language_grammars

### Related Files

**Current Implementation:**
- `src/stores/themeStore.ts` - Built-in theme management
- `src/themes/index.ts` - Built-in theme definitions
- `src/services/monacoExtensionHost.ts:269-295` - Current theme loader
- `src/stores/iconThemeStore.ts` - Icon theme pattern (reference)

**Documentation:**
- `docs/extensions/EXTENSION_ROADMAP.md` - Phase 2 overview
- `docs/extensions/ICON_THEME_SYSTEM.md` - Icon theme implementation
- `docs/extensions/EXTENSION_SYSTEM.md` - Overall extension architecture

### Example Themes

**Good Reference Implementations:**
- Monokai Pro: Clean structure, multiple variants
- One Dark Pro: Comprehensive, well-maintained
- Dracula: Simple, easy to understand

---

## Next Steps

### Recommended Implementation Order

1. ✅ **Investigation Complete** (This document)
2. ⏭️ **Create Theme Converter** - `src/utils/themeConverter.ts`
3. ⏭️ **Extend Theme Types** - Update interfaces
4. ⏭️ **Modify ThemeStore** - Add extension theme support
5. ⏭️ **Enhance Extension Loader** - Complete `loadThemes()` implementation
6. ⏭️ **Update UI** - Theme selector integration
7. ⏭️ **Test with Real Extensions** - Install and verify
8. ⏭️ **Document** - Update EXTENSION_ROADMAP.md

### Approval Required

Before proceeding with implementation, please review:

1. **Architecture Decision** - Unified theme store vs. separate color theme store
2. **Token Mapping** - Verify VS Code → Rainy variable mappings are correct
3. **Fallback Strategy** - Approve handling of missing/invalid colors
4. **UI Integration** - Confirm theme selector design

---

**Status:** 🟢 Ready for implementation
**Estimated Effort:** 3-5 days (based on icon theme experience)
**Dependencies:** None (all infrastructure exists)
**Risk:** Low (following proven icon theme pattern)

---

*Investigation completed: 2025-11-08*
*Investigator: Claude (AI Assistant)*
*Next Review: After Phase 2 implementation*
