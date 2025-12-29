/**
 * Project Context Service
 * Loads and manages project configuration files (tsconfig.json, package.json)
 * to provide workspace-aware TypeScript/JavaScript IntelliSense
 */

import { invoke } from '@tauri-apps/api/core';
import * as monaco from 'monaco-editor';

/**
 * TypeScript compiler options from tsconfig.json
 */
export interface TSConfig {
  compilerOptions?: {
    target?: string;
    module?: string;
    lib?: string[];
    jsx?: string;
    strict?: boolean;
    esModuleInterop?: boolean;
    skipLibCheck?: boolean;
    forceConsistentCasingInFileNames?: boolean;
    resolveJsonModule?: boolean;
    isolatedModules?: boolean;
    moduleResolution?: string;
    allowJs?: boolean;
    checkJs?: boolean;
    noEmit?: boolean;
    declaration?: boolean;
    declarationMap?: boolean;
    sourceMap?: boolean;
    outDir?: string;
    rootDir?: string;
    baseUrl?: string;
    paths?: Record<string, string[]>;
    types?: string[];
    typeRoots?: string[];
    allowSyntheticDefaultImports?: boolean;
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
    noImplicitReturns?: boolean;
    noFallthroughCasesInSwitch?: boolean;
    [key: string]: any;
  };
  include?: string[];
  exclude?: string[];
  extends?: string;
}

/**
 * Package.json structure
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  type?: 'module' | 'commonjs';
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: any;
}

/**
 * Project context containing configuration files
 */
export interface ProjectContext {
  workspacePath: string;
  tsconfig: TSConfig | null;
  packageJson: PackageJson | null;
}

class ProjectContextService {
  private currentContext: ProjectContext | null = null;

  /**
   * Load project context from workspace
   */
  async loadProjectContext(workspacePath: string): Promise<ProjectContext> {
    const context: ProjectContext = {
      workspacePath,
      tsconfig: null,
      packageJson: null,
    };

    // Load tsconfig.json
    try {
      const tsconfigPath = `${workspacePath}/tsconfig.json`;
      const tsconfigContent = await invoke<string>('get_file_content', { path: tsconfigPath });
      context.tsconfig = this.parseTSConfig(tsconfigContent);
      console.info('[ProjectContext] Loaded tsconfig.json');
    } catch (error) {
      console.debug('[ProjectContext] No tsconfig.json found or failed to load');
    }

    // Load package.json
    try {
      const packageJsonPath = `${workspacePath}/package.json`;
      const packageJsonContent = await invoke<string>('get_file_content', { path: packageJsonPath });
      context.packageJson = JSON.parse(packageJsonContent);
      console.info('[ProjectContext] Loaded package.json');
    } catch (error) {
      console.debug('[ProjectContext] No package.json found or failed to load');
    }

    this.currentContext = context;
    return context;
  }

  /**
   * Parse tsconfig.json content (handles comments and trailing commas via JSON5-like parsing)
   */
  private parseTSConfig(content: string): TSConfig {
    try {
      // Use robust JSON5-like parser that properly handles:
      // 1. Single-line comments (//)
      // 2. Multi-line comments (/* */)
      // 3. Trailing commas
      // 4. Comments/patterns inside strings (e.g., URLs with //)
      const cleanedContent = this.stripJsonComments(content);
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.warn('[ProjectContext] Failed to parse tsconfig.json:', error);
      return {};
    }
  }

