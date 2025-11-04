/**
 * Base Provider Interface for AI Agent System
 *
 * This module defines the core abstractions for AI providers in Rainy Aether.
 * All provider implementations must conform to the AIProvider interface.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Model tier classification
 */
export type ModelTier = 'free' | 'cost' | 'speed' | 'balanced' | 'quality' | 'premium' | 'max';

/**
 * Represents an AI model available from a provider
 */
export interface AIModel {
  /** Unique identifier for the model (e.g., "llama-3.3-70b-versatile") */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Maximum context window size in tokens */
  contextWindow: number;

  /** Maximum output tokens per request */
  maxOutputTokens: number;

  /** Whether the model supports streaming responses */
  supportsStreaming: boolean;

  /** Whether the model supports tool/function calling */
  supportsTools: boolean;

  /** Whether the model supports parallel tool calls */
  supportsParallelTools?: boolean;

  /** Whether the model supports structured output */
  supportsStructuredOutput?: boolean;

  /** Whether the model supports JSON mode */
  supportsJsonMode?: boolean;

  /** Model tier classification */
  tier?: ModelTier;

  /** Optional cost information per 1000 tokens */
  costPer1kTokens?: {
    input: number;
    output: number;
  };

  /** Model description for UI display */
  description?: string;

  /** Model capabilities (chat, completion, embedding, etc.) */
  capabilities?: string[];

  /** Recommended use cases */
  useCases?: string[];

  /** Performance characteristics */
  performance?: {
    averageLatency?: number; // ms
    tokensPerSecond?: number;
    reliability?: number; // 0-100
  };
}

/**
 * Message format for chat interactions
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool call representation
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Parameters for text generation
 */
export interface GenerateTextParams {
  /** Model ID to use */
  model: string;

  /** System and user messages */
  messages: ChatMessage[];

  /** API key for authentication */
  apiKey: string;

  /** Configuration options */
  config: GenerationConfig;

  /** Optional tools/functions the model can call */
  tools?: ToolDefinition[];
}

/**
 * Parameters for streaming text generation
 */
export interface StreamTextParams extends GenerateTextParams {
  /** Callback for progress updates */
  onProgress?: (event: TextStreamEvent) => void;
}

/**
 * Result from text generation
 */
export interface GenerateTextResult {
  /** Generated text content */
  text: string;

  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Tool calls made by the model */
  toolCalls?: ToolCall[];

  /** Finish reason (stop, length, tool_calls, etc.) */
  finishReason?: string;
}

/**
 * Stream event types
 */
export type TextStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolCall: ToolCall }
  | {
      type: 'finish';
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      finishReason?: string;
    }
  | { type: 'error'; error: Error };

/**
 * Generation configuration options
 */
export interface GenerationConfig {
  /** Temperature for randomness (0.0 - 2.0) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Top-p sampling (nucleus sampling) */
  topP?: number;

  /** Frequency penalty (-2.0 to 2.0) */
  frequencyPenalty?: number;

  /** Presence penalty (-2.0 to 2.0) */
  presencePenalty?: number;

  /** Stop sequences */
  stop?: string[];

  /** Random seed for reproducibility */
  seed?: number;

  /** Enable parallel tool calls (if model supports it) */
  parallelToolCalls?: boolean;

  /** Maximum number of tool calls per request */
  maxToolCalls?: number;

  /** Timeout for tool execution (ms) */
  toolTimeout?: number;

  /** User identifier for tracking */
  user?: string;

  /** Response format (text, json_object) */
  responseFormat?: 'text' | 'json_object' | 'json_schema';

  /** JSON schema for structured output */
  responseSchema?: Record<string, unknown>;
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  /** Default model ID */
  defaultModel: string;

  /** Default generation config */
  temperature?: number;
  maxTokens?: number;
  topP?: number;

  /** Provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Provider information for UI display
 */
export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  website?: string;
  docUrl?: string;
  status: 'active' | 'beta' | 'deprecated';
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Core interface that all AI providers must implement
 */
export interface AIProvider {
  /** Unique provider identifier (e.g., "groq", "openai") */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /** Provider description for UI */
  readonly description: string;

  /** Whether this provider requires an API key */
  readonly requiresApiKey: boolean;

  // Model management
  /** Get list of available models */
  listModels(): Promise<AIModel[]>;

  /** Get specific model by ID */
  getModel(modelId: string): AIModel | undefined;

  // Text generation
  /** Generate text (non-streaming) */
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;

  /** Stream text generation */
  streamText(params: StreamTextParams): AsyncIterable<TextStreamEvent>;

  // Validation
  /** Validate an API key by making a lightweight request */
  validateApiKey(apiKey: string): Promise<boolean>;

  // Configuration
  /** Get default configuration for this provider */
  getDefaultConfig(): ProviderConfig;

  /** Get provider information */
  getInfo(): ProviderInfo;
}

// ============================================================================
// ABSTRACT BASE CLASS
// ============================================================================

/**
 * Abstract base class providing common provider functionality
 */
export abstract class BaseProvider implements AIProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiresApiKey: boolean;

  protected models: AIModel[] = [];

  abstract listModels(): Promise<AIModel[]>;

  getModel(modelId: string): AIModel | undefined {
    return this.models.find((m) => m.id === modelId);
  }

  abstract generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
  abstract streamText(params: StreamTextParams): AsyncIterable<TextStreamEvent>;
  abstract validateApiKey(apiKey: string): Promise<boolean>;
  abstract getDefaultConfig(): ProviderConfig;

  getInfo(): ProviderInfo {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      requiresApiKey: this.requiresApiKey,
      status: 'active',
    };
  }

  /**
   * Utility method to validate generation parameters
   */
  protected validateParams(params: GenerateTextParams): void {
    if (!params.model) {
      throw new Error('Model ID is required');
    }

    if (!params.messages || params.messages.length === 0) {
      throw new Error('At least one message is required');
    }

    if (this.requiresApiKey && !params.apiKey) {
      throw new Error(`API key is required for provider: ${this.id}`);
    }

    const model = this.getModel(params.model);
    if (!model) {
      throw new Error(`Model not found: ${params.model}`);
    }

    // Validate token limits
    const maxTokens = params.config.maxTokens || this.getDefaultConfig().maxTokens || 4096;
    if (maxTokens > model.maxOutputTokens) {
      throw new Error(
        `maxTokens (${maxTokens}) exceeds model limit (${model.maxOutputTokens})`
      );
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Estimate token count (rough approximation)
 * Uses the rule of thumb: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost based on usage
 */
export function calculateCost(
  model: AIModel,
  usage: { promptTokens: number; completionTokens: number }
): number | null {
  if (!model.costPer1kTokens) return null;

  const inputCost = (usage.promptTokens / 1000) * model.costPer1kTokens.input;
  const outputCost = (usage.completionTokens / 1000) * model.costPer1kTokens.output;

  return inputCost + outputCost;
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}
