/**
 * Agent Router
 *
 * Intelligent routing system for directing user messages to the most appropriate agent.
 * Supports multiple routing strategies including explicit selection, capability-based routing,
 * and load balancing.
 *
 * Features:
 * - Explicit agent selection
 * - Capability-based routing
 * - Load balancing across agents
 * - Fallback strategies
 * - Active request tracking
 * - Performance metrics
 *
 * @example
 * ```typescript
 * import { agentRouter } from './AgentRouter';
 *
 * // Explicit agent selection
 * const response = await agentRouter.route({
 *   message: 'Hello!',
 *   agentId: 'rainy',
 * });
 *
 * // Capability-based routing
 * const response = await agentRouter.route({
 *   message: 'Refactor this code',
 *   capabilities: ['code-analysis', 'refactoring'],
 * });
 *
 * // Auto-routing (load balancing)
 * const response = await agentRouter.route({
 *   message: 'Help me debug this',
 * });
 * ```
 */

import type { AgentCore } from './AgentCore';
import type { MessageOptions, StreamChunk } from './AgentCore';
import { AgentRegistry } from './AgentRegistry';
import type { AgentResult } from '@/types/rustAgent';

/**
 * Route request configuration
 */
export interface RouteRequest {
  /** User message to route */
  message: string;

  /** Explicit agent ID (overrides other strategies) */
  agentId?: string;

  /** Required capabilities for agent selection */
  capabilities?: string[];

  /** Message options passed to agent */
  options?: MessageOptions;

  /** Routing strategy to use */
  strategy?: RouteStrategy;
}

/**
 * Routing strategy types
 */
export type RouteStrategy =
  | 'explicit' // Use agentId
  | 'capability' // Match by capabilities
  | 'load-balance' // Balance load across agents
  | 'fallback'; // Use default agent

/**
 * Routing statistics
 */
export interface RouterStats {
  /** Total number of agents */
  totalAgents: number;

  /** Currently active requests */
  activeRequests: number;

  /** Load per agent */
  agentLoads: Record<string, number>;

  /** Total requests routed */
  totalRouted: number;

  /** Requests per agent */
  requestsPerAgent: Record<string, number>;

  /** Average routing time (ms) */
  averageRoutingTime: number;
}

/**
 * Route result with metadata
 */
export interface RouteResult extends AgentResult {
  /** ID of agent that handled the request */
  agentId: string;

  /** Routing strategy used */
  strategy: RouteStrategy;

  /** Time spent routing (ms) */
  routingTimeMs: number;
}

/**
 * Stream route result with metadata
 */
export interface StreamRouteResult extends StreamChunk {
  /** ID of agent that handled the request */
  agentId: string;

  /** Routing strategy used */
  strategy: RouteStrategy;
}

/**
 * Agent Router - Intelligent message routing
 *
 * Routes user messages to the most appropriate agent based on:
 * 1. Explicit agent ID (highest priority)
 * 2. Required capabilities
 * 3. Load balancing
 * 4. Fallback to default agent
 */
export class AgentRouter {
  /** Active request count per agent */
  private activeRequests = new Map<string, number>();

  /** Total requests routed per agent */
  private totalRequests = new Map<string, number>();

  /** Total requests routed overall */
  private routedCount = 0;

  /** Routing time tracking */
  private routingTimes: number[] = [];

  /** Default agent ID */
  private defaultAgentId = 'rainy';

  /**
   * Create a new agent router
   *
   * @param registry - Agent registry instance
   */
  constructor(private registry: AgentRegistry) {
    console.log('🚦 AgentRouter initialized');
  }

  /**
   * Route a message to the appropriate agent
   *
   * @param request - Route request configuration
   * @returns Route result with agent response
   */
  async route(request: RouteRequest): Promise<RouteResult> {
    const startTime = Date.now();

    try {
      // Ensure registry is initialized
      if (!this.registry.isInitialized()) {
        await this.registry.initialize();
      }

      // Select agent based on strategy
      const agent = this.selectAgent(request);
      const strategy = this.determineStrategy(request);

      console.log(
        `🚦 Routing to ${agent.name} (${agent.id}) using ${strategy} strategy`
      );

      // Track active request
      this.incrementActive(agent.id);

      try {
        // Execute via selected agent
        const result = await agent.sendMessage(request.message, request.options);

        // Track completed request
        this.incrementTotal(agent.id);
        this.routedCount++;

        const routingTime = Date.now() - startTime;
        this.trackRoutingTime(routingTime);

        return {
          ...result,
          agentId: agent.id,
          strategy,
          routingTimeMs: routingTime,
        };
      } finally {
        // Always decrement active count
        this.decrementActive(agent.id);
      }
    } catch (error) {
      console.error('❌ Routing failed:', error);
      throw error;
    }
  }

