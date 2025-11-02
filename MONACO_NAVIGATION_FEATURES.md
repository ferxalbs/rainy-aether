# Monaco Editor Navigation & Diagnostic Features

## Overview

This document describes the Monaco-based code navigation features and unified diagnostic system implemented in Rainy Coder. These features bring VS Code-like capabilities to the editor, including breadcrumbs, Go to Definition, diagnostics tracking, and a comprehensive problems panel.

## Features Implemented

### 1. Centralized Diagnostic Service (`src/services/diagnosticService.ts`)

A unified service that collects and manages diagnostics from multiple sources:

**Features:**
- Real-time diagnostic collection from Monaco markers
- Support for multiple diagnostic sources (Monaco, TypeScript, Git, Linter, Custom)
- Severity levels: Error, Warning, Info, Hint
- Automatic subscription and notification system
- Statistics tracking (error count, warning count, etc.)

**Usage:**
```typescript
import { getDiagnosticService, DiagnosticSeverity, DiagnosticSource } from '@/services/diagnosticService';

const diagnosticService = getDiagnosticService();

// Subscribe to diagnostic changes
const unsubscribe = diagnosticService.subscribe((diagnostics, stats) => {
  console.log(`Errors: ${stats.errors}, Warnings: ${stats.warnings}`);
});

// Add custom diagnostic
diagnosticService.addDiagnostic({
  id: 'custom-1',
  source: DiagnosticSource.Custom,
  severity: DiagnosticSeverity.Warning,
  message: 'Custom warning message',
  file: 'file:///path/to/file.ts',
  line: 10,
  column: 5
});

// Clean up
unsubscribe();
```

### 2. Enhanced Breadcrumbs (`src/components/ide/Breadcrumbs.tsx`)

Improved breadcrumb navigation with better symbol detection:

**Features:**
- Pattern-based symbol extraction for TypeScript/JavaScript, HTML, CSS, and Rust
- Real-time cursor position tracking
- Click-to-navigate functionality
- Visual indicators for different symbol types (functions, classes, interfaces, etc.)
- Color-coded symbols for easy identification

**Supported Patterns:**
- **TypeScript/JavaScript:** Functions, arrow functions, classes, interfaces
- **HTML:** ID attributes
- **CSS:** Selectors
- **Rust:** Functions (`fn`), structs

### 3. Code Navigation Actions (`src/stores/editorStore.ts`)

Added comprehensive navigation actions to the editor store:

**Available Actions:**
- `goToDefinition()` - Jump to symbol definition (F12)
- `peekDefinition()` - Peek at definition inline (Alt+F12)
- `goToTypeDefinition()` - Jump to type definition
- `goToImplementation()` - Jump to implementation (Ctrl+F12)
- `findAllReferences()` - Find all references to symbol (Shift+F12)
- `renameSymbol()` - Rename symbol across files (F2)
- `showOutline()` - Show document outline (Ctrl+Shift+O)
- `formatDocument()` - Format document (Shift+Alt+F)
- `toggleComment()` - Toggle line comment (Ctrl+/)

**Usage:**
```typescript
import { editorActions } from '@/stores/editorStore';

// Go to definition
editorActions.goToDefinition();

// Peek definition
editorActions.peekDefinition();

// Rename symbol
editorActions.renameSymbol();
```

### 4. Integrated Status Bar (`src/components/ide/StatusBar.tsx`)

Updated status bar with real-time diagnostic information:

**Features:**
- Real-time error and warning counts from diagnostic service
- Visual indicators (icons and colors) for problem severity
- Git status integration
- Editor information (language, encoding, cursor position, indentation)
- Theme display

**Integration:**
- Automatically subscribes to diagnostic service
- Updates in real-time as problems are detected/resolved
- Color-coded problem indicators (red for errors, yellow for warnings, green for no problems)

### 5. Problems Panel (`src/components/ide/ProblemsPanel.tsx`)

Comprehensive problems panel for detailed diagnostic viewing:

**Features:**
- Grouped diagnostics by file
- Filter by severity (All, Errors, Warnings, Info)
- Source badges (Monaco, TypeScript, Git, Linter)
- Clickable items (ready for navigation implementation)
- Real-time updates from diagnostic service
- Problem counts in header
- Severity icons and color coding

**Usage:**
```tsx
import ProblemsPanel from '@/components/ide/ProblemsPanel';

<ProblemsPanel 
  onClose={() => console.log('Close panel')}
  className="h-64"
/>
```

## Architecture

### Diagnostic Flow

```
Monaco Editor Markers
       ↓
Diagnostic Service (Central Hub)
       ↓
    ┌──┴──┐
    ↓     ↓
StatusBar  ProblemsPanel
```

1. **Monaco Editor** emits marker changes when code is analyzed
2. **Diagnostic Service** listens to marker changes and converts them to diagnostics
3. **StatusBar** subscribes to show summary statistics
4. **ProblemsPanel** subscribes to show detailed problem list

