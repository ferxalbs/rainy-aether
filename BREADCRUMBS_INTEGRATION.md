# Breadcrumbs & Monaco Integration Enhancement

## Overview

This document describes the comprehensive integration of VS Code-like breadcrumbs functionality with Monaco Editor in Rainy Coder. The implementation replaces regex-based pattern matching with Monaco's built-in DocumentSymbolProvider API for robust, language-aware symbol extraction.

## Changes Made

### 1. Monaco Configuration Service (`src/services/monacoConfig.ts`)

**Purpose**: Centralized configuration for Monaco's language services

**Features**:
- TypeScript/JavaScript compiler options configuration
- HTML formatting and suggestions
- CSS linting rules
- JSON schema validation
- Language detection from file extensions
- Single initialization pattern (runs once)

**Key Functions**:
- `configureMonaco()`: Sets up all language services with proper compiler options
- `getLanguageFromFilename(filename)`: Maps file extensions to Monaco language IDs

**Supported Languages**:
- TypeScript/JavaScript (with JSX support)
- HTML/XML/SVG
- CSS/SCSS/SASS/LESS
- JSON (with comments support)
- Markdown
- Rust, Python, Go, Java, C/C++, Shell, SQL, and more

### 2. Symbol Service (`src/services/symbolService.ts`)

**Purpose**: Extract and manipulate document symbols using Monaco's API

**Core Features**:
- Uses `monaco.languages.executeDocumentSymbolProvider()` instead of regex
- Hierarchical symbol tree with parent-child relationships
- Position-based symbol path finding
- Symbol searching and filtering

**Key Functions**:

```typescript
// Get all document symbols from Monaco's language services
getDocumentSymbols(model: ITextModel): Promise<SymbolNode[]>

// Find the symbol path at a cursor position
findSymbolPathAtPosition(symbols: SymbolNode[], position: Position): SymbolNode[]

// Get human-readable symbol kind name
getSymbolKindName(kind: SymbolKind): string

// Flatten symbol tree for outline views
flattenSymbols(symbols: SymbolNode[]): Array<SymbolNode & { level: number }>

// Get symbols by kind (e.g., all functions)
getSymbolsByKind(symbols: SymbolNode[], kind: SymbolKind): SymbolNode[]

// Search symbols by name
searchSymbols(symbols: SymbolNode[], query: string): SymbolNode[]
```

**Symbol Types Supported**:
- File, Module, Namespace, Package
- Class, Interface, Struct, Enum
- Function, Method, Constructor
- Variable, Property, Field, Constant
- And all other Monaco symbol kinds

### 3. Enhanced Breadcrumbs Component (`src/components/ide/Breadcrumbs.tsx`)

**Before**: Used regex patterns to manually extract symbols from code

**After**: Uses Monaco's DocumentSymbolProvider API for accurate symbol extraction

**Key Improvements**:

1. **Accurate Symbol Detection**:
   - Leverages Monaco's language-specific parsers
   - Supports all languages Monaco supports out of the box
   - Handles complex nested structures (classes with methods, modules with functions, etc.)

2. **Real-time Updates**:
   - Debounced cursor position tracking (150ms)
   - Debounced content changes (500ms)
   - Model change detection (file switching)

3. **Better UI/UX**:
   - Shows filename even when no symbols present
   - Loading indicator during symbol extraction
   - "No symbols" hint when appropriate
   - Color-coded symbols by type (functions = blue, classes = purple, etc.)
   - More comprehensive icon set (20+ symbol kinds)

4. **Navigation**:
   - Click any breadcrumb to jump to that symbol
   - Smooth scrolling to symbol location
   - Auto-focus editor after navigation

**Symbol Colors**:
- Functions/Methods: Blue
- Classes/Structs: Purple
- Interfaces/Enums: Cyan
- Variables/Properties: Green
- Modules/Namespaces: Orange
- Constants: Red

### 4. Enhanced Monaco Editor (`src/components/ide/MonacoEditor.tsx`)

**Key Changes**:

1. **Language Service Configuration**:
   - Calls `configureMonaco()` on mount
   - Enables IntelliSense, syntax checking, and symbol providers

2. **Proper Model URIs**:
   - Creates models with file URIs (e.g., `file:///path/to/file.ts`)
   - Helps Monaco's language services recognize file types
   - Enables better IntelliSense and symbol resolution

3. **Filename-Based Language Detection**:
   - Accepts optional `filename` prop
   - Auto-detects language from extension
   - Falls back to explicit language prop

4. **Model Reuse**:
   - Models are reused across editor instances
   - Improves performance and maintains state
   - Proper cleanup on unmount

### 5. Updated FileViewer (`src/components/ide/FileViewer.tsx`)

**Changes**:
- Passes `filename` prop to MonacoEditor
- Enables proper language detection and symbol extraction

## Architecture Flow

```
User opens file
    ↓
FileViewer passes filename to MonacoEditor
    ↓
MonacoEditor creates model with proper URI (file:///path/to/file.ts)
    ↓
Monaco language services activate for the file type
    ↓
Breadcrumbs component requests symbols via executeDocumentSymbolProvider()
    ↓
Monaco's TypeScript/JavaScript/etc. language service returns symbol tree
    ↓
Symbol service finds symbol path at cursor position
    ↓
Breadcrumbs displays: Filename > Class > Method
```

