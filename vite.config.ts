import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Polyfill Node.js built-ins for LangGraph compatibility
      "async_hooks": path.resolve(__dirname, "./src/polyfills/async_hooks.ts"),
      "node:async_hooks": path.resolve(__dirname, "./src/polyfills/async_hooks.ts"),
    },
  },
  define: {
    // Define global for Node.js compatibility
    'global': 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    exclude: ['vscode'], // Exclude vscode module from bundling
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      external: ['vscode'], // Mark vscode as external (provided by extension host)
      output: {
        // Ensure proper format for workers
        format: 'es',
      },
    },
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    cors: true, // Enable CORS for multiple windows
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : {
          // Allow multiple clients (windows) to connect to HMR
          clientPort: 1421,
        },
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
