/**
 * TypeScript types for Rust Agent System
 *
 * These types mirror the Rust types defined in src-tauri/src/agents/
 * ensuring type safety across the Tauri IPC boundary.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Agent capabilities
 */
export enum AgentCapability {
  CodeGeneration = 'code-generation',
  CodeEditing = 'code-editing',
  FileOperations = 'file-operations',
  GitOperations = 'git-operations',
  TerminalExecution = 'terminal-execution',
  WorkspaceAnalysis = 'workspace-analysis',
  CodeAnalysis = 'code-analysis',
  Refactoring = 'refactoring',
  Testing = 'testing',
  Documentation = 'documentation',
  AutonomousCoding = 'autonomous-coding',
  ProactiveSuggestions = 'proactive-suggestions',
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Provider to use (google, groq, etc.) */
  provider: string;

  /** Model identifier */
  model: string;

  /** System prompt for the agent */
  systemPrompt?: string;

  /** Maximum iterations before stopping */
  maxIterations: number;

  /** Tool execution timeout in milliseconds */
  toolTimeout: number;

  /** Whether to allow parallel tool execution */
  parallelTools: boolean;

  /** Temperature for inference */
  temperature: number;

  /** Maximum tokens in response */
  maxTokens: number;

  /** Additional provider-specific settings */
  extra?: Record<string, unknown>;
}

/**
 * Agent input for execution
 */
export interface AgentInput {
  /** Unique session identifier */
  sessionId: string;

  /** User message/prompt */
  message: string;

  /** Additional context data */
  context?: Record<string, unknown>;

  /** Whether tools are enabled for this execution */
  toolsEnabled: boolean;

  /** Maximum number of agent iterations */
  maxIterations: number;

  /** Temperature for model inference (0.0 - 2.0) */
  temperature: number;

  /** Maximum tokens in response */
  maxTokens: number;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** The agent's response content */
  content: string;

  /** Tool calls made during execution */
  toolCalls: ToolCall[];

  /** Execution metadata and metrics */
  metadata: AgentMetadata;

  /** Whether execution completed successfully */
  success: boolean;

  /** Error message if execution failed */
  error?: string;
}

/**
 * Metadata about agent execution
 */
export interface AgentMetadata {
  /** Total tokens used (prompt + completion) */
  tokensUsed: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Names of tools executed */
  toolsExecuted: string[];

  /** Estimated cost in USD */
  costUsd: number;

  /** Number of iterations performed */
  iterations: number;

  /** Model used for inference */
  model?: string;

  /** Provider used for inference */
  provider?: string;
}

/**
 * Tool call representation
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;

  /** Name of the tool being called */
  name: string;

  /** Arguments passed to the tool */
  arguments: unknown;

  /** Result from tool execution (if completed) */
  result?: ToolResult;

  /** Timestamp when tool was called */
  timestamp: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Output from the tool */
  output: unknown;

  /** Whether tool execution succeeded */
  success: boolean;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Error message if execution failed */
  error?: string;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Parameter schema (JSON Schema) */
  parameters: unknown;

  /** Whether results should be cached */
  isCacheable: boolean;

  /** Cache TTL in seconds */
  cacheTtlSecs: number;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Agent session
 */
export interface Session {
  /** Unique session identifier */
  id: string;

  /** Agent type/identifier */
  agentType: string;

  /** Session configuration */
  config: AgentConfig;

  /** Session creation timestamp */
  createdAt: string;

  /** Last activity timestamp */
  updatedAt: string;

  /** Total messages in session */
  messageCount: number;

  /** Total tokens used in session */
  totalTokens: number;

  /** Total cost for session */
  totalCostUsd: number;
}

// ============================================================================
// Memory Types
// ============================================================================

/**
 * Message role
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

/**
 * Message in conversation
 */
export interface Message {
  /** Unique message identifier */
  id: string;

  /** Message role */
  role: MessageRole;

  /** Message content */
  content: string;

  /** Estimated token count */
  tokenCount: number;

  /** Message timestamp */
  timestamp: string;

  /** Optional metadata */
  metadata?: unknown;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Number of messages in memory */
  messageCount: number;

  /** Total tokens used */
  totalTokens: number;

  /** Maximum tokens allowed */
  maxTokens: number;

  /** Memory utilization percentage */
  utilization: number;

  /** When memory was created */
  createdAt: string;

  /** When memory was last updated */
  updatedAt: string;
}

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Agent-specific metrics
 */
export interface AgentMetrics {
  /** Total number of requests */
  totalRequests: number;

  /** Number of successful requests */
  successfulRequests: number;

  /** Number of failed requests */
  failedRequests: number;

  /** Total tokens used */
  totalTokens: number;

  /** Total cost in USD */
  totalCostUsd: number;

  /** Total latency in milliseconds */
  totalLatencyMs: number;

  /** Minimum latency in milliseconds */
  minLatencyMs: number;

  /** Maximum latency in milliseconds */
  maxLatencyMs: number;
}

/**
 * Tool execution metrics
 */
export interface ToolMetrics {
  /** Total number of executions */
  totalExecutions: number;

  /** Number of successful executions */
  successfulExecutions: number;

  /** Number of failed executions */
  failedExecutions: number;

  /** Total execution time in milliseconds */
  totalDurationMs: number;

  /** Minimum execution time in milliseconds */
  minDurationMs: number;

  /** Maximum execution time in milliseconds */
  maxDurationMs: number;
}

/**
 * Provider API metrics
 */
export interface ProviderMetrics {
  /** Total number of API calls */
  totalCalls: number;

  /** Number of successful calls */
  successfulCalls: number;

  /** Number of failed calls */
  failedCalls: number;

  /** Total tokens used */
  totalTokens: number;

  /** Total cost in USD */
  totalCostUsd: number;

  /** Total API latency in milliseconds */
  totalLatencyMs: number;
}

/**
 * System-wide metrics
 */
export interface SystemMetrics {
  /** Total requests across all agents */
  totalRequests: number;

  /** Total tokens used */
  totalTokens: number;

  /** Total cost in USD */
  totalCostUsd: number;
}

/**
 * All metrics combined
 */
export interface AllMetrics {
  /** Agent metrics by agent ID */
  agents: [string, AgentMetrics][];

  /** Tool metrics by tool name */
  tools: [string, ToolMetrics][];

  /** Provider metrics by provider name */
  providers: [string, ProviderMetrics][];

  /** System-wide metrics */
  system: SystemMetrics;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default agent configuration
 */
export const defaultAgentConfig: AgentConfig = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  maxIterations: 10,
  toolTimeout: 30000,
  parallelTools: true,
  temperature: 0.7,
  maxTokens: 4096,
};

/**
 * Create a default agent configuration with overrides
 */
export function createAgentConfig(
  overrides: Partial<AgentConfig> = {}
): AgentConfig {
  return {
    ...defaultAgentConfig,
    ...overrides,
  };
}
