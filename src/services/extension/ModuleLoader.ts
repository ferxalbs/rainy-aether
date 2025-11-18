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
      const moduleFunction = new Function(
        'exports',
        'require',
        'module',
        '__filename',
        '__dirname',
        wrappedCode
      );

      const require = (id: string) => this.require(id, module);
      const __filename = modulePath;
      const __dirname = this.getDirectoryName(modulePath);

      moduleFunction.call(
        module.exports,
        module.exports,
        require,
        module,
        __filename,
        __dirname
      );

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
      'path',
      'fs',
      'os',
      'util',
      'events',
      'stream',
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
      'assert',
      'constants',
      'string_decoder',
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
      case 'path':
        return this.getPathShim();

      case 'fs':
        throw new Error(
          'fs module is not supported in browser environment. Use vscode.workspace.fs instead.'
        );

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
        throw new Error('os module is not supported in browser environment');

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

      case 'http':
      case 'https':
      case 'net':
      case 'tls':
        // Network modules not supported in browser
        throw new Error(`Module '${id}' is not supported in browser environment`);

      case 'timers':
        return this.getTimersShim();

      case 'assert':
        return this.getAssertShim();

      case 'constants':
        return this.getConstantsShim();

      case 'string_decoder':
        return this.getStringDecoderShim();

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
      inspect: (obj: any, options?: any) => {
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
    assert.throws = (fn: Function, error?: any, message?: string) => {
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
    return {
      // File system constants
      O_RDONLY: 0,
      O_WRONLY: 1,
      O_RDWR: 2,
      O_CREAT: 64,
      O_EXCL: 128,
      O_TRUNC: 512,
      O_APPEND: 1024,

      // Error constants
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

      // Signal constants
      SIGHUP: 1,
      SIGINT: 2,
      SIGTERM: 15,
      SIGKILL: 9,
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
