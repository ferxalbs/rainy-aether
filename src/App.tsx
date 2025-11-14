import "./App.css";
import { useEffect, useState, useRef } from "react";
import IDE from "./components/ide/IDE";
import { IDEProvider } from "./stores/ideStore";
import { initializeTheme } from "./stores/themeStore";
import { initializeSettings } from "./stores/settingsStore";
import { configurationActions } from "./stores/configurationStore";
import { initializeConfigurationBridge } from "./services/configurationBridge";
import { initializeEditorConfigurationService } from "./services/editorConfigurationService";
import { initializeAutoSaveService } from "./services/autoSaveService";
import LoadingScreen from "./components/ui/loading-screen";
import ErrorBoundary from "./components/ui/error-boundary";
import { useLoadingState, loadingActions } from "./stores/loadingStore";
import { extensionManager } from "./services/extensionManager";
import { initTerminalService } from "./services/terminalService";
import { terminalActions } from "./stores/terminalStore";
import { iconThemeActions } from "./stores/iconThemeStore";
import { defaultIconTheme } from "./themes/iconThemes/defaultIconTheme";
import { fontManager } from "./services/fontManager";

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadingState = useLoadingState();
  const initializationStarted = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initializationStarted.current) {
      return;
    }
    initializationStarted.current = true;
    const initialize = async () => {
      const startTime = Date.now();
      const minLoadingTime = 800; // Minimum loading time to prevent flashing

      try {
        // Stage 1: Theme
        loadingActions.startStage('theme');
        await initializeTheme();
        loadingActions.completeStage('theme');

        // Stage 2: Settings
        loadingActions.startStage('settings');
        await initializeSettings();
        loadingActions.completeStage('settings');

        // Stage 2.3: Configuration System
        // Initialize VS Code-compatible configuration system
        try {
          console.log('[App] Initializing configuration system...');
          await configurationActions.initialize();
          console.log('[App] Configuration system initialized successfully');

          // Initialize configuration bridge (register schemas and sync)
          await initializeConfigurationBridge();
          console.log('[App] Configuration bridge initialized successfully');

          // Initialize editor configuration service (apply config to Monaco)
          initializeEditorConfigurationService();
          console.log('[App] Editor configuration service initialized successfully');

          // Initialize auto-save service
          initializeAutoSaveService();
          console.log('[App] Auto-save service initialized successfully');

          // Initialize font manager
          await fontManager.initialize();
          console.log('[App] Font manager initialized successfully');
        } catch (error) {
          console.error('[App] Failed to initialize configuration system:', error);
          // Non-fatal error - continue with initialization
        }

        // Stage 2.5: Icon Themes
        // Register default icon theme (auto-activate only if no preference)
        iconThemeActions.registerTheme(defaultIconTheme, true);

        // Stage 3: Extensions
        loadingActions.startStage('extensions');
        try {
          // Auto-enable installed extensions respecting configuration
          const activationMode = configurationActions.get<'auto' | 'manual'>('extensions.startupActivationMode', 'auto');
          const safeModeEnabled = configurationActions.get<boolean>('extensions.safeMode', false);
          const activationDelay = configurationActions.get<number>('extensions.startupActivationDelay', 0);
          const shouldAutoActivate = activationMode !== 'manual';

          const installedExtensions = await extensionManager.getInstalledExtensions();
          let enabledExtensions = installedExtensions.filter(ext => ext.enabled);

          if (safeModeEnabled) {
            enabledExtensions = enabledExtensions.filter(ext =>
              ext.publisher === 'rainy-aether' || ext.id.startsWith('rainy-aether.')
            );
          }

          if (shouldAutoActivate) {
            // Enable all extensions in parallel with per-extension delays
            // Total delay is bounded by the longest delay, not the sum of all delays
            const enablePromises = enabledExtensions.map(async (ext) => {
              try {
                await extensionManager.enableExtension(ext.id);
                // Apply delay per-extension (runs in parallel with other extensions)
                if (activationDelay > 0) {
                  await new Promise(resolve => setTimeout(resolve, activationDelay));
                }
              } catch (error) {
                console.warn(`Failed to auto-enable extension ${ext.id}:`, error);
              }
            });

            // Wait for all extensions to complete in parallel
            await Promise.all(enablePromises);
          } else {
            console.info('[App] Extension startup activation mode is set to manual; skipping auto-enable.');
          }

          loadingActions.completeStage('extensions');

          // Stage 3.5: Activate preferred icon theme
          // After extensions are loaded, activate the user's preferred icon theme
          const { getSettingsState } = await import('./stores/settingsStore');
          const settings = getSettingsState();
          if (settings.iconThemeId) {
            // User has a preferred theme - activate it
            console.log('[App] Activating preferred icon theme:', settings.iconThemeId);
            await iconThemeActions.setActiveTheme(settings.iconThemeId, false);
          }
        } catch (error) {
          console.error("Failed to load extensions:", error);
          loadingActions.errorStage('extensions', 'Some extensions failed to load');
        }

        // Stage 4: Terminal System
        loadingActions.startStage('terminal');
        try {
          await initTerminalService();
          await terminalActions.initialize();
          loadingActions.completeStage('terminal');
        } catch (error) {
          console.error("Failed to initialize terminal system:", error);
          loadingActions.errorStage('terminal', 'Terminal system initialization failed');
        }

        // Stage 5: Resources
        loadingActions.startStage('resources');
        // Add a small delay for resource provisioning
        await new Promise(resolve => setTimeout(resolve, 200));
        loadingActions.completeStage('resources');

        // Ensure minimum loading time to prevent flashing
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
        }

        // Finish global loading - this will hide the loading screen
        loadingActions.finishLoading();

        // Mark initialization as complete
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        loadingActions.finishLoading();
        setIsInitialized(true); // Still show the app even if initialization fails
      }
    };

    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading screen while initializing or while loading state is active
  // Only show for global context, not workspace context after app is initialized
  const shouldShowLoading = !isInitialized || (loadingState.isLoading && loadingState.loadingContext === 'global');
  
  if (shouldShowLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen stages={loadingState.stages} context={loadingState.loadingContext} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <IDEProvider>
        <IDE />
      </IDEProvider>
    </ErrorBoundary>
  );
};

export default App;
