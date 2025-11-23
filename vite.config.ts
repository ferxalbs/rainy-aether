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
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
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

  // Vite options tailored for Tauri development
  clearScreen: false,
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
          // FIX: Usa 1420 para el servidor WebSocket cuando no hay host personalizado
          protocol: "ws",
          host: "localhost",
          port: 1420, // Cambiado de clientPort: 1421 a port: 1420
        },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