### Symbol Detection Flow

```
Editor Content Change
       ↓
Breadcrumbs Component
       ↓
Pattern Matching (Regex)
       ↓
Symbol Extraction
       ↓
Cursor Position Tracking
       ↓
Display Current Path
```

## Integration Points

### Adding the Problems Panel to IDE

To integrate the Problems Panel into your IDE layout:

```tsx
import ProblemsPanel from '@/components/ide/ProblemsPanel';

// In your IDE component
const [showProblems, setShowProblems] = useState(false);

<div className="ide-layout">
  {/* Editor area */}
  <div className="editor-container">
    {/* Your editor */}
  </div>
  
  {/* Problems panel (bottom) */}
  {showProblems && (
    <ProblemsPanel 
      onClose={() => setShowProblems(false)}
      className="h-64 border-t"
    />
  )}
</div>
```

### Keyboard Shortcuts

Recommended keyboard shortcuts for navigation features:

| Action | Shortcut | Function |
|--------|----------|----------|
| Go to Definition | F12 | `editorActions.goToDefinition()` |
| Peek Definition | Alt+F12 | `editorActions.peekDefinition()` |
| Go to Implementation | Ctrl+F12 | `editorActions.goToImplementation()` |
| Find References | Shift+F12 | `editorActions.findAllReferences()` |
| Rename Symbol | F2 | `editorActions.renameSymbol()` |
| Show Outline | Ctrl+Shift+O | `editorActions.showOutline()` |
| Format Document | Shift+Alt+F | `editorActions.formatDocument()` |
| Toggle Comment | Ctrl+/ | `editorActions.toggleComment()` |

### Adding Custom Diagnostics

You can add diagnostics from custom sources (e.g., custom linters, Git hooks):

```typescript
import { getDiagnosticService, DiagnosticSeverity, DiagnosticSource } from '@/services/diagnosticService';

const diagnosticService = getDiagnosticService();

// Add Git-related diagnostic
diagnosticService.addDiagnostic({
  id: 'git-merge-conflict-1',
  source: DiagnosticSource.Git,
  severity: DiagnosticSeverity.Error,
  message: 'Merge conflict detected',
  file: 'file:///path/to/conflicted-file.ts',
  line: 42,
  column: 1
});

// Add custom linter diagnostic
diagnosticService.addDiagnostic({
  id: 'custom-lint-1',
  source: DiagnosticSource.Linter,
  severity: DiagnosticSeverity.Warning,
  message: 'Prefer const over let',
  file: 'file:///path/to/file.ts',
  line: 10,
  column: 5,
  code: 'prefer-const'
});
```

## Benefits

1. **Unified Diagnostic System**: All errors, warnings, and info messages from different sources are centralized
2. **Real-time Updates**: Status bar and problems panel update automatically as you type
3. **VS Code-like Experience**: Familiar navigation patterns and keyboard shortcuts
4. **Extensible**: Easy to add new diagnostic sources or navigation features
5. **Performance**: Efficient subscription model prevents unnecessary re-renders
6. **Type-safe**: Full TypeScript support with proper interfaces

## Future Enhancements

Potential improvements for future iterations:

1. **Click-to-navigate** in Problems Panel (jump to diagnostic location)
2. **Quick fixes** integration (show available code actions)
3. **Diagnostic filtering** by source
4. **Export diagnostics** to file
5. **Custom diagnostic providers** API
6. **Diagnostic history** tracking
7. **Performance metrics** for diagnostic collection
8. **Multi-file diagnostics** aggregation
9. **Diagnostic severity customization**
10. **Integration with external linters** (ESLint, Prettier, etc.)

## Testing

To test the implementation:

1. **Breadcrumbs**: Open a TypeScript/JavaScript file and observe breadcrumbs updating as you move the cursor
2. **Diagnostics**: Create syntax errors and watch the status bar update
3. **Navigation**: Use F12 on a symbol to jump to its definition
4. **Problems Panel**: Open the panel and verify diagnostics are displayed correctly
5. **Real-time Updates**: Type code and observe real-time diagnostic updates

## Troubleshooting

### Breadcrumbs not showing
- Ensure the editor instance is properly registered with `editorActions.registerView()`
- Check that the file has a supported language (TypeScript, JavaScript, HTML, CSS, Rust)

### Diagnostics not updating
- Verify the diagnostic service is initialized: `getDiagnosticService()`
- Check Monaco editor markers are being emitted
- Ensure components are properly subscribed to the service

### Navigation not working
- Verify Monaco editor has focus
- Check that the language service is loaded for the file type
- Ensure the editor action exists for the current language

## Conclusion

This implementation provides a robust foundation for code navigation and diagnostic management in Rainy Coder. The modular architecture allows for easy extension and customization while maintaining performance and type safety.
