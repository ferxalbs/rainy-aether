import { Registry, IGrammar } from 'vscode-textmate';
import type { GrammarConfiguration, LoadedGrammar, GrammarLoader } from './types';

/**
 * Registry for managing TextMate grammars
 */
export class GrammarRegistry {
  private registry: Registry | null = null;
  private grammars: Map<string, LoadedGrammar> = new Map();
  private grammarConfigurations: Map<string, GrammarConfiguration> = new Map();

  /**
   * Initialize the registry with an oniguruma-backed Registry
   */
  initialize(registry: Registry, _grammarLoader: GrammarLoader): void {
    this.registry = registry;
  }

  /**
   * Register a grammar configuration
   */
  registerGrammar(config: GrammarConfiguration): void {
    console.log(`Registering grammar for ${config.language} (${config.scopeName})`);
    this.grammarConfigurations.set(config.scopeName, config);
    this.grammarConfigurations.set(config.language, config);
  }

  /**
   * Load a grammar by scope name
   */
  async loadGrammar(scopeName: string): Promise<IGrammar | null> {
    if (!this.registry) {
      console.error('Grammar registry not initialized');
      return null;
    }

    // Check if already loaded
    const loaded = this.grammars.get(scopeName);
    if (loaded) {
      return loaded.grammar;
    }

    try {
      console.log(`Loading grammar for scope: ${scopeName}`);
      const grammar = await this.registry.loadGrammar(scopeName);

      if (grammar) {
        const config = this.grammarConfigurations.get(scopeName);
        if (config) {
          const loadedGrammar: LoadedGrammar = {
            grammar,
            configuration: config
          };
          this.grammars.set(scopeName, loadedGrammar);
          console.log(`Successfully loaded grammar for ${scopeName}`);
        }
      }

      return grammar;
    } catch (error) {
      console.error(`Failed to load grammar for ${scopeName}:`, error);
      return null;
    }
  }

  /**
   * Load a grammar by language ID
   */
  async loadGrammarByLanguage(languageId: string): Promise<IGrammar | null> {
    const config = this.grammarConfigurations.get(languageId);
    if (!config) {
      console.warn(`No grammar configuration found for language: ${languageId}`);
      return null;
    }

    return this.loadGrammar(config.scopeName);
  }

  /**
   * Get a loaded grammar
   */
  getGrammar(scopeNameOrLanguage: string): LoadedGrammar | undefined {
    return this.grammars.get(scopeNameOrLanguage);
  }

  /**
   * Check if a grammar is loaded
   */
  hasGrammar(scopeNameOrLanguage: string): boolean {
    return this.grammars.has(scopeNameOrLanguage);
  }

  /**
   * Get all loaded grammars
   */
  getAllGrammars(): LoadedGrammar[] {
    return Array.from(this.grammars.values());
  }

  /**
   * Get grammar configuration
   */
  getConfiguration(scopeNameOrLanguage: string): GrammarConfiguration | undefined {
    return this.grammarConfigurations.get(scopeNameOrLanguage);
  }

  /**
   * Unload a grammar
   */
  unloadGrammar(scopeNameOrLanguage: string): void {
    const loaded = this.grammars.get(scopeNameOrLanguage);
    if (loaded) {
      if (loaded.disposable) {
        loaded.disposable.dispose();
      }
      this.grammars.delete(scopeNameOrLanguage);
      console.log(`Unloaded grammar: ${scopeNameOrLanguage}`);
    }
  }

  /**
   * Clear all grammars
   */
  clear(): void {
    for (const loaded of this.grammars.values()) {
      if (loaded.disposable) {
        loaded.disposable.dispose();
      }
    }
    this.grammars.clear();
    this.grammarConfigurations.clear();
  }

  /**
   * Get the underlying TextMate Registry
   */
  getRegistry(): Registry | null {
    return this.registry;
  }
}

// Export singleton instance
export const grammarRegistry = new GrammarRegistry();