  /**
   * Stream a message to the appropriate agent (real-time streaming)
   *
   * Provides real-time token-by-token streaming of agent responses.
   * Yields chunks as they are generated, allowing for immediate UI updates.
   *
   * @param request - Route request configuration
   * @yields Stream chunks with agent ID and strategy metadata
   */
  async *streamRoute(
    request: RouteRequest
  ): AsyncGenerator<StreamRouteResult, void, unknown> {
    const startTime = Date.now();

    try {
      // Ensure registry is initialized
      if (!this.registry.isInitialized()) {
        await this.registry.initialize();
      }

      // Select agent based on strategy
      const agent = this.selectAgent(request);
      const strategy = this.determineStrategy(request);

      console.log(
        `🚦 Streaming to ${agent.name} (${agent.id}) using ${strategy} strategy`
      );

      // Track active request
      this.incrementActive(agent.id);

      try {
        // Stream via selected agent
        for await (const chunk of agent.streamMessage(
          request.message,
          request.options
        )) {
          yield {
            ...chunk,
            agentId: agent.id,
            strategy,
          };

          // If this is the final chunk, track completion
          if (chunk.done) {
            this.incrementTotal(agent.id);
            this.routedCount++;
            this.trackRoutingTime(Date.now() - startTime);
          }
        }
      } finally {
        // Always decrement active count
        this.decrementActive(agent.id);
      }
    } catch (error) {
      console.error('❌ Streaming failed:', error);
      throw error;
    }
  }

  /**
   * Select the appropriate agent based on request
   *
   * @param request - Route request
   * @returns Selected agent
   */
  private selectAgent(request: RouteRequest): AgentCore {
    // Strategy 1: Explicit agent ID
    if (request.agentId) {
      return this.selectExplicit(request.agentId);
    }

    // Strategy 2: Capability-based routing
    if (request.capabilities?.length) {
      return this.selectByCapabilities(request.capabilities);
    }

    // Strategy 3: Use specified strategy
    if (request.strategy === 'load-balance') {
      return this.selectByLoadBalance();
    }

    // Strategy 4: Default (load balance)
    return this.selectByLoadBalance();
  }

