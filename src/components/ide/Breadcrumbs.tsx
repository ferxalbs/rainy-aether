import React, { useEffect, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { ChevronRight, File, Package, Code, Variable, Braces, Layers, Box, Zap, Key, Hash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getDocumentSymbols, findSymbolPathAtPosition, type SymbolNode } from '@/services/symbolService';

interface BreadcrumbsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ editor, className }) => {
  const [currentPath, setCurrentPath] = useState<SymbolNode[]>([]);
  const [symbols, setSymbols] = useState<SymbolNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('Untitled');

  // Get icon for symbol kind
  const getSymbolIcon = (kind: monaco.languages.SymbolKind) => {
    const iconProps = { size: 14, className: "text-muted-foreground" };

    switch (kind) {
      case monaco.languages.SymbolKind.File:
        return <File {...iconProps} />;
      case monaco.languages.SymbolKind.Module:
      case monaco.languages.SymbolKind.Namespace:
        return <Box {...iconProps} />;
      case monaco.languages.SymbolKind.Package:
        return <Package {...iconProps} />;
      case monaco.languages.SymbolKind.Function:
      case monaco.languages.SymbolKind.Method:
      case monaco.languages.SymbolKind.Constructor:
        return <Code {...iconProps} />;
      case monaco.languages.SymbolKind.Variable:
      case monaco.languages.SymbolKind.Field:
      case monaco.languages.SymbolKind.Property:
        return <Variable {...iconProps} />;
      case monaco.languages.SymbolKind.Class:
      case monaco.languages.SymbolKind.Struct:
        return <Braces {...iconProps} />;
      case monaco.languages.SymbolKind.Interface:
      case monaco.languages.SymbolKind.Enum:
        return <Layers {...iconProps} />;
      case monaco.languages.SymbolKind.Constant:
        return <Key {...iconProps} />;
      case monaco.languages.SymbolKind.Number:
      case monaco.languages.SymbolKind.String:
        return <Hash {...iconProps} />;
      case monaco.languages.SymbolKind.Event:
        return <Zap {...iconProps} />;
      default:
        return <File {...iconProps} />;
    }
  };

  // Get symbol color based on kind
  const getSymbolColor = (kind: monaco.languages.SymbolKind) => {
    switch (kind) {
      case monaco.languages.SymbolKind.Function:
      case monaco.languages.SymbolKind.Method:
      case monaco.languages.SymbolKind.Constructor:
        return 'text-blue-500 dark:text-blue-400';
      case monaco.languages.SymbolKind.Class:
      case monaco.languages.SymbolKind.Struct:
        return 'text-purple-500 dark:text-purple-400';
      case monaco.languages.SymbolKind.Interface:
      case monaco.languages.SymbolKind.Enum:
        return 'text-cyan-500 dark:text-cyan-400';
      case monaco.languages.SymbolKind.Variable:
      case monaco.languages.SymbolKind.Property:
      case monaco.languages.SymbolKind.Field:
        return 'text-green-500 dark:text-green-400';
      case monaco.languages.SymbolKind.Module:
      case monaco.languages.SymbolKind.Namespace:
        return 'text-orange-500 dark:text-orange-400';
      case monaco.languages.SymbolKind.Constant:
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  // Update path based on cursor position (fast operation using cached symbols)
  const updatePath = useCallback((currentSymbols: SymbolNode[]) => {
    if (!editor) return;
    
    const position = editor.getPosition();
    if (position && currentSymbols.length > 0) {
      const path = findSymbolPathAtPosition(currentSymbols, position);
      setCurrentPath(path);
    } else {
      setCurrentPath([]);
    }
  }, [editor]);

  // Fetch symbols from model (expensive operation)
  const fetchSymbols = useCallback(async () => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    setIsLoading(true);
    try {
      // Update filename
      const path = model.uri.path;
      const name = path.split('/').pop() || 'Untitled';
      setFileName(name);

      // Get symbols from Monaco's DocumentSymbolProvider
      const newSymbols = await getDocumentSymbols(model);
      setSymbols(newSymbols);
      
      // Update path immediately with new symbols
      updatePath(newSymbols);
    } catch (error) {
      console.error('[Breadcrumbs] Failed to fetch symbols:', error);
      setSymbols([]);
      setCurrentPath([]);
    } finally {
      setIsLoading(false);
    }
  }, [editor, updatePath]);

  // Navigate to symbol
  const navigateToSymbol = useCallback((symbol: SymbolNode) => {
    if (!editor) return;

    const position = symbol.selectionRange.getStartPosition();
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
    editor.focus();
  }, [editor]);

  // Effect for content changes and model changes (fetch symbols)
  useEffect(() => {
    if (!editor) return;

    // Initial update
    fetchSymbols();

    // Update on content change (debounced longer as it's expensive)
    let contentTimeout: number | null = null;
    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (contentTimeout !== null) {
        clearTimeout(contentTimeout);
      }
      contentTimeout = window.setTimeout(() => {
        fetchSymbols();
      }, 1000); // Debounce 1000ms
    });

    // Update when model changes (file switch)
    const modelDisposable = editor.onDidChangeModel(() => {
      fetchSymbols();
    });

    return () => {
      if (contentTimeout !== null) clearTimeout(contentTimeout);
      contentDisposable.dispose();
      modelDisposable.dispose();
    };
  }, [editor, fetchSymbols]);

  // Effect for cursor changes (update path only)
  useEffect(() => {
    if (!editor) return;

    // Update on cursor position change (fast debounce)
    let cursorTimeout: number | null = null;
    const cursorDisposable = editor.onDidChangeCursorPosition(() => {
      if (cursorTimeout !== null) {
        clearTimeout(cursorTimeout);
      }
      cursorTimeout = window.setTimeout(() => {
        updatePath(symbols);
      }, 100); // Debounce 100ms
    });

    return () => {
      if (cursorTimeout !== null) clearTimeout(cursorTimeout);
      cursorDisposable.dispose();
    };
  }, [editor, symbols, updatePath]);

  // Don't show breadcrumbs if no editor
  if (!editor) {
    return null;
  }

  // Show file name even if no symbols
  const hasSymbols = currentPath.length > 0;

  return (
    <div className={cn("flex items-center gap-1 px-3 py-1 text-sm border-b border-border bg-muted/30", className)}>
      {/* File name as root */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <File size={14} />
        <span className="font-medium">{fileName}</span>
      </div>

      {/* Breadcrumb path */}
      {hasSymbols && currentPath.map((symbol, index) => (
        <React.Fragment key={`${symbol.name}-${index}`}>
          <ChevronRight size={14} className="text-muted-foreground" />
          <button
            onClick={() => navigateToSymbol(symbol)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded hover:bg-accent/50 transition-colors",
              getSymbolColor(symbol.kind)
            )}
            title={symbol.detail || symbol.name}
            type="button"
          >
            {getSymbolIcon(symbol.kind)}
            <span className="truncate max-w-32">{symbol.name}</span>
          </button>
        </React.Fragment>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="ml-2 text-xs text-muted-foreground animate-pulse">
          •••
        </div>
      )}

      {/* No symbols hint (only show briefly) */}
      {!isLoading && !hasSymbols && (
        <div className="ml-2 text-xs text-muted-foreground/70">
          No symbols
        </div>
      )}
    </div>
  );
};

export default Breadcrumbs;
