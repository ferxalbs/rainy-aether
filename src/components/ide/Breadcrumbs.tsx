import React, { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { ChevronRight, File, Package, Code, Variable, Braces, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: monaco.languages.SymbolKind;
  range: monaco.Range;
  selectionRange: monaco.Range;
  children?: DocumentSymbol[];
}

interface BreadcrumbsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ editor, className }) => {
  const [currentPath, setCurrentPath] = useState<DocumentSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get icon for symbol kind
  const getSymbolIcon = (kind: monaco.languages.SymbolKind) => {
    const iconProps = { size: 14, className: "text-muted-foreground" };
    
    switch (kind) {
      case monaco.languages.SymbolKind.File:
        return <File {...iconProps} />;
      case monaco.languages.SymbolKind.Module:
      case monaco.languages.SymbolKind.Package:
        return <Package {...iconProps} />;
      case monaco.languages.SymbolKind.Function:
      case monaco.languages.SymbolKind.Method:
        return <Code {...iconProps} />;
      case monaco.languages.SymbolKind.Variable:
        return <Variable {...iconProps} />;
      case monaco.languages.SymbolKind.Class:
        return <Braces {...iconProps} />;
      case monaco.languages.SymbolKind.Interface:
        return <Layers {...iconProps} />;
      default:
        return <File {...iconProps} />;
    }
  };

  // Get symbol color based on kind
  const getSymbolColor = (kind: monaco.languages.SymbolKind) => {
    switch (kind) {
      case monaco.languages.SymbolKind.Function:
      case monaco.languages.SymbolKind.Method:
        return 'text-blue-500';
      case monaco.languages.SymbolKind.Class:
      case monaco.languages.SymbolKind.Interface:
        return 'text-purple-500';
      case monaco.languages.SymbolKind.Variable:
        return 'text-green-500';
      case monaco.languages.SymbolKind.Module:
      case monaco.languages.SymbolKind.Package:
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  // Find symbol at current cursor position
  const findCurrentSymbol = (symbols: DocumentSymbol[], position: monaco.Position): DocumentSymbol[] => {
    for (const symbol of symbols) {
      if (symbol.range.containsPosition(position)) {
        const path = [symbol];
        
        // Check children
        if (symbol.children) {
          const childPath = findCurrentSymbol(symbol.children, position);
          if (childPath.length > 0) {
            return path.concat(childPath);
          }
        }
        
        return path;
      }
    }
    return [];
  };

  // Extract symbols using pattern matching (works reliably across languages)
  const extractSymbols = (model: monaco.editor.ITextModel): DocumentSymbol[] => {
    const symbols: DocumentSymbol[] = [];
    const lines = model.getValue().split('\n');
    const languageId = model.getLanguageId();

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // TypeScript/JavaScript patterns
      if (languageId === 'typescript' || languageId === 'javascript') {
        // Functions: function name() or const name = () =>
        const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|(\w+)\s*:\s*\([^)]*\)\s*=>)/);
        if (funcMatch) {
          const name = funcMatch[1] || funcMatch[2] || funcMatch[3];
          if (name) {
            symbols.push({
              name,
              kind: monaco.languages.SymbolKind.Function,
              range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
              selectionRange: new monaco.Range(lineNumber, line.indexOf(name) + 1, lineNumber, line.indexOf(name) + name.length + 1)
            });
          }
        }

        // Classes
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            kind: monaco.languages.SymbolKind.Class,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, line.indexOf(classMatch[1]) + 1, lineNumber, line.indexOf(classMatch[1]) + classMatch[1].length + 1)
          });
        }

        // Interfaces
        const interfaceMatch = line.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
          symbols.push({
            name: interfaceMatch[1],
            kind: monaco.languages.SymbolKind.Interface,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, line.indexOf(interfaceMatch[1]) + 1, lineNumber, line.indexOf(interfaceMatch[1]) + interfaceMatch[1].length + 1)
          });
        }
      }

      // HTML patterns
      if (languageId === 'html') {
        const idMatch = line.match(/id=["']([^"']+)["']/);
        if (idMatch) {
          symbols.push({
            name: `#${idMatch[1]}`,
            kind: monaco.languages.SymbolKind.Variable,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, line.indexOf(idMatch[1]) + 1, lineNumber, line.indexOf(idMatch[1]) + idMatch[1].length + 1)
          });
        }
      }

      // CSS patterns
      if (languageId === 'css') {
        const selectorMatch = line.match(/^([.#]?[\w-]+)\s*\{/);
        if (selectorMatch) {
          symbols.push({
            name: selectorMatch[1],
            kind: monaco.languages.SymbolKind.Class,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, 1, lineNumber, selectorMatch[1].length + 1)
          });
        }
      }

      // Rust patterns
      if (languageId === 'rust') {
        const fnMatch = line.match(/fn\s+(\w+)/);
        if (fnMatch) {
          symbols.push({
            name: fnMatch[1],
            kind: monaco.languages.SymbolKind.Function,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, line.indexOf(fnMatch[1]) + 1, lineNumber, line.indexOf(fnMatch[1]) + fnMatch[1].length + 1)
          });
        }

        const structMatch = line.match(/struct\s+(\w+)/);
        if (structMatch) {
          symbols.push({
            name: structMatch[1],
            kind: monaco.languages.SymbolKind.Struct,
            range: new monaco.Range(lineNumber, 1, lineNumber, line.length + 1),
            selectionRange: new monaco.Range(lineNumber, line.indexOf(structMatch[1]) + 1, lineNumber, line.indexOf(structMatch[1]) + structMatch[1].length + 1)
          });
        }
      }
    });

    return symbols;
  };

  // Update symbols and current path
  const updateSymbols = async () => {
    if (!editor) return;

    setIsLoading(true);
    try {
      const model = editor.getModel();
      if (!model) return;

      const symbols = extractSymbols(model);

      // Update current path based on cursor position
      const position = editor.getPosition();
      if (position) {
        const path = findCurrentSymbol(symbols, position);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Failed to get document symbols:', error);
      setCurrentPath([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to symbol
  const navigateToSymbol = (symbol: DocumentSymbol) => {
    if (!editor) return;
    
    editor.setPosition(symbol.selectionRange.getStartPosition());
    editor.revealRangeInCenter(symbol.selectionRange);
    editor.focus();
  };

  // Update symbols on content change and cursor position change
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      updateSymbols();
    };

    // Update on content change
    const contentDisposable = editor.onDidChangeModelContent(updateHandler);
    
    // Update on cursor position change
    const cursorDisposable = editor.onDidChangeCursorPosition(updateHandler);

    // Initial update
    updateHandler();

    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
    };
  }, [editor]);

  if (!editor || currentPath.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 px-3 py-1 text-sm border-b border-border bg-muted/30", className)}>
      {/* File name as root */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <File size={14} />
        <span>{editor.getModel()?.uri.path.split('/').pop() || 'Untitled'}</span>
      </div>

      {/* Breadcrumb path */}
      {currentPath.map((symbol, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-muted-foreground" />
          <button
            onClick={() => navigateToSymbol(symbol)}
            className={cn(
              "flex items-center gap-1 px-1 py-0.5 rounded hover:bg-muted transition-colors",
              getSymbolColor(symbol.kind)
            )}
            title={symbol.detail || symbol.name}
          >
            {getSymbolIcon(symbol.kind)}
            <span className="truncate max-w-24">{symbol.name}</span>
          </button>
        </React.Fragment>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="ml-2 text-xs text-muted-foreground animate-pulse">
          Scanning...
        </div>
      )}
    </div>
  );
};

export default Breadcrumbs;
