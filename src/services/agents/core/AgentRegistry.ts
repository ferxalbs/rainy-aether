/**
 * Agent Registry
 *
 * Centralized registry for managing all agent instances in the application.
 * Provides a single source of truth for agent discovery, initialization, and lifecycle management.
 *
 * Features:
 * - Singleton pattern for global access
 * - Dynamic agent registration
 * - Lazy initialization
 * - Automatic cleanup
 * - Agent discovery and retrieval
 *
 * @example
 * ```typescript
 * import { agentRegistry } from './AgentRegistry';
 *
 * // Initialize registry (loads all agents)
 * await agentRegistry.initialize();
 *
 * // Get specific agent
 * const rainy = agentRegistry.get('rainy');
 *
 * // List all agents
 * const allAgents = agentRegistry.getAll();
 *
 * // Cleanup when done
 * await agentRegistry.dispose();
 * ```
 */

import type { AgentCore } from './AgentCore';

/**
 * Agent metadata for registration
 */
export interface AgentMetadata {
  /** Agent instance */
  agent: AgentCore;
  /** Whether agent is initialized */
  initialized: boolean;
  /** Initialization timestamp */
  registeredAt: number;
  /** Last used timestamp */
  lastUsedAt?: number;
}

/**
 * Agent Registry - Centralized agent management
 *
 * Manages the lifecycle of all agent instances in the application.
 * Uses singleton pattern to ensure only one registry exists.
 */
export class AgentRegistry {
  private static instance: AgentRegistry;

  /** Map of agent ID to agent metadata */
  private agents = new Map<string, AgentMetadata>();

  /** Whether registry has been initialized */
  private initialized = false;

