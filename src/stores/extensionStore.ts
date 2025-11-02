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

let cachedSnapshot: ExtensionStoreState = { ...storeState };

// Store subscribers
const subscribers = new Set<() => void>();

// Notify subscribers
function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

// Cached snapshots for derived hooks (declared early)
let cachedInstalledExtensions: InstalledExtension[] = [];
let cachedMarketplaceSnapshot: { results: OpenVSXExtension[]; isSearching: boolean; error: string | null } = { 
  results: [], 
  isSearching: false, 
  error: null 
};
let cachedInstallationSnapshot: { isInstalling: boolean; installingExtension: string | null } = { 
  isInstalling: false, 
  installingExtension: null 
};

// Update derived snapshots when main state changes
function updateDerivedSnapshots() {
  cachedInstalledExtensions = cachedSnapshot.installedExtensions;
  cachedMarketplaceSnapshot = {
    results: cachedSnapshot.marketplaceSearchResults,
    isSearching: cachedSnapshot.isSearching,
    error: cachedSnapshot.searchError
  };
  cachedInstallationSnapshot = {
    isInstalling: cachedSnapshot.isInstalling,
    installingExtension: cachedSnapshot.installingExtension
  };
}

// Update state and notify
function updateState(updates: Partial<ExtensionStoreState>) {
  storeState = { ...storeState, ...updates };
  cachedSnapshot = storeState;
  updateDerivedSnapshots();
  notifySubscribers();
}

// Get current state snapshot
function getSnapshot(): ExtensionStoreState {
  return cachedSnapshot;
}

// Subscribe to state changes
function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// Initialize store with current extensions
async function initializeStore() {
  const extensions = await extensionManager.getInstalledExtensions();
  updateState({ installedExtensions: extensions });

  // Helper to refresh extensions list
  const refreshExtensions = async () => {
    const extensions = await extensionManager.getInstalledExtensions();
    updateState({ installedExtensions: extensions });
  };

  // Listen to extension manager events
  extensionManager.on('extension:installing', async (_extension) => {
    const extensions = await extensionManager.getInstalledExtensions();
    updateState({
      isInstalling: true,
      installingExtension: _extension.id,
      installedExtensions: extensions
    });
  });

  extensionManager.on('extension:installed', async (_extension) => {
    const extensions = await extensionManager.getInstalledExtensions();
    updateState({
      isInstalling: false,
      installingExtension: null,
      installedExtensions: extensions
    });
  });

  extensionManager.on('extension:enabling', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:enabled', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:disabling', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:disabled', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:uninstalling', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:uninstalled', async (_extension) => {
    await refreshExtensions();
  });

  extensionManager.on('extension:error', async (_extension, _error) => {
    const extensions = await extensionManager.getInstalledExtensions();
    updateState({
      isInstalling: false,
      installingExtension: null,
      installedExtensions: extensions
    });
  });
}

// Initialize the store
initializeStore().catch(error => {
  console.error('Failed to initialize extension store:', error);
});

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

  async refreshExtensions() {
    const extensions = await extensionManager.getInstalledExtensions();
    updateState({
      installedExtensions: extensions
    });
  }
};

// Initialize derived snapshots
updateDerivedSnapshots();

// Create the store hook
export function useExtensionStore(): ExtensionStore {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { ...state, ...storeActions };
}

// Export individual hooks for specific state
export function useInstalledExtensions() {
  return useSyncExternalStore(subscribe, () => cachedInstalledExtensions);
}

export function useMarketplaceSearch() {
  const state = useSyncExternalStore(subscribe, () => cachedMarketplaceSnapshot);

  return {
    ...state,
    searchExtensions: storeActions.searchExtensions,
    clearSearchResults: storeActions.clearSearchResults
  };
}

export function useExtensionInstallation() {
  const state = useSyncExternalStore(subscribe, () => cachedInstallationSnapshot);

  return {
    ...state,
    installExtension: storeActions.installExtension,
    uninstallExtension: storeActions.uninstallExtension,
    enableExtension: storeActions.enableExtension,
    disableExtension: storeActions.disableExtension
  };
}