  /**
   * Strip JSON comments and trailing commas while preserving strings
   * This properly handles edge cases like URLs containing // or /* patterns
   */
  private stripJsonComments(content: string): string {
    let result = '';
    let i = 0;
    const len = content.length;

    while (i < len) {
      const char = content[i];
      const nextChar = content[i + 1];

      // Handle strings - preserve everything inside them
      if (char === '"') {
        result += char;
        i++;
        // Find end of string, handling escapes
        while (i < len) {
          const strChar = content[i];
          result += strChar;
          if (strChar === '\\' && i + 1 < len) {
            // Include escaped character
            i++;
            result += content[i];
          } else if (strChar === '"') {
            break;
          }
          i++;
        }
        i++;
        continue;
      }

      // Handle single-line comments
      if (char === '/' && nextChar === '/') {
        // Skip until end of line
        while (i < len && content[i] !== '\n') {
          i++;
        }
        continue;
      }

      // Handle multi-line comments
      if (char === '/' && nextChar === '*') {
        i += 2; // Skip /*
        // Find end of comment
        while (i < len - 1) {
          if (content[i] === '*' && content[i + 1] === '/') {
            i += 2; // Skip */
            break;
          }
          i++;
        }
        continue;
      }

      // Regular character
      result += char;
      i++;
    }

    // Remove trailing commas before } and ]
    // This regex is safe because we've already removed comments
    result = result.replace(/,(\s*[}\]])/g, '$1');

    return result;
  }

  /**
   * Get current project context
   */
  getContext(): ProjectContext | null {
    return this.currentContext;
  }

  /**
   * Apply tsconfig settings to Monaco TypeScript compiler options
   */
  applyToMonaco(tsconfig: TSConfig): void {
    if (!tsconfig.compilerOptions) {
      return;
    }

    const compilerOptions = tsconfig.compilerOptions;
    const monacoOptions: monaco.typescript.CompilerOptions = {};

    // Map target
    if (compilerOptions.target) {
      const targetMap: Record<string, monaco.typescript.ScriptTarget> = {
        'ES3': monaco.typescript.ScriptTarget.ES3,
        'ES5': monaco.typescript.ScriptTarget.ES5,
        'ES6': monaco.typescript.ScriptTarget.ES2015,
        'ES2015': monaco.typescript.ScriptTarget.ES2015,
        'ES2016': monaco.typescript.ScriptTarget.ES2016,
        'ES2017': monaco.typescript.ScriptTarget.ES2017,
        'ES2018': monaco.typescript.ScriptTarget.ES2018,
        'ES2019': monaco.typescript.ScriptTarget.ES2019,
        'ES2020': monaco.typescript.ScriptTarget.ES2020,
        'ESNext': monaco.typescript.ScriptTarget.ESNext,
      };
      const target = targetMap[compilerOptions.target.toUpperCase()];
      if (target !== undefined) {
        monacoOptions.target = target;
      }
    }

    // Map module
    if (compilerOptions.module) {
      const moduleMap: Record<string, monaco.typescript.ModuleKind> = {
        'CommonJS': monaco.typescript.ModuleKind.CommonJS,
        'AMD': monaco.typescript.ModuleKind.AMD,
        'UMD': monaco.typescript.ModuleKind.UMD,
        'System': monaco.typescript.ModuleKind.System,
        'ES6': monaco.typescript.ModuleKind.ES2015,
        'ES2015': monaco.typescript.ModuleKind.ES2015,
        'ESNext': monaco.typescript.ModuleKind.ESNext,
        'None': monaco.typescript.ModuleKind.None,
      };
      const module = moduleMap[compilerOptions.module];
      if (module !== undefined) {
        monacoOptions.module = module;
      }
    }

    // Map module resolution
    if (compilerOptions.moduleResolution) {
      const resolutionMap: Record<string, monaco.typescript.ModuleResolutionKind> = {
        'Classic': monaco.typescript.ModuleResolutionKind.Classic,
        'Node': monaco.typescript.ModuleResolutionKind.NodeJs,
        'NodeJs': monaco.typescript.ModuleResolutionKind.NodeJs,
        'Node16': monaco.typescript.ModuleResolutionKind.NodeJs, // Fallback
        'NodeNext': monaco.typescript.ModuleResolutionKind.NodeJs, // Fallback
      };
      const resolution = resolutionMap[compilerOptions.moduleResolution];
      if (resolution !== undefined) {
        monacoOptions.moduleResolution = resolution;
      }
    }

    // Map JSX
    if (compilerOptions.jsx) {
      const jsxMap: Record<string, monaco.typescript.JsxEmit> = {
        'None': monaco.typescript.JsxEmit.None,
        'Preserve': monaco.typescript.JsxEmit.Preserve,
        'React': monaco.typescript.JsxEmit.React,
        'ReactNative': monaco.typescript.JsxEmit.ReactNative,
        'ReactJSX': monaco.typescript.JsxEmit.ReactJSX,
        'ReactJSXDev': monaco.typescript.JsxEmit.ReactJSXDev,
      };
      const jsx = jsxMap[compilerOptions.jsx];
      if (jsx !== undefined) {
        monacoOptions.jsx = jsx;
      }
    }

    // Boolean options - be conservative in editor context
    // Don't apply strict mode flags that are too noisy in an editor
    if (compilerOptions.esModuleInterop !== undefined) monacoOptions.esModuleInterop = compilerOptions.esModuleInterop;
    if (compilerOptions.skipLibCheck !== undefined) monacoOptions.skipLibCheck = compilerOptions.skipLibCheck;
    if (compilerOptions.resolveJsonModule !== undefined) monacoOptions.resolveJsonModule = compilerOptions.resolveJsonModule;
    if (compilerOptions.isolatedModules !== undefined) monacoOptions.isolatedModules = compilerOptions.isolatedModules;
    if (compilerOptions.allowJs !== undefined) monacoOptions.allowJs = compilerOptions.allowJs;
    if (compilerOptions.noEmit !== undefined) monacoOptions.noEmit = compilerOptions.noEmit;
    if (compilerOptions.allowSyntheticDefaultImports !== undefined) {
      monacoOptions.allowSyntheticDefaultImports = compilerOptions.allowSyntheticDefaultImports;
    }

    // Skip strict checking options that are too noisy in editor context
    // These are better handled by the build process, not the editor
    // - noUnusedLocals (already filtered in diagnostics)
    // - noUnusedParameters (already filtered in diagnostics)
    // - noImplicitReturns (too strict for editor)
    // - noFallthroughCasesInSwitch (too strict for editor)
    // - strict mode (let project build handle this)
    // - checkJs (usually too noisy for editor)

    // Lib option
    if (compilerOptions.lib && Array.isArray(compilerOptions.lib)) {
      monacoOptions.lib = compilerOptions.lib;
    }

    // Type roots
    if (compilerOptions.typeRoots && Array.isArray(compilerOptions.typeRoots)) {
      monacoOptions.typeRoots = compilerOptions.typeRoots;
    }

    // Base URL and paths support for path aliases
    if (compilerOptions.baseUrl) {
      monacoOptions.baseUrl = compilerOptions.baseUrl;
      console.info('[ProjectContext] Applied baseUrl from tsconfig:', compilerOptions.baseUrl);
    }

    // Path mappings (e.g., "@/*" -> ["./src/*"])
    if (compilerOptions.paths) {
      monacoOptions.paths = compilerOptions.paths;
      console.info('[ProjectContext] Applied path mappings from tsconfig:', Object.keys(compilerOptions.paths));
    }

    // Apply to TypeScript defaults
    monaco.typescript.typescriptDefaults.setCompilerOptions({
      ...monaco.typescript.typescriptDefaults.getCompilerOptions(),
      ...monacoOptions,
      allowNonTsExtensions: true, // Always allow non-TS extensions in editor
    });

    // Apply relevant options to JavaScript defaults
    const jsOptions: monaco.typescript.CompilerOptions = {
      ...monacoOptions,
      allowJs: true,
      checkJs: compilerOptions.checkJs ?? false,
      allowNonTsExtensions: true,
    };
    monaco.typescript.javascriptDefaults.setCompilerOptions({
      ...monaco.typescript.javascriptDefaults.getCompilerOptions(),
      ...jsOptions,
    });

    console.info('[ProjectContext] Applied tsconfig.json compiler options to Monaco');
  }

  /**
   * Get dependencies from package.json
   */
  getDependencies(): string[] {
    if (!this.currentContext?.packageJson) {
      return [];
    }

    const deps: string[] = [];
    const pkg = this.currentContext.packageJson;

    if (pkg.dependencies) {
      deps.push(...Object.keys(pkg.dependencies));
    }
    if (pkg.devDependencies) {
      deps.push(...Object.keys(pkg.devDependencies));
    }
    if (pkg.peerDependencies) {
      deps.push(...Object.keys(pkg.peerDependencies));
    }

    return deps;
  }

  /**
   * Check if project uses TypeScript
   */
  isTypeScriptProject(): boolean {
    return this.currentContext?.tsconfig !== null;
  }

  /**
   * Check if project uses ES modules
   */
  isESModule(): boolean {
    return this.currentContext?.packageJson?.type === 'module';
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    this.currentContext = null;
  }
}

// Singleton instance
let projectContextService: ProjectContextService | null = null;

/**
 * Get project context service singleton
 */
export function getProjectContextService(): ProjectContextService {
  if (!projectContextService) {
    projectContextService = new ProjectContextService();
  }
  return projectContextService;
}

/**
 * Initialize project context for workspace
 */
export async function initializeProjectContext(workspacePath: string): Promise<ProjectContext> {
  const service = getProjectContextService();
  const context = await service.loadProjectContext(workspacePath);

  // Apply tsconfig to Monaco if available
  if (context.tsconfig) {
    service.applyToMonaco(context.tsconfig);
  }

  return context;
}
