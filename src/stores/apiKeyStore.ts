/**
 * API Key Store
 *
 * Manages API keys for AI providers (Google, Groq) using secure OS keychain storage.
 * Keys are stored via Rust credential manager for maximum security.
 *
 * Features:
 * - Secure storage via OS keychain
 * - React hooks for UI integration
 * - Automatic validation
 * - Provider-specific management
 *
 * @example
 * ```typescript
 * import { useApiKeys, apiKeyActions } from '@/stores/apiKeyStore';
 *
 * // In a component
 * function MyComponent() {
 *   const apiKeys = useApiKeys();
 *
 *   const handleSave = async () => {
 *     await apiKeyActions.setKey('groq', 'gsk_...');
 *   };
 * }
 * ```
 */

import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Supported AI providers
 */
export type ProviderId = 'groq' | 'google';

/**
 * API key status
 */
export interface ApiKeyStatus {
  /** Provider ID */
  provider: ProviderId;

  /** Whether key is configured */
  configured: boolean;

  /** When key was last updated (timestamp) */
  lastUpdated?: number;

  /** Key prefix for display (e.g., "sk-***") */
  keyPrefix?: string;
}

/**
 * API keys state
 */
interface ApiKeysState {
  /** Status per provider */
  status: Record<ProviderId, ApiKeyStatus>;

  /** Whether store is initialized */
  initialized: boolean;

  /** Loading state */
  loading: boolean;

  /** Error message if any */
  error?: string;
}

// Initial state
let state: ApiKeysState = {
  status: {
    groq: { provider: 'groq', configured: false },
    google: { provider: 'google', configured: false },
  },
  initialized: false,
  loading: false,
};

// Subscribers for React integration
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * API Key Actions
 */
export const apiKeyActions = {
  /**
   * Initialize the store
   *
   * Checks which providers have configured keys.
   */
  async initialize() {
    if (state.initialized) return;

    state = { ...state, loading: true, error: undefined };
    notifyListeners();

    try {
      // Check each provider
      for (const provider of ['groq', 'google'] as ProviderId[]) {
        const hasKey = await invoke<boolean>('agent_has_credential', {
          providerId: provider,
        });

        // Initialize with basic status
        state.status[provider] = {
          provider,
          configured: false,
          lastUpdated: undefined,
        };

        // If key exists, try to retrieve it
        if (hasKey) {
          try {
            const key = await invoke<string>('agent_get_credential', {
              providerId: provider,
            });

            // Only mark as configured and set lastUpdated if retrieval succeeds
            state.status[provider] = {
              provider,
              configured: true,
              lastUpdated: Date.now(),
              keyPrefix: this.getKeyPrefix(key),
            };
          } catch (error) {
            console.error(`Failed to get key for ${provider}:`, error);
            // Key exists but couldn't be retrieved - mark as not configured
            state.status[provider] = {
              provider,
              configured: false,
              lastUpdated: undefined,
            };
          }
        }
      }

      state = { ...state, initialized: true, loading: false };
      notifyListeners();

      console.log('✅ API key store initialized');
    } catch (error) {
      state = {
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      notifyListeners();

      console.error('❌ Failed to initialize API key store:', error);
    }
  },

  /**
   * Set API key for a provider
   *
   * @param provider - Provider ID
   * @param apiKey - API key to store
   */
  async setKey(provider: ProviderId, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key cannot be empty');
    }

    try {
      // Store key securely
      await invoke('agent_store_credential', {
        providerId: provider,
        apiKey: apiKey.trim(),
      });

      // Update state
      state.status[provider] = {
        provider,
        configured: true,
        lastUpdated: Date.now(),
        keyPrefix: this.getKeyPrefix(apiKey),
      };

      state = { ...state, error: undefined };
      notifyListeners();

      console.log(`✅ API key stored for ${provider}`);
    } catch (error) {
      console.error(`❌ Failed to store API key for ${provider}:`, error);
      throw error;
    }
  },

  /**
   * Get API key for a provider
   *
   * @param provider - Provider ID
   * @returns API key or null if not configured
   */
  async getKey(provider: ProviderId): Promise<string | null> {
    try {
      const key = await invoke<string>('agent_get_credential', {
        providerId: provider,
      });
      return key;
    } catch (error) {
      console.error(`Failed to get API key for ${provider}:`, error);
      return null;
    }
  },

  /**
   * Delete API key for a provider
   *
   * @param provider - Provider ID
   */
  async deleteKey(provider: ProviderId): Promise<void> {
    try {
      await invoke('agent_delete_credential', {
        providerId: provider,
      });

      // Update state
      state.status[provider] = {
        provider,
        configured: false,
        lastUpdated: undefined,
        keyPrefix: undefined,
      };

      state = { ...state, error: undefined };
      notifyListeners();

      console.log(`✅ API key deleted for ${provider}`);
    } catch (error) {
      console.error(`❌ Failed to delete API key for ${provider}:`, error);
      throw error;
    }
  },

  /**
   * Check if provider has a configured key
   *
   * @param provider - Provider ID
   * @returns True if key is configured
   */
  hasKey(provider: ProviderId): boolean {
    return state.status[provider]?.configured || false;
  },

  /**
   * Check if all providers have configured keys
   *
   * @returns True if all providers are configured
   */
  allConfigured(): boolean {
    return Object.values(state.status).every((s) => s.configured);
  },

  /**
   * Get missing providers (those without keys)
   *
   * @returns Array of provider IDs without keys
   */
  getMissingProviders(): ProviderId[] {
    return Object.keys(state.status).filter(
      (provider) => !state.status[provider as ProviderId].configured
    ) as ProviderId[];
  },

  /**
   * Get key prefix for display (e.g., "sk-***" or "gsk_***")
   *
   * @param key - Full API key
   * @returns Safe prefix for display
   */
  getKeyPrefix(key: string): string {
    if (key.length <= 8) return '***';

    // Show first few characters
    const prefix = key.slice(0, Math.min(8, key.length));
    return `${prefix}***`;
  },
};

/**
 * React hook for API keys state
 *
 * @returns Current API keys state
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const apiKeys = useApiKeys();
 *
 *   return (
 *     <div>
 *       {apiKeys.status.groq.configured ? 'Groq configured' : 'Groq missing'}
 *       {apiKeys.status.google.configured ? 'Google configured' : 'Google missing'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiKeys() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

/**
 * React hook for provider status
 *
 * @param provider - Provider ID
 * @returns Provider status
 */
export function useProviderStatus(provider: ProviderId) {
  const state = useApiKeys();
  return state.status[provider];
}
