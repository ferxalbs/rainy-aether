/**
 * Rust Agent System
 *
 * High-performance agent system powered by Rust backend with:
 * - Multi-provider support (Google Gemini, Groq/Llama 3.3)
 * - Tool execution with caching and rate limiting
 * - Memory management and conversation history
 * - Performance metrics and telemetry
 * - Streaming responses (future)
 */

// Re-export commands
export * as RustAgentCommands from './commands';

// Re-export orchestrator
export {
  RustAgentOrchestrator,
  rustAgentOrchestrator,
  getRustAgentOrchestrator,
} from './orchestrator';

export type { AgentEvent, AgentEventHandler } from './orchestrator';

// Re-export types
export type {
  AgentConfig,
  AgentInput,
  AgentResult,
  AgentMetadata,
  AgentMetrics,
  Session,
  Message,
  MemoryStats,
  ToolCall,
  ToolResult,
  ToolDefinition,
  ToolMetrics,
  ProviderMetrics,
  SystemMetrics,
  AllMetrics,
} from '@/types/rustAgent';

// Re-export enums and utility functions
export { MessageRole, AgentCapability, createAgentConfig, defaultAgentConfig } from '@/types/rustAgent';
