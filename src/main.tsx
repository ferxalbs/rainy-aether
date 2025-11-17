import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";
import { configureMonacoForVite } from "./services/monacoWorkers";

console.log('[main.tsx] Starting application initialization...');
console.log('[main.tsx] Window location:', window.location.href);

// Configure Monaco Editor Environment for web workers
// This is required for Monaco to load language services like TypeScript
try {
  console.log('[main.tsx] Configuring Monaco for Vite...');
  configureMonacoForVite();
  console.log('[main.tsx] Monaco configured successfully');
} catch (error) {
  console.error('[main.tsx] Failed to configure Monaco:', error);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[main.tsx] ❌ CRITICAL: Root element not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">ERROR: Root element not found. The application cannot start.</div>';
} else {
  console.log('[main.tsx] Root element found, creating React root...');
  try {
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    console.log('[main.tsx] React root created, rendering App...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('[main.tsx] ✓ App rendered successfully');
  } catch (error) {
    console.error('[main.tsx] ❌ Failed to render app:', error);
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace;">ERROR: Failed to render app: ${error}</div>`;
  }
}
