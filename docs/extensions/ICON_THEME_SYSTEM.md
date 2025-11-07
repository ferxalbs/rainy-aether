# Icon Theme System

## Overview

The Icon Theme System allows extensions to customize file and folder icons in the Project Explorer, similar to VS Code's Material Icon Theme and other popular icon packs.

## Architecture

### Components

1. **iconThemeStore** (`src/stores/iconThemeStore.ts`)
   - Central state management for icon themes
   - Handles theme registration, activation, and icon lookups
   - Provides React hooks for UI components

2. **Default Theme** (`src/themes/iconThemes/defaultIconTheme.tsx`)
   - Built-in theme using Lucide icons with color coding
   - Comprehensive coverage of common file types and folders
   - Always available as a fallback

3. **Extension API** (`src/services/extension/iconThemeAPI.ts`)
   - API for extensions to register custom icon themes
   - Compatible with VS Code extension patterns

4. **Project Explorer Integration** (`src/components/ide/ProjectExplorer.tsx`)
   - Uses icon theme store to render appropriate icons
   - Supports both React components and image/SVG icons
   - Automatically updates when theme changes

## Key Features

### Icon Matching Priority

For **Files**:

1. Exact file name match (e.g., `package.json` → npm icon)
2. File extension match (e.g., `.ts` → TypeScript icon)
3. Language ID match (e.g., `typescript` → TypeScript icon)
4. Default file icon

For **Folders**:

1. Folder name match (e.g., `src` → source folder icon)
2. Expanded/collapsed variants (e.g., `src` open vs closed)
3. Default folder icon

### Icon Definition Types

Icons can be defined as:

```typescript
// React component (Lucide icons, custom components)
iconDefinitions: {
  typescript: FileCode // Lucide icon
}

// Colored React component (with custom styles)
iconDefinitions: {
  typescript: createColoredIcon(FileCode, '#3178c6')
}

// SVG string
iconDefinitions: {
  custom: '<svg>...</svg>'
}

// Image path (relative to extension)
iconDefinitions: {
  custom: './icons/custom.png'
}
```

## For Extension Developers

### Creating an Icon Theme Extension

#### 1. Define Icon Theme in package.json

```json
{
  "name": "material-icon-theme",
  "displayName": "Material Icon Theme",
  "description": "Material Design icons for files and folders",
  "version": "1.0.0",
  "contributes": {
    "iconThemes": [
      {
        "id": "material-icon-theme",
        "label": "Material Icon Theme",
        "path": "./themes/material-icon-theme.json"
      }
    ]
  }
}
```

#### 2. Create Icon Theme Definition

**Option A: JSON-based (for image/SVG icons)**

`themes/material-icon-theme.json`:

```json
{
  "id": "material-icon-theme",
  "label": "Material Icon Theme",
  "iconDefinitions": {
    "typescript": "./icons/typescript.svg",
    "javascript": "./icons/javascript.svg",
    "folder": "./icons/folder.svg",
    "folder-open": "./icons/folder-open.svg"
  },
  "associations": {
    "fileExtensions": {
      "ts": "typescript",
      "tsx": "typescript",
      "js": "javascript",
      "jsx": "javascript"
    },
    "fileNames": {
      "package.json": "nodejs",
      "tsconfig.json": "typescript"
    },
    "folderNames": {
      "src": "folder-src",
      "node_modules": "folder-node"
    },
    "folderNamesExpanded": {
      "src": "folder-src-open",
      "node_modules": "folder-node-open"
    }
  },
  "defaultFileIcon": "file",
  "defaultFolderIcon": "folder",
  "defaultFolderIconExpanded": "folder-open"
}
```

**Option B: TypeScript-based (for React components)**

`themes/material-icon-theme.ts`:

```typescript
import { IconTheme } from 'rainy-aether';
import { FileCode, Folder, FolderOpen } from 'lucide-react';

export const materialIconTheme: IconTheme = {
  id: 'material-icon-theme',
  label: 'Material Icon Theme',
  iconDefinitions: {
    typescript: FileCode,
    javascript: FileCode,
    folder: Folder,
    'folder-open': FolderOpen,
  },
  associations: {
    fileExtensions: {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
    },
    fileNames: {
      'package.json': 'nodejs',
      'tsconfig.json': 'typescript',
    },
    folderNames: {
      src: 'folder-src',
      node_modules: 'folder-node',
    },
    folderNamesExpanded: {
      src: 'folder-src-open',
      node_modules: 'folder-node-open',
    },
  },
  defaultFileIcon: 'file',
  defaultFolderIcon: 'folder',
  defaultFolderIconExpanded: 'folder-open',
};
```

#### 3. Register Icon Theme in activate()

```typescript
import { iconThemeAPI } from 'rainy-aether';
import { materialIconTheme } from './themes/material-icon-theme';

export function activate(context) {
  // Register the icon theme
  iconThemeAPI.registerIconTheme(materialIconTheme);

  // Optionally, set it as active immediately
  iconThemeAPI.setActiveIconTheme(materialIconTheme.id);

  // Clean up on deactivation
  context.subscriptions.push({
    dispose: () => {
      iconThemeAPI.unregisterIconTheme(materialIconTheme.id);
    },
  });
}
```

#### 4. Load Theme from JSON (if using JSON-based)

