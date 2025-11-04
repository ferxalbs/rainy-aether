/**
 * Provider Manager
 *
 * Central registry and orchestration service for AI providers.
 * Handles provider lifecycle, validation, and model discovery.
 */

import type { AIProvider, AIModel, ProviderInfo } from './providers/base';
import { GroqProvider } from './providers/groq';
import { CredentialService } from './credentialService';

/**
 * Provider status information
 */
export interface ProviderStatus {
  id: string;
  isConfigured: boolean;
  hasApiKey: boolean;
  isValidated: boolean;
  lastValidated?: number;
  error?: string;
}

/**
 * Manages registration and lifecycle of AI providers
 */
export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, AIProvider> = new Map();
  private credentialService: CredentialService;
  private validationCache: Map<string, { validated: boolean; timestamp: number }> = new Map();
  private readonly VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.credentialService = CredentialService.getInstance();
    this.registerBuiltInProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  /**
   * Register built-in providers
   */
  private registerBuiltInProviders(): void {
    this.registerProvider(new GroqProvider());
    // Future providers will be registered here:
    // this.registerProvider(new OpenAIProvider());
    // this.registerProvider(new AnthropicProvider());
    // this.registerProvider(new RainyAPIProvider());
  }

  /**
   * Register a new provider
   */
  registerProvider(provider: AIProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider ${provider.id} is already registered, replacing...`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(providerId: string): AIProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  listProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider information for all providers
   */
  getProviderInfoList(): ProviderInfo[] {
    return this.listProviders().map((p) => p.getInfo());
  }

  /**
   * Get all available models across all providers
   */
  async getAllModels(): Promise<Map<string, AIModel[]>> {
    const modelMap = new Map<string, AIModel[]>();

    for (const provider of this.providers.values()) {
      try {
        const models = await provider.listModels();
        modelMap.set(provider.id, models);
      } catch (error) {
        console.error(`Failed to list models for ${provider.id}:`, error);
        modelMap.set(provider.id, []);
      }
    }

    return modelMap;
  }

  /**
   * Get models for a specific provider
   */
  async getModelsForProvider(providerId: string): Promise<AIModel[]> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return await provider.listModels();
  }

  /**
   * Find a model by ID across all providers
   */
  async findModel(modelId: string): Promise<{ provider: AIProvider; model: AIModel } | null> {
    for (const provider of this.providers.values()) {
      const model = provider.getModel(modelId);
      if (model) {
        return { provider, model };
      }
    }
    return null;
  }

  /**
   * Validate a provider's API key
   */
  async validateProvider(providerId: string, apiKey: string): Promise<boolean> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      const isValid = await provider.validateApiKey(apiKey);

      // Update validation cache
      this.validationCache.set(providerId, {
        validated: isValid,
        timestamp: Date.now(),
      });

      return isValid;
    } catch (error) {
      console.error(`Validation failed for ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Get provider status (configured, validated, etc.)
   */
  async getProviderStatus(providerId: string): Promise<ProviderStatus> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const hasApiKey = await this.credentialService.hasCredential(providerId);
    const cached = this.validationCache.get(providerId);
    const isCacheValid = cached && Date.now() - cached.timestamp < this.VALIDATION_CACHE_TTL;

    return {
      id: providerId,
      isConfigured: hasApiKey,
      hasApiKey,
      isValidated: isCacheValid ? cached.validated : false,
      lastValidated: cached?.timestamp,
    };
  }

  /**
   * Get status for all providers
   */
  async getAllProviderStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const provider of this.providers.values()) {
      try {
        const status = await this.getProviderStatus(provider.id);
        statuses.push(status);
      } catch (error) {
        console.error(`Failed to get status for ${provider.id}:`, error);
      }
    }

    return statuses;
  }

  /**
   * Setup a provider with an API key
   */
  async setupProvider(providerId: string, apiKey: string): Promise<boolean> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Validate the API key first
    const isValid = await this.validateProvider(providerId, apiKey);
    if (!isValid) {
      throw new Error('Invalid API key');
    }

    // Store the credential securely
    await this.credentialService.storeCredential(providerId, apiKey);

    return true;
  }

  /**
   * Remove provider configuration
   */
  async removeProviderConfig(providerId: string): Promise<void> {
    await this.credentialService.deleteCredential(providerId);
    this.validationCache.delete(providerId);
  }

  /**
   * Get configured providers (those with API keys)
   */
  async getConfiguredProviders(): Promise<AIProvider[]> {
    const configured: AIProvider[] = [];

    for (const provider of this.providers.values()) {
      const hasKey = await this.credentialService.hasCredential(provider.id);
      if (hasKey) {
        configured.push(provider);
      }
    }

    return configured;
  }

  /**
   * Check if any provider is configured
   */
  async hasAnyConfiguredProvider(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      const hasKey = await this.credentialService.hasCredential(provider.id);
      if (hasKey) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the default provider (first configured provider or first provider)
   */
  async getDefaultProvider(): Promise<AIProvider | null> {
    // Try to get the first configured provider
    const configured = await this.getConfiguredProviders();
    if (configured.length > 0) {
      return configured[0];
    }

    // Fall back to first registered provider
    const all = this.listProviders();
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(providerId?: string): void {
    if (providerId) {
      this.validationCache.delete(providerId);
    } else {
      this.validationCache.clear();
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<{
    total: number;
    configured: number;
    validated: number;
  }> {
    const statuses = await this.getAllProviderStatuses();

    return {
      total: statuses.length,
      configured: statuses.filter((s) => s.isConfigured).length,
      validated: statuses.filter((s) => s.isValidated).length,
    };
  }
}

/**
 * Get singleton instance of ProviderManager
 */
export function getProviderManager(): ProviderManager {
  return ProviderManager.getInstance();
}
