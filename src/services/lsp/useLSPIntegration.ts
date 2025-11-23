/**
 * LSP Integration Hook for Monaco Editor
 * React hook for initializing and managing LSP integration
 */

import { useEffect, useRef } from 'react';
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
        await initializeLanguageClient(workspacePath);

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
 * Get LSP status information
 */
export function getLSPStatus() {
  return {
    isRunning: isLanguageClientRunning(),
    isTauriEnvironment: isTauriEnvironment(),
  };
}
