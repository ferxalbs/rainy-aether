import * as monaco from 'monaco-editor';
import { InstalledExtension } from '../types/extension';
import {
  ExtensionSandbox,
  createExtensionSandbox,
  ActivationManager,
  createActivationManager,
  ExtensionError,
  ExtensionSandboxConfig,
} from './extension';

export class MonacoExtensionHost {
  private loadedExtensions: Map<string, LoadedExtension> = new Map();
  private languageServices: Map<string, LanguageService> = new Map();
  private activationManager: ActivationManager = createActivationManager();
  private sandboxes: Map<string, ExtensionSandbox> = new Map();

  /**
   * Load an extension into Monaco Editor
   */
  async loadExtension(extension: InstalledExtension): Promise<void> {
    if (this.loadedExtensions.has(extension.id)) {
      console.warn(`Extension ${extension.id} is already loaded`);
      return;
    }

    try {
      console.log(`Loading extension ${extension.id} into Monaco`);

      const loadedExtension: LoadedExtension = {
        extension,
        disposables: [],
        activated: false,
        sandbox: null,
      };

      // Load the extension's contributions (static)
      await this.loadExtensionContributions(extension, loadedExtension);

      // Initialize extension sandbox if extension has a main entry point
      if (extension.manifest.main) {
        await this.initializeExtensionSandbox(extension, loadedExtension);
      }

      this.loadedExtensions.set(extension.id, loadedExtension);
      console.log(`Successfully loaded extension ${extension.id}`);

      // Try to activate if extension has activation events
      if (extension.manifest.activationEvents) {
        await this.tryActivateExtension(extension.id);
      }
    } catch (error) {
      console.error(`Failed to load extension ${extension.id}:`, error);
      throw error;
    }
  }

