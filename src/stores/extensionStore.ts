import { useSyncExternalStore } from 'react';
import { extensionManager } from '../services/extensionManager';
import { InstalledExtension, OpenVSXExtension } from '../types/extension';

// Extension Store State
interface ExtensionStoreState {
  installedExtensions: InstalledExtension[];
  marketplaceSearchResults: OpenVSXExtension[];
  isSearching: boolean;
  searchError: string | null;
  isInstalling: boolean;
  installingExtension: string | null;
}

// Store Actions
interface ExtensionStoreActions {
  // Marketplace actions
  searchExtensions: (query: string, category?: string) => Promise<void>;
  clearSearchResults: () => void;

  // Installation actions
  installExtension: (publisher: string, name: string, version?: string) => Promise<void>;
  uninstallExtension: (id: string) => Promise<void>;
  enableExtension: (id: string) => Promise<void>;
  disableExtension: (id: string) => Promise<void>;

  // Utility actions
  checkExtensionCompatibility: (publisher: string, name: string) => Promise<{ canInstall: boolean; reason?: string }>;
  refreshExtensions: () => void;
}

// Combined Store Type
type ExtensionStore = ExtensionStoreState & ExtensionStoreActions;

// Internal store state
let storeState: ExtensionStoreState = {
  installedExtensions: [],
  marketplaceSearchResults: [],
  isSearching: false,
  searchError: null,
  isInstalling: false,
  installingExtension: null
};

// Store subscribers
const subscribers = new Set<() => void>();

// Notify subscribers
function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

// Update state and notify
function updateState(updates: Partial<ExtensionStoreState>) {
  storeState = { ...storeState, ...updates };
  notifySubscribers();
}

// Get current state snapshot
function getSnapshot(): ExtensionStoreState {
  return { ...storeState };
}

// Subscribe to state changes
function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// Initialize store with current extensions
function initializeStore() {
  const extensions = extensionManager.getInstalledExtensions();
  updateState({ installedExtensions: extensions });

  // Listen to extension manager events
  extensionManager.on('extension:installing', (_extension) => {
    updateState({
      isInstalling: true,
      installingExtension: _extension.id,
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:installed', (_extension) => {
    updateState({
      isInstalling: false,
      installingExtension: null,
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:enabling', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:enabled', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:disabling', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:disabled', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:uninstalling', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:uninstalled', (_extension) => {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });

  extensionManager.on('extension:error', (_extension, _error) => {
    updateState({
      isInstalling: false,
      installingExtension: null,
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  });
}

// Initialize the store
initializeStore();

// Store actions implementation
const storeActions: ExtensionStoreActions = {
  async searchExtensions(query: string, category?: string) {
    updateState({ isSearching: true, searchError: null });

    try {
      const { openVSXRegistry } = await import('../services/openVSXRegistry');
      const results = await openVSXRegistry.searchExtensions(query, {
        category,
        limit: 50
      });

      updateState({
        marketplaceSearchResults: results,
        isSearching: false
      });
    } catch (error) {
      updateState({
        searchError: error instanceof Error ? error.message : 'Search failed',
        isSearching: false,
        marketplaceSearchResults: []
      });
    }
  },

  clearSearchResults() {
    updateState({
      marketplaceSearchResults: [],
      searchError: null
    });
  },

  async installExtension(publisher: string, name: string, version?: string) {
    try {
      await extensionManager.installExtension(publisher, name, { version });
    } catch (error) {
      console.error('Failed to install extension:', error);
      throw error;
    }
  },

  async uninstallExtension(id: string) {
    try {
      await extensionManager.uninstallExtension(id);
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
      throw error;
    }
  },

  async enableExtension(id: string) {
    try {
      await extensionManager.enableExtension(id);
    } catch (error) {
      console.error('Failed to enable extension:', error);
      throw error;
    }
  },

  async disableExtension(id: string) {
    try {
      await extensionManager.disableExtension(id);
    } catch (error) {
      console.error('Failed to disable extension:', error);
      throw error;
    }
  },

  async checkExtensionCompatibility(publisher: string, name: string) {
    return await extensionManager.canInstallExtension(publisher, name);
  },

  refreshExtensions() {
    updateState({
      installedExtensions: extensionManager.getInstalledExtensions()
    });
  }
};

// Create the store hook
export function useExtensionStore(): ExtensionStore {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { ...state, ...storeActions };
}

// Export individual hooks for specific state
export function useInstalledExtensions() {
  return useSyncExternalStore(subscribe, () => getSnapshot().installedExtensions);
}

export function useMarketplaceSearch() {
  const state = useSyncExternalStore(subscribe, () => ({
    results: getSnapshot().marketplaceSearchResults,
    isSearching: getSnapshot().isSearching,
    error: getSnapshot().searchError
  }));

  return {
    ...state,
    searchExtensions: storeActions.searchExtensions,
    clearSearchResults: storeActions.clearSearchResults
  };
}

export function useExtensionInstallation() {
  const state = useSyncExternalStore(subscribe, () => ({
    isInstalling: getSnapshot().isInstalling,
    installingExtension: getSnapshot().installingExtension
  }));

  return {
    ...state,
    installExtension: storeActions.installExtension,
    uninstallExtension: storeActions.uninstallExtension,
    enableExtension: storeActions.enableExtension,
    disableExtension: storeActions.disableExtension
  };
}
