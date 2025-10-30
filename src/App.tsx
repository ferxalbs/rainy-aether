import "./App.css";
import { useEffect } from "react";
import IDE from "./components/ide/IDE";
import { IDEProvider } from "./stores/ideStore";
import { initializeTheme } from "./stores/themeStore";
import { initializeSettings } from "./stores/settingsStore";

const App: React.FC = () => {
  useEffect(() => {
    initializeTheme();
    initializeSettings();
  }, []);

  return (
    <IDEProvider>
      <IDE />
    </IDEProvider>
  );
};

export default App;
