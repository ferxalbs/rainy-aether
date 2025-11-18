import { useCallback, useEffect, useRef, useState, memo } from 'react';
import * as monaco from 'monaco-editor';
import { editorActions } from '../../stores/editorStore';
import { getCurrentTheme, subscribeToThemeChanges } from '../../stores/themeStore';
import { configureMonaco, getLanguageFromFilename } from '../../services/monacoConfig';
import { configurationService } from '../../services/configurationService';
import { applyEditorConfiguration } from '../../services/editorConfigurationService';

// Helper: Monaco expects hex colors WITHOUT the '#' prefix
const toMonacoColor = (color: string): string => {
  return color.startsWith('#') ? color.substring(1) : color;
};

interface MonacoEditorProps {
  value: string;
  language?: 'javascript' | 'html' | 'css' | 'markdown' | 'rust';
  onChange?: (value: string) => void;
  readOnly?: boolean;
  filename?: string; // Optional filename for better language detection
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  value,
  language = 'javascript',
  onChange,
  readOnly = false,
  filename,
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

  // Memoize theme creation based on actual theme properties
  const createMonacoTheme = useCallback(() => {
    const theme = themeRef.current;
    const isDark = theme.mode === 'night' ||
      theme.variables['--bg-editor'] === '#0f172a' ||
      theme.variables['--bg-editor'] === '#1c1917' ||
      theme.variables['--bg-editor'] === '#2d2a26';

    const themeName = `custom-theme-${theme.mode}-${theme.name.replace(/\s+/g, '-')}`;

    monaco.editor.defineTheme(themeName, {
      base: isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        // Comments
        { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },

        // Keywords
        { token: 'keyword', foreground: toMonacoColor(theme.variables['--accent-primary']), fontStyle: 'bold' },
        { token: 'control.keyword', foreground: toMonacoColor(theme.variables['--accent-primary']), fontStyle: 'bold' },

        // Strings
        { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
        { token: 'string.escape', foreground: isDark ? 'D7BA7D' : 'EE0000' },

        // Numbers
        { token: 'number', foreground: isDark ? 'B5CEA8' : '098658' },

        // Functions
        { token: 'identifier.function', foreground: isDark ? 'DCDCAA' : '795E26' },

        // Variables and properties
        { token: 'variable', foreground: toMonacoColor(theme.variables['--text-editor']) },
        { token: 'property', foreground: isDark ? '9CDCFE' : '0451A5' },
        { token: 'attribute.name', foreground: isDark ? '92C5F8' : '0451A5' },

        // Types and classes
        { token: 'type', foreground: isDark ? '4EC9B0' : '267F99' },
        { token: 'class.name', foreground: isDark ? '4EC9B0' : '267F99' },

        // Operators and punctuation
        { token: 'operator', foreground: toMonacoColor(theme.variables['--text-editor']) },
        { token: 'delimiter', foreground: toMonacoColor(theme.variables['--text-editor']) },
        { token: 'delimiter.bracket', foreground: isDark ? 'FFD700' : '0431FA' },
        { token: 'delimiter.parenthesis', foreground: toMonacoColor(theme.variables['--text-editor']) },

        // HTML tags
        { token: 'tag', foreground: isDark ? '569CD6' : '800000' },
        { token: 'tag.attribute.name', foreground: isDark ? '92C5F8' : '0451A5' },

        // CSS
        { token: 'attribute.value', foreground: isDark ? 'D19A66' : '0451A5' },
        { token: 'unit', foreground: isDark ? 'B5CEA8' : '098658' },

        // Markdown
        { token: 'heading', foreground: toMonacoColor(theme.variables['--accent-primary']), fontStyle: 'bold' },
        { token: 'emphasis', fontStyle: 'italic' },
        { token: 'strong', fontStyle: 'bold' },
        { token: 'link', foreground: toMonacoColor(theme.variables['--accent-secondary']) },

        // Invalid
        { token: 'invalid', foreground: isDark ? 'F44747' : 'CD3131', fontStyle: 'underline' },
      ],
      colors: {
        // Colors object KEEPS the # prefix (different from rules array!)
        'editor.background': theme.variables['--bg-editor'],
        'editor.foreground': theme.variables['--text-editor'],
        'editor.lineHighlightBackground': isDark ? '#ffffff0d' : '#0000000d',
        'editor.selectionBackground': theme.variables['--accent-primary'] + '40',
        'editor.inactiveSelectionBackground': theme.variables['--accent-primary'] + '30',
        'editorCursor.foreground': theme.variables['--accent-primary'],
        'editorWhitespace.foreground': isDark ? '#ffffff33' : '#00000033',
        'editorIndentGuide.background': isDark ? '#ffffff1a' : '#0000001a',
        'editorIndentGuide.activeBackground': isDark ? '#ffffff33' : '#00000033',
        'editorLineNumber.foreground': isDark ? '#ffffff66' : '#00000066',
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
        'inputValidation.errorBackground': isDark ? '#F447471a' : '#CD31311a',
        'inputValidation.errorBorder': isDark ? '#F48771' : '#E51400',
        'dropdown.background': theme.variables['--bg-secondary'],
        'dropdown.border': theme.variables['--border-color'],
        'button.background': theme.variables['--accent-primary'],
        'button.foreground': isDark ? '#ffffff' : '#000000',
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

    // Configure Monaco language services (only runs once)
    configureMonaco();

    const themeName = createMonacoTheme();
    monaco.editor.setTheme(themeName);

    // Create a proper URI for the model (helps Monaco language services)
    const modelUri = monaco.Uri.parse(
      filename
        ? `file:///${filename}`
        : `file:///untitled-${Date.now()}.${language === 'javascript' ? 'ts' : language}`
    );

    // Determine the language from filename if available
    const detectedLanguage = filename
      ? getLanguageFromFilename(filename)
      : getMonacoLanguage();

    // Create or get existing model
    let model = monaco.editor.getModel(modelUri);
    if (!model) {
      model = monaco.editor.createModel(value, detectedLanguage, modelUri);
    }

    // Get editor configuration from configuration service
    const fontSize = configurationService.get<number>('editor.fontSize', 14);
    const fontFamily = configurationService.get<string>('editor.fontFamily', 'Consolas, "Courier New", monospace');
    const tabSize = configurationService.get<number>('editor.tabSize', 4);
    const insertSpaces = configurationService.get<boolean>('editor.insertSpaces', true);
    const wordWrap = configurationService.get<string>('editor.wordWrap', 'off');
    const lineNumbers = configurationService.get<string>('editor.lineNumbers', 'on');
    const minimapEnabled = configurationService.get<boolean>('editor.minimap.enabled', true);

    const editor = monaco.editor.create(container, {
      model,
      theme: themeName,
      readOnly,
      automaticLayout: false, // Disable automatic layout, we'll handle it manually
      fontSize,
      fontFamily,
      tabSize,
      insertSpaces,
      lineNumbers: lineNumbers as 'on' | 'off' | 'relative' | 'interval',
      minimap: { enabled: minimapEnabled },
      scrollBeyondLastLine: false,
      wordWrap: wordWrap as 'off' | 'on' | 'wordWrapColumn' | 'bounded',
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

    // Apply editor configuration (this will re-apply settings from configurationService)
    applyEditorConfiguration(editor);

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
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);

      // Small delay to ensure observer callbacks complete before disposal
      // This prevents race conditions where layout() is called on a disposed editor
      setTimeout(() => {
        editorActions.unregisterView(editor as any);
        disposable.dispose();

        // Dispose editor but keep the model alive for reuse
        editor.dispose();

        if (editorRef.current === editor) {
          editorRef.current = null;
        }
      }, 0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, filename]);

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

// Memoize component to prevent unnecessary re-renders
const MonacoEditor = memo(MonacoEditorComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.value === nextProps.value &&
    prevProps.language === nextProps.language &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.filename === nextProps.filename &&
    prevProps.onChange === nextProps.onChange
  );
});

export default MonacoEditor;
