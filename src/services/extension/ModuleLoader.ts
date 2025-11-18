/**
 * Module Loader
 *
 * Implements CommonJS-style module loading for extension code execution.
 * Supports require(), module.exports, exports, and circular dependencies.
 */

import { ModuleInfo, ModuleCacheEntry, ModuleLoaderConfig } from './types';

/**
 * Module loader class
 */
export class ModuleLoader {
  private config: ModuleLoaderConfig;
  private moduleCache: Map<string, ModuleCacheEntry> = new Map();
  private loadingModules: Set<string> = new Set(); // Track modules currently being loaded (circular dep detection)
  private fileReader: (path: string) => Promise<string>;

  constructor(config: ModuleLoaderConfig, fileReader: (path: string) => Promise<string>) {
    this.config = config;
    this.fileReader = fileReader;
  }

  /**
   * Main require() implementation
   */
  require(id: string, parentModule?: ModuleInfo): any {
    // Resolve module path
    const modulePath = this.resolveModulePath(id, parentModule?.filename);

    // Check cache first
    if (this.moduleCache.has(modulePath)) {
      const cached = this.moduleCache.get(modulePath)!;
      return cached.exports;
    }

    // Check for circular dependency
    if (this.loadingModules.has(modulePath)) {
      console.warn(`[ModuleLoader] Circular dependency detected: ${modulePath}`);
      // Return empty exports object for circular deps
      const circularModule = this.createModule(modulePath);
      return circularModule.exports;
    }

    // Load the module
    return this.loadModule(modulePath, parentModule);
  }

