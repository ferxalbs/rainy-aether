import { Registry, IRawGrammar, IOnigLib } from 'vscode-textmate';
import { loadWASM, createOnigScanner, createOnigString } from 'vscode-oniguruma';
import { grammarRegistry } from './grammarRegistry';
import type { GrammarConfiguration } from './types';

/**
 * TextMate service for managing syntax highlighting via TextMate grammars
 */
export class TextMateService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the TextMate service
   * This loads the Oniguruma WASM and creates the Registry
   */
  async initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.initialized) {
      return;
    }

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Initializing TextMate service...');

      // Load Oniguruma WASM
      const wasmPath = await this.getOnigWasmPath();
      await this.loadOniguruma(wasmPath);

      // Create the onigLib for the Registry
      const onigLib: IOnigLib = {
        createOnigScanner: (sources: string[]) => createOnigScanner(sources),
        createOnigString: (str: string) => createOnigString(str)
      };

      // Create the TextMate Registry
      const registry = new Registry({
        onigLib: Promise.resolve(onigLib),
        loadGrammar: async (scopeName: string): Promise<IRawGrammar | null> => {
          return this.loadGrammarFile(scopeName);
        }
      });

      // Initialize the grammar registry with the TextMate Registry
      grammarRegistry.initialize(registry, this.loadGrammarFile.bind(this));

      this.initialized = true;
      console.log('TextMate service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TextMate service:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Load the Oniguruma WASM binary
   */
  private async loadOniguruma(wasmPath: string): Promise<void> {
    try {
      console.log('Loading Oniguruma WASM from:', wasmPath);

      const response = await fetch(wasmPath);
      const arrayBuffer = await response.arrayBuffer();

      await loadWASM(arrayBuffer);

      console.log('Oniguruma WASM loaded successfully');
    } catch (error) {
      console.error('Failed to load Oniguruma WASM:', error);
      throw new Error('Failed to load Oniguruma WASM. Syntax highlighting will not work.');
    }
  }

  /**
   * Get the path to the Oniguruma WASM file
   * In production, this should be bundled with the app
   */
  private async getOnigWasmPath(): Promise<string> {
    // Try to load from node_modules (development)
    // In production, this should be copied to the public directory
    try {
      // First, try to load from a public path (production)
      const publicPath = '/onig.wasm';
      const response = await fetch(publicPath, { method: 'HEAD' });
      if (response.ok) {
        return publicPath;
      }
    } catch {
      // Fall through to node_modules path
    }

    // Fall back to node_modules path (development)
    return '/node_modules/vscode-oniguruma/release/onig.wasm';
  }

  /**
   * Load a grammar file by scope name
   */
  private async loadGrammarFile(scopeName: string): Promise<IRawGrammar | null> {
    try {
      // Get the grammar configuration
      const config = grammarRegistry.getConfiguration(scopeName);
      if (!config) {
        console.warn(`No grammar configuration found for scope: ${scopeName}`);
        return null;
      }

      console.log(`Loading grammar file from: ${config.path}`);

      // Load the grammar file
      const { invoke } = await import('@tauri-apps/api/core');
      const grammarContent = await invoke<string>('read_extension_file', {
        path: config.path
      });

      // Parse the grammar JSON
      const grammar = JSON.parse(grammarContent) as IRawGrammar;

      console.log(`Successfully loaded grammar for ${scopeName}`);
      return grammar;
    } catch (error) {
      console.error(`Failed to load grammar file for ${scopeName}:`, error);
      return null;
    }
  }

  /**
   * Register a grammar configuration
   */
  registerGrammar(config: GrammarConfiguration): void {
    grammarRegistry.registerGrammar(config);
  }

  /**
   * Load a grammar by language ID
   */
  async loadGrammarByLanguage(languageId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('TextMate service not initialized');
    }

    await grammarRegistry.loadGrammarByLanguage(languageId);
  }

  /**
   * Load a grammar by scope name
   */
  async loadGrammarByScope(scopeName: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('TextMate service not initialized');
    }

    await grammarRegistry.loadGrammar(scopeName);
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the grammar registry
   */
  getGrammarRegistry() {
    return grammarRegistry;
  }

  /**
   * Cleanup and reset the service
   */
  dispose(): void {
    grammarRegistry.clear();
    this.initialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
export const textMateService = new TextMateService();
