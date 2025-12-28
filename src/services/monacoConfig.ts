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
      // Module resolution errors (unavoidable without full node_modules)
      2307, // Cannot find module 'X' or its corresponding type declarations
      2306, // File is not a module
      2792, // Cannot find module 'X'. Did you mean to set moduleResolution?
      7016, // Could not find declaration file for module 'X'
      1479, // The current file is a CommonJS module whose imports will produce 'require'

      // React/JSX specific false positives
      2708, // Cannot use namespace 'React' as a value (false positive with react-jsx)
      1259, // Module can only be default-imported using esModuleInterop
      2686, // 'React' refers to a UMD global

      // Import/Export resolution issues
      1192, // Module has no default export
      1261, // Default export of module has or is using private name
      2497, // This module can only be referenced with ECMAScript imports
      2614, // Module has no exported member. Did you mean default import?

      // Type resolution issues for external libraries
      2339, // Property does not exist on type (often false positive for untyped libs)
      2345, // Argument of type 'X' is not assignable
      2322, // Type 'X' is not assignable to type 'Y' (JSX prop type mismatches)
      2769, // No overload matches this call (JSX component props)
      2559, // Type 'X' has no properties in common with type 'Y'

      // Note: Syntax errors and undefined variables are still shown
      // 2304 - Cannot find name (undefined variables)
    ],
  });

  monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      // Module resolution errors
      2307, 2306, 2792, 7016, 1479,
      // React/JSX false positives
      2708, 1259, 2686,
      // Import/Export issues
      1192, 1261, 2497, 2614,
      // Type resolution for external libs
      2339, 2345, 2322, 2769, 2559,
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

  // Register AI autocompletion provider
  try {
    // Use dynamic import with .then() since we're not in an async function
    Promise.all([
      import('./autocompletion'),
      import('@/stores/autocompletionStore'),
    ]).then(([autocompletionModule, storeModule]) => {
      const { registerAutocompletionProvider, initializeAutocompletionService } = autocompletionModule;
      const { autocompletionActions } = storeModule;

      // Initialize store from persisted settings
      autocompletionActions.initialize();

      // Always register the provider (it will lazy-init when needed)
      registerAutocompletionProvider();
      console.info('[Monaco] AI autocompletion provider registered');

      // Pre-initialize service in background (non-blocking)
      initializeAutocompletionService().then((initialized) => {
        if (initialized) {
          console.info('[Monaco] AI autocompletion service initialized');
        } else {
          console.warn('[Monaco] AI autocompletion service not initialized (API key may be missing)');
        }
      });
    }).catch((error) => {
      console.warn('[Monaco] AI autocompletion registration skipped:', error);
    });
  } catch (error) {
    console.warn('[Monaco] AI autocompletion registration skipped:', error);
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