  /** Initialization promise for preventing concurrent initialization */
  private initPromise?: Promise<void>;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('🏗️ AgentRegistry instance created');
  }

  /**
   * Get the singleton instance
   *
   * @returns The global AgentRegistry instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Initialize the registry and load all available agents
   *
   * This method dynamically imports and registers all agent implementations.
   * It's safe to call multiple times - subsequent calls are no-ops.
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.initialized) {
      console.log('✅ AgentRegistry already initialized');
      return;
    }

    console.log('🔄 Initializing AgentRegistry...');

    this.initPromise = this.performInitialization();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = undefined;
    }
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      // Import API key actions
      const { apiKeyActions } = await import('@/stores/apiKeyStore');

      // Initialize API key store to check for existing keys
      await apiKeyActions.initialize();

      // Dynamically import and register Rainy Agent
      const { RainyAgent } = await import('../rainy/RainyAgent');
      const rainy = new RainyAgent();
      this.register(rainy);

      // Dynamically import and register Claude Code Agent
      const { ClaudeAgent } = await import('../claude/ClaudeAgent');
      const claude = new ClaudeAgent();
      this.register(claude);

      // Dynamically import and register Abby Mode Agent
      const { AbbyAgent } = await import('../abby/AbbyAgent');
      const abby = new AbbyAgent();
      this.register(abby);

      this.initialized = true;
      console.log(
        `✅ AgentRegistry initialized with ${this.agents.size} agent(s)`
      );
    } catch (error) {
      console.error('❌ Failed to initialize AgentRegistry:', error);
      throw error;
    }
  }

  /**
   * Type guard to validate provider ID
   *
   * @param provider - Provider string to validate
   * @returns True if provider is valid
   */
  private isValidProvider(provider: string): provider is 'groq' | 'google' {
    return provider === 'groq' || provider === 'google';
  }

  /**
   * Initialize an agent with API keys
   *
   * This method initializes an agent by fetching its API key from secure storage.
   * It should be called before using an agent for the first time.
   *
   * @param agentId - Agent ID to initialize
   * @returns True if initialization succeeded
   */
  async initializeAgent(agentId: string): Promise<boolean> {
    const metadata = this.agents.get(agentId);
    if (!metadata) {
      console.error(`❌ Agent not found: ${agentId}`);
      return false;
    }

    // Skip if already initialized
    if (metadata.initialized) {
      console.log(`✅ Agent ${agentId} already initialized`);
      return true;
    }

    try {
      // Import API key actions
      const { apiKeyActions } = await import('@/stores/apiKeyStore');

      // Determine provider for this agent
      const agent = metadata.agent;
      const config = agent.getConfig();
      const rawProvider = config.provider;

      // Validate provider ID at runtime
      if (!this.isValidProvider(rawProvider)) {
        console.error(
          `❌ Invalid provider '${rawProvider}' for agent ${agentId}. ` +
          `Expected 'groq' or 'google'.`
        );
        return false;
      }

      // Now providerId is safely typed as 'groq' | 'google'
      const providerId = rawProvider;

      // Get API key for the provider
      const apiKey = await apiKeyActions.getKey(providerId);

      if (!apiKey) {
        console.warn(
          `⚠️ No API key found for ${providerId}. Agent ${agentId} not initialized.`
        );
        console.warn(
          `💡 Please configure your ${providerId === 'groq' ? 'Groq' : 'Google AI'} API key in Settings to use the ${agentId} agent.`
        );
        return false;
      }

      // Initialize the agent with the API key
      await agent.initialize({
        apiKey,
        workspaceRoot: undefined, // Will be set by session
        userId: undefined,
      });

      // Mark as initialized
      metadata.initialized = true;
      console.log(`✅ Agent ${agentId} initialized with ${providerId} provider`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Initialize all agents with their API keys
   *
   * Attempts to initialize all registered agents by fetching their API keys.
   *
   * @returns Number of successfully initialized agents
   */
  async initializeAllAgents(): Promise<number> {
    let initialized = 0;

    for (const agentId of this.agents.keys()) {
      const success = await this.initializeAgent(agentId);
      if (success) {
        initialized++;
      }
    }

    console.log(`✅ Initialized ${initialized}/${this.agents.size} agents`);
    return initialized;
  }

  /**
   * Register an agent instance
   *
   * @param agent - Agent instance to register
   * @throws Error if agent with same ID already exists
   */
  register(agent: AgentCore): void {
    if (this.agents.has(agent.id)) {
      console.warn(
        `⚠️ Agent '${agent.id}' already registered. Skipping registration.`
      );
      return;
    }

    const metadata: AgentMetadata = {
      agent,
      initialized: false,
      registeredAt: Date.now(),
    };

    this.agents.set(agent.id, metadata);
    console.log(`📝 Registered agent: ${agent.name} (${agent.id})`);
  }

  /**
   * Unregister an agent
   *
   * This will dispose the agent if it's initialized.
   *
   * @param agentId - ID of agent to unregister
   */
  async unregister(agentId: string): Promise<void> {
    const metadata = this.agents.get(agentId);
    if (!metadata) {
      console.warn(`⚠️ Agent '${agentId}' not found in registry`);
      return;
    }

    // Dispose agent if initialized
    if (metadata.initialized) {
      await metadata.agent.dispose();
    }

    this.agents.delete(agentId);
    console.log(`🗑️ Unregistered agent: ${agentId}`);
  }

  /**
   * Get an agent by ID
   *
   * @param agentId - Agent ID
   * @returns Agent instance or undefined if not found
   */
  get(agentId: string): AgentCore | undefined {
    const metadata = this.agents.get(agentId);
    if (!metadata) {
      return undefined;
    }

    // Update last used timestamp
    metadata.lastUsedAt = Date.now();

    return metadata.agent;
  }

  /**
   * Get an agent by ID or throw an error
   *
   * @param agentId - Agent ID
   * @returns Agent instance
   * @throws Error if agent not found
   */
  getOrThrow(agentId: string): AgentCore {
    const agent = this.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  /**
   * Get all registered agents
   *
   * @returns Array of all agent instances
   */
  getAll(): AgentCore[] {
    return Array.from(this.agents.values()).map((meta) => meta.agent);
  }

  /**
   * Get all agent IDs
   *
   * @returns Array of agent IDs
   */
  getAllIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if an agent is registered
   *
   * @param agentId - Agent ID
   * @returns True if agent is registered
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get registry statistics
   *
   * @returns Registry statistics
   */
  getStats() {
    const agents = Array.from(this.agents.values());

    return {
      totalAgents: agents.length,
      initializedAgents: agents.filter((a) => a.initialized).length,
      agentIds: Array.from(this.agents.keys()),
      oldestAgent: agents.reduce((oldest, current) => {
        return !oldest || current.registeredAt < oldest.registeredAt
          ? current
          : oldest;
      }, null as AgentMetadata | null),
      mostRecentlyUsed: agents.reduce((recent, current) => {
        if (!current.lastUsedAt) return recent;
        return !recent || (current.lastUsedAt ?? 0) > (recent.lastUsedAt ?? 0)
          ? current
          : recent;
      }, null as AgentMetadata | null),
    };
  }

  /**
   * Find agents by capability
   *
   * @param capability - Capability to search for
   * @returns Array of agents supporting the capability
   */
  findByCapability(capability: string): AgentCore[] {
    return this.getAll().filter((agent) => agent.hasCapability(capability));
  }

  /**
   * Get agent metadata
   *
   * @param agentId - Agent ID
   * @returns Agent metadata or undefined
   */
  getMetadata(agentId: string): AgentMetadata | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Mark an agent as initialized
   *
   * This should be called after agent.initialize() completes.
   *
   * @param agentId - Agent ID
   */
  markInitialized(agentId: string): void {
    const metadata = this.agents.get(agentId);
    if (metadata) {
      metadata.initialized = true;
    }
  }

  /**
   * Cleanup all agents and reset registry
   *
   * This will dispose all registered agents and clear the registry.
   * After calling dispose(), you need to call initialize() again to use the registry.
   */
  async dispose(): Promise<void> {
    console.log('🗑️ Disposing AgentRegistry...');

    // Dispose all agents
    const disposePromises = Array.from(this.agents.values()).map(
      async (metadata) => {
        try {
          if (metadata.initialized) {
            await metadata.agent.dispose();
          }
        } catch (error) {
          console.error(
            `Failed to dispose agent ${metadata.agent.id}:`,
            error
          );
        }
      }
    );

    await Promise.all(disposePromises);

    // Clear registry
    this.agents.clear();
    this.initialized = false;

    console.log('✅ AgentRegistry disposed');
  }

  /**
   * Check if registry is initialized
   *
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get count of registered agents
   *
   * @returns Number of registered agents
   */
  count(): number {
    return this.agents.size;
  }

  /**
   * Reset the registry (for testing purposes)
   *
   * This is a dangerous operation and should only be used in tests.
   */
  _reset(): void {
    this.agents.clear();
    this.initialized = false;
    this.initPromise = undefined;
    console.warn('⚠️ AgentRegistry has been reset (testing only)');
  }
}

/**
 * Global singleton instance of AgentRegistry
 *
 * Use this instance throughout the application for agent management.
 *
 * @example
 * ```typescript
 * import { agentRegistry } from '@/services/agents/core/AgentRegistry';
 *
 * // Initialize once at app startup
 * await agentRegistry.initialize();
 *
 * // Use anywhere in the app
 * const rainy = agentRegistry.get('rainy');
 * if (rainy) {
 *   await rainy.initialize({ apiKey: 'xxx' });
 *   const response = await rainy.sendMessage('Hello!');
 * }
 * ```
 */
export const agentRegistry = AgentRegistry.getInstance();
