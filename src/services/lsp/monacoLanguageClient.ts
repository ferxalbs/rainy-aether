/**
 * Monaco Language Client Integration
 * Connects Monaco Editor with typescript-language-server via Tauri IPC
 *
 * This implements the modern monaco-languageclient pattern for optimal LSP integration
 */

import * as monaco from 'monaco-editor';
import {
  MonacoLanguageClient,
  CloseAction,
  ErrorAction,
  MessageTransports,
} from 'monaco-languageclient';
import { createTauriMessageConnection, isTauriEnvironment } from './TauriTransport';
import { useIDEState } from '@/stores/ideStore';

/**
 * Language Client Manager
 * Manages the lifecycle of the Monaco Language Client
 */
class LanguageClientManager {
  private client: MonacoLanguageClient | null = null;
  private isStarted = false;
  private isStarting = false;

  /**
   * Start the language client
   */
  async start(): Promise<void> {
    if (this.isStarted || this.isStarting) {
      console.warn('[LSP] Client already started or starting');
      return;
    }

    if (!isTauriEnvironment()) {
      console.warn('[LSP] Not running in Tauri environment, LSP features disabled');
      return;
    }

    this.isStarting = true;

    try {
      console.info('[LSP] Starting Monaco Language Client...');

      // Create the language client
      this.client = new MonacoLanguageClient({
        name: 'TypeScript/JavaScript Language Client',
        clientOptions: {
          // Document selector - which files this client handles
          documentSelector: [
            { language: 'typescript' },
            { language: 'javascript' },
            { language: 'typescriptreact' },
            { language: 'javascriptreact' },
          ],

          // Workspace configuration
          workspaceFolder: {
            uri: monaco.Uri.file(this.getWorkspacePath()).toString(),
            name: 'workspace',
            index: 0,
          },

          // Error handling
          errorHandler: {
            error: () => {
              console.error('[LSP] Error in language client');
              return { action: ErrorAction.Continue };
            },
            closed: () => {
              console.warn('[LSP] Connection closed');
              return { action: CloseAction.Restart };
            },
          },

          // Synchronization options
          synchronize: {
            // Notify the server about file changes to '.ts', '.js', '.tsx', '.jsx' files
            fileEvents: [
              monaco.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}'),
            ],
          },

          // Initialization options for typescript-language-server
          initializationOptions: {
            preferences: {
              // TypeScript compiler options
              includeInlayParameterNameHints: 'all',
              includeInlayParameterNameHintsWhenArgumentMatchesName: true,
              includeInlayFunctionParameterTypeHints: true,
              includeInlayVariableTypeHints: true,
              includeInlayPropertyDeclarationTypeHints: true,
              includeInlayFunctionLikeReturnTypeHints: true,
              includeInlayEnumMemberValueHints: true,
            },
          },
        },

        // Connection provider - creates the transport layer
        connectionProvider: {
          get: async (encoding: string): Promise<MessageTransports> => {
            console.info('[LSP] Creating Tauri message connection...');
            return createTauriMessageConnection(encoding);
          },
        },
      });

      // Start the client
      // This will:
      // 1. Create the transport via connectionProvider
      // 2. Send 'initialize' request
      // 3. Send 'initialized' notification
      // 4. Start synchronizing documents
      await this.client.start();

      this.isStarted = true;
      this.isStarting = false;

      console.info('[LSP] Monaco Language Client started successfully');
    } catch (error) {
      this.isStarting = false;
      console.error('[LSP] Failed to start language client:', error);
      throw error;
    }
  }

  /**
   * Stop the language client
   */
  async stop(): Promise<void> {
    if (!this.client || !this.isStarted) {
      return;
    }

    try {
      console.info('[LSP] Stopping Monaco Language Client...');

      // Stop the client (sends 'shutdown' and 'exit')
      await this.client.stop();

      this.client = null;
      this.isStarted = false;

      console.info('[LSP] Monaco Language Client stopped');
    } catch (error) {
      console.error('[LSP] Error stopping language client:', error);
    }
  }

  /**
   * Restart the language client
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Check if the client is running
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Get the language client instance
   */
  getClient(): MonacoLanguageClient | null {
    return this.client;
  }

  /**
   * Get the workspace path from IDE state
   */
  private getWorkspacePath(): string {
    // Try to get from IDE state
    const ideState = useIDEState.getState?.();
    if (ideState?.workspace) {
      return ideState.workspace;
    }

    // Fallback to current working directory
    return process.cwd?.() || '/';
  }
}

// Singleton instance
let languageClientManager: LanguageClientManager | null = null;

/**
 * Get the language client manager singleton
 */
export function getLanguageClientManager(): LanguageClientManager {
  if (!languageClientManager) {
    languageClientManager = new LanguageClientManager();
  }
  return languageClientManager;
}

/**
 * Initialize and start the language client
 * Call this after Monaco Editor is ready
 */
export async function initializeLanguageClient(): Promise<void> {
  const manager = getLanguageClientManager();
  await manager.start();
}

/**
 * Stop the language client
 * Call this when shutting down or changing workspace
 */
export async function shutdownLanguageClient(): Promise<void> {
  const manager = getLanguageClientManager();
  await manager.stop();
}

/**
 * Restart the language client
 * Useful when workspace changes or settings update
 */
export async function restartLanguageClient(): Promise<void> {
  const manager = getLanguageClientManager();
  await manager.restart();
}

/**
 * Check if language client is running
 */
export function isLanguageClientRunning(): boolean {
  const manager = getLanguageClientManager();
  return manager.isRunning();
}
