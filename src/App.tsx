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
import { ToastContainer } from "./components/ui/Toast";
import { useLoadingState, loadingActions } from "./stores/loadingStore";
import { extensionManager } from "./services/extensionManager";
import { initTerminalService } from "./services/terminalService";
import { terminalActions } from "./stores/terminalStore";
import { iconThemeActions } from "./stores/iconThemeStore";
import { defaultIconTheme } from "./themes/iconThemes/defaultIconTheme";
import { fontManager } from "./services/fontManager";
import { initializeExtensionConfig, getExtensionConfig, isExtensionAllowed } from "./stores/extensionConfigStore";
import { initializeAgentServer, startAgentServer } from "./services/agentServer";

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadingState = useLoadingState();
  const initializationStarted = useRef(false);
  const windowShown = useRef(false);

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

        // Platform detection for scrollbars
        // Mac: use native overlay scrollbars (no custom CSS)
        // Windows/Linux: use custom thin scrollbars (CSS)
        const isMac = navigator.userAgent.toUpperCase().includes('MAC');
        if (isMac) {
          document.body.classList.add('os-mac');
        } else {
          document.body.classList.add('os-non-mac');
        }

        loadingActions.completeStage('theme');

        // Stage 2: Settings
        loadingActions.startStage('settings');
        await initializeSettings();
        await initializeExtensionConfig(); // Initialize extension configuration
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
          // Get extension configuration
          const extensionConfig = getExtensionConfig();
          const {
            startupActivationMode,
            startupActivationDelay,
            loadingStrategy,
            securityLevel,
            maxActiveExtensions,
            autoCleanupErrorExtensions,
            errorHandling,
            verboseLogging,
            showLoadingProgress
          } = extensionConfig;

          // ALWAYS log startup mode for debugging
          console.log('[App] 🔧 Extension Configuration Loaded:');
          console.log(`[App]   - Startup Activation Mode: ${startupActivationMode}`);
          console.log(`[App]   - Loading Strategy: ${loadingStrategy}`);
          console.log(`[App]   - Security Level: ${securityLevel}`);
          console.log(`[App]   - Verbose Logging: ${verboseLogging}`);

          if (verboseLogging) {
            console.log('[App] Full extension configuration:', extensionConfig);
          }

          const shouldAutoActivate = startupActivationMode === 'auto';
          console.log(`[App] 🚀 Should auto-activate extensions: ${shouldAutoActivate}`);

          // Auto-cleanup error extensions if enabled
          if (autoCleanupErrorExtensions) {
            const installedExtensions = await extensionManager.getInstalledExtensions();
            const errorExtensions = installedExtensions.filter(ext => ext.state === 'error' || ext.state === 'installing');

            if (errorExtensions.length > 0) {
              console.log(`[App] Auto-cleanup: Found ${errorExtensions.length} extension(s) in error state`);
              for (const ext of errorExtensions) {
                try {
                  await extensionManager.uninstallExtension(ext.id, true);
                  console.log(`[App] Auto-cleanup: Removed ${ext.id}`);
                } catch (error) {
                  console.error(`[App] Auto-cleanup failed for ${ext.id}:`, error);
                }
              }
            }
          }

          const installedExtensions = await extensionManager.getInstalledExtensions();
          let enabledExtensions = installedExtensions.filter(ext => ext.enabled);

          console.log(`[App] 📦 Found ${installedExtensions.length} total extension(s)`);
          console.log(`[App] ✅ Found ${enabledExtensions.length} enabled extension(s):`);
          enabledExtensions.forEach(ext => {
            console.log(`[App]    - ${ext.id} (${ext.displayName})`);
          });

          // Apply security filters
          enabledExtensions = enabledExtensions.filter(ext => {
            // Check if extension is allowed based on security settings
            const allowed = isExtensionAllowed(ext.id, ext.publisher);

            if (!allowed) {
              console.warn(`[App] ⛔ Extension ${ext.id} blocked by security settings (level: ${securityLevel})`);
            }

            return allowed;
          });

          if (enabledExtensions.length !== installedExtensions.filter(ext => ext.enabled).length) {
            console.log(`[App] 🔒 After security filter: ${enabledExtensions.length} extension(s) allowed`);
          }

          // Apply max active extensions limit
          if (maxActiveExtensions > 0 && enabledExtensions.length > maxActiveExtensions) {
            console.warn(`[App] ⚠️ Too many extensions enabled (${enabledExtensions.length}), limiting to ${maxActiveExtensions}`);
            enabledExtensions = enabledExtensions.slice(0, maxActiveExtensions);
          }

          if (shouldAutoActivate && enabledExtensions.length > 0) {
            console.log(`[App] Auto-activating ${enabledExtensions.length} extension(s) using ${loadingStrategy} strategy`);

            if (showLoadingProgress) {
              console.log(`[App] Loading extensions: ${enabledExtensions.map(e => e.id).join(', ')}`);
            }

            // Choose loading strategy
            switch (loadingStrategy) {
              case 'parallel': {
                // Load all extensions in parallel
                const enablePromises = enabledExtensions.map(async (ext, index) => {
                  try {
                    if (verboseLogging) {
                      console.log(`[App] Starting extension ${ext.id} (${index + 1}/${enabledExtensions.length})`);
                    }

                    await extensionManager.enableExtension(ext.id);

                    if (startupActivationDelay > 0) {
                      await new Promise(resolve => setTimeout(resolve, startupActivationDelay));
                    }

                    if (verboseLogging) {
                      console.log(`[App] Extension ${ext.id} loaded successfully`);
                    }
                  } catch (error) {
                    console.error(`[App] Failed to enable extension ${ext.id}:`, error);

                    if (errorHandling === 'stop') {
                      throw error; // Stop loading all extensions
                    }
                    // Otherwise continue with next extension
                  }
                });

                await Promise.all(enablePromises);
                break;
              }

              case 'sequential': {
                // Load extensions one by one
                for (let i = 0; i < enabledExtensions.length; i++) {
                  const ext = enabledExtensions[i];

                  try {
                    if (showLoadingProgress || verboseLogging) {
                      console.log(`[App] Loading extension ${ext.id} (${i + 1}/${enabledExtensions.length})`);
                    }

                    await extensionManager.enableExtension(ext.id);

                    if (startupActivationDelay > 0) {
                      await new Promise(resolve => setTimeout(resolve, startupActivationDelay));
                    }
                  } catch (error) {
                    console.error(`[App] Failed to enable extension ${ext.id}:`, error);

                    if (errorHandling === 'stop') {
                      console.error('[App] Stopping extension loading due to error');
                      break; // Stop loading
                    }
                  }
                }
                break;
              }

              case 'lazy': {
                // Extensions will be loaded on-demand
                console.log('[App] Lazy loading enabled - extensions will load on-demand');
                // Store enabled extensions list for lazy loading
                // Actual loading happens when extension features are requested
                break;
              }
            }

            console.log('[App] ✅ Extension activation complete');
          } else if (!shouldAutoActivate) {
            console.warn('[App] ⚠️ Extension startup activation mode is set to MANUAL; skipping auto-enable.');
            console.warn(`[App] ⚠️ Found ${enabledExtensions.length} enabled extension(s) that require manual activation.`);
            console.warn('[App] ⚠️ To enable automatic activation, set extensions.startupActivationMode to "auto"');
          } else {
            console.info('[App] ℹ️ No enabled extensions found to activate.');
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

        // Stage 4.5: Agent Server (Background Start)
        // Initialize agent server health polling and start it in background
        try {
          console.log('[App] Initializing agent server...');
          initializeAgentServer(); // Start health polling

          // Start the server in background (don't wait for it to complete)
          startAgentServer().then(() => {
            console.log('[App] ✓ Agent server started successfully');
          }).catch((error) => {
            console.warn('[App] Agent server start failed (non-fatal):', error);
          });
        } catch (error) {
          console.warn('[App] Agent server initialization failed (non-fatal):', error);
          // Non-fatal - agent features will be unavailable but app continues
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

        // CRITICAL: Show window now that frontend is ready (matches Fluxium pattern)
        // This prevents blank windows by ensuring window only shows after initialization
        // NOTE: Main window starts visible, but new windows start hidden and need this call
        if (!windowShown.current) {
          windowShown.current = true;
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('window_show_ready', { label: null });
            console.log('[App] ✓ Window shown (frontend ready)');
          } catch (error) {
            // Non-fatal - main window is already visible, this is only for new windows
            console.log('[App] Window show called (may already be visible)');
          }
        }
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
        <ToastContainer position="bottom-right" />
      </IDEProvider>
    </ErrorBoundary>
  );
};

export default App;
