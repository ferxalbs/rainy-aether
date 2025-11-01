import "./App.css";
import { useEffect, useState } from "react";
import IDE from "./components/ide/IDE";
import { IDEProvider } from "./stores/ideStore";
import { initializeTheme } from "./stores/themeStore";
import { initializeSettings } from "./stores/settingsStore";

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          initializeTheme(),
          initializeSettings()
        ]);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a1929',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Rainy Aether</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <IDEProvider>
      <IDE />
    </IDEProvider>
  );
};

export default App;
