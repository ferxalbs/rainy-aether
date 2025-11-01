import { useCallback, useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { editorActions } from '../../stores/editorStore';
import { getCurrentTheme, subscribeToThemeChanges } from '../../stores/themeStore';

interface MonacoEditorProps {
  value: string;
  language?: 'javascript' | 'html' | 'css' | 'markdown' | 'rust';
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language = 'javascript',
  onChange,
  readOnly = false,
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef<typeof onChange>(onChange);
  const themeRef = useRef(getCurrentTheme());
  const isMountedRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const getMonacoLanguage = useCallback(() => {
    switch (language) {
      case 'javascript':
        return 'typescript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'markdown':
        return 'markdown';
      case 'rust':
        return 'rust';
      default:
        return 'typescript';
    }
  }, [language]);

  const createMonacoTheme = useCallback(() => {
    const theme = themeRef.current;
    const isDark = theme.mode === 'night' ||
      theme.variables['--bg-editor'] === '#0f172a' ||
      theme.variables['--bg-editor'] === '#1c1917' ||
      theme.variables['--bg-editor'] === '#2d2a26';

    const themeName = `custom-theme-${theme.mode}`;
    
    monaco.editor.defineTheme(themeName, {
      base: isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        // Comments
        { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
        
        // Keywords
        { token: 'keyword', foreground: theme.variables['--accent-primary'], fontStyle: 'bold' },
        { token: 'control.keyword', foreground: theme.variables['--accent-primary'], fontStyle: 'bold' },
        
        // Strings
        { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
        { token: 'string.escape', foreground: isDark ? 'D7BA7D' : 'EE0000' },
        
        // Numbers
        { token: 'number', foreground: isDark ? 'B5CEA8' : '098658' },
        
        // Functions
        { token: 'identifier.function', foreground: isDark ? 'DCDCAA' : '795E26' },
        
        // Variables and properties
        { token: 'variable', foreground: theme.variables['--text-editor'] },
        { token: 'property', foreground: isDark ? '9CDCFE' : '0451A5' },
        { token: 'attribute.name', foreground: isDark ? '92C5F8' : '0451A5' },
        
        // Types and classes
        { token: 'type', foreground: isDark ? '4EC9B0' : '267F99' },
        { token: 'class.name', foreground: isDark ? '4EC9B0' : '267F99' },
        
        // Operators and punctuation
        { token: 'operator', foreground: theme.variables['--text-editor'] },
        { token: 'delimiter', foreground: theme.variables['--text-editor'] },
        { token: 'delimiter.bracket', foreground: isDark ? 'FFD700' : '0431FA' },
        { token: 'delimiter.parenthesis', foreground: theme.variables['--text-editor'] },
        
        // HTML tags
        { token: 'tag', foreground: isDark ? '569CD6' : '800000' },
        { token: 'tag.attribute.name', foreground: isDark ? '92C5F8' : '0451A5' },
        
        // CSS
        { token: 'attribute.value', foreground: isDark ? 'D19A66' : '0451A5' },
        { token: 'unit', foreground: isDark ? 'B5CEA8' : '098658' },
        
        // Markdown
        { token: 'heading', foreground: theme.variables['--accent-primary'], fontStyle: 'bold' },
        { token: 'emphasis', fontStyle: 'italic' },
        { token: 'strong', fontStyle: 'bold' },
        { token: 'link', foreground: theme.variables['--accent-secondary'] },
        
        // Invalid
        { token: 'invalid', foreground: isDark ? 'F44747' : 'CD3131', fontStyle: 'underline' },
      ],
      colors: {
        'editor.background': theme.variables['--bg-editor'],
        'editor.foreground': theme.variables['--text-editor'],
        'editor.lineHighlightBackground': isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        'editor.selectionBackground': theme.variables['--accent-primary'] + '40',
        'editor.inactiveSelectionBackground': theme.variables['--accent-primary'] + '30',
        'editorCursor.foreground': theme.variables['--accent-primary'],
        'editorWhitespace.foreground': isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        'editorIndentGuide.background': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        'editorIndentGuide.activeBackground': isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
        'editorLineNumber.foreground': isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
        'editorLineNumber.activeForeground': theme.variables['--text-editor'],
        'editorGutter.background': theme.variables['--bg-editor'],
        'editorWidget.background': theme.variables['--bg-secondary'],
        'editorWidget.border': theme.variables['--border-color'],
        'editorSuggestWidget.background': theme.variables['--bg-secondary'],
        'editorSuggestWidget.border': theme.variables['--border-color'],
        'editorSuggestWidget.selectedBackground': theme.variables['--accent-primary'],
        'input.background': theme.variables['--bg-editor'],
        'input.border': theme.variables['--border-color'],
        'input.foreground': theme.variables['--text-editor'],
        'inputValidation.errorBackground': isDark ? 'rgba(244, 71, 71, 0.1)' : 'rgba(205, 49, 49, 0.1)',
        'inputValidation.errorBorder': isDark ? 'F44747' : 'CD3131',
        'dropdown.background': theme.variables['--bg-secondary'],
        'dropdown.border': theme.variables['--border-color'],
        'button.background': theme.variables['--accent-primary'],
        'button.foreground': isDark ? 'ffffff' : '000000',
        'button.hoverBackground': theme.variables['--accent-secondary'],
        'searchEditor.findMatchBackground': theme.variables['--accent-secondary'] + '60',
        'searchEditor.findMatchBorder': theme.variables['--accent-secondary'],
        'searchEditor.findMatchHighlightBackground': theme.variables['--accent-primary'] + '80',
      }
    });

    return themeName;
  }, []);

  useEffect(() => {
    themeRef.current = getCurrentTheme();

    const unsubscribe = subscribeToThemeChanges((theme) => {
      themeRef.current = theme;
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const themeName = createMonacoTheme();
      monaco.editor.setTheme(themeName);
    });

    return unsubscribe;
  }, [createMonacoTheme]);

  useEffect(() => {
    if (!container) {
      return;
    }

    const themeName = createMonacoTheme();
    monaco.editor.setTheme(themeName);

    const editor = monaco.editor.create(container, {
      value,
      language: getMonacoLanguage(),
      theme: themeName,
      readOnly,
      automaticLayout: false, // Disable automatic layout, we'll handle it manually
      fontSize: 14,
      fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
    });

    editorRef.current = editor;
    isMountedRef.current = true;

    // Set up ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current && isMountedRef.current) {
        editorRef.current.layout();
      }
    });
    resizeObserver.observe(container);

    // Set up window resize listener as backup
    const handleWindowResize = () => {
      if (editorRef.current && isMountedRef.current) {
        editorRef.current.layout();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    // Initial layout
    setTimeout(() => {
      if (editorRef.current && isMountedRef.current) {
        editorRef.current.layout();
        editorRef.current.focus();
      }
    }, 100);

    // Register editor actions
    editorActions.registerView(editor as any, {
      toggleWrap: (enabled?: boolean) => {
        // For Monaco, we toggle word wrap directly
        const currentWordWrap = editor.getOption(monaco.editor.EditorOption.wordWrap);
        const next = typeof enabled === 'boolean' ? enabled : currentWordWrap === 'off';
        editor.updateOptions({
          wordWrap: next ? 'on' : 'off'
        });
        editorActions.setWrapEnabled(next);
      },
    });

    // Handle content changes
    const disposable = editor.onDidChangeModelContent((event) => {
      const handler = onChangeRef.current;
      if (!handler) {
        return;
      }

      // Filter out undo/redo events to prevent loops
      const isUndoRedo = event.isUndoing || event.isRedoing;
      if (isUndoRedo) {
        return;
      }

      handler(editor.getValue());
    });

    return () => {
      isMountedRef.current = false;
      editorActions.unregisterView(editor as any);
      disposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      editor.dispose();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);

  // Expose focus method
  useEffect(() => {
    if (editorRef.current && isMountedRef.current) {
      // Focus editor when component becomes active
      const timer = setTimeout(() => {
        if (editorRef.current && isMountedRef.current) {
          editorRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [value, language]); // Focus when content or language changes

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isMountedRef.current) {
      return;
    }

    const currentValue = editor.getValue();
    if (value === currentValue) {
      return;
    }

    // Only update if the change is not coming from the editor itself
    editor.setValue(value);
    
    // Trigger layout and focus after content change
    setTimeout(() => {
      if (editorRef.current && isMountedRef.current) {
        editorRef.current.layout();
        editorRef.current.focus();
      }
    }, 50);
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isMountedRef.current) {
      return;
    }

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, getMonacoLanguage());
    }
    
    editor.updateOptions({ readOnly });
    
    // Trigger layout and focus after language/readOnly change
    setTimeout(() => {
      if (editorRef.current && isMountedRef.current) {
        editorRef.current.layout();
        editorRef.current.focus();
      }
    }, 50);
  }, [getMonacoLanguage, readOnly]);

  return (
    <div
      ref={setContainer}
      className="monaco-container w-full h-full"
    />
  );
};

export default MonacoEditor;
