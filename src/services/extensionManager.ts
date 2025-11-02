import { EventEmitter } from '../utils/EventEmitter';
import { invoke } from '@tauri-apps/api/core';
import { openVSXRegistry } from './openVSXRegistry';
import { monacoExtensionHost } from './monacoExtensionHost';
import {
  InstalledExtension,
  ExtensionInstallOptions,
  ExtensionManifest,
  OpenVSXExtension
} from '../types/extension';

export class ExtensionManager extends EventEmitter {
  private extensions: Map<string, InstalledExtension> = new Map();
  private readonly extensionsDir = 'extensions'; // Relative to app data directory
  private isInitialized = false;

  constructor() {
    super();
    // Don't load extensions in constructor - do it lazily
  }

  /**
   * Get all installed extensions
   */
  async getInstalledExtensions(): Promise<InstalledExtension[]> {
    await this.ensureInitialized();
    return Array.from(this.extensions.values());
  }

  /**
   * Get a specific installed extension
   */
  getInstalledExtension(id: string): InstalledExtension | undefined {
    return this.extensions.get(id);
  }

  /**
   * Install an extension from Open VSX
   */
  async installExtension(
    publisher: string,
    name: string,
    options: ExtensionInstallOptions = {}
  ): Promise<InstalledExtension> {
    const id = `${publisher}.${name}`;

    // Check if already installed
    const existing = this.extensions.get(id);
    if (existing && !options.force) {
      throw new Error(`Extension ${id} is already installed`);
    }

    try {
      // Get extension info from registry
      const extension = await openVSXRegistry.getExtension(publisher, name);
      if (!extension) {
        throw new Error(`Extension ${id} not found in registry`);
      }

      const version = options.version || extension.version;

      // Create installed extension object
      const installedExtension: InstalledExtension = {
        id,
        publisher,
        name,
        displayName: extension.displayName,
        description: extension.description,
        version,
        state: 'installing',
        installedAt: new Date().toISOString(),
        enabled: false,
        manifest: {} as ExtensionManifest, // Will be populated after download
        path: this.getExtensionPath(publisher, name, version),
        dependencies: extension.extensionDependencies || []
      };

      this.extensions.set(id, installedExtension);
      this.emit('extension:installing', installedExtension);
      this.saveInstalledExtensions();

      // Download and extract extension
      await this.downloadAndExtractExtension(extension, version, installedExtension);

      // Install dependencies if any
      if (installedExtension.dependencies && installedExtension.dependencies.length > 0) {
        await this.installDependencies(installedExtension);
      }

      // Mark as installed
      installedExtension.state = 'installed';
      this.emit('extension:installed', installedExtension);
      this.saveInstalledExtensions();

      return installedExtension;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update extension state to error
      const extension = this.extensions.get(id);
      if (extension) {
        extension.state = 'error';
        extension.error = errorMessage;
        this.emit('extension:error', extension, errorMessage);
        this.saveInstalledExtensions();
      }

      throw error;
    }
  }

  /**
   * Enable an installed extension
   */
  async enableExtension(id: string): Promise<void> {
    const extension = this.extensions.get(id);
    if (!extension) {
      throw new Error(`Extension ${id} not found`);
    }

    if (extension.state === 'enabled') {
      return; // Already enabled
    }

    if (extension.state !== 'installed' && extension.state !== 'disabled') {
      throw new Error(`Cannot enable extension in state: ${extension.state}`);
    }

    try {
      extension.state = 'enabling';
      this.emit('extension:enabling', extension);
      this.saveInstalledExtensions();

      // Load extension in Monaco (this will be implemented when we integrate with Monaco)
      await this.loadExtensionInMonaco(extension);

      extension.state = 'enabled';
      extension.enabled = true;
      this.emit('extension:enabled', extension);
      this.saveInstalledExtensions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      extension.state = 'error';
      extension.error = errorMessage;
      this.emit('extension:error', extension, errorMessage);
      this.saveInstalledExtensions();
      throw error;
    }
  }

  /**
   * Disable an enabled extension
   */
  async disableExtension(id: string): Promise<void> {
    const extension = this.extensions.get(id);
    if (!extension) {
      throw new Error(`Extension ${id} not found`);
    }

    if (extension.state !== 'enabled') {
      throw new Error(`Extension ${id} is not enabled`);
    }

    try {
      extension.state = 'disabling';
      this.emit('extension:disabling', extension);
      this.saveInstalledExtensions();

      // Unload extension from Monaco
      await this.unloadExtensionFromMonaco(extension);

      extension.state = 'disabled';
      extension.enabled = false;
      this.emit('extension:disabled', extension);
      this.saveInstalledExtensions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      extension.state = 'error';
      extension.error = errorMessage;
      this.emit('extension:error', extension, errorMessage);
      this.saveInstalledExtensions();
      throw error;
    }
  }

