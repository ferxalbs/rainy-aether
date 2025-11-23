/**
 * LSP Service
 * Manages multiple language server clients and provides unified access to LSP features
 */

import { LSPClient } from './lspClient';
import { OptimizedLSPClient } from './OptimizedLSPClient';
import type { LanguageServerConfig, Diagnostic } from './types';
import { getDiagnosticService, DiagnosticSource, DiagnosticSeverity } from '../diagnosticService';

/**
 * LSP Service - Manages all language servers
 */
class LSPService {
  private clients: Map<string, LSPClient> = new Map();
  private languageToServer: Map<string, string> = new Map();
  private diagnosticService = getDiagnosticService();

  /**
   * Register a language server
   */
  async registerServer(config: LanguageServerConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      console.warn(`[LSP] Server ${config.id} already registered`);
      return;
    }

    // Use OptimizedLSPClient for better performance
    const client = new OptimizedLSPClient(config);

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
      console.info(`[LSP] Server registered and started: ${config.name}`);
    } catch (error) {
      console.error(`[LSP] Failed to start server: ${config.name}`, error);
    }
  }

  /**
   * Unregister a language server
   */
  async unregisterServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      return;
    }

    await client.stop();
    this.clients.delete(serverId);

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
    const ext = uri.split('.').pop()?.toLowerCase() || '';
    return this.getClientForLanguage(ext);
  }

  /**
   * Open a document in the appropriate language server
   */
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
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
    const client = this.getClientForFile(uri);
    if (client) {
      await client.closeDocument(uri);
    }
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
  }

  /**
   * Handle diagnostics from language servers
   */
  private handleDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    // Clear previous LSP diagnostics for this file
    const service = this.diagnosticService;
    const allDiagnostics = service.getAllDiagnostics();

    // Remove old LSP diagnostics for this file
    allDiagnostics
      .filter((d: { source: DiagnosticSource; file?: string }) => d.source === DiagnosticSource.LSP && d.file === uri)
      .forEach((d: { id: string }) => service.removeDiagnostic(d.id));

    // Add new diagnostics
    diagnostics.forEach((diagnostic, index) => {
      const severity = this.convertSeverity(diagnostic.severity || 1);

      service.addDiagnostic({
        id: `lsp-${uri}-${index}`,
        source: DiagnosticSource.LSP,
        severity,
        message: diagnostic.message,
        file: uri,
        line: diagnostic.range.start.line + 1, // LSP is 0-based, we use 1-based
        column: diagnostic.range.start.character + 1,
      });
    });
  }

  /**
   * Convert LSP severity to our diagnostic severity
   */
  private convertSeverity(lspSeverity: number): DiagnosticSeverity {
    // LSP severities: 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
    switch (lspSeverity) {
      case 1:
        return DiagnosticSeverity.Error;
      case 2:
        return DiagnosticSeverity.Warning;
      case 3:
      case 4:
        return DiagnosticSeverity.Info;
      default:
        return DiagnosticSeverity.Info;
    }
  }
}

// Singleton instance
let lspService: LSPService | null = null;

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
 */
export async function initializeLSP(): Promise<void> {
  const service = getLSPService();

  // Register TypeScript/JavaScript language server
  // Note: For now, we rely on Monaco's built-in TS support
  // In the future, we can add a proper TS language server via Tauri
  await service.registerServer({
    id: 'typescript',
    name: 'TypeScript Language Server',
    languages: ['ts', 'tsx', 'js', 'jsx'],
    command: 'typescript-language-server', // Will be implemented in Tauri
    args: ['--stdio'],
  });

  console.info('[LSP] LSP service initialized');
}
