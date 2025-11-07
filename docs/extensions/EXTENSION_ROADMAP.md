# Extension System Roadmap

**Current Status:** Phase 1 Complete - Icon Themes
**Next Phase:** Language Support & Syntax Highlighting
**Ultimate Goal:** Full VS Code Extension Compatibility

---

## 🎯 Vision

Create a **fully extensible IDE** where the community can add:

- 🎨 Icon Themes (✅ **DONE**)
- 🌈 Color Themes
- 📝 Language Support & Syntax Highlighting
- ✂️ Code Snippets
- 🔧 Commands & Keybindings
- 🪝 Custom Functionality via Web Workers
- 🔌 LSP Integration
- 🎭 Debugger Support

---

## 📊 Extension System Architecture (Global Foundation)

The current icon theme system establishes the **foundation** for all future extension types:

```
┌─────────────────────────────────────────────────────────────┐
│  Extension Package (.vsix)                                   │
│  ├── package.json (manifest)                                │
│  ├── contributes:                                            │
│  │   ├── iconThemes          ✅ IMPLEMENTED                 │
│  │   ├── themes              🔄 NEXT                        │
│  │   ├── languages           🔄 NEXT                        │
│  │   ├── grammars            🔄 NEXT                        │
│  │   ├── snippets            📋 PLANNED                     │
│  │   ├── commands            📋 PLANNED                     │
│  │   ├── keybindings         📋 PLANNED                     │
│  │   ├── configuration       📋 PLANNED                     │
│  │   └── views               📋 PLANNED                     │
│  └── Extension files (icons, themes, grammars, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

### ✅ What We Have (Reusable Infrastructure)

**1. Extension Installation System:**

```
✅ OpenVSX Registry API integration
✅ .vsix download & extraction
✅ VS Code-compatible directory structure
✅ Extension manifest (extensions.json)
✅ User directory storage (~/.rainy-aether/)
```

**2. Extension Lifecycle Management:**

```
✅ Install/Uninstall/Enable/Disable
✅ State persistence
✅ Health monitoring
✅ Auto-recovery from stuck states
```

**3. Extension Loading Pipeline:**

```
✅ MonacoExtensionHost (extension loader)
✅ Package.json parsing
✅ Contribution point detection
✅ File reading from extension directory
✅ Path resolution (handles ../ and ./)
```

**4. Backend Infrastructure:**

```
✅ Rust commands for file operations
✅ Safe path validation
✅ Directory creation/deletion
✅ Extension file reading
```

### 🔄 What Needs Extension-Specific Implementation

Each new contribution type needs:

1. **Store** - State management (like iconThemeStore.ts)
2. **Loader** - Parse and register contribution (in monacoExtensionHost.ts)
3. **Renderer/Integrator** - Apply to Monaco/UI (like RenderIcon component)
4. **User Preferences** - Save/restore settings

---

## 🗺️ Implementation Roadmap

### ✅ Phase 1: Icon Themes (COMPLETED)

**Status:** Production Ready (with minor icon recognition issues)

**Implemented:**

- Icon theme registration
- SVG → Data URL conversion
- File/folder icon lookup
- Theme activation & persistence
- ProjectExplorer integration

**Files Created:**

- `iconThemeStore.ts` - State management
- `monacoExtensionHost.ts::loadIconThemes()` - Loading
- `ProjectExplorer.tsx::RenderIcon` - Rendering

---

### 🔄 Phase 2: Color Themes (NEXT - HIGH PRIORITY)

**Goal:** Allow extensions to provide color themes (Dark+, Light+, Monokai, etc.)

#### Implementation Plan

**1. Theme Store** (`src/stores/colorThemeStore.ts`)

```typescript
interface ColorTheme {
  id: string;
  label: string;
  type: 'dark' | 'light' | 'highContrast';
  colors: {
    'editor.background': string;
    'editor.foreground': string;
    'activityBar.background': string;
    // ... 200+ token colors
  };
  tokenColors: Array<{
    scope: string | string[];
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }>;
}
```

**2. Extension Loader** (`monacoExtensionHost.ts`)

```typescript
private async loadColorThemes(
  extension: InstalledExtension,
  manifest: ExtensionManifest
): Promise<void> {
  if (!manifest.contributes?.themes) return;

  for (const themeContrib of manifest.contributes.themes) {
    // Read theme JSON file
    const themePath = this.resolveExtensionPath(extension, themeContrib.path);
    const themeData = await this.loadJsonFile(themePath);

    // Register with Monaco
    monaco.editor.defineTheme(themeContrib.id, {
      base: themeData.type === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: convertTokenColors(themeData.tokenColors),
      colors: themeData.colors
    });

    // Register with our theme system
    colorThemeActions.registerTheme({
      id: themeContrib.id,
      label: themeContrib.label,
      ...themeData
    });
  }
}
```

**3. Integration with Existing Theme System**

- Merge with current `themeStore.ts`
- Support both built-in and extension themes
- Allow switching via settings

**4. UI Updates**

- Theme selector in settings
- Live preview
- Import from VS Code theme extensions

**VS Code Compatibility:**

```json
{
  "contributes": {
    "themes": [
      {
        "label": "Monokai Pro",
        "uiTheme": "vs-dark",
        "path": "./themes/monokai-pro.json"
      }
    ]
  }
}
```

---

### 🔄 Phase 3: Language Support (NEXT - HIGH PRIORITY)

**Goal:** Register new programming languages with Monaco Editor

#### Implementation Plan

**1. Language Store** (`src/stores/languageStore.ts`)

```typescript
interface LanguageDefinition {
  id: string;
  extensions: string[];
  aliases: string[];
  configuration: {
    comments: {
      lineComment?: string;
      blockComment?: [string, string];
    };
    brackets: Array<[string, string]>;
    autoClosingPairs: Array<{ open: string; close: string }>;
    surroundingPairs: Array<{ open: string; close: string }>;
  };
}
```

**2. Language Registration**

```typescript
private async loadLanguages(
  extension: InstalledExtension,
  manifest: ExtensionManifest
): Promise<void> {
  if (!manifest.contributes?.languages) return;

  for (const langContrib of manifest.contributes.languages) {
    // Register with Monaco
    monaco.languages.register({
      id: langContrib.id,
      extensions: langContrib.extensions,
      aliases: langContrib.aliases,
      mimetypes: langContrib.mimetypes
    });

    // Load language configuration
    if (langContrib.configuration) {
      const configPath = this.resolveExtensionPath(extension, langContrib.configuration);
      const config = await this.loadJsonFile(configPath);

      monaco.languages.setLanguageConfiguration(langContrib.id, config);
    }
  }
}
```

**VS Code Compatibility:**

```json
{
  "contributes": {
    "languages": [
      {
        "id": "rust",
        "extensions": [".rs"],
        "aliases": ["Rust", "rust"],
        "configuration": "./language-configuration.json"
      }
    ]
  }
}
```

---

### 🔄 Phase 4: Grammar/Syntax Highlighting (NEXT - HIGH PRIORITY)

**Goal:** TextMate grammar support for syntax highlighting

#### Implementation Plan

**1. Grammar Loading**

```typescript
private async loadGrammars(
  extension: InstalledExtension,
  manifest: ExtensionManifest
): Promise<void> {
  if (!manifest.contributes?.grammars) return;

  for (const grammarContrib of manifest.contributes.grammars) {
    const grammarPath = this.resolveExtensionPath(extension, grammarContrib.path);

    // Monaco uses TextMate grammars via vscode-textmate
    // We need to integrate vscode-oniguruma for regex engine
    const grammarContent = await invoke<string>('read_extension_file', {
      path: grammarPath
    });

    // Register grammar with Monaco's TextMate service
    await this.registerTextMateGrammar(
      grammarContrib.language,
      grammarContrib.scopeName,
      grammarContent
    );
  }
}
```

**2. Dependencies Needed**

```bash
npm install vscode-textmate vscode-oniguruma
```

**3. TextMate Service Integration**

- Load `.tmLanguage.json` or `.tmLanguage` files
- Wire up to Monaco's tokenization
- Support for scope-based syntax highlighting

**VS Code Compatibility:**

```json
{
  "contributes": {
    "grammars": [
      {
        "language": "rust",
        "scopeName": "source.rust",
        "path": "./syntaxes/rust.tmLanguage.json"
      }
    ]
  }
}
```

---

### 📋 Phase 5: Code Snippets (PLANNED)

**Goal:** Custom code snippets from extensions

#### Implementation Plan

**1. Snippet Store** (`src/stores/snippetStore.ts`)

```typescript
interface Snippet {
  prefix: string;
  body: string | string[];
  description: string;
  scope?: string; // language scope
}

