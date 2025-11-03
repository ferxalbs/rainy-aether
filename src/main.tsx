import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";
import { configureMonacoForVite } from "./services/monacoWorkers";

// Configure Monaco Editor Environment for web workers
// This is required for Monaco to load language services like TypeScript
configureMonacoForVite();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