  /**
   * Select agent by explicit ID
   *
   * @param agentId - Agent ID
   * @returns Agent instance
   * @throws Error if agent not found
   */
  private selectExplicit(agentId: string): AgentCore {
    const agent = this.registry.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  /**
   * Select agent by required capabilities
   *
   * Finds the first agent that supports all required capabilities.
   * If multiple agents match, selects the least loaded one.
   *
   * @param capabilities - Required capabilities
   * @returns Agent instance
   */
  private selectByCapabilities(capabilities: string[]): AgentCore {
    const agents = this.registry.getAll();
    const candidates: AgentCore[] = [];

    // Find all agents that support required capabilities
    for (const agent of agents) {
      const hasAll = capabilities.every((cap) => agent.hasCapability(cap));
      if (hasAll) {
        candidates.push(agent);
      }
    }

    if (candidates.length === 0) {
      console.warn(
        `⚠️ No agents found with capabilities: ${capabilities.join(', ')}`
      );
      console.warn(`⚠️ Falling back to default agent: ${this.defaultAgentId}`);
      return this.registry.getOrThrow(this.defaultAgentId);
    }

    // If multiple candidates, select least loaded
    if (candidates.length > 1) {
      return candidates.reduce((prev, current) => {
        const prevLoad = this.activeRequests.get(prev.id) || 0;
        const currentLoad = this.activeRequests.get(current.id) || 0;
        return currentLoad < prevLoad ? current : prev;
      });
    }

    return candidates[0];
  }

  /**
   * Select agent by load balancing
   *
   * Selects the agent with the least active requests.
   *
   * @returns Agent instance
   */
  private selectByLoadBalance(): AgentCore {
    const agents = this.registry.getAll();

    if (agents.length === 0) {
      throw new Error('No agents available');
    }

    // Find agent with minimum load
    let minLoad = Infinity;
    let selected: AgentCore | null = null;

    for (const agent of agents) {
      const load = this.activeRequests.get(agent.id) || 0;
      if (load < minLoad) {
        minLoad = load;
        selected = agent;
      }
    }

    return selected || agents[0];
  }

  /**
   * Determine which routing strategy was used
   *
   * @param request - Route request
   * @returns Strategy name
   */
  private determineStrategy(request: RouteRequest): RouteStrategy {
    if (request.agentId) return 'explicit';
    if (request.capabilities?.length) return 'capability';
    if (request.strategy) return request.strategy;
    return 'load-balance';
  }

  /**
   * Increment active request count for an agent
   *
   * @param agentId - Agent ID
   */
  private incrementActive(agentId: string): void {
    const current = this.activeRequests.get(agentId) || 0;
    this.activeRequests.set(agentId, current + 1);
  }

  /**
   * Decrement active request count for an agent
   *
   * @param agentId - Agent ID
   */
  private decrementActive(agentId: string): void {
    const current = this.activeRequests.get(agentId) || 0;
    this.activeRequests.set(agentId, Math.max(0, current - 1));
  }

  /**
   * Increment total request count for an agent
   *
   * @param agentId - Agent ID
   */
  private incrementTotal(agentId: string): void {
    const current = this.totalRequests.get(agentId) || 0;
    this.totalRequests.set(agentId, current + 1);
  }

  /**
   * Track routing time for statistics
   *
   * @param timeMs - Routing time in milliseconds
   */
  private trackRoutingTime(timeMs: number): void {
    this.routingTimes.push(timeMs);

    // Keep only last 100 samples
    if (this.routingTimes.length > 100) {
      this.routingTimes.shift();
    }
  }

  /**
   * Get routing statistics
   *
   * @returns Router statistics
   */
  getStats(): RouterStats {
    const agents = this.registry.getAll();

    const agentLoads: Record<string, number> = {};
    const requestsPerAgent: Record<string, number> = {};

    let totalActive = 0;

    for (const agent of agents) {
      const load = this.activeRequests.get(agent.id) || 0;
      const total = this.totalRequests.get(agent.id) || 0;

      agentLoads[agent.id] = load;
      requestsPerAgent[agent.id] = total;
      totalActive += load;
    }

    const avgRoutingTime =
      this.routingTimes.length > 0
        ? this.routingTimes.reduce((sum, time) => sum + time, 0) /
          this.routingTimes.length
        : 0;

    return {
      totalAgents: agents.length,
      activeRequests: totalActive,
      agentLoads,
      totalRouted: this.routedCount,
      requestsPerAgent,
      averageRoutingTime: Math.round(avgRoutingTime * 100) / 100,
    };
  }

  /**
   * Get load for a specific agent
   *
   * @param agentId - Agent ID
   * @returns Active request count
   */
  getAgentLoad(agentId: string): number {
    return this.activeRequests.get(agentId) || 0;
  }

  /**
   * Get total requests for a specific agent
   *
   * @param agentId - Agent ID
   * @returns Total request count
   */
  getAgentTotal(agentId: string): number {
    return this.totalRequests.get(agentId) || 0;
  }

  /**
   * Set default agent ID
   *
   * @param agentId - Agent ID to use as default
   */
  setDefaultAgent(agentId: string): void {
    if (!this.registry.has(agentId)) {
      throw new Error(`Cannot set default: Agent not found: ${agentId}`);
    }
    this.defaultAgentId = agentId;
    console.log(`🚦 Default agent set to: ${agentId}`);
  }

  /**
   * Get default agent ID
   *
   * @returns Default agent ID
   */
  getDefaultAgent(): string {
    return this.defaultAgentId;
  }

  /**
   * Reset statistics (for testing)
   */
  _resetStats(): void {
    this.activeRequests.clear();
    this.totalRequests.clear();
    this.routingTimes = [];
    this.routedCount = 0;
    console.warn('⚠️ Router statistics have been reset (testing only)');
  }
}

/**
 * Global singleton instance of AgentRouter
 *
 * Use this instance throughout the application for routing messages to agents.
 *
 * @example
 * ```typescript
 * import { agentRouter } from '@/services/agents/core/AgentRouter';
 *
 * // Route with explicit agent
 * const result = await agentRouter.route({
 *   message: 'Hello!',
 *   agentId: 'rainy',
 * });
 *
 * // Route by capability
 * const result = await agentRouter.route({
 *   message: 'Refactor this code',
 *   capabilities: ['refactoring'],
 * });
 *
 * // Get statistics
 * const stats = agentRouter.getStats();
 * console.log(`Active requests: ${stats.activeRequests}`);
 * ```
 */
export const agentRouter = new AgentRouter(AgentRegistry.getInstance());