interface SnippetCollection {
  language: string;
  snippets: Record<string, Snippet>;
}
```

**2. Snippet Registration**

```typescript
private async loadSnippets(
  extension: InstalledExtension,
  manifest: ExtensionManifest
): Promise<void> {
  if (!manifest.contributes?.snippets) return;

  for (const snippetContrib of manifest.contributes.snippets) {
    const snippetPath = this.resolveExtensionPath(extension, snippetContrib.path);
    const snippets = await this.loadJsonFile(snippetPath);

    // Register with Monaco snippet controller
    monaco.languages.registerCompletionItemProvider(snippetContrib.language, {
      provideCompletionItems: (model, position) => {
        return {
          suggestions: convertSnippetsToCompletions(snippets)
        };
      }
    });
  }
}
```

**VS Code Compatibility:**

```json
{
  "contributes": {
    "snippets": [
      {
        "language": "javascript",
        "path": "./snippets/javascript.json"
      }
    ]
  }
}
```

---

### 📋 Phase 6: Commands & Keybindings (PLANNED)

**Goal:** Custom commands and keyboard shortcuts

#### Implementation Plan

**1. Command Registry** (`src/services/commandRegistry.ts`)

```typescript
interface Command {
  id: string;
  title: string;
  category?: string;
  handler: () => void | Promise<void>;
}

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  execute(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) throw new Error(`Command not found: ${commandId}`);
    return Promise.resolve(command.handler());
  }
}
```

**2. Keybinding Integration**

```typescript
private async loadKeybindings(
  extension: InstalledExtension,
  manifest: ExtensionManifest
): Promise<void> {
  if (!manifest.contributes?.keybindings) return;

  for (const keybinding of manifest.contributes.keybindings) {
    // Register with Monaco's keybinding service
    monaco.editor.addKeybindingRules([{
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K,
      command: keybinding.command,
      when: keybinding.when
    }]);
  }
}
```

---

### 📋 Phase 7: Configuration Contributions (PLANNED)

**Goal:** Extension-specific settings

```typescript
interface ConfigurationContribution {
  title: string;
  properties: Record<string, {
    type: string;
    default: any;
    description: string;
    enum?: any[];
  }>;
}
```

---

### 📋 Phase 8: Custom Views & WebViews (FUTURE)

**Goal:** Extensions can add custom UI panels

**Examples:**

- Git graph view
- Database explorer
- REST client
- Custom documentation viewers

---

## 🏗️ Technical Architecture Updates

### Extension Host Evolution

```typescript
// Current (Phase 1)
class MonacoExtensionHost {
  loadIconThemes() { }
}

