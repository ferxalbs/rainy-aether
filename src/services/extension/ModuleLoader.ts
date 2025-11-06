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
    return await this.requireAsync(this.config.mainModulePath);
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
        return this.loadBuiltInModule(modulePath);
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
    // Built-in modules
    if (this.isBuiltInModule(id)) {
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
   */
  private resolveNodeModule(id: string, _fromPath?: string): string {
    // Try to resolve from extension's node_modules
    const extensionNodeModules = `${this.config.extensionPath}/node_modules/${id}`;

    // Check if it's a package.json reference
    // For now, we'll assume it's a direct path
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
      'child_process',
      'process',
      'timers',
    ];

    return builtInModules.includes(id);
  }

  /**
   * Load built-in Node.js module shim
   */
  private loadBuiltInModule(id: string): any {
    // Return basic shims for built-in modules
    // In a full implementation, we would provide more complete polyfills

    switch (id) {
      case 'path':
        return this.getPathShim();

      case 'fs':
        throw new Error(
          'fs module is not supported in browser environment. Use vscode.workspace.fs instead.'
        );

      case 'util':
        return this.getUtilShim();

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
        throw new Error('child_process module is not supported in browser environment');

      case 'crypto':
        throw new Error(
          'crypto module is not supported in browser environment. Use Web Crypto API instead.'
        );

      default:
        throw new Error(`Built-in module '${id}' is not supported`);
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
    return {
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
    };
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
