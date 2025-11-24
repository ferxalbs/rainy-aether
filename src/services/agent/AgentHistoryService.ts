import { invoke } from '@tauri-apps/api/core';
import { join, homeDir } from '@tauri-apps/api/path';
import { AgentSession } from '@/stores/agentStore';
import { ChatMessage } from '@/types/chat';

export class AgentHistoryService {
  private static instance: AgentHistoryService;
  private initialized = false;
  private historyPath: string = '';

  private constructor() {}

  static getInstance(): AgentHistoryService {
    if (!AgentHistoryService.instance) {
      AgentHistoryService.instance = new AgentHistoryService();
    }
    return AgentHistoryService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get the home directory path
      const home = await homeDir();
      this.historyPath = await join(home, '.rainy-aether', 'agent-history');

      // Ensure the history directory exists
      // Note: We use absolute path here, so we need to make sure the backend supports it
      // The backend 'check_path_exists' and 'create_directory' should handle absolute paths
      const exists = await invoke<boolean>('check_path_exists', { path: this.historyPath });
      if (!exists) {
        await invoke('create_directory', { path: this.historyPath });
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AgentHistoryService:', error);
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
}

export const agentHistoryService = AgentHistoryService.getInstance();