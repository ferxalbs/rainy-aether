/**
 * LSP Integration Hook for Monaco Editor
 * React hook for initializing and managing LSP integration
 */

import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import {
  initializeLanguageClient,
  shutdownLanguageClient,
  isLanguageClientRunning,
  restartLanguageClient,
} from './monacoLanguageClient';
import { isTauriEnvironment } from './TauriTransport';

/**
 * Hook options
 */
export interface UseLSPIntegrationOptions {
  /** Whether to enable LSP integration */
  enabled?: boolean;
  /** Workspace path for the language server */
  workspacePath?: string;
  /** Callback when LSP is ready */
  onReady?: () => void;
  /** Callback when LSP encounters an error */
  onError?: (error: Error) => void;
}

/**
 * LSP Integration Hook
 * Initializes and manages the LSP client lifecycle
 *
 * @example
 * ```tsx
 * function MyEditor() {
 *   const { isLSPReady, restartLSP } = useLSPIntegration({
 *     enabled: true,
 *     workspacePath: '/path/to/workspace',
 *     onReady: () => console.log('LSP ready'),
 *   });
 *
 *   return <div>LSP Status: {isLSPReady ? 'Ready' : 'Not Ready'}</div>;
 * }
 * ```
 */
export function useLSPIntegration(options: UseLSPIntegrationOptions = {}) {
  const {
    enabled = true,
    workspacePath,
    onReady,
    onError,
  } = options;

  const isInitialized = useRef(false);
  const isLSPReady = useRef(false);

  useEffect(() => {
    // Only run in Tauri environment
    if (!isTauriEnvironment()) {
      console.info('[LSP] Not running in Tauri, LSP integration disabled');
      return;
    }

    // Check if enabled
    if (!enabled) {
      console.info('[LSP] LSP integration is disabled');
      return;
    }

    // Initialize LSP client
    const initializeLSP = async () => {
      if (isInitialized.current) {
        console.warn('[LSP] Already initialized, skipping');
        return;
      }

      try {
        console.info('[LSP] Initializing LSP integration...');
        isInitialized.current = true;

        // Start the language client
        await initializeLanguageClient();

        // Mark as ready
        isLSPReady.current = true;
        console.info('[LSP] LSP integration ready');

        // Trigger callback
        onReady?.();
      } catch (error) {
        console.error('[LSP] Failed to initialize LSP:', error);
        isLSPReady.current = false;
        isInitialized.current = false;

        // Trigger error callback
        onError?.(error as Error);
      }
    };

    // Start initialization
    initializeLSP();

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        console.info('[LSP] Shutting down LSP integration...');
        shutdownLanguageClient().catch((error) => {
          console.error('[LSP] Error during shutdown:', error);
        });
        isInitialized.current = false;
        isLSPReady.current = false;
      }
    };
  }, [enabled, workspacePath, onReady, onError]);

  // Restart LSP
  const restartLSP = async () => {
    try {
      console.info('[LSP] Restarting LSP integration...');
      await restartLanguageClient();
      isLSPReady.current = true;
      console.info('[LSP] LSP integration restarted');
    } catch (error) {
      console.error('[LSP] Failed to restart LSP:', error);
      isLSPReady.current = false;
      onError?.(error as Error);
    }
  };

  return {
    isLSPReady: isLSPReady.current,
    isLSPRunning: isLanguageClientRunning(),
    restartLSP,
  };
}

/**
 * Configure Monaco services for LSP integration
 * Call this before creating the editor instance
 */
export function configureMonacoServices() {
  // Configure Monaco to work with LSP
  // This sets up the necessary services for language features

  // Set up TypeScript compiler options for better IntelliSense
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });

  // Configure diagnostics options
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: false,
  });

  // Same for JavaScript
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    allowJs: true,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: false,
  });

  console.info('[LSP] Monaco services configured for LSP integration');
}

/**
 * Get LSP status information
 */
export function getLSPStatus() {
  return {
    isRunning: isLanguageClientRunning(),
    isTauriEnvironment: isTauriEnvironment(),
  };
}