  /**
   * Uninstall an extension
   */
  async uninstallExtension(id: string): Promise<void> {
    const extension = this.extensions.get(id);
    if (!extension) {
      throw new Error(`Extension ${id} not found`);
    }

    try {
      // Disable first if enabled
      if (extension.state === 'enabled') {
        await this.disableExtension(id);
      }

      extension.state = 'uninstalling';
      this.emit('extension:uninstalling', extension);
      this.saveInstalledExtensions();

      // Remove extension files
      await this.removeExtensionFiles(extension);

      // Remove from installed extensions
      this.extensions.delete(id);
      this.emit('extension:uninstalled', extension);
      this.saveInstalledExtensions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (extension) {
        extension.state = 'error';
        extension.error = errorMessage;
        this.emit('extension:error', extension, errorMessage);
        this.saveInstalledExtensions();
      }
      throw error;
    }
  }

  /**
   * Check if extension can be installed
   */
  async canInstallExtension(publisher: string, name: string): Promise<{
    canInstall: boolean;
    reason?: string;
  }> {
    const extension = await openVSXRegistry.getExtension(publisher, name);
    if (!extension) {
      return { canInstall: false, reason: 'Extension not found in registry' };
    }

    const compatibility = openVSXRegistry.validateExtensionCompatibility(extension);
    if (!compatibility.isCompatible) {
      return {
        canInstall: false,
        reason: compatibility.issues.join('; ')
      };
    }

    // Check dependencies
    if (extension.extensionDependencies) {
      for (const dep of extension.extensionDependencies) {
        if (!this.extensions.has(dep)) {
          return {
            canInstall: false,
            reason: `Missing dependency: ${dep}`
          };
        }
      }
    }

    return { canInstall: true };
  }

  // Private methods

  private getExtensionPath(publisher: string, name: string, version: string): string {
    return `${this.extensionsDir}/${publisher}/${name}/${version}`;
  }

  private async downloadAndExtractExtension(
    extension: OpenVSXExtension,
    version: string,
    installedExtension: InstalledExtension
  ): Promise<void> {
    try {
      // Download VSIX package
      const vsixData = await openVSXRegistry.downloadExtension(
        extension.publisher.name,
        extension.name,
        version
      );

      if (!vsixData) {
        throw new Error('Failed to download extension package');
      }

      // Extract VSIX (zip file) using Tauri command
      await invoke('extract_extension', {
        vsixData: Array.from(new Uint8Array(vsixData)),
        targetPath: installedExtension.path
      });

      // Load manifest
      const manifest = await openVSXRegistry.getExtensionManifest(
        extension.publisher.name,
        extension.name,
        version
      );

      if (!manifest) {
        throw new Error('Failed to load extension manifest');
      }

      installedExtension.manifest = manifest;
    } catch (error) {
      console.error('Failed to download and extract extension:', error);
      throw error;
    }
  }

  private async installDependencies(extension: InstalledExtension): Promise<void> {
    if (!extension.dependencies) return;

    for (const depId of extension.dependencies) {
      const [depPublisher, depName] = depId.split('.');
      if (!this.extensions.has(depId)) {
        // Install dependency recursively
        await this.installExtension(depPublisher, depName);
      }
    }
  }

  private async loadExtensionInMonaco(extension: InstalledExtension): Promise<void> {
    try {
      // Use the Monaco extension host to load the extension
      await monacoExtensionHost.loadExtension(extension);
    } catch (error) {
      console.error(`Failed to load extension ${extension.id} in Monaco:`, error);
      // Don't throw - allow the extension to be marked as enabled even if Monaco loading fails
      // This prevents blocking the entire UI
    }
  }

  private async unloadExtensionFromMonaco(extension: InstalledExtension): Promise<void> {
    // Use the Monaco extension host to unload the extension
    await monacoExtensionHost.unloadExtension(extension.id);
  }

  private async removeExtensionFiles(extension: InstalledExtension): Promise<void> {
    try {
      await invoke('remove_directory', { path: extension.path });
    } catch (error) {
      console.error('Failed to remove extension files:', error);
      // Don't throw here - the extension is still uninstalled from the manager
    }
  }

  private async loadInstalledExtensions(): Promise<void> {
    try {
      const installedData = await invoke<string>('load_installed_extensions');
      const installed = JSON.parse(installedData) as InstalledExtension[];

      for (const ext of installed) {
        this.extensions.set(ext.id, ext);
      }
    } catch (error) {
      console.warn('Failed to load installed extensions:', error);
      // Start with empty state if loading fails
    }
  }

  private async saveInstalledExtensions(): Promise<void> {
    try {
      const extensions = Array.from(this.extensions.values());
      await invoke('save_installed_extensions', {
        extensions: JSON.stringify(extensions)
      });
    } catch (error) {
      console.error('Failed to save installed extensions:', error);
    }
  }
}

// Export singleton instance
export const extensionManager = new ExtensionManager();
