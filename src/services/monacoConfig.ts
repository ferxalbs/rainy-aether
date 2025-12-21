/**
 * Monaco Editor Configuration Service
 * Configures Monaco's language services for proper VS Code-like functionality
 */

import * as monaco from 'monaco-editor';
import { initializeLSP } from './lsp';
import { registerLSPWithMonaco, registerCustomLSPProviders } from './lsp/monacoAdapter';
import { addMonacoExtraLibs } from './monacoLibs';
import { initializeProjectContext } from './projectContext';

let isConfigured = false;
let workspaceConfigured = false;

/**
 * Configure Monaco Editor with proper language services
 * This should be called once when the app initializes
 */
export function configureMonaco() {
  if (isConfigured) {
    return;
  }

  // Configure TypeScript/JavaScript compiler options
  monaco.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.typescript.JsxEmit.ReactJSX, // React 17+ new transform (matches tsconfig)
    allowJs: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    allowSyntheticDefaultImports: true,
    strict: true, // Enable strict type checking
    noUnusedLocals: true, // Detect unused variables
    noUnusedParameters: true, // Detect unused parameters
    typeRoots: ['node_modules/@types'],
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
  });

  monaco.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.typescript.JsxEmit.ReactJSX, // React 17+ new transform (matches tsconfig)
    allowJs: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    allowSyntheticDefaultImports: true,
    checkJs: false, // Don't type-check JS files aggressively
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
  });

  // Set diagnostic options - enable full validation like VS Code
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      // Only ignore errors that truly don't apply without full project context
      2307, // Cannot find module (unavoidable without node_modules resolution)
      7016, // Could not find declaration file for module
      // React-specific false positives with new JSX transform
      2708, // Cannot use namespace 'React' as a value (false positive with react-jsx)
      1259, // Module can only be default-imported using esModuleInterop (React types issue)
      // Note: Real errors that ARE now shown:
      // 2305 - Module has no exported member
      // 2339 - Property does not exist on type
      // 2322 - Type is not assignable
    ],
  });

  monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      // Only ignore errors that truly don't apply without full project context
      2307, // Cannot find module (unavoidable without node_modules resolution)
      7016, // Could not find declaration file for module
      2708, // Cannot use namespace as a value (React false positive)
      1259, // Module default-import issue (React types)
    ],
  });

  // Enable eager model sync for better IntelliSense
  monaco.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.typescript.javascriptDefaults.setEagerModelSync(true);

  // Add extra library definitions for common modules
  addMonacoExtraLibs();

  // Configure HTML language
  monaco.html.htmlDefaults.setOptions({
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
  monaco.css.cssDefaults.setOptions({
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
  monaco.json.jsonDefaults.setDiagnosticsOptions({
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
 * Configure Monaco with workspace-specific settings
 * This should be called when a workspace is loaded
 */
export async function configureMonacoForWorkspace(workspacePath: string): Promise<void> {
  if (workspaceConfigured) {
    console.debug('[Monaco] Workspace already configured, reinitializing...');
  }

  try {
    // Load project configuration (tsconfig.json, package.json)
    await initializeProjectContext(workspacePath);
    workspaceConfigured = true;
    console.info('[Monaco] Workspace-specific configuration applied');
  } catch (error) {
    console.warn('[Monaco] Failed to configure workspace settings:', error);
  }
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