```typescript
import { iconThemeAPI } from 'rainy-aether';

export async function activate(context) {
  // Load theme definition from JSON file
  const themeJson = await context.readExtensionFile('themes/material-icon-theme.json');
  const themeDefinition = JSON.parse(themeJson);

  // Convert image paths to full URLs
  const iconDefinitions = {};
  for (const [key, value] of Object.entries(themeDefinition.iconDefinitions)) {
    if (typeof value === 'string' && value.startsWith('./')) {
      // Convert relative path to extension resource URL
      iconDefinitions[key] = context.extensionUri + value.substring(1);
    } else {
      iconDefinitions[key] = value;
    }
  }

  const iconTheme = {
    ...themeDefinition,
    iconDefinitions,
    extensionId: context.extensionId,
  };

  iconThemeAPI.registerIconTheme(iconTheme);

  context.subscriptions.push({
    dispose: () => {
      iconThemeAPI.unregisterIconTheme(iconTheme.id);
    },
  });
}
```

### Advanced Features

#### Custom Colored Icons

```typescript
const createColoredIcon = (Icon, color) => {
  return ({ size = 16, className, style }) => (
    <Icon size={size} className={className} style={{ color, ...style }} />
  );
};

const iconTheme = {
  // ...
  iconDefinitions: {
    typescript: createColoredIcon(FileCode, '#3178c6'),
    javascript: createColoredIcon(FileCode, '#f7df1e'),
    python: createColoredIcon(FileCode, '#3776ab'),
  },
};
```

#### Language ID Associations

```typescript
const iconTheme = {
  // ...
  associations: {
    languageIds: {
      typescript: 'typescript',
      javascript: 'javascript',
      python: 'python',
      rust: 'rust',
    },
  },
};
```

#### Folder-Specific Icons

```typescript
const iconTheme = {
  // ...
  associations: {
    folderNames: {
      src: 'folder-src',
      dist: 'folder-dist',
      'node_modules': 'folder-node',
      '.git': 'folder-git',
      public: 'folder-public',
      components: 'folder-components',
    },
    folderNamesExpanded: {
      src: 'folder-src-open',
      dist: 'folder-dist-open',
      'node_modules': 'folder-node-open',
      '.git': 'folder-git-open',
      public: 'folder-public-open',
      components: 'folder-components-open',
    },
  },
};
```

## API Reference

### iconThemeAPI

#### `registerIconTheme(theme: IconTheme): void`

Register a new icon theme. The theme will be available in the icon theme picker.

#### `unregisterIconTheme(themeId: string): void`

Unregister an icon theme. If it's the active theme, no theme will be active.

#### `setActiveIconTheme(themeId: string): void`

Set the active icon theme. Icons will update immediately in the UI.

#### `getIconThemes(): IconTheme[]`

Get all registered icon themes.

#### `getActiveIconTheme(): IconTheme | null`

Get the currently active icon theme.

### IconTheme Interface

```typescript
interface IconTheme {
  // Unique identifier
  id: string;

  // Display name
  label: string;

  // Extension that provides this theme (optional)
  extensionId?: string;

  // Icon definitions: maps icon name to icon definition
  iconDefinitions: Record<string, IconDefinition>;

  // Associations between files/folders and icons
  associations: IconAssociations;

  // Default icons
  defaultFileIcon?: string;
  defaultFolderIcon?: string;
  defaultFolderIconExpanded?: string;

  // Whether this is a built-in theme
  builtIn?: boolean;
}
```

### IconDefinition

```typescript
type IconDefinition =
  | string // SVG string or image path
  | React.ComponentType<{
      size?: number;
      className?: string;
      style?: React.CSSProperties
    }>;
```

### IconAssociations

```typescript
interface IconAssociations {
  // Map file extensions to icon names
  fileExtensions?: Record<string, string>;

  // Map exact file names to icon names
  fileNames?: Record<string, string>;

  // Map language IDs to icon names
  languageIds?: Record<string, string>;

  // Map folder names to icon names
  folderNames?: Record<string, string>;

  // Map folder names when expanded
  folderNamesExpanded?: Record<string, string>;
}
```

## Built-in Default Theme

The default theme (`rainy-default`) provides:

- **45+ file type icons** with color coding
- **20+ folder type icons** with open/closed variants
- Support for major programming languages (TypeScript, JavaScript, Python, Rust, Go, Java, C#, PHP, Ruby, Swift, Kotlin, Dart)
- Web technologies (HTML, CSS, SCSS, LESS)
- Data formats (JSON, YAML, TOML, XML)
- Config files (.env, package.json, tsconfig.json, etc.)
- Special folders (src, dist, node_modules, .git, public, components)

## Examples

### Minimal Icon Theme

```typescript
const minimalTheme: IconTheme = {
  id: 'minimal',
  label: 'Minimal',
  iconDefinitions: {
    file: File,
    folder: Folder,
    'folder-open': FolderOpen,
  },
  associations: {},
  defaultFileIcon: 'file',
  defaultFolderIcon: 'folder',
  defaultFolderIconExpanded: 'folder-open',
};
```

### VS Code Material Icon Theme Clone

See `examples/material-icon-theme` directory for a full implementation that mimics the popular VS Code extension.

## Troubleshooting

### Icons not showing

- Ensure theme is registered: `iconThemeAPI.getIconThemes()`
- Check if theme is active: `iconThemeAPI.getActiveIconTheme()`
- Verify icon definitions exist for your file types

### Icons not updating after theme change

- Icon theme store automatically notifies React components
- Check browser console for errors

### Custom icons not loading

- Verify image paths are correct (relative to extension root)
- Check that SVG strings are valid
- Ensure React components accept size, className, and style props

## Future Enhancements

- [ ] Settings UI for selecting icon themes
- [ ] Icon theme preview in extension marketplace
- [ ] Icon customization per user (override specific icons)
- [ ] Icon theme inheritance (extend existing themes)
- [ ] Dynamic icon generation based on file content