// Phase 2-4
class MonacoExtensionHost {
  loadIconThemes() { }      // ✅ Done
  loadColorThemes() { }     // 🔄 Next
  loadLanguages() { }       // 🔄 Next
  loadGrammars() { }        // 🔄 Next
  loadSnippets() { }        // 📋 Future
  loadCommands() { }        // 📋 Future
  loadKeybindings() { }     // 📋 Future
  loadConfiguration() { }   // 📋 Future
}
```

### Store Pattern (Established in Phase 1)

Each contribution type gets its own store:

```
src/stores/
├── iconThemeStore.ts      ✅ Icon themes
├── colorThemeStore.ts     🔄 Color themes (merge with themeStore)
├── languageStore.ts       🔄 Language definitions
├── snippetStore.ts        📋 Code snippets
├── commandStore.ts        📋 Commands
└── extensionStore.ts      ✅ Extension lifecycle (existing)
```

### Service Layer Pattern

```
src/services/
├── extensionManager.ts           ✅ Lifecycle
├── monacoExtensionHost.ts        ✅ Loading (expandable)
├── extensionsManifest.ts         ✅ Manifest tracking
├── commandRegistry.ts            📋 Command execution
└── languageService.ts            🔄 Language integration
```

---

## 🎯 Priority Order for Next Phases

### Immediate (Next Sprint)

1. **🔄 Color Themes** - High user value, moderate complexity
   - Estimated: 3-5 days
   - Dependencies: Theme system refactor
   - User Impact: HIGH

2. **🔄 Language Support** - Core editor functionality
   - Estimated: 2-3 days
   - Dependencies: Monaco language API
   - User Impact: HIGH

3. **🔄 Grammar/Syntax** - Complements language support
   - Estimated: 4-6 days
   - Dependencies: vscode-textmate integration
   - User Impact: HIGH

### Short Term (Next Month)

4. **📋 Code Snippets** - Developer productivity
   - Estimated: 3-4 days
   - Dependencies: Monaco completion API
   - User Impact: MEDIUM

5. **📋 Commands** - Extensibility foundation
   - Estimated: 5-7 days
   - Dependencies: Command palette, menu integration
   - User Impact: MEDIUM

### Long Term (Future Quarters)

6. **📋 Keybindings** - User customization
7. **📋 Configuration** - Extension settings
8. **📋 Custom Views** - Advanced extensions

---

## 📚 Required Dependencies

### For Phase 2-4 (Themes + Languages)

```json
{
  "dependencies": {
    "vscode-textmate": "^9.0.0",
    "vscode-oniguruma": "^2.0.0"
  }
}
```

### Web Worker Setup

For heavy parsing operations (TextMate grammars):

```typescript
// src/services/grammarWorker.ts
import * as tm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

