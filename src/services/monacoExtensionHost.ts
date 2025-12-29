import * as monaco from 'monaco-editor';
import { InstalledExtension } from '../types/extension';
import {
  ExtensionSandbox,
  createExtensionSandbox,
  ActivationManager,
  createActivationManager,
  ExtensionError,
  ExtensionSandboxConfig,
  ActivationEventType,
} from './extension';
import { webviewActions } from '../stores/webviewStore';
import { ideActions } from '../stores/ideStore';

export class MonacoExtensionHost {
  private loadedExtensions: Map<string, LoadedExtension> = new Map();
  private languageServices: Map<string, LanguageService> = new Map();
  private activationManager: ActivationManager = createActivationManager();
  private sandboxes: Map<string, ExtensionSandbox> = new Map();

  /**
   * Load an extension into Monaco Editor
   */
  async loadExtension(extension: InstalledExtension): Promise<void> {
    const existingExtension = this.loadedExtensions.get(extension.id);
    if (existingExtension) {
      console.warn(`Extension ${extension.id} is already loaded`);
      // ensure activation events are re-registered when reloading is requested to keep state fresh
      await this.reloadExtension(extension.id, extension);
      return;
    }

    try {
      console.log(`Loading extension ${extension.id} into Monaco`);

      const loadedExtension: LoadedExtension = {
        extension,
        disposables: [],
        activated: false,
        sandbox: null,
        languageServices: new Map(),
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
      } else if (!extension.manifest.main) {
        // load extensions that only contribute static assets on startup to keep user experience consistent
        await this.triggerActivationEvent(ActivationEventType.OnStartupFinished);
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

      // Unregister from activation manager and reset state
      this.activationManager.unregisterExtension(extensionId);

      // Dispose all disposables
      for (const disposable of loadedExtension.disposables) {
        disposable.dispose();
      }

      // Remove language services for this specific LoadedExtension instance
      this.unloadLanguageServices(loadedExtension);

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

    // Load webview views and containers
    if (contributes.viewsContainers || contributes.views) {
      await this.loadWebviewContributions(extension, contributes, loadedExtension);
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

        // Store language service in LoadedExtension instance for per-instance tracking
        loadedExtension.languageServices.set(language.id, languageService);
        // Also keep in global map for quick lookup by language id
        this.languageServices.set(language.id, languageService);
        loadedExtension.disposables.push({
          dispose: () => {
            // Note: Monaco doesn't provide a way to unregister languages
            // They persist for the session
            // Remove from both per-instance and global maps
            loadedExtension.languageServices.delete(language.id);
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
    console.log(`[ColorTheme] Extension ${extension.id} provides ${themes.length} color theme(s)`);

    try {
      // Dynamically import theme utilities
      const { convertVSCodeThemeToRainy, convertTokenColorsToMonaco } = await import('@/utils/themeConverter');
      const { registerExtensionTheme } = await import('@/stores/themeStore');

      for (const themeContrib of themes) {
        try {
          console.log(`[ColorTheme] Loading theme: ${themeContrib.label}`);

          // 1. Resolve path to theme JSON file
          const themePath = this.resolveExtensionPath(extension, themeContrib.path);
          console.log(`[ColorTheme] Theme file path: ${themePath}`);

          // 2. Load VS Code theme data
          const vsCodeTheme = await this.loadJsonFile(themePath);
          console.log(`[ColorTheme] Loaded theme data for: ${themeContrib.label}`);

          // 3. Convert to Rainy Aether format
          const rainyTheme = convertVSCodeThemeToRainy(vsCodeTheme, {
            extensionId: extension.id,
            extensionLabel: themeContrib.label,
            contribution: themeContrib,
          });

          console.log(`[ColorTheme] Converted theme to Rainy format: ${rainyTheme.name}`);
          console.log(`[ColorTheme] Theme mode: ${rainyTheme.mode}`);
          console.log(`[ColorTheme] Theme has ${Object.keys(rainyTheme.variables).length} CSS variables`);

          // 4. Register with Monaco Editor (for syntax highlighting)
          // Monaco theme names must only contain alphanumeric characters, underscores, and hyphens
          // Replace dots and other special characters with hyphens
          const rawThemeId = themeContrib.id || `theme-${extension.id}-${themeContrib.label.toLowerCase().replace(/\s+/g, '-')}`;
          const monacoThemeId = rawThemeId.replace(/[^a-zA-Z0-9_-]/g, '-');

          console.log(`[ColorTheme] Monaco theme ID (sanitized): ${monacoThemeId}`);

          // Add Monaco theme ID to Rainy theme object
          rainyTheme.monacoThemeId = monacoThemeId;

          // Determine Monaco base theme
          const monacoBase = themeContrib.uiTheme === 'vs' ? 'vs' : themeContrib.uiTheme === 'hc-black' ? 'hc-black' : 'vs-dark';

          // Convert token colors to Monaco format
          const monacoTokenColors = convertTokenColorsToMonaco(vsCodeTheme.tokenColors);

          monaco.editor.defineTheme(monacoThemeId, {
            base: monacoBase,
            inherit: true,
            rules: monacoTokenColors,
            colors: vsCodeTheme.colors || {},
          });

          console.log(`[ColorTheme] Successfully registered with Monaco as: ${monacoThemeId}`);
          console.log(`[ColorTheme] Monaco base: ${monacoBase}, token rules: ${monacoTokenColors.length}`);

          // 5. Register with Rainy Aether theme system
          registerExtensionTheme(rainyTheme);

          console.log(`[ColorTheme] Successfully registered theme in Rainy theme store`);
          console.log(`[ColorTheme] Theme available as: "${rainyTheme.displayName}"`);

          // 6. Add disposal callback
          loadedExtension.disposables.push({
            dispose: async () => {
              console.log(`[ColorTheme] Unregistering theme: ${rainyTheme.name}`);
              // Dynamically import to avoid circular dependencies
              const { unregisterExtensionTheme } = await import('@/stores/themeStore');
              unregisterExtensionTheme(rainyTheme.name);
            },
          });

          console.log(`[ColorTheme] ✅ Successfully loaded theme: ${themeContrib.label}`);

        } catch (error) {
          console.error(`[ColorTheme] Failed to load theme ${themeContrib.label}:`, error);
          // Continue with other themes even if one fails
        }
      }

      console.log(`[ColorTheme] Finished loading ${themes.length} theme(s) from ${extension.id}`);

    } catch (error) {
      console.error(`[ColorTheme] Failed to import theme utilities:`, error);
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
      const { invoke } = await import('@tauri-apps/api/core');
      const { iconThemeActions } = await import('@/stores/iconThemeStore');

      for (const iconThemeContrib of iconThemes) {
        try {
          // Use Rust backend for high-performance icon theme loading
          // This loads the manifest and builds O(1) lookup tables in Rust
          const themeInfo = await invoke<{
            id: string;
            label: string;
            extensionId: string | null;
            iconCount: number;
            fileExtensionCount: number;
            fileNameCount: number;
          }>('load_icon_theme', {
            themeId: iconThemeContrib.id,
            themeLabel: iconThemeContrib.label,
            themePath: iconThemeContrib.path,
            extensionPath: extension.path,
            extensionId: extension.id,
          });

          console.log(`[IconTheme] Loaded theme in Rust: ${themeInfo.label} (${themeInfo.iconCount} icons, ${themeInfo.fileExtensionCount} extensions)`);

          // Also register in TypeScript store for backward compatibility
          // but with minimal data - icons are resolved on-demand from Rust
          const themePath = this.resolveExtensionPath(extension, iconThemeContrib.path);
          const themeData = await this.loadJsonFile(themePath);

          // Register theme metadata in TS store (icons are resolved from Rust on-demand)
          // We still need to load icon definitions for the TS store because
          // some components may use the TS store directly
          const iconDefinitions: Record<string, any> = {};
          if (themeData.iconDefinitions) {
            let loadedCount = 0;
            let failedCount = 0;

            for (const [iconId, iconDef] of Object.entries<any>(themeData.iconDefinitions)) {
              try {
                let iconPath: string | undefined;

                if (typeof iconDef === 'string') {
                  iconPath = iconDef;
                } else if (iconDef && typeof iconDef === 'object' && iconDef.iconPath) {
                  iconPath = iconDef.iconPath;
                }

                if (iconPath) {
                  const fullPath = this.resolveExtensionPath(extension, iconPath);
                  const iconContent = await invoke<string>('read_extension_file', { path: fullPath });

                  if (fullPath.endsWith('.svg')) {
                    const encoder = new TextEncoder();
                    const data = encoder.encode(iconContent);
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
                    const ext = fullPath.split('.').pop()?.toLowerCase();
                    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
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
                  iconDefinitions[iconId] = iconDef;
                }
              } catch {
                failedCount++;
                // Skip this icon silently - Rust backend will handle it
              }
            }
          }

          iconThemeActions.registerTheme({
            id: iconThemeContrib.id,
            label: iconThemeContrib.label,
            extensionId: extension.id,
            iconDefinitions,
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

          // Set active theme in both Rust and TS
          await invoke('set_active_icon_theme', { themeId: iconThemeContrib.id });
          await iconThemeActions.setActiveTheme(iconThemeContrib.id, true);

          loadedExtension.disposables.push({
            dispose: async () => {
              try {
                await invoke('unregister_icon_theme', { themeId: iconThemeContrib.id });
              } catch { /* ignore cleanup errors */ }
              iconThemeActions.unregisterTheme(iconThemeContrib.id);
            },
          });
        } catch (error) {
          console.error(`[IconTheme] Failed to load icon theme ${iconThemeContrib.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[IconTheme] Failed to load icon themes:`, error);
    }
  }

  /**
   * Load webview views and view containers from extension contributions
   */
  private async loadWebviewContributions(
    extension: InstalledExtension,
    contributes: any,
    loadedExtension: LoadedExtension
  ): Promise<void> {
    console.log(`[Webview] Loading webview contributions for ${extension.id}`);

    try {
      // Load view containers first (they define where views appear)
      if (contributes.viewsContainers?.activitybar) {
        for (const container of contributes.viewsContainers.activitybar) {
          console.log(`[Webview] Found view container: ${container.id} (${container.title})`);

          // View container is registered implicitly when we create views
          // Store container metadata for reference
          if (!loadedExtension.viewContainers) {
            loadedExtension.viewContainers = [];
          }
          loadedExtension.viewContainers.push({
            id: container.id,
            title: container.title,
            icon: container.icon,
          });
        }
      }

      // Load views (actual webview panels)
      if (contributes.views) {
        for (const [containerKey, views] of Object.entries<any[]>(contributes.views)) {
          console.log(`[Webview] Loading ${views.length} view(s) for container: ${containerKey}`);

          for (const view of views) {
            // Only handle webview type views
            if (view.type === 'webview' || !view.type) {
              console.log(`[Webview] Creating webview panel: ${view.id} (${view.name})`);

              // Create the webview panel
              const panel = webviewActions.createWebviewPanel({
                viewId: view.id,
                extensionId: extension.id,
                title: view.name || view.id,
                icon: view.icon,
                enableScripts: true,
                retainContextWhenHidden: true,
              });

              console.log(`[Webview] Webview panel created: ${view.id}`);

              // Show the panel (makes it appear in activity bar)
              // Don't auto-switch sidebar - let user click the button
              webviewActions.showWebview(view.id);

              console.log(`[Webview] Webview panel ${view.id} is now available in sidebar`);

              // Store view metadata for disposal
              if (!loadedExtension.webviewViews) {
                loadedExtension.webviewViews = [];
              }
              loadedExtension.webviewViews.push({
                id: view.id,
                name: view.name,
                containerKey,
              });

              // Add disposal callback
              loadedExtension.disposables.push({
                dispose: () => {
                  console.log(`[Webview] Disposing webview panel: ${view.id}`);
                  webviewActions.disposeWebview(view.id);
                },
              });

              console.log(`[Webview] Successfully registered webview view: ${view.id}`);
            } else {
              console.log(`[Webview] Skipping non-webview view: ${view.id} (type: ${view.type})`);
            }
          }
        }
      }

      console.log(`[Webview] Finished loading webview contributions for ${extension.id}`);
    } catch (error) {
      console.error(`[Webview] Failed to load webview contributions for ${extension.id}:`, error);
      throw error;
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

  /**
   * Strip comments from JSONC (JSON with Comments) content
   * VS Code theme files often contain comments that need to be removed
   */
  private stripJsonComments(jsonc: string): string {
    let result = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let escapeNext = false;

    for (let i = 0; i < jsonc.length; i++) {
      const char = jsonc[i];
      const nextChar = jsonc[i + 1];

      // Handle escape sequences in strings
      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      // Check for escape character in strings
      if (inString && char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      // Toggle string state
      if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
        inString = !inString;
        result += char;
        continue;
      }

      // Skip processing if we're in a string
      if (inString) {
        result += char;
        continue;
      }

      // Handle multi-line comment end
      if (inMultiLineComment) {
        if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
          i++; // Skip the '/'
        }
        continue;
      }

      // Handle single-line comment
      if (inSingleLineComment) {
        if (char === '\n' || char === '\r') {
          inSingleLineComment = false;
          result += char; // Keep the newline
        }
        continue;
      }

      // Check for comment starts
      if (char === '/') {
        if (nextChar === '/') {
          inSingleLineComment = true;
          i++; // Skip the second '/'
          continue;
        }
        if (nextChar === '*') {
          inMultiLineComment = true;
          i++; // Skip the '*'
          continue;
        }
      }

      // Add non-comment characters
      result += char;
    }

    return result;
  }

  private async loadJsonFile(path: string): Promise<any> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const fileContent = await invoke<string>('read_extension_file', { path });

      // Strip JSONC comments before parsing
      const cleanedContent = this.stripJsonComments(fileContent);

      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error(`Failed to load file ${path}:`, error);
      throw new Error(`Failed to load extension file: ${path}`);
    }
  }

  private unloadLanguageServices(loadedExtension: LoadedExtension): void {
    // Dispose only the language services for this specific LoadedExtension instance
    for (const [languageId, service] of loadedExtension.languageServices.entries()) {
      if (service.disposable) {
        service.disposable.dispose();
      }
      // Remove from both instance and global map
      loadedExtension.languageServices.delete(languageId);
      this.languageServices.delete(languageId);
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
      const activationEvents = extension.manifest.activationEvents || [ActivationEventType.OnStartupFinished];
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

    if (!loadedExtension.sandbox) {
      console.warn(`Extension ${extensionId} has no sandbox (no main entry point)`);
      return;
    }

    // Check actual sandbox state, not just loadedExtension.activated
    // This handles cases where the state might be out of sync
    const isSandboxActivated = (loadedExtension.sandbox as any).isActivated;

    if (loadedExtension.activated && isSandboxActivated) {
      console.log(`Extension ${extensionId} is already activated`);
      return;
    }

    // State mismatch - reset and re-activate
    if (loadedExtension.activated && !isSandboxActivated) {
      console.warn(`State mismatch for ${extensionId}: loadedExtension.activated=true but sandbox.isActivated=false. Resetting and re-activating.`);
      loadedExtension.activated = false;
      this.activationManager.markDeactivated(extensionId);
    }

    try {
      console.log(`Activating extension ${extensionId} with event: ${activationEvent}`);

      this.activationManager.markActivating(extensionId);

      await loadedExtension.sandbox.activate(activationEvent);

      // Sandbox will call onActivated handler when activation completes
      // Verify activation succeeded
      if (!loadedExtension.activated) {
        throw new Error('Activation completed but onActivated callback was not called');
      }
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
   * Resolve webview HTML from an extension
   * Called by WebviewPanel to get HTML content from extension's provider
   */
  async resolveExtensionWebview(extensionId: string, viewId: string): Promise<string> {
    const loadedExtension = this.loadedExtensions.get(extensionId);
    if (!loadedExtension) {
      throw new Error(`Extension ${extensionId} is not loaded`);
    }

    if (!loadedExtension.sandbox) {
      throw new Error(`Extension ${extensionId} has no sandbox (no main entry point)`);
    }

    // Ensure extension is activated before resolving webview
    if (!loadedExtension.activated) {
      console.log(`Auto-activating extension ${extensionId} for webview ${viewId}`);
      try {
        // Directly call activateExtension which handles re-activation checks
        await this.activateExtension(extensionId, '*');
      } catch (error) {
        console.error(`Failed to activate extension ${extensionId}:`, error);
        throw new Error(`Cannot resolve webview: extension activation failed - ${error}`);
      }
    }

    // Double-check activation status
    if (!loadedExtension.activated) {
      throw new Error(`Extension ${extensionId} activation completed but extension is not marked as activated`);
    }

    try {
      return await loadedExtension.sandbox.resolveWebview(viewId);
    } catch (error) {
      console.error(`Failed to resolve webview ${viewId} from extension ${extensionId}:`, error);
      throw error;
    }
  }

  /**
   * Forward message from webview to extension
   */
  async sendMessageToExtension(extensionId: string, viewId: string, message: any): Promise<void> {
    const loadedExtension = this.loadedExtensions.get(extensionId);
    if (!loadedExtension?.sandbox) {
      throw new Error(`Extension ${extensionId} is not loaded or has no sandbox`);
    }

    await loadedExtension.sandbox.handleMessageFromWebview(viewId, message);
  }

  /**
   * Get activation manager (for debugging)
   */
  getActivationManager(): ActivationManager {
    return this.activationManager;
  }

  /**
   * Reload an extension in-place to refresh contributions and sandbox state.
   * Uses pre-load + atomic-swap pattern to avoid UI flicker:
   * 1. Pre-load new extension into temporary holder (old one stays in loadedExtensions)
   * 2. On success, atomically swap: replace map entry and dispose old instance
   * 3. On failure, keep old extension untouched and clean up resources
   * 4. Track swap state to ensure rollback restores old instance if activation fails
   */
  private async reloadExtension(extensionId: string, extension?: InstalledExtension): Promise<void> {
    const existing = this.loadedExtensions.get(extensionId);

    if (!existing) {
      if (extension) {
        await this.loadExtension(extension);
      }
      return;
    }

    const extensionToLoad = extension ?? existing.extension;
    let newLoadedExtension: LoadedExtension | null = null;
    let swapped = false;

    try {
      console.log(`Reloading extension ${extensionId} with pre-load + atomic-swap pattern`);

      // Phase 1: Pre-load new extension into temporary holder without touching the old one
      newLoadedExtension = {
        extension: extensionToLoad,
        disposables: [],
        activated: false,
        sandbox: null,
        languageServices: new Map(),
      };

      await this.loadExtensionContributions(extensionToLoad, newLoadedExtension);

      if (extensionToLoad.manifest.main) {
        await this.initializeExtensionSandbox(extensionToLoad, newLoadedExtension);
      }

      // Phase 2: Atomic swap - replace map entry
      this.loadedExtensions.set(extensionId, newLoadedExtension);
      swapped = true;
      console.log(`Atomically swapped extension ${extensionId}`);

      // Phase 3: Try to activate BEFORE disposing old instance
      // This ensures old instance remains available if activation fails
      try {
        if (extensionToLoad.manifest.activationEvents) {
          await this.tryActivateExtension(extensionId);
        } else if (!extensionToLoad.manifest.main) {
          await this.triggerActivationEvent(ActivationEventType.OnStartupFinished);
        }
      } catch (activationError) {
        // Activation failed - restore old instance to map before rethrowing
        console.error(`Activation failed after swap, restoring old extension ${extensionId}`);
        this.loadedExtensions.set(extensionId, existing);
        swapped = false;
        throw activationError;
      }

      // Phase 4: Activation succeeded - now safely dispose old instance
      try {
        // Unload language services for old instance (prevents race where new services are deleted)
        this.unloadLanguageServices(existing);
        if (existing.sandbox) {
          await existing.sandbox.dispose();
          this.sandboxes.delete(extensionId);
        }
        this.activationManager.unregisterExtension(extensionId);
        for (const disposable of existing.disposables) {
          disposable.dispose();
        }
      } catch (disposeError) {
        console.error(`Error cleaning up old extension ${extensionId}:`, disposeError);
      }

      console.log(`Successfully reloaded extension ${extensionId}`);
    } catch (error) {
      console.error(`Failed to reload extension ${extensionId}:`, error);

      // Phase 5: Rollback - restore old instance if swap occurred
      if (swapped) {
        console.log(`Rolling back extension ${extensionId} to previous state`);
        this.loadedExtensions.set(extensionId, existing);
      }

      // Clean up resources from failed new load
      if (newLoadedExtension) {
        try {
          console.log(`Cleaning up resources from failed reload of ${extensionId}`);
          if (newLoadedExtension.sandbox) {
            await newLoadedExtension.sandbox.dispose();
          }
          for (const disposable of newLoadedExtension.disposables) {
            disposable.dispose();
          }
        } catch (cleanupError) {
          console.error(`Error during resource cleanup for failed reload:`, cleanupError);
        }
      }
    }
  }
}

// Types
interface LoadedExtension {
  extension: InstalledExtension;
  disposables: monaco.IDisposable[];
  activated: boolean;
  sandbox: ExtensionSandbox | null;
  languageServices: Map<string, LanguageService>;
  viewContainers?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
  webviewViews?: Array<{
    id: string;
    name: string;
    containerKey: string;
  }>;
}

interface LanguageService {
  id: string;
  extensionId: string;
  monarchTokenizer: any;
  disposable: monaco.IDisposable | null;
}

// Export singleton instance
export const monacoExtensionHost = new MonacoExtensionHost();
