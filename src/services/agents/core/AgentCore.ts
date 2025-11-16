/**
 * AgentCore - Base class for all agents
 *
 * This abstract class provides the foundation for all agent implementations
 * in the Rainy Code IDE. It supports dual-mode operation:
 *
 * - **Fast Mode**: Direct Rust execution for quick responses (< 200ms)
 * - **Smart Mode**: LangGraph + Rust tools for advanced reasoning (< 500ms)
 *
 * Architecture:
 * 1. Each agent has both a Rust session and a LangGraph agent
 * 2. Rust session handles tool execution and memory
 * 3. LangGraph provides ReAct reasoning patterns
 * 4. Tools execute in Rust regardless of mode (via bridge)
 */

import type { CompiledGraph } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { getRustAgentOrchestrator } from '../../agent/rust/orchestrator';
import { rustBridge } from '../../agent/langgraph/rustBridge';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { createLangGraphChatModel } from '../../agent/langgraph/modelFactory';
import type {
  AgentConfig,
  AgentResult,
  AgentMetrics,
  MemoryStats,
} from '@/types/rustAgent';
import { createAgentConfig } from '@/types/rustAgent';

/**
 * Options for sending a message to an agent
 */
export interface MessageOptions {
  /** Whether to enable tool execution (default: true) */
  enableTools?: boolean;

  /** Use fast mode (Rust-only) vs smart mode (LangGraph) */
  fastMode?: boolean;

  /** Override temperature for this request */
  temperature?: number;

  /** Override max tokens for this request */
  maxTokens?: number;

  /** Maximum iterations for tool calling */
  maxIterations?: number;
}

/**
 * Options for initializing an agent
 */
export interface InitializeOptions {
  /** API key for the model provider */
  apiKey?: string;

  /** Workspace root directory */
  workspaceRoot?: string;

  /** User ID for session tracking */
  userId?: string;
}

/**
 * Abstract base class for all agents
 *
 * Agents must implement:
 * - id, name, description (readonly properties)
 * - initialize() method for setup
 *
 * Agents can optionally override:
 * - sendMessage() for custom message handling
 * - streamMessage() for custom streaming
 */
export abstract class AgentCore {
  /** Unique agent identifier (e.g., 'rainy', 'claude', 'abby') */
  abstract readonly id: string;

  /** Human-readable agent name */
  abstract readonly name: string;

  /** Brief description of agent capabilities */
  abstract readonly description: string;

  /** LangGraph agent instance (for smart mode) */
  protected langGraphAgent?: CompiledGraph;

  /** Rust session ID (for fast mode and tool execution) */
  protected rustSessionId?: string;

  /** Agent configuration */
  protected config: AgentConfig;

  /** Initialization options */
  protected initOptions?: InitializeOptions;

  /**
   * Create a new agent instance
   *
   * @param config - Agent configuration
   */
  constructor(config: Partial<AgentConfig> = {}) {
    this.config = createAgentConfig(config);
  }