## Benefits

### 1. **Accuracy**
- Uses Monaco's AST-based symbol extraction
- No false positives from regex matching
- Handles complex syntax (generics, decorators, async/await, etc.)

### 2. **Language Support**
- Works with all Monaco-supported languages
- TypeScript gets full type information
- HTML gets tag and attribute symbols
- CSS gets selector symbols
- And many more...

### 3. **Performance**
- Debounced updates prevent excessive re-computation
- Async symbol extraction doesn't block UI
- Model reuse reduces memory overhead

### 4. **Maintainability**
- No need to write/maintain regex patterns for each language
- Leverages Monaco's built-in, battle-tested parsers
- Easy to extend with new symbol features

### 5. **Deep Integration**
- Same symbol data used by outline view (future)
- Supports Go to Symbol (Ctrl+Shift+O)
- Enables semantic features like Find References

## Usage Examples

### For Users

1. **Navigate Code**:
   - Open a TypeScript/JavaScript file
   - See breadcrumbs: `filename.ts > MyClass > myMethod`
   - Click any breadcrumb to jump to that location

2. **Track Context**:
   - Move cursor around in large files
   - Breadcrumbs show your current position in the code hierarchy
   - Quickly understand "where am I?" in the file

3. **Quick Navigation**:
   - Click parent breadcrumb to jump to class definition
   - Click function breadcrumb to jump to function start
   - Faster than scrolling or searching

### For Developers

1. **Add New Symbol Features**:
```typescript
import { getDocumentSymbols } from '@/services/symbolService';

// Get all functions in the current file
const model = editor.getModel();
const symbols = await getDocumentSymbols(model);
const functions = getSymbolsByKind(symbols, SymbolKind.Function);
```

2. **Create Outline View**:
```typescript
import { flattenSymbols } from '@/services/symbolService';

const symbols = await getDocumentSymbols(model);
const flatList = flattenSymbols(symbols);
// Render as tree with indentation based on 'level'
```

3. **Symbol Search**:
```typescript
import { searchSymbols } from '@/services/symbolService';

const results = searchSymbols(symbols, 'handleClick');
// Returns all symbols matching 'handleClick'
```

## Future Enhancements

Based on this foundation, we can now implement:

1. **Outline Panel**: Tree view of all symbols in the file
2. **Go to Symbol**: Search and jump to any symbol (Ctrl+Shift+O)
3. **Breadcrumb Dropdown**: Click breadcrumb to see siblings at that level
4. **Semantic Highlighting**: Color code based on symbol type
5. **Symbol Hierarchy**: Show inheritance and implementation chains
6. **Cross-file Navigation**: Jump to symbol definitions in other files
7. **Workspace Symbols**: Search symbols across entire project

## Testing

To verify the integration:

1. **Open a TypeScript file** with classes and methods
2. **Check breadcrumbs** show: Filename > ClassName > methodName
3. **Move cursor** to different methods, verify breadcrumbs update
4. **Click breadcrumbs** to navigate to symbols
5. **Test with other languages** (HTML, CSS, Rust, etc.)

## Troubleshooting

### Breadcrumbs not showing

**Possible causes**:
- File language not supported by Monaco
- No symbols in the file (e.g., empty file or plain text)
- Monaco language service not initialized

**Solutions**:
1. Check console for errors
2. Verify `configureMonaco()` was called
3. Check if file has a proper extension
4. Try a TypeScript/JavaScript file first

### Symbols not updating

**Possible causes**:
- Debounce delay (wait 150-500ms)
- Syntax errors in the file
- Language service not responding

**Solutions**:
1. Wait for debounce timeout
2. Fix syntax errors
3. Check Monaco language service status
4. Refresh the editor

### Wrong language detected

**Possible causes**:
- Incorrect file extension
- Language override not working

**Solutions**:
1. Verify file has correct extension
2. Check `getLanguageFromFilename()` mapping
3. Pass explicit `language` prop if needed

## Technical Notes

### Symbol Provider Priority

Monaco uses multiple symbol providers:
1. Built-in TypeScript/JavaScript provider (for .ts, .js, .tsx, .jsx)
2. Built-in HTML provider (for .html)
3. Built-in CSS provider (for .css, .scss, .sass, .less)
4. Built-in JSON provider (for .json)
5. Other language providers registered by Monaco

The `executeDocumentSymbolProvider()` API automatically selects the right provider based on the model's language.

### Model URIs

Using proper URIs is crucial:
- Format: `file:///path/to/filename.ext`
- Monaco uses URI to determine language
- Language services use URI for cross-file features
- Enables import resolution in TypeScript

### Performance Considerations

- Symbol extraction is async (doesn't block UI)
- Results are cached by Monaco
- Debouncing prevents excessive API calls
- Model reuse reduces memory usage

## Conclusion

This integration brings Rainy Coder's breadcrumbs to parity with VS Code by leveraging Monaco's powerful language services. The implementation is robust, maintainable, and extensible, providing a solid foundation for future code navigation features.
