/**
 * Monaco Editor Configuration Service
 * Configures Monaco's language services for proper VS Code-like functionality
 */

import * as monaco from 'monaco-editor';
import { initializeLSP } from './lsp';
import { registerLSPWithMonaco, registerCustomLSPProviders } from './lsp/monacoAdapter';
import { addMonacoExtraLibs } from './monacoLibs';

let isConfigured = false;

/**
 * Configure Monaco Editor with proper language services
 * This should be called once when the app initializes
 */
export function configureMonaco() {
  if (isConfigured) {
    return;
  }

  // Configure TypeScript/JavaScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    allowSyntheticDefaultImports: true,
    strict: false, // Reduce false positives in editor
    noUnusedLocals: false,
    noUnusedParameters: false,
    typeRoots: ['node_modules/@types'],
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    allowSyntheticDefaultImports: true,
    checkJs: false, // Don't type-check JS files aggressively
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
  });

  // Set diagnostic options - reduce false positives
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      1108, // Return statement only in functions
      2307, // Cannot find module (common in editors without full project context)
      2304, // Cannot find name (reduces noise for globals)
      6133, // Declared but never used
      7016, // Could not find declaration file for module
      2345, // Argument type mismatch (can be noisy)
    ],
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      1108, // Return statement only in functions
      2307, // Cannot find module
      2304, // Cannot find name
      6133, // Declared but never used
      7016, // Could not find declaration file for module
    ],
  });

  // Enable eager model sync for better IntelliSense
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  // Add extra library definitions for common modules
  addMonacoExtraLibs();

  // Configure HTML language
  monaco.languages.html.htmlDefaults.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'wbr',
      contentUnformatted: 'pre,code,textarea',
      indentInnerHtml: false,
      preserveNewLines: true,
      maxPreserveNewLines: undefined,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: 'head, body, /html',
      wrapAttributes: 'auto',
    },
    suggest: { html5: true, angular1: false, ionic: false },
  });

  // Configure CSS language
  monaco.languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'warning',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRules: 'warning',
      importStatement: 'warning',
      boxModel: 'warning',
      universalSelector: 'warning',
      zeroUnits: 'warning',
      fontFaceProperties: 'warning',
      hexColorLength: 'warning',
      argumentsInColorFunction: 'warning',
      unknownProperties: 'warning',
      ieHack: 'warning',
      unknownVendorSpecificProperties: 'warning',
      propertyIgnoredDueToDisplay: 'warning',
      important: 'warning',
      float: 'warning',
      idSelector: 'warning',
    },
  });

  // Configure JSON language
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: [],
    enableSchemaRequest: true,
  });

  // Note: LSP service is currently a stub implementation
  // Monaco's built-in TypeScript language service provides excellent IntelliSense
  // Future: Implement full LSP via Tauri for additional language servers
  try {
    initializeLSP().catch(error => {
      console.warn('[Monaco] LSP initialization skipped (stub implementation):', error);
    });
    registerLSPWithMonaco();
    registerCustomLSPProviders();
  } catch (error) {
    console.warn('[Monaco] LSP registration skipped:', error);
  }

  isConfigured = true;
  console.info('[Monaco] Language services configured with LSP support');
}

/**
 * Get language ID for file extension
 */
export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'md': 'markdown',
    'markdown': 'markdown',
    'xml': 'xml',
    'svg': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'rs': 'rust',
    'toml': 'toml',
    'py': 'python',
    'sh': 'shell',
    'bash': 'shell',
    'sql': 'sql',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
  };

  return languageMap[ext] || 'plaintext';
}
