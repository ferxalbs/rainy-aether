import { EventEmitter } from '../utils/EventEmitter';
import { invoke } from '@tauri-apps/api/core';
import { openVSXRegistry } from './openVSXRegistry';
import { monacoExtensionHost } from './monacoExtensionHost';
import { extensionHealthMonitor } from './extensionHealthMonitor';
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
  private cleanupTimer?: NodeJS.Timeout;
  private readonly cleanupInterval = 60 * 1000; // 1 minute

  constructor() {
    super();
    // Don't load extensions in constructor - do it lazily
    this.setupHealthMonitoring();
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
  async getInstalledExtension(id: string): Promise<InstalledExtension | undefined> {
    await this.ensureInitialized();
    return this.extensions.get(id);
  }

  /**
   * Install an extension from Open VSX with validation and health monitoring
   */
  async installExtension(
    publisher: string,
    name: string,
    options: ExtensionInstallOptions = {}
  ): Promise<InstalledExtension> {
    await this.ensureInitialized();
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
        throw new Error(`Extension ${id} not found in Open VSX registry`);
      }

      // Validate compatibility before installation
      const compatibility = openVSXRegistry.validateExtensionCompatibility(extension);

      if (!compatibility.isCompatible) {
        const issues = compatibility.issues.join('; ');
        throw new Error(`Extension ${id} is not compatible: ${issues}`);
      }

      // Warn about compatibility issues
      if (compatibility.warnings.length > 0) {
        console.warn(`Extension ${id} compatibility warnings:`, compatibility.warnings);
      }

      // Log compatibility score
      console.log(`Extension ${id} compatibility score: ${compatibility.compatibilityScore}%`);

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

      // Record successful installation in health monitor
      extensionHealthMonitor.recordSuccess(id);

      return installedExtension;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failure in health monitor
      extensionHealthMonitor.recordFailure(id, errorMessage);

      // Update extension state to error
      const extension = this.extensions.get(id);
      if (extension) {
        extension.state = 'error';
        extension.error = errorMessage;
        this.emit('extension:error', extension, errorMessage);
        this.saveInstalledExtensions();

        // Check if should auto-cleanup
        if (extensionHealthMonitor.shouldAutoUninstall(id)) {
          console.warn(`Extension ${id} has critical errors - scheduling for cleanup`);
          setTimeout(() => this.cleanupFailedExtension(id), 5000);
        }
      }

      throw new Error(`Failed to install extension ${id}: ${errorMessage}`);
    }
  }

  /**
   * Enable an installed extension
   */
  async enableExtension(id: string): Promise<void> {
    await this.ensureInitialized();
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

      // Record success in health monitor
      extensionHealthMonitor.recordSuccess(id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failure in health monitor
      extensionHealthMonitor.recordFailure(id, errorMessage);

      extension.state = 'error';
      extension.error = errorMessage;
      this.emit('extension:error', extension, errorMessage);
      this.saveInstalledExtensions();

      // Check if should auto-disable
      if (extensionHealthMonitor.shouldAutoDisable(id)) {
        console.warn(`Extension ${id} has repeated failures - auto-disabling`);
        extension.state = 'disabled';
        extension.enabled = false;
      }

      throw new Error(`Failed to enable extension ${id}: ${errorMessage}`);
    }
  }

  /**
   * Disable an enabled extension
   */
  async disableExtension(id: string): Promise<void> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadInstalledExtensions();
      this.isInitialized = true;
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

  /**
   * Setup health monitoring for extensions
   */
  private setupHealthMonitoring(): void {
    // Start the health monitor
    extensionHealthMonitor.startMonitoring();

    // Listen to health events
    extensionHealthMonitor.on('health:critical', (extensionId, health) => {
      console.warn(`[ExtensionManager] Extension ${extensionId} health is critical:`, health);

      const extension = this.extensions.get(extensionId);
      if (extension && extension.enabled) {
        // Auto-disable critically unhealthy extensions
        this.disableExtension(extensionId).catch(error => {
          console.error(`Failed to auto-disable unhealthy extension ${extensionId}:`, error);
        });
      }
    });

    extensionHealthMonitor.on('cleanup:required', (extensionId) => {
      console.warn(`[ExtensionManager] Extension ${extensionId} requires cleanup`);
      // Schedule cleanup for later to avoid immediate removal
      setTimeout(() => {
        this.cleanupFailedExtension(extensionId).catch(error => {
          console.error(`Failed to cleanup extension ${extensionId}:`, error);
        });
      }, 10000); // Wait 10 seconds before cleanup
    });

    // Start periodic cleanup check
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup of failed extensions
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      return; // Already running
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanupCheck();
    }, this.cleanupInterval);

    console.log('[ExtensionManager] Started periodic cleanup');
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      console.log('[ExtensionManager] Stopped periodic cleanup');
    }
  }

  /**
   * Perform cleanup check for all extensions
   */
  private async performCleanupCheck(): Promise<void> {
    const unhealthy = extensionHealthMonitor.getUnhealthyExtensions();

    for (const health of unhealthy) {
      const extension = this.extensions.get(health.id);
      if (!extension) continue;

      // Auto-uninstall if extension should be removed
      if (extensionHealthMonitor.shouldAutoUninstall(health.id)) {
        console.warn(`Auto-uninstalling critically failed extension: ${health.id}`);
        try {
          await this.cleanupFailedExtension(health.id);
        } catch (error) {
          console.error(`Failed to cleanup extension ${health.id}:`, error);
        }
      }
      // Auto-disable if extension should be disabled
      else if (extensionHealthMonitor.shouldAutoDisable(health.id) && extension.enabled) {
        console.warn(`Auto-disabling failed extension: ${health.id}`);
        try {
          await this.disableExtension(health.id);
        } catch (error) {
          console.error(`Failed to disable extension ${health.id}:`, error);
        }
      }
    }
  }

  /**
   * Cleanup a failed extension
   */
  private async cleanupFailedExtension(id: string): Promise<void> {
    const extension = this.extensions.get(id);
    if (!extension) {
      console.warn(`Extension ${id} not found for cleanup`);
      return;
    }

    // Only cleanup if in error state
    if (extension.state !== 'error') {
      console.log(`Extension ${id} is not in error state - skipping cleanup`);
      return;
    }

    console.log(`Cleaning up failed extension: ${id}`);

    try {
      // First try to disable if enabled
      if (extension.enabled) {
        try {
          await this.disableExtension(id);
        } catch (error) {
          console.warn(`Failed to disable extension ${id} during cleanup:`, error);
        }
      }

      // Remove extension files
      await this.removeExtensionFiles(extension);

      // Remove from registry
      this.extensions.delete(id);
      this.emit('extension:uninstalled', extension);
      await this.saveInstalledExtensions();

      // Reset health monitor for this extension
      extensionHealthMonitor.reset(id);

      console.log(`Successfully cleaned up extension: ${id}`);
    } catch (error) {
      console.error(`Failed to cleanup extension ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get health status for an extension
   */
  getExtensionHealth(id: string) {
    return extensionHealthMonitor.getHealth(id);
  }

  /**
   * Get overall health report
   */
  getHealthReport() {
    return extensionHealthMonitor.getHealthReport();
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.stopPeriodicCleanup();
    extensionHealthMonitor.stopMonitoring();
  }
}

// Export singleton instance
export const extensionManager = new ExtensionManager();