  /**
   * Unload an extension from Monaco Editor
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const loadedExtension = this.loadedExtensions.get(extensionId);
    if (!loadedExtension) {
      console.warn(`Extension ${extensionId} is not loaded`);
      return;
    }

    try {
      console.log(`Unloading extension ${extensionId} from Monaco`);

      // Dispose extension sandbox if it exists
      if (loadedExtension.sandbox) {
        await loadedExtension.sandbox.dispose();
        this.sandboxes.delete(extensionId);
      }

      // Unregister from activation manager
      this.activationManager.unregisterExtension(extensionId);

      // Dispose all disposables
      for (const disposable of loadedExtension.disposables) {
        disposable.dispose();
      }

      // Remove language services
      this.unloadLanguageServices(extensionId);

      this.loadedExtensions.delete(extensionId);
      console.log(`Successfully unloaded extension ${extensionId}`);
    } catch (error) {
      console.error(`Failed to unload extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an extension is loaded
   */
  isExtensionLoaded(extensionId: string): boolean {
    return this.loadedExtensions.has(extensionId);
  }

  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): LoadedExtension[] {
    return Array.from(this.loadedExtensions.values());
  }

  // Private methods

  private async loadExtensionContributions(
    extension: InstalledExtension,
    loadedExtension: LoadedExtension
  ): Promise<void> {
    const manifest = extension.manifest;

    if (!manifest.contributes) {
      console.log(`Extension ${extension.id} has no contributions`);
      return;
    }

    const contributes = manifest.contributes;

    // Load languages
    if (contributes.languages) {
      await this.loadLanguages(extension, contributes.languages, loadedExtension);
    }

    // Load grammars (TextMate)
    if (contributes.grammars) {
      await this.loadGrammars(extension, contributes.grammars, loadedExtension);
    }

    // Load themes
    if (contributes.themes) {
      await this.loadThemes(extension, contributes.themes, loadedExtension);
    }

    // Load snippets
    if (contributes.snippets) {
      await this.loadSnippets(extension, contributes.snippets, loadedExtension);
    }

    // Load configuration
    if (contributes.configuration) {
      await this.loadConfiguration(extension, contributes.configuration, loadedExtension);
    }

    // Load commands (if applicable)
    if (contributes.commands) {
      await this.loadCommands(extension, contributes.commands, loadedExtension);
    }

    // Load icon themes
    if (contributes.iconThemes) {
      await this.loadIconThemes(extension, contributes.iconThemes, loadedExtension);
    }
  }

  private async loadLanguages(
    extension: InstalledExtension,
    languages: any[],
    loadedExtension: LoadedExtension
  ): Promise<void> {
    for (const language of languages) {
      try {
        // Register language with Monaco
        monaco.languages.register({
          id: language.id,
          aliases: language.aliases || [],
          extensions: language.extensions || [],
          filenames: language.filenames || [],
          filenamePatterns: language.filenamePatterns || [],
          firstLine: language.firstLine,
          mimetypes: language.mimetypes || []
        });

        // Set language configuration
        if (language.configuration) {
          try {
            const configPath = this.resolveExtensionPath(extension, language.configuration);
            const config = await this.loadJsonFile(configPath);

            monaco.languages.setLanguageConfiguration(language.id, config);
            console.log(`Loaded language configuration for ${language.id}`);
          } catch (configError) {
            console.warn(`Failed to load language configuration for ${language.id}, using defaults:`, configError);
          }
        }

        // Create language service
        const languageService: LanguageService = {
          id: language.id,
          extensionId: extension.id,
          monarchTokenizer: null,
          disposable: null
        };

        this.languageServices.set(language.id, languageService);
        loadedExtension.disposables.push({
          dispose: () => {
            // Note: Monaco doesn't provide a way to unregister languages
            // They persist for the session
            this.languageServices.delete(language.id);
          }
        });

      } catch (error) {
        console.error(`Failed to load language ${language.id}:`, error);
        // Continue with other languages even if one fails
      }
    }
  }

  private async loadGrammars(
    extension: InstalledExtension,
    grammars: any[],
    loadedExtension: LoadedExtension
  ): Promise<void> {
    console.log(`Loading TextMate grammars from extension ${extension.id}`);

    try {
      // Import TextMate services
      const { textMateService, registerTextMateLanguage } = await import('./textmate');

      // Initialize TextMate service if not already initialized
      if (!textMateService.isInitialized()) {
        await textMateService.initialize();
      }

      // Load each grammar
      for (const grammar of grammars) {
        try {
          // Resolve grammar path
          const grammarPath = this.resolveExtensionPath(extension, grammar.path);

          // Register grammar configuration
          textMateService.registerGrammar({
            language: grammar.language,
            scopeName: grammar.scopeName,
            path: grammarPath,
            embeddedLanguages: grammar.embeddedLanguages,
            tokenTypes: grammar.tokenTypes
          });

          // Register with Monaco
          await registerTextMateLanguage(grammar.language);

          console.log(`Successfully loaded TextMate grammar for ${grammar.language}`);

          // Add disposable for cleanup
          loadedExtension.disposables.push({
            dispose: () => {
              // Grammar cleanup is handled by grammarRegistry
              console.log(`Unloading grammar for ${grammar.language}`);
            }
          });
        } catch (grammarError) {
          console.error(`Failed to load grammar for ${grammar.language}:`, grammarError);
          // Continue with other grammars even if one fails
        }
      }
    } catch (error) {
      console.error(`Failed to load TextMate grammars from ${extension.id}:`, error);
    }
  }

  private async loadThemes(
    extension: InstalledExtension,
    themes: any[],
    loadedExtension: LoadedExtension
  ): Promise<void> {
    for (const theme of themes) {
      try {
        const themePath = this.resolveExtensionPath(extension, theme.path);
        const themeData = await this.loadJsonFile(themePath);

        // Register theme with Monaco
        monaco.editor.defineTheme(theme.id || `theme-${extension.id}`, themeData);

        loadedExtension.disposables.push({
          dispose: () => {
            // Monaco doesn't provide a way to unregister themes
            // They persist for the session
          }
        });

        console.log(`Loaded theme ${theme.label || theme.id} from ${extension.id}`);
      } catch (error) {
        console.warn(`Failed to load theme from ${extension.id}, skipping:`, error);
        // Continue with other themes even if one fails
      }
    }
  }

  private async loadSnippets(
    extension: InstalledExtension,
    snippets: any[],
    _loadedExtension: LoadedExtension
  ): Promise<void> {
    for (const snippet of snippets) {
      try {
        const snippetPath = this.resolveExtensionPath(extension, snippet.path);
        const snippetData = await this.loadJsonFile(snippetPath);

        // Register snippets with Monaco
        monaco.languages.registerCompletionItemProvider(snippet.language, {
          provideCompletionItems: (_model, position) => {
            return {
              suggestions: Object.entries(snippetData).map(([key, value]: [string, any]) => ({
                label: key,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: value.body?.join('\n') || value.body || '',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: value.description || value.prefix,
                detail: `Snippet: ${key}`,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column
                }
              }))
            };
          }
        });

        console.log(`Loaded snippets for language ${snippet.language} from ${extension.id}`);
      } catch (error) {
        console.warn(`Failed to load snippets from ${extension.id}, skipping:`, error);
        // Continue with other snippets even if one fails
      }
    }
  }

  private async loadConfiguration(
    _extension: InstalledExtension,
    _configuration: any,
    _loadedExtension: LoadedExtension
  ): Promise<void> {
    // Configuration defaults would be handled by the settings system
    // For now, just log that configuration is available
    console.log(`Extension ${_extension.id} provides configuration defaults`);
  }

  private async loadCommands(
    _extension: InstalledExtension,
    _commands: any[],
    _loadedExtension: LoadedExtension
  ): Promise<void> {
    // Monaco doesn't have a command system like VS Code
    // Commands would need to be integrated with the application's command system
    console.log(`Extension ${_extension.id} provides commands, but Monaco integration is limited`);
  }

  private async loadIconThemes(
    extension: InstalledExtension,
    iconThemes: any[],
    loadedExtension: LoadedExtension
  ): Promise<void> {
    console.log(`[IconTheme] Extension ${extension.id} provides ${iconThemes.length} icon theme(s)`);

    try {
      // Dynamically import the icon theme API
      const { iconThemeActions } = await import('@/stores/iconThemeStore');

      for (const iconThemeContrib of iconThemes) {
        console.log(`[IconTheme] Loading icon theme: ${iconThemeContrib.label} (${iconThemeContrib.id})`);

        try {
          // Resolve the path to the icon theme JSON file
          const themePath = this.resolveExtensionPath(extension, iconThemeContrib.path);
          console.log(`[IconTheme] Loading theme file from: ${themePath}`);

          // Load the icon theme data
          const themeData = await this.loadJsonFile(themePath);
          console.log(`[IconTheme] Loaded theme data for ${iconThemeContrib.id}`);

          // Convert icon paths to full extension paths and load as data URLs
          const iconDefinitions: Record<string, any> = {};
          if (themeData.iconDefinitions) {
            const { invoke } = await import('@tauri-apps/api/core');
            let loadedCount = 0;
            let failedCount = 0;

            for (const [iconId, iconDef] of Object.entries<any>(themeData.iconDefinitions)) {
              try {
                // Handle different formats:
                // 1. Object with iconPath property: { iconPath: "./icons/file.svg" }
                // 2. Direct string value (legacy format)
                let iconPath: string | undefined;

                if (typeof iconDef === 'string') {
                  iconPath = iconDef;
                } else if (iconDef && typeof iconDef === 'object' && iconDef.iconPath) {
                  iconPath = iconDef.iconPath;
                }

                if (iconPath) {
                  // Convert relative path to full extension path
                  const fullPath = this.resolveExtensionPath(extension, iconPath);

                  // Read the icon file
                  const iconContent = await invoke<string>('read_extension_file', { path: fullPath });

                  // If it's an SVG, convert to data URL (properly encoded for UTF-8)
                  if (fullPath.endsWith('.svg')) {
                    // Properly encode UTF-8 strings for base64
                    // Use TextEncoder to handle UTF-8 characters correctly
                    const encoder = new TextEncoder();
                    const data = encoder.encode(iconContent);
                    // Convert to base64 using Uint8Array
                    let binary = '';
                    const len = data.byteLength;
                    for (let i = 0; i < len; i++) {
                      binary += String.fromCharCode(data[i]);
                    }
                    const base64 = btoa(binary);
                    const dataUrl = `data:image/svg+xml;base64,${base64}`;
                    iconDefinitions[iconId] = { iconPath: dataUrl };
                    loadedCount++;
                  } else {
                    // For PNG/JPG, we'd need to determine MIME type
                    const ext = fullPath.split('.').pop()?.toLowerCase();
                    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
                    // For binary files, we need to read them differently
                    // For now, use the same encoding approach
                    const encoder = new TextEncoder();
                    const data = encoder.encode(iconContent);
                    let binary = '';
                    const len = data.byteLength;
                    for (let i = 0; i < len; i++) {
                      binary += String.fromCharCode(data[i]);
                    }
                    const base64 = btoa(binary);
                    const dataUrl = `data:${mimeType};base64,${base64}`;
                    iconDefinitions[iconId] = { iconPath: dataUrl };
                    loadedCount++;
                  }
                } else {
                  // No iconPath, keep the definition as-is (might be font-based icon)
                  iconDefinitions[iconId] = iconDef;
                }
              } catch (error) {
                failedCount++;
                console.warn(`[IconTheme] Failed to load icon ${iconId}:`, error);
                // Skip this icon - don't add it to iconDefinitions
              }
            }

            console.log(`[IconTheme] Loaded ${loadedCount} icons, ${failedCount} failed for theme ${iconThemeContrib.id}`);
          }

          // Register the icon theme
          iconThemeActions.registerTheme({
            id: iconThemeContrib.id,
            label: iconThemeContrib.label,
            extensionId: extension.id,
            iconDefinitions,
            // Copy VS Code standard properties
            file: themeData.file,
            folder: themeData.folder,
            folderExpanded: themeData.folderExpanded,
            rootFolder: themeData.rootFolder,
            rootFolderExpanded: themeData.rootFolderExpanded,
            fileExtensions: themeData.fileExtensions,
            fileNames: themeData.fileNames,
            languageIds: themeData.languageIds,
            folderNames: themeData.folderNames,
            folderNamesExpanded: themeData.folderNamesExpanded,
            rootFolderNames: themeData.rootFolderNames,
            rootFolderNamesExpanded: themeData.rootFolderNamesExpanded,
          });

          console.log(`[IconTheme] Successfully registered icon theme: ${iconThemeContrib.id}`);

          // Auto-activate the theme when the extension is enabled
          // This ensures the user sees the icons immediately
          console.log(`[IconTheme] Auto-activating icon theme: ${iconThemeContrib.id}`);
          await iconThemeActions.setActiveTheme(iconThemeContrib.id, true);
          console.log(`[IconTheme] Icon theme ${iconThemeContrib.id} is now active`);

          // Add disposal callback
          loadedExtension.disposables.push({
            dispose: () => {
              console.log(`[IconTheme] Unregistering icon theme: ${iconThemeContrib.id}`);
              iconThemeActions.unregisterTheme(iconThemeContrib.id);
            },
          });
        } catch (error) {
          console.error(`[IconTheme] Failed to load icon theme ${iconThemeContrib.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[IconTheme] Failed to import icon theme store:`, error);
    }
  }

  private resolveExtensionPath(extension: InstalledExtension, relativePath: string): string {
    // The iconPath in material-icons.json is relative to the dist/ folder
    // Example: iconPath: "./../icons/git.svg" means go up from dist/ to extension root, then into icons/

    // Start with the extension folder name (e.g., "pkief.material-icon-theme-5.28.0")
    let cleanPath = relativePath.startsWith('./') ? relativePath.substring(2) : relativePath;

    // If the path starts with ../, it's relative to dist/ folder
    // We need to resolve it relative to the extension root
    if (cleanPath.startsWith('../')) {
      // Remove the ../ prefix (going up from dist/)
      cleanPath = cleanPath.substring(3);
    }

    // Build the final path: extension-folder/resolved-path
    const finalPath = `${extension.path}/${cleanPath}`;

    console.log(`[IconTheme] Resolved path: ${relativePath} -> ${finalPath}`);
    return finalPath;
  }

  private async loadJsonFile(path: string): Promise<any> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const fileContent = await invoke<string>('read_extension_file', { path });
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Failed to load file ${path}:`, error);
      throw new Error(`Failed to load extension file: ${path}`);
    }
  }

  private unloadLanguageServices(extensionId: string): void {
    for (const [languageId, service] of this.languageServices.entries()) {
      if (service.extensionId === extensionId) {
        if (service.disposable) {
          service.disposable.dispose();
        }
        this.languageServices.delete(languageId);
      }
    }
  }

  /**
   * Initialize extension sandbox for code execution
   */
  private async initializeExtensionSandbox(
    extension: InstalledExtension,
    loadedExtension: LoadedExtension
  ): Promise<void> {
    try {
      console.log(`Initializing sandbox for extension ${extension.id}`);

      // Create sandbox configuration
      const sandboxConfig: ExtensionSandboxConfig = {
        extensionId: extension.id,
        extensionPath: extension.path,
        manifest: extension.manifest,
        activationTimeout: 10000, // 10 seconds
        debug: true, // Enable debug logging for development
      };

      // Create sandbox
      const sandbox = createExtensionSandbox(sandboxConfig);

      // Set up error handler
      sandbox.onError((error: ExtensionError) => {
        console.error(`[ExtensionHost] Error in extension ${extension.id}:`, error);
        this.activationManager.markFailed(extension.id, error.message);
      });

      // Set up activation handler
      sandbox.onActivated(() => {
        loadedExtension.activated = true;
        this.activationManager.markActivated(extension.id);
        console.log(`Extension ${extension.id} activated`);
      });

      // Set up deactivation handler
      sandbox.onDeactivated(() => {
        loadedExtension.activated = false;
        this.activationManager.markDeactivated(extension.id);
        console.log(`Extension ${extension.id} deactivated`);
      });

      // Initialize sandbox
      await sandbox.initialize();

      // Store sandbox
      loadedExtension.sandbox = sandbox;
      this.sandboxes.set(extension.id, sandbox);

      // Register with activation manager
      const activationEvents = extension.manifest.activationEvents || [];
      this.activationManager.registerExtension(extension.id, activationEvents);

      console.log(`Sandbox initialized for extension ${extension.id}`);
    } catch (error) {
      console.error(`Failed to initialize sandbox for ${extension.id}:`, error);
      throw error;
    }
  }

  /**
   * Try to activate an extension
   */
  private async tryActivateExtension(extensionId: string): Promise<void> {
    // For now, we'll activate with a generic event
    // In a full implementation, we'd check specific activation events
    const activationEvent = '*'; // Always activate for now

    if (this.activationManager.shouldActivate(extensionId, activationEvent)) {
      await this.activateExtension(extensionId, activationEvent);
    }
  }

  /**
   * Activate an extension
   */
  async activateExtension(extensionId: string, activationEvent: string): Promise<void> {
    const loadedExtension = this.loadedExtensions.get(extensionId);
    if (!loadedExtension) {
      throw new Error(`Extension ${extensionId} is not loaded`);
    }

    if (loadedExtension.activated) {
      console.log(`Extension ${extensionId} is already activated`);
      return;
    }

    if (!loadedExtension.sandbox) {
      console.warn(`Extension ${extensionId} has no sandbox (no main entry point)`);
      return;
    }

    try {
      console.log(`Activating extension ${extensionId} with event: ${activationEvent}`);

      this.activationManager.markActivating(extensionId);

      await loadedExtension.sandbox.activate(activationEvent);

      // Sandbox will call onActivated handler when activation completes
    } catch (error) {
      console.error(`Failed to activate extension ${extensionId}:`, error);
      this.activationManager.markFailed(extensionId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Trigger activation event
   */
  async triggerActivationEvent(event: string): Promise<void> {
    const extensionsToActivate = this.activationManager.getExtensionsToActivate(event);

    for (const extensionId of extensionsToActivate) {
      try {
        await this.activateExtension(extensionId, event);
      } catch (error) {
        console.error(`Failed to activate extension ${extensionId} for event ${event}:`, error);
        // Continue with other extensions
      }
    }
  }

  /**
   * Get activation manager (for debugging)
   */
  getActivationManager(): ActivationManager {
    return this.activationManager;
  }
}

// Types
interface LoadedExtension {
  extension: InstalledExtension;
  disposables: monaco.IDisposable[];
  activated: boolean;
  sandbox: ExtensionSandbox | null;
}

interface LanguageService {
  id: string;
  extensionId: string;
  monarchTokenizer: any;
  disposable: monaco.IDisposable | null;
}

// Export singleton instance
export const monacoExtensionHost = new MonacoExtensionHost();
