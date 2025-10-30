import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { Theme } from '../../../themes';
import { validateThemeAccessibility } from '../../../themes/themeValidator';

// Función para crear un tema personalizado basado en el tema del store
export const createCustomCodeMirrorTheme = (theme: Theme) => {
  // Validate theme accessibility before creating CodeMirror theme
  const validation = validateThemeAccessibility(theme.variables);
  if (!validation.isWCAGAACompliant) {
    console.warn(`CodeMirror theme "${theme.displayName}" fails WCAG AA accessibility:`, validation.issues);
  }

  const isDark = theme.mode === 'night' ||
    theme.variables['--bg-editor'] === '#0f172a' ||
    theme.variables['--bg-editor'] === '#1c1917' ||
    theme.variables['--bg-editor'] === '#2d2a26';

  // Tema base del editor
  const editorTheme = EditorView.theme({
    '&': {
      color: theme.variables['--text-editor'],
      backgroundColor: theme.variables['--bg-editor'],
      fontSize: '14px',
      fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
    },
    '.cm-content': {
      padding: '16px',
      caretColor: theme.variables['--accent-primary'],
      minHeight: '100%'
    },
    '.cm-focused .cm-cursor': {
      borderLeftColor: theme.variables['--accent-primary'],
      borderLeftWidth: '2px'
    },
    '.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: theme.variables['--accent-primary'] + '40' // 25% opacity
    },
    '.cm-selectionBackground': {
      backgroundColor: theme.variables['--accent-primary'] + '30' // 19% opacity
    },
    '.cm-activeLine': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
    },
    '.cm-gutters': {
      backgroundColor: theme.variables['--bg-editor'],
      color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
      border: 'none',
      borderRight: `1px solid ${theme.variables['--border-color']}`
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 16px',
      minWidth: '40px'
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 4px',
      cursor: 'pointer'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: theme.variables['--bg-tertiary'],
      border: `1px solid ${theme.variables['--border-color']}`,
      color: theme.variables['--text-secondary'],
      borderRadius: '3px',
      padding: '0 4px',
      margin: '0 2px'
    },
    '.cm-tooltip': {
      backgroundColor: theme.variables['--bg-secondary'],
      border: `1px solid ${theme.variables['--border-color']}`,
      borderRadius: '4px',
      color: theme.variables['--text-primary']
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: theme.variables['--accent-primary'],
        color: isDark ? '#ffffff' : '#000000'
      }
    },
    '.cm-searchMatch': {
      backgroundColor: theme.variables['--accent-secondary'] + '60', // 38% opacity
      outline: `1px solid ${theme.variables['--accent-secondary']}`
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: theme.variables['--accent-primary'] + '80' // 50% opacity
    },
    '.cm-panels': {
      backgroundColor: theme.variables['--bg-secondary'],
      color: theme.variables['--text-primary'],
      borderTop: `1px solid ${theme.variables['--border-color']}`
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: `1px solid ${theme.variables['--border-color']}`,
      borderTop: 'none'
    },
    '.cm-button': {
      backgroundColor: theme.variables['--accent-primary'],
      color: isDark ? '#ffffff' : '#000000',
      border: 'none',
      borderRadius: '3px',
      padding: '4px 8px',
      cursor: 'pointer'
    },
    '.cm-button:hover': {
      backgroundColor: theme.variables['--accent-secondary']
    },
    '.cm-textfield': {
      backgroundColor: theme.variables['--bg-editor'],
      border: `1px solid ${theme.variables['--border-color']}`,
      borderRadius: '3px',
      color: theme.variables['--text-editor'],
      padding: '4px 8px'
    },
    '.cm-textfield:focus': {
      outline: `2px solid ${theme.variables['--accent-primary']}`,
      outlineOffset: '-2px'
    }
  }, { dark: isDark });

  // Resaltado de sintaxis personalizado
  const highlightStyle = HighlightStyle.define([
    // Comentarios
    { tag: t.comment, color: isDark ? '#6A9955' : '#008000', fontStyle: 'italic' },
    { tag: t.lineComment, color: isDark ? '#6A9955' : '#008000', fontStyle: 'italic' },
    { tag: t.blockComment, color: isDark ? '#6A9955' : '#008000', fontStyle: 'italic' },
    
    // Palabras clave
    { tag: t.keyword, color: theme.variables['--accent-primary'], fontWeight: 'bold' },
    { tag: t.controlKeyword, color: theme.variables['--accent-primary'], fontWeight: 'bold' },
    { tag: t.operatorKeyword, color: theme.variables['--accent-primary'], fontWeight: 'bold' },
    
    // Strings
    { tag: t.string, color: isDark ? '#CE9178' : '#A31515' },
    { tag: t.special(t.string), color: isDark ? '#D7BA7D' : '#EE0000' },
    
    // Números
    { tag: t.number, color: isDark ? '#B5CEA8' : '#098658' },
    { tag: t.integer, color: isDark ? '#B5CEA8' : '#098658' },
    { tag: t.float, color: isDark ? '#B5CEA8' : '#098658' },
    
    // Funciones y métodos
    { tag: t.function(t.variableName), color: isDark ? '#DCDCAA' : '#795E26' },
    { tag: t.function(t.propertyName), color: isDark ? '#DCDCAA' : '#795E26' },
    { tag: t.function(t.propertyName), color: isDark ? '#DCDCAA' : '#795E26' },
    
    // Variables y propiedades
    { tag: t.variableName, color: theme.variables['--text-editor'] },
    { tag: t.propertyName, color: isDark ? '#9CDCFE' : '#0451A5' },
    { tag: t.attributeName, color: isDark ? '#92C5F8' : '#0451A5' },
    
    // Tipos y clases
    { tag: t.typeName, color: isDark ? '#4EC9B0' : '#267F99' },
    { tag: t.className, color: isDark ? '#4EC9B0' : '#267F99' },
    { tag: t.namespace, color: isDark ? '#4EC9B0' : '#267F99' },
    
    // Operadores y puntuación
    { tag: t.operator, color: theme.variables['--text-editor'] },
    { tag: t.punctuation, color: theme.variables['--text-editor'] },
    { tag: t.bracket, color: isDark ? '#FFD700' : '#0431FA' },
    { tag: t.paren, color: theme.variables['--text-editor'] },
    { tag: t.squareBracket, color: isDark ? '#FFD700' : '#0431FA' },
    
    // Tags HTML
    { tag: t.tagName, color: isDark ? '#569CD6' : '#800000' },
    { tag: t.angleBracket, color: isDark ? '#808080' : '#800000' },
    
    // CSS
    { tag: t.atom, color: isDark ? '#D19A66' : '#0451A5' },
    { tag: t.unit, color: isDark ? '#B5CEA8' : '#098658' },
    { tag: t.modifier, color: theme.variables['--accent-secondary'] },
    
    // Markdown
    { tag: t.heading, color: theme.variables['--accent-primary'], fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.link, color: theme.variables['--accent-secondary'], textDecoration: 'underline' },
    { tag: t.monospace, 
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      padding: '2px 4px',
      borderRadius: '3px',
      fontFamily: 'inherit'
    },
    
    // Estados especiales
    { tag: t.invalid, color: isDark ? '#F44747' : '#CD3131', textDecoration: 'underline' },
    { tag: t.deleted, color: isDark ? '#F44747' : '#CD3131', backgroundColor: isDark ? 'rgba(244, 71, 71, 0.1)' : 'rgba(205, 49, 49, 0.1)' },
    { tag: t.inserted, color: isDark ? '#89D185' : '#098658', backgroundColor: isDark ? 'rgba(137, 209, 133, 0.1)' : 'rgba(9, 134, 88, 0.1)' },
    { tag: t.changed, color: isDark ? '#E2C08D' : '#795E26', backgroundColor: isDark ? 'rgba(226, 192, 141, 0.1)' : 'rgba(121, 94, 38, 0.1)' }
  ]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
};

// Función auxiliar para obtener colores específicos según el tema
export const getThemeColors = (theme: Theme) => {
  const isDark = theme.mode === 'night' ||
    theme.variables['--bg-editor'] === '#0f172a' ||
    theme.variables['--bg-editor'] === '#1c1917' ||
    theme.variables['--bg-editor'] === '#2d2a26';

  return {
    isDark,
    background: theme.variables['--bg-editor'],
    foreground: theme.variables['--text-editor'],
    accent: theme.variables['--accent-primary'],
    secondary: theme.variables['--accent-secondary'],
    border: theme.variables['--border-color']
  };
};