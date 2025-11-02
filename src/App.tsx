import "./App.css";
import { useEffect, useState } from "react";
import IDE from "./components/ide/IDE";
import { IDEProvider } from "./stores/ideStore";
import { initializeTheme } from "./stores/themeStore";
import { initializeSettings } from "./stores/settingsStore";
import LoadingScreen from "./components/ui/loading-screen";
import ErrorBoundary from "./components/ui/error-boundary";
import { useLoadingState, loadingActions } from "./stores/loadingStore";
import { extensionManager } from "./services/extensionManager";

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadingState = useLoadingState();

  useEffect(() => {
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

        // Stage 3: Extensions
        loadingActions.startStage('extensions');
        try {
          // Auto-enable installed extensions
          const installedExtensions = await extensionManager.getInstalledExtensions();
          const enabledExtensions = installedExtensions.filter(ext => ext.enabled);

          // Load enabled extensions
          for (const ext of enabledExtensions) {
            try {
              await extensionManager.enableExtension(ext.id);
            } catch (error) {
              console.warn(`Failed to auto-enable extension ${ext.id}:`, error);
            }
          }
          loadingActions.completeStage('extensions');
        } catch (error) {
          console.error("Failed to load extensions:", error);
          loadingActions.errorStage('extensions', 'Some extensions failed to load');
        }

        // Stage 4: Resources
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
  }, []);

  // Show loading screen while initializing or while loading state is active
  if (!isInitialized || loadingState.isLoading) {
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