  /**
   * Async version of require for top-level loading
   */
  async requireAsync(id: string, parentModule?: ModuleInfo): Promise<any> {
    const modulePath = this.resolveModulePath(id, parentModule?.filename);

    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath)!.exports;
    }

    return await this.loadModuleAsync(modulePath, parentModule);
  }

  /**
   * Load main extension module
   */
  async loadMainModule(): Promise<any> {
    // For the main module, if it's a relative path, resolve it against the extension path
    const mainPath = this.config.mainModulePath;
    const resolvedMainPath = this.resolveMainModulePath(mainPath);
    console.log(`[ModuleLoader] Loading main module: "${mainPath}" -> "${resolvedMainPath}"`);
    console.log(`[ModuleLoader] Extension path: "${this.config.extensionPath}"`);

    // Check cache first
    if (this.moduleCache.has(resolvedMainPath)) {
      return this.moduleCache.get(resolvedMainPath)!.exports;
    }

    // Load the module directly without going through resolveModulePath again
    return await this.loadModuleAsync(resolvedMainPath);
  }

  /**
   * Resolve the main module path against extension path if needed
   */
  private resolveMainModulePath(mainPath: string): string {
    // If already absolute, return as-is
    if (mainPath.startsWith('/') || /^[a-zA-Z]:/.test(mainPath)) {
      return mainPath;
    }

    // If relative, resolve against extension path
    if (mainPath.startsWith('./') || mainPath.startsWith('../')) {
      // Normalize extension path (replace backslashes with forward slashes for consistency)
      const normalizedExtPath = this.config.extensionPath.replace(/\\/g, '/');
      // Remove leading './'
      const cleanPath = mainPath.replace(/^\.\//, '');
      // Join and normalize the result
      const joined = `${normalizedExtPath}/${cleanPath}`;
      return joined.replace(/\\/g, '/'); // Ensure forward slashes throughout
    }

    // Otherwise (node_modules), return as-is to be resolved later
    return mainPath;
  }

  /**
   * Clear module cache
   */
  clearCache(): void {
    this.moduleCache.clear();
    this.loadingModules.clear();
  }

  /**
   * Get loaded modules
   */
  getLoadedModules(): string[] {
    return Array.from(this.moduleCache.keys());
  }

  // Private methods

  /**
   * Synchronous module loading (for runtime require() calls)
   */
  private loadModule(modulePath: string, parentModule?: ModuleInfo): any {
    // Check if this is a built-in module that we can load synchronously
    if (this.isBuiltInModule(modulePath)) {
      const builtInExports = this.loadBuiltInModule(modulePath);

      // Cache built-in modules
      const module = this.createModule(modulePath, parentModule);
      module.exports = builtInExports;
      module.loaded = true;

      this.moduleCache.set(modulePath, {
        module,
        code: '// Built-in module',
        exports: builtInExports,
      });

      return builtInExports;
    }

    // Mark as loading
    this.loadingModules.add(modulePath);

    try {
      // Create module object
      const module = this.createModule(modulePath, parentModule);

      // Cache the module early (for circular deps)
      this.moduleCache.set(modulePath, {
        module,
        code: '', // Will be populated later
        exports: module.exports,
      });

      // In synchronous mode, we can't actually load the file
      // Extensions must use async activation
      throw new Error(
        `Synchronous require() is not supported. Module '${modulePath}' must be loaded during extension activation.`
      );
    } finally {
      this.loadingModules.delete(modulePath);
    }
  }

  /**
   * Asynchronous module loading
   */
  private async loadModuleAsync(modulePath: string, parentModule?: ModuleInfo): Promise<any> {
    this.loadingModules.add(modulePath);

    try {
      // Check if this is a built-in Node.js module that we need to shim
      if (this.isBuiltInModule(modulePath)) {
        const builtInExports = this.loadBuiltInModule(modulePath);

        // Cache built-in modules
        const module = this.createModule(modulePath, parentModule);
        module.exports = builtInExports;
        module.loaded = true;

        this.moduleCache.set(modulePath, {
          module,
          code: '// Built-in module',
          exports: builtInExports,
        });

        return builtInExports;
      }

      // Create module object
      const module = this.createModule(modulePath, parentModule);

      // Cache the module early (for circular deps)
      const cacheEntry: ModuleCacheEntry = {
        module,
        code: '',
        exports: module.exports,
      };
      this.moduleCache.set(modulePath, cacheEntry);

      // Read file content
      const code = await this.fileReader(modulePath);
      cacheEntry.code = code;

      // Wrap code in CommonJS wrapper
      const wrappedCode = this.wrapModule(code, modulePath);

      // Execute module code
      let moduleFunction: Function;
      try {
        moduleFunction = new Function(
          'exports',
          'require',
          'module',
          '__filename',
          '__dirname',
          wrappedCode
        );
      } catch (syntaxError) {
        console.error(`[ModuleLoader] Syntax error in module ${modulePath}:`, syntaxError);
        throw syntaxError;
      }

      const require = (id: string) => {
        console.log(`[ModuleLoader] require('${id}') called from ${modulePath}`);
        const result = this.require(id, module);
        if (id === 'vscode') {
          console.log(`[ModuleLoader] vscode module returned with keys:`, Object.keys(result || {}).slice(0, 20));
          // Check for critical classes
          const criticalClasses = ['TreeDataProvider', 'EventEmitter', 'Uri', 'Range', 'Position', 'Disposable'];
          const missing = criticalClasses.filter(c => !result[c]);
          if (missing.length > 0) {
            console.error(`[ModuleLoader] ❌ Missing critical vscode classes:`, missing);
          }
        }
        return result;
      };
      const __filename = modulePath;
      const __dirname = this.getDirectoryName(modulePath);

      try {
        moduleFunction.call(
          module.exports,
          module.exports,
          require,
          module,
          __filename,
          __dirname
        );
      } catch (executionError: any) {
        // Log detailed error information
        console.error(`[ModuleLoader] ❌ Module execution failed for ${modulePath}`);
        console.error(`[ModuleLoader] Error type:`, executionError?.constructor?.name);
        console.error(`[ModuleLoader] Error message:`, executionError?.message);

        // If it's the "Class extends value undefined" error, try to provide more context
        if (executionError?.message?.includes('Class extends value undefined')) {
          console.error(`[ModuleLoader] 🔍 This error typically means the extension is trying to extend a class that doesn't exist.`);
          console.error(`[ModuleLoader] 🔍 Check if all required vscode.* classes are implemented in VSCodeAPIShim.ts`);

          // Log the vscode API that was provided
          const vscode = (self as any).vscode;
          if (vscode) {
            const allKeys = Object.keys(vscode);
            const classKeys = allKeys.filter(k => typeof vscode[k] === 'function');
            console.error(`[ModuleLoader] 🔍 Available vscode classes:`, classKeys);
          }
        }

        throw executionError;
      }

      // Mark as loaded
      module.loaded = true;

      return module.exports;
    } catch (error) {
      // Remove from cache if loading failed
      this.moduleCache.delete(modulePath);
      throw new Error(`Failed to load module '${modulePath}': ${error}`);
    } finally {
      this.loadingModules.delete(modulePath);
    }
  }

  /**
   * Create a module object
   */
  private createModule(filename: string, parent?: ModuleInfo): ModuleInfo {
    const module: ModuleInfo = {
      id: filename,
      filename,
      loaded: false,
      exports: {},
      children: [],
      parent: parent || null,
      require: (id: string) => this.require(id, module),
    };

    // Add to parent's children
    if (parent) {
      parent.children.push(module);
    }

    return module;
  }

  /**
   * Wrap module code in CommonJS wrapper
   */
  private wrapModule(code: string, modulePath: string): string {
    // Remove source map comments (they won't work in our context)
    const cleanedCode = code.replace(/\/\/# sourceMappingURL=.*$/gm, '');

    // Add "use strict" if not present
    const hasUseStrict = /^\s*['"]use strict['"];/.test(cleanedCode);
    const strictDirective = hasUseStrict ? '' : '"use strict";\n';

    return `${strictDirective}${cleanedCode}\n//# sourceURL=${modulePath}`;
  }

  /**
   * Resolve module path
   */
  private resolveModulePath(id: string, fromPath?: string): string {
    // Built-in modules (including those with 'node:' prefix)
    if (this.isBuiltInModule(id)) {
      // Return the original id (with or without 'node:' prefix)
      // The loadModule will handle stripping the prefix
      return id;
    }

    // Absolute path
    if (id.startsWith('/')) {
      return this.normalizeModulePath(id);
    }

    // Relative path
    if (id.startsWith('./') || id.startsWith('../')) {
      if (!fromPath) {
        throw new Error(`Cannot resolve relative path '${id}' without parent module`);
      }
      const dir = this.getDirectoryName(fromPath);
      return this.normalizeModulePath(`${dir}/${id}`);
    }

    // Node modules (try extension path)
    return this.resolveNodeModule(id, fromPath);
  }

  /**
   * Resolve node_modules path
   * Implements Node.js resolution algorithm: search in parent directories
   */
  private resolveNodeModule(id: string, fromPath?: string): string {
    // Start from the directory containing the requesting file
    let searchDir = fromPath ? this.getDirectoryName(fromPath) : this.config.extensionPath;

    // Search up the directory tree for node_modules
    // This matches Node.js behavior: node_modules can be in any parent directory
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    while (depth < maxDepth) {
      const nodeModulesPath = `${searchDir}/node_modules/${id}`;

      // Check if this would resolve to a path under the extension path
      // We prioritize the extension's node_modules
      if (searchDir === this.config.extensionPath ||
          searchDir.startsWith(this.config.extensionPath + '/')) {
        return this.normalizeModulePath(nodeModulesPath);
      }

      // Move up one directory
      const parentDir = this.getDirectoryName(searchDir);
      if (parentDir === searchDir || parentDir === '.') {
        break; // Reached root
      }
      searchDir = parentDir;
      depth++;
    }

    // Fallback to extension's node_modules
    const extensionNodeModules = `${this.config.extensionPath}/node_modules/${id}`;
    return this.normalizeModulePath(extensionNodeModules);
  }

  /**
   * Normalize module path (add .js extension if missing)
   */
  private normalizeModulePath(path: string): string {
    // Don't normalize built-in modules
    if (this.isBuiltInModule(path)) {
      return path;
    }

    // Remove trailing slash
    path = path.replace(/\/$/, '');

    // Add .js extension if missing
    if (!path.match(/\.(js|json)$/)) {
      // Try .js first
      return `${path}.js`;
    }

    return path;
  }

  /**
   * Get directory name from path
   */
  private getDirectoryName(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return '.';
    }
    return path.substring(0, lastSlash);
  }

  /**
   * Check if module is a built-in Node.js module
   */
  private isBuiltInModule(id: string): boolean {
    // Strip 'node:' prefix if present (Node.js v14+ syntax)
    const moduleId = id.startsWith('node:') ? id.substring(5) : id;

    const builtInModules = [
      'vscode', // VS Code Extension API (CRITICAL for extensions)
      'path',
      'fs',
      'os',
      'util',
      'events',
      'stream',
      'stream/promises', // Stream promises API
      'buffer',
      'crypto',
      'url',
      'querystring',
      'http',
      'https',
      'net',
      'tls',
      'tty',
      'child_process',
      'process',
      'timers',
      'timers/promises',
      'assert',
      'constants',
      'string_decoder',
      'v8', // V8 engine API
      'vscode-languageclient', // VS Code language client shim
      'vscode-jsonrpc', // JSON-RPC protocol
    ];

    return builtInModules.includes(moduleId);
  }

  /**
   * Load built-in Node.js module shim
   */
  private loadBuiltInModule(id: string): any {
    // Strip 'node:' prefix if present (Node.js v14+ syntax)
    const moduleId = id.startsWith('node:') ? id.substring(5) : id;

    // Return basic shims for built-in modules
    // In a full implementation, we would provide more complete polyfills

    switch (moduleId) {
      case 'vscode':
        // Return the VS Code API from the global scope
        // This is set by the extension worker when it initializes the VS Code API
        const vscode = (self as any).vscode;
        if (!vscode) {
          throw new Error(
            'VS Code API not available. This should be initialized by the extension worker before loading modules.'
          );
        }
        console.log('[ModuleLoader] Loaded vscode module from global scope');
        console.log('[ModuleLoader] Available vscode classes:', Object.keys(vscode).filter(k => typeof vscode[k] === 'function'));

        // Validate critical classes
        const criticalClasses = [
          'Uri', 'Range', 'Position', 'Selection', 'Disposable', 'EventEmitter',
          'TreeItem', 'TreeDataProvider', 'CancellationTokenSource', 'MarkdownString',
          'ThemeIcon', 'ThemeColor', 'StatusBarItem', 'Diagnostic', 'Location',
          'WorkspaceEdit', 'TextEdit'
        ];

        const missingClasses = criticalClasses.filter(className => !vscode[className]);
        if (missingClasses.length > 0) {
          console.warn('[ModuleLoader] WARNING: Missing vscode classes:', missingClasses);
        }

        return vscode;

      case 'path':
        return this.getPathShim();

      case 'fs':
        return this.getFsShim();

      case 'util':
        console.log('[ModuleLoader] Loading util module shim');
        const utilExports = this.getUtilShim();
        console.log('[ModuleLoader] util exports:', Object.keys(utilExports));
        console.log('[ModuleLoader] util.debuglog from loadBuiltInModule:', utilExports.debuglog);
        return utilExports;

      case 'events':
        return this.getEventsShim();

      case 'buffer':
        // Buffer is not available in browser, provide a shim
        return {
          Buffer: typeof Buffer !== 'undefined' ? Buffer : class BufferShim {
            static from() { throw new Error('Buffer is not available in browser'); }
            static alloc() { throw new Error('Buffer is not available in browser'); }
          }
        };

      case 'process':
        return this.getProcessShim();

      case 'os':
        return this.getOsShim();

      case 'child_process':
        return this.getChildProcessShim();

      case 'crypto':
        throw new Error(
          'crypto module is not supported in browser environment. Use Web Crypto API instead.'
        );

      case 'vscode-languageclient':
        // Dynamically import the shim to avoid circular dependencies
        return this.getVSCodeLanguageClientShim();

      case 'vscode-jsonrpc':
        // Provide JSON-RPC shim
        return this.getVSCodeJsonRpcShim();

      case 'url':
        return this.getUrlShim();

      case 'querystring':
        return this.getQuerystringShim();

      case 'stream':
        return this.getStreamShim();

      case 'stream/promises':
        return this.getStreamPromisesShim();

      case 'http':
      case 'https':
      case 'net':
      case 'tls':
        // Network modules not supported in browser
        throw new Error(`Module '${id}' is not supported in browser environment`);

      case 'tty':
        return this.getTtyShim();

      case 'timers':
        return this.getTimersShim();

      case 'timers/promises':
        return this.getTimersPromisesShim();

      case 'assert':
        return this.getAssertShim();

      case 'constants':
        return this.getConstantsShim();

      case 'string_decoder':
        return this.getStringDecoderShim();

      case 'v8':
        return this.getV8Shim();

      default:
        throw new Error(`Built-in module '${moduleId}' is not supported`);
    }
  }

  /**
   * Path module shim
   */
  private getPathShim(): any {
    return {
      join: (...args: string[]) => {
        return args.join('/').replace(/\/+/g, '/');
      },
      resolve: (...args: string[]) => {
        let resolved = '';
        for (let i = args.length - 1; i >= 0; i--) {
          const path = args[i];
          if (path.startsWith('/')) {
            resolved = path;
            break;
          }
          resolved = path + '/' + resolved;
        }
        return resolved.replace(/\/+/g, '/');
      },
      dirname: (path: string) => {
        const lastSlash = path.lastIndexOf('/');
        return lastSlash === -1 ? '.' : path.substring(0, lastSlash);
      },
      basename: (path: string, ext?: string) => {
        const base = path.substring(path.lastIndexOf('/') + 1);
        if (ext && base.endsWith(ext)) {
          return base.substring(0, base.length - ext.length);
        }
        return base;
      },
      extname: (path: string) => {
        const lastDot = path.lastIndexOf('.');
        const lastSlash = path.lastIndexOf('/');
        return lastDot > lastSlash ? path.substring(lastDot) : '';
      },
      sep: '/',
      delimiter: ':',
      normalize: (path: string) => {
        return path.replace(/\/+/g, '/').replace(/\/$/, '');
      },
    };
  }

  /**
   * FS module shim
   * Provides stub implementations that guide users to use VS Code APIs
   */
  private getFsShim(): any {
    const notSupportedError = (operation: string) => {
      throw new Error(
        `fs.${operation} is not supported in browser environment. Extensions should use vscode.workspace.fs API instead.`
      );
    };

    // Create stub objects for common fs functionality
    const fsStub: any = {
      // File reading
      readFile: (..._args: any[]) => notSupportedError('readFile'),
      readFileSync: (..._args: any[]) => notSupportedError('readFileSync'),

      // File writing
      writeFile: (..._args: any[]) => notSupportedError('writeFile'),
      writeFileSync: (..._args: any[]) => notSupportedError('writeFileSync'),

      // File operations
      unlink: (..._args: any[]) => notSupportedError('unlink'),
      unlinkSync: (..._args: any[]) => notSupportedError('unlinkSync'),
      rename: (..._args: any[]) => notSupportedError('rename'),
      renameSync: (..._args: any[]) => notSupportedError('renameSync'),

      // Directory operations
      mkdir: (..._args: any[]) => notSupportedError('mkdir'),
      mkdirSync: (..._args: any[]) => notSupportedError('mkdirSync'),
      rmdir: (..._args: any[]) => notSupportedError('rmdir'),
      rmdirSync: (..._args: any[]) => notSupportedError('rmdirSync'),
      readdir: (..._args: any[]) => notSupportedError('readdir'),
      readdirSync: (..._args: any[]) => notSupportedError('readdirSync'),

      // File info
      stat: (..._args: any[]) => notSupportedError('stat'),
      statSync: (..._args: any[]) => notSupportedError('statSync'),
      lstat: (..._args: any[]) => notSupportedError('lstat'),
      lstatSync: (..._args: any[]) => notSupportedError('lstatSync'),
      exists: (..._args: any[]) => notSupportedError('exists'),
      existsSync: (..._args: any[]) => notSupportedError('existsSync'),
      access: (..._args: any[]) => notSupportedError('access'),
      accessSync: (..._args: any[]) => notSupportedError('accessSync'),

      // Streams
      createReadStream: (..._args: any[]) => notSupportedError('createReadStream'),
      createWriteStream: (..._args: any[]) => notSupportedError('createWriteStream'),

      // Watch
      watch: (..._args: any[]) => notSupportedError('watch'),
      watchFile: (..._args: any[]) => notSupportedError('watchFile'),
      unwatchFile: (..._args: any[]) => notSupportedError('unwatchFile'),

      // Promises API
      promises: {
        readFile: (..._args: any[]) => notSupportedError('promises.readFile'),
        writeFile: (..._args: any[]) => notSupportedError('promises.writeFile'),
        mkdir: (..._args: any[]) => notSupportedError('promises.mkdir'),
        readdir: (..._args: any[]) => notSupportedError('promises.readdir'),
        stat: (..._args: any[]) => notSupportedError('promises.stat'),
        unlink: (..._args: any[]) => notSupportedError('promises.unlink'),
        rmdir: (..._args: any[]) => notSupportedError('promises.rmdir'),
        rename: (..._args: any[]) => notSupportedError('promises.rename'),
        access: (..._args: any[]) => notSupportedError('promises.access'),
      },

      // Constants
      constants: {
        F_OK: 0,
        R_OK: 4,
        W_OK: 2,
        X_OK: 1,
      },
    };

    return fsStub;
  }

  /**
   * Util module shim
   */
  private getUtilShim(): any {
    const utilShim = {
      inherits: (ctor: any, superCtor: any) => {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true,
          },
        });
      },
      format: (format: string, ...args: any[]) => {
        return format.replace(/%[sdj%]/g, (match) => {
          if (match === '%%') return '%';
          if (args.length === 0) return match;
          const arg = args.shift();
          switch (match) {
            case '%s':
              return String(arg);
            case '%d':
              return Number(arg).toString();
            case '%j':
              return JSON.stringify(arg);
            default:
              return match;
          }
        });
      },
      debuglog: (section: string) => {
        // Return a function that logs debug messages for a specific section
        // In browser environment, we can use console.debug
        return (...args: any[]) => {
          console.debug(`[${section}]`, ...args);
        };
      },
      inspect: (obj: any, _options?: any) => {
        // Simple inspect implementation
        try {
          return JSON.stringify(obj, null, 2);
        } catch (e) {
          return String(obj);
        }
      },
      isArray: (value: any) => Array.isArray(value),
      isBoolean: (value: any) => typeof value === 'boolean',
      isNull: (value: any) => value === null,
      isNullOrUndefined: (value: any) => value == null,
      isNumber: (value: any) => typeof value === 'number',
      isString: (value: any) => typeof value === 'string',
      isSymbol: (value: any) => typeof value === 'symbol',
      isUndefined: (value: any) => value === undefined,
      isRegExp: (value: any) => value instanceof RegExp,
      isObject: (value: any) => typeof value === 'object' && value !== null,
      isDate: (value: any) => value instanceof Date,
      isError: (value: any) => value instanceof Error,
      isFunction: (value: any) => typeof value === 'function',
      isPrimitive: (value: any) => {
        return value === null || (typeof value !== 'object' && typeof value !== 'function');
      },
      promisify: (fn: Function) => {
        // Basic promisify implementation
        return (...args: any[]) => {
          return new Promise((resolve, reject) => {
            fn(...args, (err: any, result: any) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
        };
      },
      callbackify: (fn: Function) => {
        // Basic callbackify implementation
        return (...args: any[]) => {
          const callback = args[args.length - 1];
          const promiseArgs = args.slice(0, -1);
          Promise.resolve(fn(...promiseArgs))
            .then((result) => callback(null, result))
            .catch((err) => callback(err));
        };
      },
    };

    // Debug logging to verify debuglog is properly set
    console.log('[ModuleLoader] util.debuglog type:', typeof utilShim.debuglog);
    console.log('[ModuleLoader] util.debuglog:', utilShim.debuglog);

    return utilShim;
  }

  /**
   * Events module shim (basic EventEmitter)
   */
  private getEventsShim(): any {
    class EventEmitter {
      private events: Map<string, Function[]> = new Map();

      on(event: string, listener: Function): this {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this;
      }

      once(event: string, listener: Function): this {
        const onceListener = (...args: any[]) => {
          this.off(event, onceListener);
          listener.apply(this, args);
        };
        return this.on(event, onceListener);
      }

      off(event: string, listener: Function): this {
        const listeners = this.events.get(event);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
        return this;
      }

      emit(event: string, ...args: any[]): boolean {
        const listeners = this.events.get(event);
        if (listeners) {
          for (const listener of listeners) {
            listener.apply(this, args);
          }
          return true;
        }
        return false;
      }

      removeAllListeners(event?: string): this {
        if (event) {
          this.events.delete(event);
        } else {
          this.events.clear();
        }
        return this;
      }

      listenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
      }
    }

    return { EventEmitter };
  }

  /**
   * Process shim
   */
  private getProcessShim(): any {
    return {
      env: {},
      platform: 'browser',
      version: 'v18.0.0',
      versions: { node: '18.0.0' },
      cwd: () => '/',
      nextTick: (callback: Function, ...args: any[]) => {
        setTimeout(() => callback(...args), 0);
      },
    };
  }

  /**
   * OS module shim
   * Provides basic OS information for browser environment
   */
  private getOsShim(): any {
    // Detect platform from user agent
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let platform = 'linux';
    if (ua.includes('Win')) platform = 'win32';
    else if (ua.includes('Mac')) platform = 'darwin';

    return {
      platform: () => platform,
      type: () => {
        if (platform === 'win32') return 'Windows_NT';
        if (platform === 'darwin') return 'Darwin';
        return 'Linux';
      },
      release: () => '0.0.0',
      arch: () => 'x64',
      hostname: () => 'localhost',
      homedir: () => '/',
      tmpdir: () => '/tmp',
      endianness: () => 'LE',
      cpus: () => [{
        model: 'Browser',
        speed: 0,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 }
      }],
      totalmem: () => 0,
      freemem: () => 0,
      uptime: () => 0,
      loadavg: () => [0, 0, 0],
      networkInterfaces: () => ({}),
      EOL: '\n',
      devNull: '/dev/null',
      constants: {
        // Signal constants
        signals: {
          SIGHUP: 1,
          SIGINT: 2,
          SIGQUIT: 3,
          SIGILL: 4,
          SIGTRAP: 5,
          SIGABRT: 6,
          SIGIOT: 6,
          SIGBUS: 7,
          SIGFPE: 8,
          SIGKILL: 9,
          SIGUSR1: 10,
          SIGSEGV: 11,
          SIGUSR2: 12,
          SIGPIPE: 13,
          SIGALRM: 14,
          SIGTERM: 15,
          SIGCHLD: 17,
          SIGCONT: 18,
          SIGSTOP: 19,
          SIGTSTP: 20,
          SIGTTIN: 21,
          SIGTTOU: 22,
          SIGURG: 23,
          SIGXCPU: 24,
          SIGXFSZ: 25,
          SIGVTALRM: 26,
          SIGPROF: 27,
          SIGWINCH: 28,
          SIGIO: 29,
          SIGPOLL: 29,
          SIGPWR: 30,
          SIGSYS: 31,
          SIGUNUSED: 31,
        },
        // Error constants
        errno: {
          E2BIG: 7,
          EACCES: 13,
          EADDRINUSE: 98,
          EADDRNOTAVAIL: 99,
          EAFNOSUPPORT: 97,
          EAGAIN: 11,
          EEXIST: 17,
          EINVAL: 22,
          ENOENT: 2,
          ENOTDIR: 20,
        },
        // Priority constants
        priority: {
          PRIORITY_LOW: 19,
          PRIORITY_BELOW_NORMAL: 10,
          PRIORITY_NORMAL: 0,
          PRIORITY_ABOVE_NORMAL: -7,
          PRIORITY_HIGH: -14,
          PRIORITY_HIGHEST: -20,
        },
        // Also include at top level for backwards compatibility
        SIGHUP: 1,
        SIGINT: 2,
        SIGQUIT: 3,
        SIGILL: 4,
        SIGTRAP: 5,
        SIGABRT: 6,
        SIGIOT: 6,
        SIGBUS: 7,
        SIGFPE: 8,
        SIGKILL: 9,
        SIGUSR1: 10,
        SIGSEGV: 11,
        SIGUSR2: 12,
        SIGPIPE: 13,
        SIGALRM: 14,
        SIGTERM: 15,
        SIGCHLD: 17,
        SIGCONT: 18,
        SIGSTOP: 19,
        SIGTSTP: 20,
        SIGTTIN: 21,
        SIGTTOU: 22,
        SIGURG: 23,
        SIGXCPU: 24,
        SIGXFSZ: 25,
        SIGVTALRM: 26,
        SIGPROF: 27,
        SIGWINCH: 28,
        SIGIO: 29,
        SIGPOLL: 29,
        SIGPWR: 30,
        SIGSYS: 31,
        SIGUNUSED: 31,
        PRIORITY_LOW: 19,
        PRIORITY_BELOW_NORMAL: 10,
        PRIORITY_NORMAL: 0,
        PRIORITY_ABOVE_NORMAL: -7,
        PRIORITY_HIGH: -14,
        PRIORITY_HIGHEST: -20,
      },
    };
  }

  /**
   * VS Code Language Client shim
   */
  private getVSCodeLanguageClientShim(): any {
    // Dynamically import to avoid circular dependencies
    // This will be resolved at runtime
    return import('./vscode-languageclient-shim').then(
      (module) => module.vscodeLanguageClient
    );
  }

  /**
   * VS Code JSON-RPC shim
   */
  private getVSCodeJsonRpcShim(): any {
    // Basic JSON-RPC exports that extensions might need
    return {
      MessageType: {
        Error: 1,
        Warning: 2,
        Info: 3,
        Log: 4,
      },
      ErrorCodes: {
        ParseError: -32700,
        InvalidRequest: -32600,
        MethodNotFound: -32601,
        InvalidParams: -32602,
        InternalError: -32603,
      },
    };
  }

  /**
   * URL module shim
   */
  private getUrlShim(): any {
    return {
      parse: (urlString: string) => {
        try {
          const url = new URL(urlString);
          return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
            href: url.href,
          };
        } catch (e) {
          return null;
        }
      },
      format: (urlObject: any) => {
        const protocol = urlObject.protocol || '';
        const hostname = urlObject.hostname || urlObject.host || '';
        const port = urlObject.port ? `:${urlObject.port}` : '';
        const pathname = urlObject.pathname || '';
        const search = urlObject.search || '';
        const hash = urlObject.hash || '';
        return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
      },
      pathToFileURL: (path: string) => {
        // Convert a file path to a file:// URL
        // Normalize path separators to forward slashes
        const normalizedPath = path.replace(/\\/g, '/');
        // Ensure it starts with a slash for absolute paths
        const absolutePath = normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath;
        return new URL(`file://${absolutePath}`);
      },
      fileURLToPath: (url: URL | string) => {
        // Convert a file:// URL to a file path
        const urlObj = typeof url === 'string' ? new URL(url) : url;
        if (urlObj.protocol !== 'file:') {
          throw new Error('URL must use file:// protocol');
        }
        // Remove the leading slash on Windows-style paths (e.g., /C:/path)
        let path = urlObj.pathname;
        if (/^\/[a-zA-Z]:/.test(path)) {
          path = path.substring(1);
        }
        return decodeURIComponent(path);
      },
      URL: typeof URL !== 'undefined' ? URL : undefined,
      URLSearchParams: typeof URLSearchParams !== 'undefined' ? URLSearchParams : undefined,
    };
  }

  /**
   * Querystring module shim
   */
  private getQuerystringShim(): any {
    return {
      parse: (str: string) => {
        const params = new URLSearchParams(str);
        const result: any = {};
        params.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      },
      stringify: (obj: any) => {
        const params = new URLSearchParams();
        Object.keys(obj).forEach(key => {
          params.append(key, obj[key]);
        });
        return params.toString();
      },
    };
  }

  /**
   * Stream module shim (basic)
   */
  private getStreamShim(): any {
    const { EventEmitter } = this.getEventsShim();

    class Readable extends EventEmitter {
      constructor() {
        super();
      }
    }

    class Writable extends EventEmitter {
      constructor() {
        super();
      }
    }

    return {
      Readable,
      Writable,
      Stream: EventEmitter,
    };
  }

  /**
   * Stream/Promises module shim
   * Provides promise-based stream utilities
   */
  private getStreamPromisesShim(): any {
    const { Readable, Writable } = this.getStreamShim();

    return {
      // Pipeline function that works with async iterables
      pipeline: async (..._streams: any[]) => {
        // Simple implementation that just resolves
        // In a real implementation, this would chain streams together
        return Promise.resolve();
      },

      // Finished promise wrapper
      finished: (stream: any) => {
        return new Promise((resolve, _reject) => {
          if (!stream) {
            return resolve(undefined);
          }
          // Simulate stream completion
          setTimeout(() => resolve(undefined), 0);
        });
      },

      // Readable stream utilities
      Readable,
      Writable,
    };
  }

  /**
   * Timers module shim
   */
  private getTimersShim(): any {
    return {
      setTimeout: (callback: Function, delay: number, ...args: any[]) => {
        return setTimeout(() => callback(...args), delay);
      },
      clearTimeout: (timeoutId: any) => {
        clearTimeout(timeoutId);
      },
      setInterval: (callback: Function, delay: number, ...args: any[]) => {
        return setInterval(() => callback(...args), delay);
      },
      clearInterval: (intervalId: any) => {
        clearInterval(intervalId);
      },
      setImmediate: (callback: Function, ...args: any[]) => {
        return setTimeout(() => callback(...args), 0);
      },
      clearImmediate: (immediateId: any) => {
        clearTimeout(immediateId);
      },
    };
  }

  /**
   * Timers/Promises module shim
   * Provides promise-based timer functions
   */
  private getTimersPromisesShim(): any {
    return {
      setTimeout: (delay: number, value?: any) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(value), delay);
        });
      },
      setImmediate: (value?: any) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(value), 0);
        });
      },
      setInterval: async function* (delay: number, value?: any) {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          yield value;
        }
      },
      scheduler: {
        wait: (delay: number) => {
          return new Promise((resolve) => setTimeout(resolve, delay));
        },
        yield: () => {
          return new Promise((resolve) => setTimeout(resolve, 0));
        },
      },
    };
  }

  /**
   * Assert module shim
   */
  private getAssertShim(): any {
    const assert: any = (value: any, message?: string) => {
      if (!value) {
        throw new Error(message || 'Assertion failed');
      }
    };

    assert.ok = assert;
    assert.equal = (actual: any, expected: any, message?: string) => {
      if (actual != expected) {
        throw new Error(message || `${actual} != ${expected}`);
      }
    };
    assert.strictEqual = (actual: any, expected: any, message?: string) => {
      if (actual !== expected) {
        throw new Error(message || `${actual} !== ${expected}`);
      }
    };
    assert.deepEqual = (actual: any, expected: any, message?: string) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || 'Deep equality check failed');
      }
    };
    assert.notEqual = (actual: any, expected: any, message?: string) => {
      if (actual == expected) {
        throw new Error(message || `${actual} == ${expected}`);
      }
    };
    assert.throws = (fn: Function, _error?: any, message?: string) => {
      let threw = false;
      try {
        fn();
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error(message || 'Function did not throw');
      }
    };
    assert.fail = (message?: string) => {
      throw new Error(message || 'Assertion failed');
    };

    return assert;
  }

  /**
   * Constants module shim
   */
  private getConstantsShim(): any {
    // Signal constants (matching Node.js os.constants.signals)
    const signals = {
      SIGHUP: 1,
      SIGINT: 2,
      SIGQUIT: 3,
      SIGILL: 4,
      SIGTRAP: 5,
      SIGABRT: 6,
      SIGIOT: 6,
      SIGBUS: 7,
      SIGFPE: 8,
      SIGKILL: 9,
      SIGUSR1: 10,
      SIGSEGV: 11,
      SIGUSR2: 12,
      SIGPIPE: 13,
      SIGALRM: 14,
      SIGTERM: 15,
      SIGCHLD: 17,
      SIGCONT: 18,
      SIGSTOP: 19,
      SIGTSTP: 20,
      SIGTTIN: 21,
      SIGTTOU: 22,
      SIGURG: 23,
      SIGXCPU: 24,
      SIGXFSZ: 25,
      SIGVTALRM: 26,
      SIGPROF: 27,
      SIGWINCH: 28,
      SIGIO: 29,
      SIGPOLL: 29,
      SIGPWR: 30,
      SIGSYS: 31,
      SIGUNUSED: 31,
    };

    // Error constants (errno)
    const errno = {
      E2BIG: 7,
      EACCES: 13,
      EADDRINUSE: 98,
      EADDRNOTAVAIL: 99,
      EAFNOSUPPORT: 97,
      EAGAIN: 11,
      EALREADY: 114,
      EBADF: 9,
      EBADMSG: 74,
      EBUSY: 16,
      ECANCELED: 125,
      ECHILD: 10,
      ECONNABORTED: 103,
      ECONNREFUSED: 111,
      ECONNRESET: 104,
      EDEADLK: 35,
      EDESTADDRREQ: 89,
      EDOM: 33,
      EDQUOT: 122,
      EEXIST: 17,
      EFAULT: 14,
      EFBIG: 27,
      EHOSTUNREACH: 113,
      EIDRM: 43,
      EILSEQ: 84,
      EINPROGRESS: 115,
      EINTR: 4,
      EINVAL: 22,
      EIO: 5,
      EISCONN: 106,
      EISDIR: 21,
      ELOOP: 40,
      EMFILE: 24,
      EMLINK: 31,
      EMSGSIZE: 90,
      EMULTIHOP: 72,
      ENAMETOOLONG: 36,
      ENETDOWN: 100,
      ENETRESET: 102,
      ENETUNREACH: 101,
      ENFILE: 23,
      ENOBUFS: 105,
      ENODATA: 61,
      ENODEV: 19,
      ENOENT: 2,
      ENOEXEC: 8,
      ENOLCK: 37,
      ENOLINK: 67,
      ENOMEM: 12,
      ENOMSG: 42,
      ENOPROTOOPT: 92,
      ENOSPC: 28,
      ENOSR: 63,
      ENOSTR: 60,
      ENOSYS: 38,
      ENOTCONN: 107,
      ENOTDIR: 20,
      ENOTEMPTY: 39,
      ENOTSOCK: 88,
      ENOTSUP: 95,
      ENOTTY: 25,
      ENXIO: 6,
      EOPNOTSUPP: 95,
      EOVERFLOW: 75,
      EPERM: 1,
      EPIPE: 32,
      EPROTO: 71,
      EPROTONOSUPPORT: 93,
      EPROTOTYPE: 91,
      ERANGE: 34,
      EROFS: 30,
      ESPIPE: 29,
      ESRCH: 3,
      ESTALE: 116,
      ETIME: 62,
      ETIMEDOUT: 110,
      ETXTBSY: 26,
      EWOULDBLOCK: 11,
      EXDEV: 18,
    };

    // Priority constants
    const priority = {
      PRIORITY_LOW: 19,
      PRIORITY_BELOW_NORMAL: 10,
      PRIORITY_NORMAL: 0,
      PRIORITY_ABOVE_NORMAL: -7,
      PRIORITY_HIGH: -14,
      PRIORITY_HIGHEST: -20,
    };

    // File system constants
    const fs = {
      // Access modes
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,

      // File open flags
      O_RDONLY: 0,
      O_WRONLY: 1,
      O_RDWR: 2,
      O_CREAT: 64,
      O_EXCL: 128,
      O_NOCTTY: 256,
      O_TRUNC: 512,
      O_APPEND: 1024,
      O_DIRECTORY: 65536,
      O_NOATIME: 262144,
      O_NOFOLLOW: 131072,
      O_SYNC: 1052672,
      O_DSYNC: 4096,
      O_DIRECT: 16384,
      O_NONBLOCK: 2048,

      // File type constants
      S_IFMT: 61440,
      S_IFREG: 32768,
      S_IFDIR: 16384,
      S_IFCHR: 8192,
      S_IFBLK: 24576,
      S_IFIFO: 4096,
      S_IFLNK: 40960,
      S_IFSOCK: 49152,

      // File mode constants
      S_IRWXU: 448,
      S_IRUSR: 256,
      S_IWUSR: 128,
      S_IXUSR: 64,
      S_IRWXG: 56,
      S_IRGRP: 32,
      S_IWGRP: 16,
      S_IXGRP: 8,
      S_IRWXO: 7,
      S_IROTH: 4,
      S_IWOTH: 2,
      S_IXOTH: 1,
    };

    // UV constants (libuv error codes)
    const uv = {
      UV_UDP_REUSEADDR: 4,
    };

    return {
      // Include all signal constants at top level for backwards compatibility
      ...signals,

      // Include all errno constants at top level for backwards compatibility
      ...errno,

      // Include all priority constants at top level for backwards compatibility
      ...priority,

      // Include all fs constants at top level for backwards compatibility
      ...fs,

      // Include all uv constants at top level for backwards compatibility
      ...uv,

      // Grouped constants (Node.js style)
      signals,
      errno,
      priority,
      fs,
      uv,
    };
  }

  /**
   * Child Process module shim
   * Provides stub implementations that throw helpful errors when called
   */
  private getChildProcessShim(): any {
    const { EventEmitter } = this.getEventsShim();

    const notSupportedError = () => {
      throw new Error('child_process operations are not supported in browser environment. Extensions should use VS Code APIs for process execution.');
    };

    class ChildProcessStub extends EventEmitter {
      pid = -1;
      stdin: any = null;
      stdout: any = null;
      stderr: any = null;
      killed = false;

      kill() {
        notSupportedError();
      }

      send() {
        notSupportedError();
      }

      disconnect() {
        notSupportedError();
      }
    }

    return {
      exec: notSupportedError,
      execFile: notSupportedError,
      spawn: notSupportedError,
      fork: notSupportedError,
      execSync: notSupportedError,
      execFileSync: notSupportedError,
      spawnSync: notSupportedError,
      ChildProcess: ChildProcessStub,
    };
  }

  /**
   * TTY module shim
   * Provides basic terminal detection functionality
   */
  private getTtyShim(): any {
    const { Readable, Writable } = this.getStreamShim();

    // ReadStream class (stdin-like)
    class ReadStream extends Readable {
      isRaw = false;
      isTTY = false;

      setRawMode(mode: boolean) {
        this.isRaw = mode;
        return this;
      }
    }

    // WriteStream class (stdout/stderr-like)
    class WriteStream extends Writable {
      isTTY = false;
      columns = 80;
      rows = 24;

      clearLine(_dir: number) {
        return true;
      }

      clearScreenDown() {
        return true;
      }

      cursorTo(_x: number, _y?: number) {
        return true;
      }

      moveCursor(_dx: number, _dy: number) {
        return true;
      }

      getColorDepth() {
        return 8;
      }

      hasColors(_count?: number) {
        return true;
      }

      getWindowSize() {
        return [this.columns, this.rows];
      }
    }

    return {
      isatty: (_fd: number) => false, // In browser, never a TTY
      ReadStream,
      WriteStream,
    };
  }

  /**
   * String Decoder module shim
   * Provides basic StringDecoder functionality
   */
  private getStringDecoderShim(): any {
    class StringDecoder {
      private encoding: string;

      constructor(encoding: string = 'utf8') {
        this.encoding = encoding;
      }

      write(buffer: any): string {
        // If it's already a string, return it
        if (typeof buffer === 'string') {
          return buffer;
        }

        // If it's a Buffer or Uint8Array
        if (buffer && (buffer instanceof Uint8Array || ArrayBuffer.isView(buffer))) {
          const decoder = new TextDecoder(this.encoding);
          return decoder.decode(buffer);
        }

        // Fallback: convert to string
        return String(buffer);
      }

      end(buffer?: any): string {
        if (buffer) {
          return this.write(buffer);
        }
        return '';
      }
    }

    return { StringDecoder };
  }

  /**
   * V8 module shim
   * Provides basic V8 engine API stubs
   */
  private getV8Shim(): any {
    return {
      // Serialization API (used by many packages for structured cloning)
      serialize: (value: any) => {
        // Simple JSON-based serialization fallback
        try {
          const json = JSON.stringify(value);
          return new TextEncoder().encode(json);
        } catch (e) {
          throw new Error('V8 serialization not fully supported in browser environment');
        }
      },
      deserialize: (buffer: Uint8Array) => {
        try {
          const json = new TextDecoder().decode(buffer);
          return JSON.parse(json);
        } catch (e) {
          throw new Error('V8 deserialization not fully supported in browser environment');
        }
      },

      // Serializer/Deserializer classes (stub implementations)
      Serializer: class Serializer {
        writeHeader() {}
        writeValue(_value: any) {}
        releaseBuffer() { return new Uint8Array(0); }
        transferArrayBuffer(_id: number, _arrayBuffer: ArrayBuffer) {}
        writeUint32(_value: number) {}
        writeUint64(_hi: number, _lo: number) {}
        writeDouble(_value: number) {}
        writeRawBytes(_buffer: Uint8Array) {}
      },
      Deserializer: class Deserializer {
        constructor(_buffer: Uint8Array) {}
        readHeader() { return true; }
        readValue() { return null; }
        transferArrayBuffer(_id: number, _arrayBuffer: ArrayBuffer) {}
        getWireFormatVersion() { return 15; }
        readUint32() { return 0; }
        readUint64() { return [0, 0]; }
        readDouble() { return 0; }
        readRawBytes(_length: number) { return new Uint8Array(0); }
      },

      // DefaultSerializer/DefaultDeserializer (wrappers around serialize/deserialize)
      DefaultSerializer: class DefaultSerializer {
        constructor() {}
        writeValue(value: any) {
          try {
            const json = JSON.stringify(value);
            return new TextEncoder().encode(json);
          } catch (e) {
            return new Uint8Array(0);
          }
        }
        releaseBuffer() { return new Uint8Array(0); }
      },
      DefaultDeserializer: class DefaultDeserializer {
        constructor(_buffer: Uint8Array) {}
        readValue() { return null; }
      },

      // Heap statistics (stub values)
      getHeapStatistics: () => ({
        total_heap_size: 0,
        total_heap_size_executable: 0,
        total_physical_size: 0,
        total_available_size: 0,
        used_heap_size: 0,
        heap_size_limit: 0,
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: 0,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0,
      }),

      getHeapSpaceStatistics: () => [],

      getHeapSnapshot: () => {
        throw new Error('V8 heap snapshots are not available in browser environment');
      },

      writeHeapSnapshot: (_filename?: string) => {
        throw new Error('V8 heap snapshots are not available in browser environment');
      },

      // Code cache API
      getHeapCodeStatistics: () => ({
        code_and_metadata_size: 0,
        bytecode_and_metadata_size: 0,
        external_script_source_size: 0,
      }),

      // Promises
      setFlagsFromString: (_flags: string) => {
        // Flags are ignored in browser environment
        console.warn('[V8 Shim] setFlagsFromString is not supported in browser environment');
      },

      // Cached data versioning
      cachedDataVersionTag: () => 0,

      // Take heap snapshot
      takeCoverage: () => {
        throw new Error('V8 coverage is not available in browser environment');
      },

      stopCoverage: () => {
        throw new Error('V8 coverage is not available in browser environment');
      },
    };
  }
}

/**
 * Create module loader
 */
export function createModuleLoader(
  config: ModuleLoaderConfig,
  fileReader: (path: string) => Promise<string>
): ModuleLoader {
  return new ModuleLoader(config, fileReader);
}