  /**
   * Initialize the agent
   *
   * This method must be called before using the agent. It:
   * 1. Creates a Rust backend session
   * 2. Initializes the Rust tool bridge
   * 3. Creates a LangGraph agent with Rust-backed tools
   *
   * @param options - Initialization options
   */
  async initialize(options?: InitializeOptions): Promise<void> {
    this.initOptions = options;

    console.log(`🤖 Initializing ${this.name}...`);

    const orchestrator = getRustAgentOrchestrator();

    try {
      // Create Rust session
      this.rustSessionId = await orchestrator.createSession(this.id, this.config);
      console.log(`✅ Rust session created: ${this.rustSessionId}`);

      // Initialize Rust bridge (idempotent)
      await rustBridge.initialize();
      console.log(`✅ Rust tool bridge initialized`);

      // Create LangGraph agent with Rust tools
      await this.initializeLangGraph(options);
      console.log(`✅ LangGraph agent initialized`);

      console.log(`✅ ${this.name} fully initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize LangGraph agent
   *
   * Can be overridden by subclasses for custom LangGraph setup.
   *
   * @param options - Initialization options
   */
  protected async initializeLangGraph(options?: InitializeOptions): Promise<void> {
    // Get all Rust-backed tools
    const tools = rustBridge.getAllTools();

    // Create model
    const model = createLangGraphChatModel({
      providerId: this.config.provider,
      modelId: this.config.model,
      apiKey: options?.apiKey || '',
      config: {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      },
    });

    // Create ReAct agent with Rust tools
    this.langGraphAgent = createReactAgent({
      llm: model,
      tools,
      checkpointSaver: new MemorySaver(),
      stateModifier: this.config.systemPrompt,
    });
  }

  /**
   * Send a message to the agent
   *
   * This method automatically routes to either fast or smart mode based on options.
   *
   * @param message - User message
   * @param options - Message options
   * @returns Agent response
   */
  async sendMessage(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResult> {
    if (!this.rustSessionId) {
      throw new Error(`${this.name} not initialized. Call initialize() first.`);
    }

    // Route based on mode
    if (options?.fastMode) {
      return this.sendViaRust(message, options);
    } else {
      return this.sendViaLangGraph(message, options);
    }
  }

  /**
   * Send message via Rust backend (fast mode)
   *
   * This mode provides quick responses with direct tool execution.
   * Best for simple queries and when speed is critical.
   *
   * @param message - User message
   * @param options - Message options
   * @returns Agent response
   */
  protected async sendViaRust(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResult> {
    if (!this.rustSessionId) {
      throw new Error('Rust session not initialized');
    }

    console.log(`🦀 Fast mode: Executing via Rust backend`);

    const orchestrator = getRustAgentOrchestrator();
    return orchestrator.sendMessage(
      this.rustSessionId,
      message,
      options?.enableTools ?? true
    );
  }

  /**
   * Send message via LangGraph (smart mode)
   *
   * This mode uses LangGraph's ReAct pattern for advanced reasoning.
   * Tools still execute in Rust via the bridge.
   * Best for complex tasks requiring planning and multi-step reasoning.
   *
   * @param message - User message
   * @param options - Message options
   * @returns Agent response
   */
  protected async sendViaLangGraph(
    message: string,
    options?: MessageOptions
  ): Promise<AgentResult> {
    if (!this.langGraphAgent || !this.rustSessionId) {
      throw new Error('LangGraph agent not initialized');
    }

    console.log(`🧠 Smart mode: Executing via LangGraph with Rust tools`);

    let fullContent = '';
    const toolCalls: any[] = [];
    const startTime = Date.now();

    try {
      // Stream LangGraph execution
      const stream = this.langGraphAgent.stream(
        { messages: [new HumanMessage(message)] },
        {
          configurable: {
            thread_id: this.rustSessionId,
            sessionId: this.rustSessionId,
            workspaceRoot: this.initOptions?.workspaceRoot,
            userId: this.initOptions?.userId,
          },
        }
      );

      // Process stream
      for await (const chunk of stream) {
        const messages = chunk.messages || [];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage?.content) {
          fullContent = lastMessage.content.toString();
        }

        if (lastMessage?.tool_calls) {
          toolCalls.push(...lastMessage.tool_calls);
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        content: fullContent,
        toolCalls: toolCalls.map((tc) => ({
          id: tc.id || '',
          name: tc.name || '',
          arguments: tc.args || {},
          timestamp: new Date().toISOString(),
        })),
        metadata: {
          tokensUsed: 0, // TODO: Calculate from model response
          executionTimeMs: executionTime,
          toolsExecuted: toolCalls.map((tc) => tc.name),
          costUsd: 0, // TODO: Calculate based on provider pricing
          iterations: toolCalls.length,
        },
        success: true,
      };
    } catch (error) {
      console.error(`❌ LangGraph execution failed:`, error);
      return {
        content: '',
        toolCalls: [],
        metadata: {
          tokensUsed: 0,
          executionTimeMs: Date.now() - startTime,
          toolsExecuted: [],
          costUsd: 0,
          iterations: 0,
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get agent metrics from Rust backend
   *
   * @returns Agent metrics or null if not available
   */
  async getMetrics(): Promise<AgentMetrics | null> {
    const orchestrator = getRustAgentOrchestrator();
    return orchestrator.getMetrics(this.id);
  }

  /**
   * Get memory statistics for current session
   *
   * @returns Memory statistics or null if not available
   */
  async getMemoryStats(): Promise<MemoryStats | null> {
    if (!this.rustSessionId) {
      return null;
    }

    const orchestrator = getRustAgentOrchestrator();
    return orchestrator.getMemoryStats(this.rustSessionId);
  }

  /**
   * Get conversation history
   *
   * @param limit - Maximum number of messages to retrieve
   * @returns Array of messages
   */
  async getHistory(limit?: number) {
    if (!this.rustSessionId) {
      return [];
    }

    const orchestrator = getRustAgentOrchestrator();
    return orchestrator.getHistory(this.rustSessionId, limit);
  }

  /**
   * Check if agent supports a specific capability
   *
   * Can be overridden by subclasses to provide more specific capability checks.
   *
   * @param capability - Capability to check
   * @returns True if capability is supported
   */
  hasCapability(capability: string): boolean {
    // Default implementation - subclasses can override
    return true;
  }

  /**
   * Get list of enabled tools for this agent
   *
   * @returns Array of tool names
   */
  getEnabledTools(): string[] {
    return rustBridge.getAllTools().map((tool) => tool.name);
  }

  /**
   * Cleanup resources
   *
   * Should be called when the agent is no longer needed.
   * Destroys the Rust session and frees resources.
   */
  async dispose(): Promise<void> {
    if (this.rustSessionId) {
      const orchestrator = getRustAgentOrchestrator();
      await orchestrator.destroySession(this.rustSessionId);
      this.rustSessionId = undefined;
    }

    this.langGraphAgent = undefined;

    console.log(`🗑️ ${this.name} disposed`);
  }

  /**
   * Get agent configuration
   *
   * @returns Current agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update agent configuration
   *
   * Note: Changes only apply to new sessions. Existing session is not affected.
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
