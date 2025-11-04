/**
 * Credential Service
 *
 * Manages secure storage and retrieval of AI provider API keys.
 * Uses Tauri commands to interact with OS-level keychain storage.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Service for managing API credentials securely
 *
 * @example
 * ```ts
 * const service = CredentialService.getInstance();
 *
 * // Store a credential
 * await service.storeCredential('groq', 'gsk_...');
 *
 * // Retrieve a credential
 * const apiKey = await service.getCredential('groq');
 *
 * // Check if credential exists
 * const hasKey = await service.hasCredential('groq');
 *
 * // Delete a credential
 * await service.deleteCredential('groq');
 * ```
 */
export class CredentialService {
  private static instance: CredentialService;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance of CredentialService
   */
  static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  /**
   * Store an API key securely in the OS keychain
   *
   * @param providerId - Unique provider identifier (e.g., "groq", "openai")
   * @param apiKey - The API key to store
   * @throws Error if storage fails
   */
  async storeCredential(providerId: string, apiKey: string): Promise<void> {
    if (!providerId || !apiKey) {
      throw new Error('Provider ID and API key are required');
    }

    try {
      await invoke('agent_store_credential', { providerId, apiKey });
    } catch (error) {
      throw new Error(`Failed to store credential: ${error}`);
    }
  }

  /**
   * Retrieve an API key from the OS keychain
   *
   * @param providerId - Unique provider identifier
   * @returns The stored API key
   * @throws Error if credential not found or retrieval fails
   */
  async getCredential(providerId: string): Promise<string> {
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    try {
      return await invoke<string>('agent_get_credential', { providerId });
    } catch (error) {
      throw new Error(`Failed to retrieve credential: ${error}`);
    }
  }

  /**
   * Delete a stored credential from the OS keychain
   *
   * @param providerId - Unique provider identifier
   * @throws Error if deletion fails
   */
  async deleteCredential(providerId: string): Promise<void> {
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    try {
      await invoke('agent_delete_credential', { providerId });
    } catch (error) {
      throw new Error(`Failed to delete credential: ${error}`);
    }
  }

  /**
   * Check if a credential exists for a provider
   *
   * @param providerId - Unique provider identifier
   * @returns true if credential exists, false otherwise
   */
  async hasCredential(providerId: string): Promise<boolean> {
    if (!providerId) {
      return false;
    }

    try {
      return await invoke<boolean>('agent_has_credential', { providerId });
    } catch (error) {
      console.error('Failed to check credential:', error);
      return false;
    }
  }

  /**
   * Update an existing credential or create a new one
   *
   * This is a convenience method that combines delete + store.
   *
   * @param providerId - Unique provider identifier
   * @param apiKey - The new API key to store
   */
  async updateCredential(providerId: string, apiKey: string): Promise<void> {
    // Delete old credential if it exists (ignore errors)
    try {
      await this.deleteCredential(providerId);
    } catch {
      // Ignore deletion errors
    }

    // Store new credential
    await this.storeCredential(providerId, apiKey);
  }

  /**
   * Validate a credential by checking if it can be retrieved
   *
   * Note: This only validates that the credential exists and can be accessed,
   * not that it's a valid API key for the provider.
   *
   * @param providerId - Unique provider identifier
   * @returns true if credential is accessible, false otherwise
   */
  async validateCredentialExists(providerId: string): Promise<boolean> {
    try {
      await this.getCredential(providerId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a masked version of the API key for display
   *
   * Shows only the first and last few characters, masking the middle.
   *
   * @param apiKey - The API key to mask
   * @param visibleChars - Number of characters to show at start and end (default: 4)
   * @returns Masked API key (e.g., "gsk_1234...7890")
   */
  maskApiKey(apiKey: string, visibleChars: number = 4): string {
    if (!apiKey || apiKey.length <= visibleChars * 2) {
      return '***';
    }

    const start = apiKey.slice(0, visibleChars);
    const end = apiKey.slice(-visibleChars);
    return `${start}...${end}`;
  }

  /**
   * Validate API key format (basic checks)
   *
   * This performs basic format validation before storing.
   * Provider-specific validation should be done separately.
   *
   * @param apiKey - The API key to validate
   * @returns true if format looks valid, false otherwise
   */
  validateApiKeyFormat(apiKey: string): boolean {
    // Basic checks
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Remove whitespace
    const trimmed = apiKey.trim();

    // Check minimum length (most API keys are at least 20 chars)
    if (trimmed.length < 20) {
      return false;
    }

    // Check for suspicious characters (only alphanumeric, dash, underscore)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(trimmed);
  }
}

/**
 * Get singleton instance of CredentialService
 * Convenience function for imports
 */
export function getCredentialService(): CredentialService {
  return CredentialService.getInstance();
}