// Load in worker to avoid blocking main thread
```

---

## 🔧 Extension Compatibility Matrix

| Contribution Type | VS Code Support | Rainy Aether Status | Complexity |
|-------------------|----------------|---------------------|------------|
| Icon Themes       | ✅ Full        | ✅ **DONE**         | Low        |
| Color Themes      | ✅ Full        | 🔄 Next             | Medium     |
| Languages         | ✅ Full        | 🔄 Next             | Medium     |
| Grammars          | ✅ Full        | 🔄 Next             | High       |
| Snippets          | ✅ Full        | 📋 Planned          | Low        |
| Commands          | ✅ Full        | 📋 Planned          | Medium     |
| Keybindings       | ✅ Full        | 📋 Planned          | Medium     |
| Configuration     | ✅ Full        | 📋 Planned          | Low        |
| Debuggers         | ✅ Full        | 🔮 Future           | Very High  |
| Views             | ✅ Full        | 🔮 Future           | High       |
| Webviews          | ✅ Full        | 🔮 Future           | Very High  |
| LSP               | ✅ Full        | 🔮 Future           | Very High  |

**Legend:**

- ✅ Implemented and working
- 🔄 In progress / Next sprint
- 📋 Planned for near future
- 🔮 Long-term roadmap

---

## 🚀 Success Metrics

### Phase 1 (Icon Themes) ✅

- ✅ Can install Material Icon Theme
- ✅ Icons display in sidebar
- ✅ Theme persists across restarts
- 🟡 95%+ file types recognized (currently ~80%)

### Phase 2 (Color Themes) 🎯

- [ ] Can install popular themes (Monokai, Dracula, One Dark)
- [ ] Theme applies to editor
- [ ] Theme applies to UI (sidebar, status bar)
- [ ] Smooth theme switching

### Phase 3-4 (Languages) 🎯

- [ ] Can install language extensions (Rust, Go, Python)
- [ ] Syntax highlighting works
- [ ] Auto-completion for language
- [ ] Bracket matching & auto-close

### Phase 5+ (Advanced) 🎯

- [ ] Code snippets work
- [ ] Custom commands execute
- [ ] Keybindings customize
- [ ] Extension settings save

---

## 📖 Example: Complete Extension Support

**Example Extension:** `rust-lang.rust-analyzer`

```json
{
  "name": "rust-analyzer",
  "publisher": "rust-lang",
  "version": "0.4.1830",
  "contributes": {
    "languages": [{
      "id": "rust",
      "extensions": [".rs"],
      "aliases": ["Rust"]
    }],
    "grammars": [{
      "language": "rust",
      "scopeName": "source.rust",
      "path": "./syntaxes/rust.tmLanguage.json"
    }],
    "snippets": [{
      "language": "rust",
      "path": "./snippets/rust.json"
    }],
    "themes": [{
      "label": "Rust Theme",
      "path": "./themes/rust-theme.json"
    }],
    "iconThemes": [{
      "id": "rust-icons",
      "path": "./icons/rust-icon-theme.json"
    }]
  }
}
```

**Rainy Aether Support:**

- ✅ Icon theme loads
- 🔄 Color theme loads (Phase 2)
- 🔄 Language registration (Phase 3)
- 🔄 Syntax highlighting (Phase 4)
- 📋 Snippets (Phase 5)

---

## 🎓 Learning from Phase 1

### What Worked Well ✅

1. **Incremental approach** - Starting with icon themes was perfect
2. **VS Code compatibility** - Following their structure pays off
3. **Comprehensive logging** - Debug logs saved hours of debugging
4. **User directory** - Visible files make troubleshooting easy
5. **Manifest system** - Proper tracking from day 1

### What to Improve 🔄

1. **Path resolution** - Needs to be more robust for complex extensions
2. **Error handling** - Better user feedback when loading fails
3. **Performance** - Cache converted data (SVG → data URLs)
4. **Testing** - Automated tests for extension loading
5. **Documentation** - Keep docs updated as we build

### Apply to Future Phases

- ✅ Start with logging infrastructure
- ✅ Build comprehensive docs upfront
- ✅ Test with popular extensions early
- ✅ Get user feedback quickly
- ✅ Plan for performance from start

---

## 🤝 Community Contribution Opportunities

As we expand the extension system, community can help with:

1. **Extension Testing** - Test popular VS Code extensions
2. **Documentation** - Write guides for extension authors
3. **Example Extensions** - Create sample extensions
4. **Bug Reports** - Report compatibility issues
5. **Feature Requests** - Suggest improvements

---

## 📅 Estimated Timeline

```
Q4 2025:
├─ ✅ Phase 1: Icon Themes (DONE)
├─ 🔄 Phase 2: Color Themes (2 weeks)
├─ 🔄 Phase 3: Languages (1 week)
└─ 🔄 Phase 4: Grammars (2 weeks)

Q1 2026:
├─ 📋 Phase 5: Snippets (1 week)
├─ 📋 Phase 6: Commands (2 weeks)
└─ 📋 Phase 7: Configuration (1 week)

Q2 2026+:
└─ 🔮 Advanced features (Views, LSP, Debuggers)
```

---

## 🎯 Ultimate Goal

**Vision:** A fully extensible IDE where developers can:

- Install any VS Code extension from OpenVSX
- Customize every aspect of the editor
- Build their own extensions
- Share extensions with the community

**Current Progress:** ~15% of full extension system
**Icon Themes:** ✅ Complete foundation established
**Next Milestone:** Color themes + Language support = ~40% complete

---

*This is a living document. As we implement each phase, we'll update with learnings and adjust the roadmap.*

**Last Updated:** 2025-11-07
**Current Phase:** Phase 1 Complete, Phase 2 Starting
**Contributors:** Rainy Aether Development Team
