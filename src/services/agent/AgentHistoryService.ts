import { invoke } from '@tauri-apps/api/core';
import { join, homeDir } from '@tauri-apps/api/path';
import { AgentSession } from '@/stores/agentStore';

/**
 * AgentHistoryService - Manages chat session persistence per workspace
 * 
 * Sessions are stored in ~/.rainy-aether/agent-sessions/{workspace-hash}/
 * This keeps all agent data centralized while isolating sessions per project.
 */
export class AgentHistoryService {
  private static instance: AgentHistoryService;
  private initialized = false;
  private currentWorkspacePath: string = '';
  private historyPath: string = '';
  private basePath: string = '';

  private constructor() { }

  static getInstance(): AgentHistoryService {
    if (!AgentHistoryService.instance) {
      AgentHistoryService.instance = new AgentHistoryService();
    }
    return AgentHistoryService.instance;
  }

  /**
   * Generate a safe folder name from workspace path
   * Uses the folder name + a short hash for uniqueness
   */
  private generateWorkspaceId(workspacePath: string): string {
    // Get the folder name
    const folderName = workspacePath.split('/').pop() || workspacePath.split('\\').pop() || 'unknown';

    // Create a simple hash of the full path for uniqueness
    let hash = 0;
    for (let i = 0; i < workspacePath.length; i++) {
      const char = workspacePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const hashStr = Math.abs(hash).toString(16).substring(0, 6);

    // Sanitize folder name (remove special characters)
    const safeName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');

    return `${safeName}_${hashStr}`;
  }

  /**
   * Set the current workspace path
   * This should be called when the workspace changes
   */
  async setWorkspace(workspacePath: string): Promise<void> {
    if (this.currentWorkspacePath === workspacePath && this.initialized) {
      return; // Already set to this workspace
    }

    this.currentWorkspacePath = workspacePath;
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get the current workspace path
   */
  getWorkspacePath(): string {
    return this.currentWorkspacePath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const home = await homeDir();
      this.basePath = await join(home, '.rainy-aether', 'agent-sessions');

      if (!this.currentWorkspacePath) {
        // Fallback to global path if no workspace is set
        this.historyPath = await join(this.basePath, '_global');
        console.log('[AgentHistoryService] Using global history path:', this.historyPath);
      } else {
        // Use workspace-specific subfolder
        const workspaceId = this.generateWorkspaceId(this.currentWorkspacePath);
        this.historyPath = await join(this.basePath, workspaceId);
        console.log('[AgentHistoryService] Using workspace history path:', this.historyPath);
      }

      // Try to ensure the directory exists
      try {
        await invoke('load_directory_children', { path: this.historyPath });
      } catch {
        // Directory doesn't exist - try to create it
        try {
          await invoke('create_path', { path: this.historyPath, isFile: false });
          console.log('[AgentHistoryService] Created history directory:', this.historyPath);
        } catch {
          console.log('[AgentHistoryService] Will create history directory on first save');
        }
      }

      this.initialized = true;
    } catch (error) {
      console.warn('[AgentHistoryService] Initialization warning:', error);
      this.initialized = true; // Mark as initialized to prevent repeated attempts
    }
  }

  async saveSession(session: AgentSession): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      const fileName = `${session.id}.json`;
      const filePath = await join(this.historyPath, fileName);

      const content = JSON.stringify(session, null, 2);
      await invoke('save_file_content', { path: filePath, content });
    } catch (error) {
      console.error(`Failed to save session ${session.id}:`, error);
    }
  }

  async loadSession(sessionId: string): Promise<AgentSession | null> {
    if (!this.initialized) await this.initialize();

    try {
      const fileName = `${sessionId}.json`;
      const filePath = await join(this.historyPath, fileName);

      const content = await invoke<string>('get_file_content', { path: filePath });
      if (!content) return null;

      const session = JSON.parse(content) as AgentSession;

      // Restore Date objects
      session.createdAt = new Date(session.createdAt);
      session.lastMessageAt = new Date(session.lastMessageAt);
      session.messages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      return session;
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    if (!this.initialized) await this.initialize();

    try {
      const files = await invoke<any[]>('load_directory_children', { path: this.historyPath });
      const sessions: AgentSession[] = [];

      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const sessionId = file.name.replace('.json', '');
          const session = await this.loadSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }

      // Sort by last message date, newest first
      return sessions.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      const fileName = `${sessionId}.json`;
      const filePath = await join(this.historyPath, fileName);
      await invoke('delete_path', { path: filePath });
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
    }
  }

  /**
   * Clear initialization state to force re-initialization
   * Useful when workspace changes
   */
  reset(): void {
    this.initialized = false;
    this.currentWorkspacePath = '';
    this.historyPath = '';
  }
}

export const agentHistoryService = AgentHistoryService.getInstance();