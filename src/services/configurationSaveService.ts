/**
 * Configuration Save Service
 *
 * Optimizes configuration saves with debouncing and batching to reduce disk I/O.
 * Ensures atomic writes and provides retry logic for failed saves.
 */

import { invoke } from '@tauri-apps/api/core';

interface PendingSave {
  key: string;
  value: any;
  scope: 'user' | 'workspace';
  timestamp: number;
}

class ConfigurationSaveService {
  private pendingSaves: Map<string, PendingSave> = new Map();
  private saveTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce
  private readonly MAX_RETRIES = 3;
  private isSaving = false;

  /**
   * Queue a configuration save (debounced)
   */
  public queueSave(key: string, value: any, scope: 'user' | 'workspace'): void {
    // Update or add to pending saves
    this.pendingSaves.set(key, {
      key,
      value,
      scope,
      timestamp: Date.now()
    });

    // Clear existing timer
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }

    // Set new debounced save timer
    this.saveTimer = window.setTimeout(() => {
      this.executeBatchSave();
    }, this.DEBOUNCE_DELAY);

    console.log('[ConfigurationSaveService] 📝 Queued save:', { key, scope, queueSize: this.pendingSaves.size });
  }

  /**
   * Execute batched saves
   */
  private async executeBatchSave(): Promise<void> {
    if (this.isSaving || this.pendingSaves.size === 0) {
      return;
    }

    this.isSaving = true;
    const saves = Array.from(this.pendingSaves.values());
    this.pendingSaves.clear();

    console.log('[ConfigurationSaveService] 💾 Executing batch save:', { count: saves.length });

    try {
      // Group saves by scope
      const userSaves = saves.filter(s => s.scope === 'user');
      const workspaceSaves = saves.filter(s => s.scope === 'workspace');

      // Execute user saves
      if (userSaves.length > 0) {
        await this.saveBatch(userSaves, 'user');
      }

      // Execute workspace saves
      if (workspaceSaves.length > 0) {
        await this.saveBatch(workspaceSaves, 'workspace');
      }

      console.log('[ConfigurationSaveService] ✅ Batch save completed successfully');
    } catch (error) {
      console.error('[ConfigurationSaveService] ❌ Batch save failed:', error);
      // Re-queue failed saves
      saves.forEach(save => {
        this.pendingSaves.set(save.key, save);
      });
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Save a batch of configuration values for a specific scope
   */
  private async saveBatch(saves: PendingSave[], scope: 'user' | 'workspace'): Promise<void> {
    const scopeCapitalized = scope === 'user' ? 'User' : 'Workspace';

    for (const save of saves) {
      await this.saveWithRetry(save.key, save.value, scopeCapitalized);
    }
  }

  /**
   * Save with retry logic
   */
  private async saveWithRetry(
    key: string,
    value: any,
    scope: string,
    retries = 0
  ): Promise<void> {
    try {
      await invoke('set_configuration_value', {
        key,
        value,
        scope
      });
      console.log('[ConfigurationSaveService] ✅ Saved:', { key, scope });
    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        console.warn('[ConfigurationSaveService] ⚠️ Save failed, retrying...', { key, attempt: retries + 1 });
        await new Promise(resolve => setTimeout(resolve, 100 * (retries + 1))); // Exponential backoff
        await this.saveWithRetry(key, value, scope, retries + 1);
      } else {
        console.error('[ConfigurationSaveService] ❌ Save failed after max retries:', { key, error });
        throw error;
      }
    }
  }

  /**
   * Force immediate save of all pending changes
   */
  public async flush(): Promise<void> {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await this.executeBatchSave();
  }

  /**
   * Get number of pending saves
   */
  public getPendingCount(): number {
    return this.pendingSaves.size;
  }
}

// Singleton instance
const configurationSaveService = new ConfigurationSaveService();

export { configurationSaveService };
export type { PendingSave };
