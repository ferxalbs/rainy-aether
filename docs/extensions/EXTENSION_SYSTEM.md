# Extension System Documentation

**Status:** 🟡 Beta - Functional but with known issues
**Version:** 1.0.0
**Last Updated:** 2025-11-07

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Extension Manifest System](#extension-manifest-system)
5. [Icon Theme System](#icon-theme-system)
6. [Installation Flow](#installation-flow)
7. [Known Issues](#known-issues)
8. [Troubleshooting](#troubleshooting)
9. [Implementation History](#implementation-history)

---

## Overview

Rainy Aether's extension system allows users to install VS Code-compatible extensions from OpenVSX Registry. The system currently focuses on **icon theme extensions** with plans to expand to language support, snippets, and more.

### Key Features

✅ **OpenVSX Integration** - Download extensions from OpenVSX Registry
✅ **VS Code-Compatible** - Uses VS Code extension format (`.vsix`)
✅ **Icon Themes** - Full support for file/folder icon themes
✅ **Manifest Tracking** - `extensions.json` manifest similar to VS Code
✅ **User Directory** - Extensions stored in `~/.rainy-aether/extensions/`
✅ **Auto-Activation** - Icon themes activate immediately when enabled
🟡 **Path Recognition** - Some file types recognized, others use fallback icons

---

## Architecture

### 4-Layer System

```
┌─────────────────────────────────────────────────┐
│  UI Layer (React Components)                    │
│  - ExtensionManager.tsx                         │
│  - ProjectExplorer.tsx (icon rendering)         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  State Management (Stores)                      │
│  - extensionStore.ts (extension state)          │
│  - iconThemeStore.ts (icon theme state)         │
│  - settingsStore.ts (user preferences)          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Service Layer (TypeScript)                     │
│  - extensionManager.ts (lifecycle management)   │
│  - monacoExtensionHost.ts (extension loading)   │
│  - extensionsManifest.ts (manifest management)  │
│  - openVSXRegistry.ts (marketplace API)         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Backend (Rust/Tauri)                           │
│  - extension_manager.rs (file operations)       │
│  - Commands: extract, read, save, etc.          │
└─────────────────────────────────────────────────┘
```

---

## Directory Structure

### User Directory Layout

Extensions are stored in the **user's home directory** for visibility and auditability:

```
~/.rainy-aether/                                    # Main Rainy Aether directory
├── extensions/                                     # All extensions
│   ├── extensions.json                            # VS Code-compatible manifest
│   ├── pkief.material-icon-theme-5.28.0/          # Extension folder (VS Code format)
│   │   ├── package.json                           # Extension manifest
│   │   ├── dist/
│   │   │   └── material-icons.json                # Icon theme definition
│   │   └── icons/
│   │       ├── git.svg                            # Icon files
│   │       ├── typescript.svg
│   │       └── ... (500+ icons)
│   └── other-extension-1.0.0/
└── installed_extensions.json                       # Legacy compatibility file
```

**Platform Paths:**
- **Windows:** `C:\Users\{username}\.rainy-aether\extensions\`
- **macOS:** `/Users/{username}/.rainy-aether/extensions/`
- **Linux:** `/home/{username}/.rainy-aether/extensions/`

### Extension Folder Format

Extensions follow **VS Code naming convention**:

```
Format: {publisher}.{name}-{version}
Example: pkief.material-icon-theme-5.28.0
```

**Comparison:**
```
✅ VS Code:  pkief.material-icon-theme-5.28.0
✅ Windsurf: tauri-apps.tauri-vscode-0.2.10-universal
✅ Rainy:    pkief.material-icon-theme-5.28.0  (SAME FORMAT)
```

---

## Extension Manifest System

### extensions.json Structure

VS Code-compatible manifest that tracks all installed extensions:

```json
{
  "extensions": [
    {
      "identifier": {
        "id": "PKief.material-icon-theme",
        "uuid": null
      },
      "version": "5.28.0",
      "relative_path": "pkief.material-icon-theme-5.28.0",
      "metadata": {
        "installed_timestamp": 1699564800000,
        "is_enabled": true,
        "is_builtin": false,
        "is_system": false,
        "updated_timestamp": 1699564800000,
        "pre_release_version": false,
        "display_name": "Material Icon Theme",
        "description": "Material Design Icons for Visual Studio Code"
      }
    }
  ]
}
```

### Rust Backend Commands

**File Operations:**
```rust
// Ensure directory exists
ensure_extensions_directory() -> String

// Load/Save manifest
load_extensions_manifest() -> String (JSON)
save_extensions_manifest(manifest: String) -> ()

// Extension file operations
extract_extension(vsix_data: Vec<u8>, target_path: String) -> ()
read_extension_file(path: String) -> String
list_extension_files(path: String) -> Vec<String>
remove_directory(path: String) -> ()

// Diagnostics
get_app_data_directory() -> String
```

**Path Resolution:**
- All paths are relative to `~/.rainy-aether/extensions/`
- Safety checks prevent access outside extensions directory
- Full paths are logged for debugging

### TypeScript Service Layer

**ExtensionsManifestService** (`src/services/extensionsManifest.ts`):

```typescript
class ExtensionsManifestService {
  // Initialize and load manifest
  async initialize(): Promise<void>

  // Load from disk
  async loadManifest(): Promise<ExtensionsManifest>

  // Save to disk
  async saveManifest(): Promise<void>

  // Manage extensions
  async addOrUpdateExtension(extension: InstalledExtension): Promise<void>
  async removeExtension(extensionId: string): Promise<void>
  async updateExtensionEnabled(extensionId: string, enabled: boolean): Promise<void>

  // Sync with installed extensions
  async syncWithInstalledExtensions(installedExtensions: InstalledExtension[]): Promise<void>
}
```

---

## Icon Theme System

### Architecture

Icon themes are managed through a dedicated store and rendering system:

```
Extension provides       Icon Theme Store         ProjectExplorer
icon theme data    →    manages themes      →    renders icons
```

### Icon Theme Structure

**From VS Code Extension:**
```json
{
  "iconDefinitions": {
    "typescript": {
      "iconPath": "./../icons/typescript.svg"
    },
    "javascript": {
      "iconPath": "./../icons/javascript.svg"
    }
  },
  "fileExtensions": {
    "ts": "typescript",
    "js": "javascript"
  },
  "fileNames": {
    "package.json": "nodejs",
    ".gitignore": "git"
  }
}
```

### Icon Lookup Process

**When rendering a file in ProjectExplorer:**

1. **Extract filename:** `test.ts`
2. **Check fileNames:** Is "test.ts" in `fileNames` mapping? No
3. **Check fileExtensions:** Is "ts" in `fileExtensions`? Yes → `iconId: "typescript"`
4. **Lookup iconDefinition:** Get `iconDefinitions["typescript"]`
5. **Resolve path:** `./../icons/typescript.svg` → `pkief.material-icon-theme-5.28.0/icons/typescript.svg`
6. **Read file:** Invoke `read_extension_file()`
7. **Convert to data URL:** SVG → Base64 → `data:image/svg+xml;base64,...`
8. **Render:** `<img src="data:image/svg+xml;base64,..." />`

### Path Resolution Algorithm

**Challenge:** Icon paths in `material-icons.json` are relative to `dist/` folder:
```
iconPath: "./../icons/git.svg"
```

**Solution:**
```typescript
private resolveExtensionPath(extension: InstalledExtension, relativePath: string): string {
  // Remove leading ./
  let cleanPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;

  // If path starts with ../, it's relative to dist/ folder
  if (cleanPath.startsWith('../')) {
    cleanPath = cleanPath.substring(3); // Remove "../"
  }

  // Build final path: extension-folder/icons/file.svg
  return `${extension.path}/${cleanPath}`;
}

// Example:
// Input:  "./../icons/git.svg"
// Output: "pkief.material-icon-theme-5.28.0/icons/git.svg"
```

### SVG to Data URL Conversion

**Problem:** `btoa()` doesn't handle UTF-8 characters in SVG files correctly.

**Solution:** Use `TextEncoder` for proper UTF-8 encoding:

```typescript
// Properly encode UTF-8 strings for base64
const encoder = new TextEncoder();
const data = encoder.encode(iconContent);
let binary = '';
for (let i = 0; i < data.byteLength; i++) {
  binary += String.fromCharCode(data[i]);
}
const base64 = btoa(binary);
const dataUrl = `data:image/svg+xml;base64,${base64}`;
```

### Icon Rendering Component

**RenderIcon** component in `ProjectExplorer.tsx`:

```typescript
const RenderIcon: React.FC<{ icon: IconDefinition }> = ({ icon }) => {
  // React component (built-in themes)
  if (icon.iconComponent) {
    return <IconComponent />;
  }

  // Icon path (extension-provided icons)
  if (icon.iconPath) {
    // SVG string (inline)
    if (icon.iconPath.startsWith('<svg')) {
      return <div dangerouslySetInnerHTML={{ __html: icon.iconPath }} />;
    }
    // Data URL (extension icons)
    return <img src={icon.iconPath} alt="" />;
  }

  // Fallback to Lucide icon
  return <File />;
};
```

---

## Installation Flow

### Complete Extension Installation Process

```
1. User clicks "Install" in Extension Manager
        ↓
2. ExtensionManager.installExtension()
   - Creates InstalledExtension object
   - Sets state to "installing"
        ↓
3. OpenVSX Registry API
   - Download .vsix file (ZIP format)
        ↓
4. Rust Backend: extract_extension()
   - Extract to ~/.rainy-aether/extensions/pkief.material-icon-theme-5.28.0/
   - Logs extraction progress
        ↓
5. Save to installed_extensions.json
   - Legacy compatibility
        ↓
6. ExtensionsManifestService
   - Sync with extensions.json manifest
   - Track metadata (timestamps, enabled state)
        ↓
7. User enables extension
        ↓
8. MonacoExtensionHost.loadExtension()
   - Read package.json
   - Find iconTheme contribution
        ↓
9. Load Icon Theme
   - Read material-icons.json
   - Parse iconDefinitions
   - Load ALL icon SVG files (~500+)
   - Convert to data URLs
        ↓
10. Register Icon Theme
    - iconThemeActions.registerTheme()
    - Auto-activate theme
    - Save preference to settings
        ↓
11. Update UI
    - ProjectExplorer re-renders
    - Icons appear in sidebar
```

---

## Known Issues

### 🟡 Icon Recognition Issues

**Problem:** Some file types show fallback icons instead of correct Material Icons.

**Status:** Under investigation

**Symptoms:**
- `.ts` files may not show TypeScript icon
- Some file extensions missing from theme mapping
- Console shows: `⚠️ Using default file icon for "file.ts"`

**Possible Causes:**

1. **Icon Definition Not Loaded:**
   ```
   IconId exists in fileExtensions mapping
   BUT iconDefinition[iconId] is missing/undefined
   ```

2. **Extension Mapping Missing:**
   ```
   File extension not in fileExtensions mapping
   Falls back to default icon
   ```

3. **SVG Loading Failure:**
   ```
   Icon file fails to load from disk
   Logged as: "Failed to load icon {iconId}"
   ```

**Debug Logs to Check:**

```javascript
// When extension loads:
[IconTheme] Theme has 550 icon definitions
[IconTheme] Theme has 300 file extensions
[IconTheme] Sample fileExtensions: ['ts', 'tsx', 'js', ...]

// When opening a file:
[IconTheme] Looking up icon for file: "test.ts"
[IconTheme] File parts: ['test', 'ts']
[IconTheme] Trying extension: "ts"
[IconTheme] Found iconId: typescript
[IconTheme] ✅ Found icon via extension "ts": typescript
```

**Workaround:**
- Default icon shown for unmapped file types
- Core file types (.js, .json, .md) usually work correctly

---

## Troubleshooting

### Extension Not Installing

**Symptoms:**
- Extension stuck in "installing" state
- No files in `~/.rainy-aether/extensions/`

**Solutions:**

1. **Check backend logs:**
   ```
   [ExtensionManager] Extracting extension to: ...
   [ExtensionExtract] Extracted: package.json -> package.json
   ```

2. **Verify directory exists:**
   - Open `C:\Users\{username}\.rainy-aether\extensions\`
   - Should see extension folder

3. **Check permissions:**
   - Ensure write access to home directory
   - Windows: Check folder isn't read-only

4. **Clear and reinstall:**
   ```bash
   # Delete extensions directory
   rm -rf ~/.rainy-aether/

   # Restart IDE and reinstall
   ```

### Icons Not Showing

**Symptoms:**
- All files show generic file icon
- No Material Icons visible

**Solutions:**

1. **Verify theme is active:**
   ```javascript
   // Console should show:
   [IconTheme] Active theme set to: material-icon-theme
   [IconTheme] Saved theme preference: material-icon-theme
   ```

2. **Check icon definitions loaded:**
   ```javascript
   [IconTheme] Theme has 550 icon definitions
   [IconTheme] Loaded 550 icons, 0 failed
   ```

3. **Verify files exist:**
   ```bash
   ls ~/.rainy-aether/extensions/pkief.material-icon-theme-5.28.0/icons/
   # Should show: git.svg, typescript.svg, etc.
   ```

4. **Check render logs:**
   ```javascript
   [RenderIcon] Rendering icon with path: data:image/svg+xml;base64,...
   ```

5. **Force re-activation:**
   - Disable extension
   - Wait 2 seconds
   - Enable extension
   - Check if icons appear

### Path Resolution Errors

**Symptoms:**
```
File does not exist: icons/git.svg
Full path: C:\Users\...\extensions\icons\git.svg
```

**Problem:** Missing extension folder in path

**Solution:**
- Should be: `C:\Users\...\extensions\pkief.material-icon-theme-5.28.0\icons\git.svg`
- Check `resolveExtensionPath()` in monacoExtensionHost.ts
- Verify extension.path is set correctly

---

## Implementation History

### Evolution of Extension System

#### **Phase 1: Initial OpenVSX Integration**
- Basic extension download from OpenVSX
- Extraction to app_data_dir (hidden location)
- Simple installed_extensions.json tracking

**Issues:**
- Extensions not visible to user
- No proper manifest system
- Path structure too complex (4 levels deep)

---

#### **Phase 2: User Directory Migration**
**Commit:** `50e42fe`

**Changes:**
- Created `get_rainy_aether_dir()` - uses home directory
- Updated all Rust commands to use `~/.rainy-aether/`
- Extensions now visible and auditable

**Benefits:**
- User can inspect extension files in File Explorer
- Better debugging (can see actual files)
- Matches VS Code pattern

---

#### **Phase 3: Path Structure Simplification**
**Commit:** `90e45f3`

**Problem:**
```
❌ extensions/PKief/material-icon-theme/5.28.0  (4 levels)
```

**Solution:**
```
✅ pkief.material-icon-theme-5.28.0  (1 level, VS Code format)
```

**Changes:**
- Updated `getExtensionPath()` to return flat format
- Removed nested directory structure
- Matches VS Code/Windsurf exactly

---

#### **Phase 4: VS Code-Compatible Manifest**
**Commits:** `794afc3`, `90e45f3`

**Added:**
- `extensions.json` manifest file
- ExtensionsManifest Rust structs
- ExtensionsManifestService TypeScript class
- Metadata tracking (timestamps, enabled state)

**Benefits:**
- Full VS Code compatibility
- Better extension management
- Persistent metadata

---

#### **Phase 5: Icon Path Resolution Fixes**
**Commits:** `556aeab`, `5e4e24b`

**Problem 1:** Path normalization removing extension folder
```
❌ Input:  "./../icons/git.svg"
❌ Output: "icons/git.svg"  (missing extension folder!)
```

**Solution:**
```typescript
✅ Output: "pkief.material-icon-theme-5.28.0/icons/git.svg"
```

**Problem 2:** Icons not activating after registration

**Solution:** Auto-activate theme when extension is enabled
```typescript
await iconThemeActions.setActiveTheme(iconThemeContrib.id, true);
```

---

#### **Phase 6: SVG Encoding Fix**
**Commit:** `ed28d50`

**Problem:** `btoa()` fails with UTF-8 characters in SVG

**Solution:** Use TextEncoder for proper UTF-8 → Base64 conversion

---

#### **Phase 7: Debug Logging**
**Commits:** `da9d83f`, `d9cef2e`

**Added comprehensive logging:**
- Icon lookup process (step by step)
- Theme registration details
- Path resolution debugging
- Success/Warning/Error indicators (✅/⚠️/❌)

**Benefits:**
- Easy to diagnose icon recognition issues
- Clear visibility into extension loading
- Better troubleshooting

---

## Future Improvements

### Planned Features

🔲 **Full Icon Coverage**
- Investigate why some file types don't show icons
- Ensure all VS Code icon mappings work correctly
- Add fallback icons for uncommon file types

🔲 **Language Support**
- Load language definitions from extensions
- Register with Monaco Editor
- Syntax highlighting for additional languages

🔲 **Snippets Support**
- Load code snippets from extensions
- Integrate with Monaco snippet system

🔲 **Theme Support**
- Color themes (not just icons)
- Monaco theme registration

🔲 **Extension Settings**
- UI for configuring extension settings
- Persist extension-specific preferences

🔲 **Extension Dependencies**
- Handle extensions that depend on other extensions
- Auto-install dependencies

🔲 **Performance Optimization**
- Lazy-load icons on demand
- Cache icon data URLs
- Reduce logging in production

---

## Developer Notes

### Adding New Extension Types

To support a new extension contribution type:

1. **Update `monacoExtensionHost.ts`:**
   ```typescript
   if (manifest.contributes.yourContributionType) {
     await this.loadYourContribution(extension, manifest);
   }
   ```

2. **Create loader method:**
   ```typescript
   private async loadYourContribution(
     extension: InstalledExtension,
     manifest: ExtensionManifest
   ): Promise<void> {
     // Implementation
   }
   ```

3. **Register with appropriate system:**
   - Icon Themes → `iconThemeStore.ts`
   - Languages → Monaco Editor
   - Snippets → Monaco snippet system
   - Themes → Theme system

### Testing Extensions

**Manual Test Checklist:**

- [ ] Extension installs without errors
- [ ] Files appear in `~/.rainy-aether/extensions/`
- [ ] `extensions.json` updated correctly
- [ ] Extension shows as "enabled" in UI
- [ ] Icons appear in ProjectExplorer sidebar
- [ ] Theme persists after restart
- [ ] Extension can be disabled
- [ ] Extension can be uninstalled
- [ ] No console errors

**Debug Commands:**

```typescript
// Check active theme
iconThemeActions.getActiveTheme()

// List all themes
iconThemeActions.getAllThemes()

// Get extension manifest
extensionsManifestService.getManifest()

// Check app data directory
invoke('get_app_data_directory')
```

---

## References

### Related Documentation

- [Icon Theme System](./ICON_THEME_SYSTEM.md) - Detailed icon theme documentation
- [CLAUDE.md](../../CLAUDE.md) - Project overview and conventions
- [OpenVSX Registry API](https://open-vsx.org/api) - Extension marketplace

### Key Files

**TypeScript:**
- `src/stores/extensionStore.ts` - Extension state
- `src/stores/iconThemeStore.ts` - Icon theme state
- `src/services/extensionManager.ts` - Lifecycle management
- `src/services/monacoExtensionHost.ts` - Extension loading
- `src/services/extensionsManifest.ts` - Manifest management
- `src/components/ide/ProjectExplorer.tsx` - Icon rendering

**Rust:**
- `src-tauri/src/extension_manager.rs` - File operations
- `src-tauri/src/lib.rs` - Command registration

**Types:**
- `src/types/extension.ts` - Extension types
- `src/types/extensionsManifest.ts` - Manifest types

---

## Changelog

### v1.0.0 (2025-11-07)

**Added:**
- ✅ VS Code-compatible extension manifest system
- ✅ Icon theme support with Material Icon Theme
- ✅ User directory storage (`~/.rainy-aether/`)
- ✅ Auto-activation of icon themes
- ✅ Comprehensive debug logging
- ✅ Path resolution fixes
- ✅ UTF-8 SVG encoding

**Known Issues:**
- 🟡 Some file types don't show correct icons
- 🟡 Icon lookup needs optimization

**Status:** Beta - Functional with minor issues

---

*Last updated: 2025-11-07*
*Author: Rainy Aether Development Team*
