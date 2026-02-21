/**
 * LSP Service
 * Manages multiple language server clients and provides unified access to LSP features
 */

import * as monaco from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';
import { LSPClient } from './lspClient';
import { OptimizedLSPClient } from './OptimizedLSPClient';
import type { LanguageServerConfig, Diagnostic } from './types';
import { getMarkerService, MarkerSeverity, type IMarkerData } from '../markerService';
import { lspStatusActions } from '../../stores/lspStatusStore';
import { LSPClientState } from './types';

/**
 * LSP Service - Manages all language servers
 */
class LSPService {
  private clients: Map<string, LSPClient> = new Map();
  private languageToServer: Map<string, string> = new Map();
  private markerService = getMarkerService();
  private documentLanguages: Map<string, string> = new Map();

  /**
   * Register a language server
   */
  async registerServer(config: LanguageServerConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      console.debug(`[LSP] Server ${config.id} already registered`);
      return;
    }

    lspStatusActions.registerServer(config.id, config.name, config.languages);
    lspStatusActions.setServerStatus(config.id, 'starting');

    // Use OptimizedLSPClient for better performance
    const client = new OptimizedLSPClient(config);

    client.onStateChange((state) => {
      lspStatusActions.setServerStatus(
        config.id,
        this.mapClientStateToStatus(state)
      );
    });

    // Map languages to this server
    for (const lang of config.languages) {
      this.languageToServer.set(lang, config.id);
    }

    // Subscribe to diagnostics
    client.onDiagnostics((uri, diagnostics) => {
      this.handleDiagnostics(uri, diagnostics);
    });

    this.clients.set(config.id, client);

    // Auto-start the server
    try {
      await client.start();
      lspStatusActions.setServerStatus(config.id, 'running');
      console.info(`[LSP] Server registered and started: ${config.name}`);
    } catch (error) {
      const errorMessage = this.stringifyError(error);
      const unavailable = this.isUnavailableServerError(errorMessage);
      lspStatusActions.setServerStatus(config.id, unavailable ? 'unavailable' : 'error', errorMessage);

      this.clients.delete(config.id);
      for (const [language, serverId] of this.languageToServer.entries()) {
        if (serverId === config.id) {
          this.languageToServer.delete(language);
        }
      }

      console.error(`[LSP] Failed to start server: ${config.name}`, error);
    }
  }

  /**
   * Check if a server is already registered
   */
  isServerRegistered(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Unregister a language server
   */
  async unregisterServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      lspStatusActions.unregisterServer(serverId);
      return;
    }

    await client.stop();
    this.clients.delete(serverId);
    lspStatusActions.setServerStatus(serverId, 'stopped');
    lspStatusActions.unregisterServer(serverId);

    // Remove language mappings
    for (const [lang, id] of this.languageToServer.entries()) {
      if (id === serverId) {
        this.languageToServer.delete(lang);
      }
    }

    console.info(`[LSP] Server unregistered: ${serverId}`);
  }

  /**
   * Get client for a language
   */
  getClientForLanguage(language: string): LSPClient | null {
    const serverId = this.languageToServer.get(language);
    if (!serverId) {
      return null;
    }
    return this.clients.get(serverId) || null;
  }

  /**
   * Get client for a file URI
   */
  getClientForFile(uri: string): LSPClient | null {
    const languageId = this.documentLanguages.get(uri) || this.getLanguageIdFromUri(uri);
    if (!languageId) {
      return null;
    }
    return this.getClientForLanguage(languageId);
  }

  /**
   * Open a document in the appropriate language server
   */
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
    this.documentLanguages.set(uri, languageId);
    const client = this.getClientForLanguage(languageId);
    if (client) {
      await client.openDocument(uri, languageId, content);
    }
  }

  /**
   * Update a document
   */
  async updateDocument(uri: string, content: string, version?: number): Promise<void> {
    const client = this.getClientForFile(uri);
    if (client) {
      await client.updateDocument(uri, content, version);
    }
  }

  /**
   * Close a document
   */
  async closeDocument(uri: string): Promise<void> {
    const languageId = this.documentLanguages.get(uri);
    const client = languageId ? this.getClientForLanguage(languageId) : this.getClientForFile(uri);
    if (client) {
      await client.closeDocument(uri);
    }
    this.documentLanguages.delete(uri);
  }

  /**
   * Get all registered servers
   */
  getServers(): LSPClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Shutdown all language servers
   */
  async shutdown(): Promise<void> {
    console.info('[LSP] Shutting down all language servers');
    await Promise.all(
      Array.from(this.clients.values()).map(client => client.stop())
    );
    this.clients.clear();
    this.languageToServer.clear();
    this.documentLanguages.clear();
    lspStatusActions.clearAll();
  }

  /**
   * Handle diagnostics from language servers
   */
  private handleDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    const markers: IMarkerData[] = diagnostics.map((diagnostic) => {
      const startLineNumber = diagnostic.range.start.line + 1;
      const startColumn = diagnostic.range.start.character + 1;
      const endLineNumber = diagnostic.range.end.line + 1;
      const endColumn = diagnostic.range.end.character + 1;

      return {
        severity: this.convertSeverity(diagnostic.severity || 1),
        message: diagnostic.message,
        startLineNumber,
        startColumn,
        endLineNumber: endLineNumber >= startLineNumber ? endLineNumber : startLineNumber,
        endColumn: endColumn > 0 ? endColumn : startColumn + 1,
        code: diagnostic.code ? String(diagnostic.code) : undefined,
        source: 'lsp',
      };
    });

    const model = monaco.editor.getModel(monaco.Uri.parse(uri));
    if (model) {
      monaco.editor.setModelMarkers(
        model,
        'lsp',
        markers.map((marker) => ({
          severity: this.toMonacoSeverity(marker.severity),
          message: marker.message,
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          code: typeof marker.code === 'string' ? marker.code : marker.code?.value,
          source: marker.source,
        }))
      );
    }

    this.markerService.changeAll('lsp', [{ resource: uri, markers }]);
  }

  /**
   * Convert LSP severity to our diagnostic severity
   */
  private convertSeverity(lspSeverity: number): MarkerSeverity {
    // LSP severities: 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
    switch (lspSeverity) {
      case 1:
        return MarkerSeverity.Error;
      case 2:
        return MarkerSeverity.Warning;
      case 3:
        return MarkerSeverity.Info;
      case 4:
        return MarkerSeverity.Hint;
      default:
        return MarkerSeverity.Info;
    }
  }

  private toMonacoSeverity(severity: MarkerSeverity): monaco.MarkerSeverity {
    switch (severity) {
      case MarkerSeverity.Error:
        return monaco.MarkerSeverity.Error;
      case MarkerSeverity.Warning:
        return monaco.MarkerSeverity.Warning;
      case MarkerSeverity.Info:
        return monaco.MarkerSeverity.Info;
      case MarkerSeverity.Hint:
        return monaco.MarkerSeverity.Hint;
      default:
        return monaco.MarkerSeverity.Info;
    }
  }

  private mapClientStateToStatus(state: LSPClientState): 'stopped' | 'starting' | 'running' | 'error' {
    switch (state) {
      case LSPClientState.Starting:
        return 'starting';
      case LSPClientState.Running:
        return 'running';
      case LSPClientState.Error:
        return 'error';
      case LSPClientState.Stopped:
      default:
        return 'stopped';
    }
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private isUnavailableServerError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('not found') ||
      normalized.includes('enoent') ||
      normalized.includes('no such file') ||
      normalized.includes('could not start')
    );
  }

  private getLanguageIdFromUri(uri: string): string | null {
    const cleanUri = uri.split('?')[0];
    const ext = cleanUri.split('.').pop()?.toLowerCase() || '';

    if (!ext) {
      return null;
    }

    const extensionToLanguage: Record<string, string> = {
      rs: 'rust',
      py: 'python',
      go: 'go',
    };

    return extensionToLanguage[ext] || ext;
  }
}

