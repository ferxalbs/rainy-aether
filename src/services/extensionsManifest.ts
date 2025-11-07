/**
 * Extensions Manifest Service
 *
 * Manages the extensions.json manifest file that tracks all installed extensions
 * Provides VS Code-compatible extension tracking
 */

import { invoke } from '@tauri-apps/api/core';
import {
  ExtensionsManifest,
  ExtensionManifestEntry,
} from '../types/extensionsManifest';
import { InstalledExtension } from '../types/extension';

class ExtensionsManifestService {
  private manifest: ExtensionsManifest | null = null;
  private isInitialized = false;

  /**
   * Initialize the extensions manifest system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure extensions directory exists
      const extensionsDir = await invoke<string>('ensure_extensions_directory');
      console.log('[ExtensionsManifest] Extensions directory:', extensionsDir);

      // Load the manifest
      await this.loadManifest();

      this.isInitialized = true;
      console.log('[ExtensionsManifest] Initialized with', this.manifest?.extensions.length || 0, 'extensions');
    } catch (error) {
      console.error('[ExtensionsManifest] Failed to initialize:', error);
      // Initialize with empty manifest if loading fails
      this.manifest = { extensions: [] };
      this.isInitialized = true;
    }
  }

  /**
   * Load the extensions manifest from disk
   */
  async loadManifest(): Promise<ExtensionsManifest> {
    try {
      const manifestJson = await invoke<string>('load_extensions_manifest');
      this.manifest = JSON.parse(manifestJson);
      return this.manifest!;
    } catch (error) {
      console.warn('[ExtensionsManifest] Failed to load manifest, creating new one:', error);
      this.manifest = { extensions: [] };
      return this.manifest;
    }
  }

  /**
   * Save the extensions manifest to disk
   */
  async saveManifest(): Promise<void> {
    if (!this.manifest) {
      console.warn('[ExtensionsManifest] No manifest to save');
      return;
    }

    try {
      const manifestJson = JSON.stringify(this.manifest, null, 2);
      await invoke('save_extensions_manifest', { manifest: manifestJson });
      console.log('[ExtensionsManifest] Saved manifest with', this.manifest.extensions.length, 'extensions');
    } catch (error) {
      console.error('[ExtensionsManifest] Failed to save manifest:', error);
      throw error;
    }
  }

  /**
   * Get the current manifest
   */
  getManifest(): ExtensionsManifest {
    return this.manifest || { extensions: [] };
  }

  /**
   * Add or update an extension in the manifest
   */
  async addOrUpdateExtension(extension: InstalledExtension): Promise<void> {
    await this.ensureInitialized();

    const existingIndex = this.manifest!.extensions.findIndex(
      (entry) => entry.identifier.id === extension.id
    );

    const manifestEntry: ExtensionManifestEntry = {
      identifier: {
        id: extension.id,
        uuid: undefined, // We can add UUID support later if needed
      },
      version: extension.version,
      relative_path: extension.path,
      metadata: {
        installed_timestamp: extension.installedAt ? new Date(extension.installedAt).getTime() : Date.now(),
        is_enabled: extension.enabled,
        is_builtin: false,
        is_system: false,
        updated_timestamp: Date.now(),
        pre_release_version: false,
        display_name: extension.displayName,
        description: extension.description,
      },
    };

    if (existingIndex >= 0) {
      // Update existing entry
      this.manifest!.extensions[existingIndex] = manifestEntry;
      console.log('[ExtensionsManifest] Updated extension:', extension.id);
    } else {
      // Add new entry
      this.manifest!.extensions.push(manifestEntry);
      console.log('[ExtensionsManifest] Added extension:', extension.id);
    }

    await this.saveManifest();
  }

  /**
   * Remove an extension from the manifest
   */
  async removeExtension(extensionId: string): Promise<void> {
    await this.ensureInitialized();

    const initialLength = this.manifest!.extensions.length;
    this.manifest!.extensions = this.manifest!.extensions.filter(
      (entry) => entry.identifier.id !== extensionId
    );

    if (this.manifest!.extensions.length < initialLength) {
      console.log('[ExtensionsManifest] Removed extension:', extensionId);
      await this.saveManifest();
    }
  }

  /**
   * Update extension enabled state
   */
  async updateExtensionEnabled(extensionId: string, enabled: boolean): Promise<void> {
    await this.ensureInitialized();

    const entry = this.manifest!.extensions.find((e) => e.identifier.id === extensionId);
    if (entry) {
      entry.metadata.is_enabled = enabled;
      entry.metadata.updated_timestamp = Date.now();
      console.log('[ExtensionsManifest] Updated extension enabled state:', extensionId, enabled);
      await this.saveManifest();
    }
  }

  /**
   * Get an extension entry from the manifest
   */
  getExtensionEntry(extensionId: string): ExtensionManifestEntry | undefined {
    return this.manifest?.extensions.find((entry) => entry.identifier.id === extensionId);
  }

  /**
   * Get all extension entries
   */
  getAllExtensions(): ExtensionManifestEntry[] {
    return this.manifest?.extensions || [];
  }

  /**
   * Synchronize manifest with installed extensions
   * This ensures the manifest is in sync with the actual installed extensions
   */
  async syncWithInstalledExtensions(installedExtensions: InstalledExtension[]): Promise<void> {
    await this.ensureInitialized();

    console.log('[ExtensionsManifest] Syncing manifest with', installedExtensions.length, 'installed extensions');

    // Remove extensions that are no longer installed
    const installedIds = new Set(installedExtensions.map((ext) => ext.id));
    this.manifest!.extensions = this.manifest!.extensions.filter((entry) =>
      installedIds.has(entry.identifier.id)
    );

    // Add or update extensions from installed list
    for (const extension of installedExtensions) {
      await this.addOrUpdateExtension(extension);
    }

    await this.saveManifest();
    console.log('[ExtensionsManifest] Sync complete');
  }

  /**
   * Get app data directory path (for diagnostics)
   */
  async getAppDataDirectory(): Promise<string> {
    try {
      return await invoke<string>('get_app_data_directory');
    } catch (error) {
      console.error('[ExtensionsManifest] Failed to get app data directory:', error);
      return 'Unknown';
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Export singleton instance
export const extensionsManifestService = new ExtensionsManifestService();