// Singleton instance
let lspService: LSPService | null = null;
let initializePromise: Promise<void> | null = null;

interface LSPBinaryStatus {
  server_id: string;
  installed: boolean;
}

/**
 * Get the LSP service singleton
 */
export function getLSPService(): LSPService {
  if (!lspService) {
    lspService = new LSPService();
  }
  return lspService;
}

/**
 * Initialize LSP service with default language servers
 * 
 * NOTE: We intentionally DO NOT auto-start an external TypeScript language server.
 * Monaco Editor includes an excellent built-in TypeScript language service (same as VS Code).
 * External LSP servers are reserved for languages not supported by Monaco:
 * - rust-analyzer for Rust
 * - pylsp for Python
 * - gopls for Go
 * - etc.
 * 
 * The LSP infrastructure is kept in place for future expansion.
 */
export async function initializeLSP(): Promise<void> {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
  const service = getLSPService();

  const externalServers: LanguageServerConfig[] = [
    {
      id: 'rust-analyzer',
      name: 'Rust Analyzer',
      languages: ['rust'],
      command: 'rust-analyzer',
      args: [],
    },
    {
      id: 'pylsp',
      name: 'Python LSP',
      languages: ['python'],
      command: 'pylsp',
      args: [],
    },
    {
      id: 'gopls',
      name: 'Go PLS',
      languages: ['go'],
      command: 'gopls',
      args: [],
    },
  ];

  // Preflight check for installed binaries. If this fails (e.g. non-Tauri env),
  // we fall back to the previous behavior and attempt normal registration.
  let installedByServerId: Record<string, boolean> | null = null;
  try {
    const statuses = await invoke<LSPBinaryStatus[]>('lsp_get_binary_statuses');
    installedByServerId = Object.fromEntries(
      statuses.map((entry) => [entry.server_id, entry.installed])
    );
  } catch (error) {
    console.debug('[LSP] Binary preflight unavailable, falling back to direct startup:', error);
  }

  for (const server of externalServers) {
    const isInstalled = installedByServerId ? installedByServerId[server.id] === true : true;

    if (!isInstalled) {
      lspStatusActions.registerServer(server.id, server.name, server.languages);
      lspStatusActions.setServerStatus(
        server.id,
        'unavailable',
        `Command not found: ${server.command}. Install it from Settings > LSP & Binaries.`
      );
      continue;
    }

    if (service.isServerRegistered(server.id)) {
      continue;
    }

    await service.registerServer(server);
  }

  console.info('[LSP] LSP service initialized (Monaco built-in TS/JS + external servers)');
  })().finally(() => {
    initializePromise = null;
  });

  return initializePromise;
}
