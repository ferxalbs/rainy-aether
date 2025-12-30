import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import { ChatMessage, ToolCall } from '@/types/chat';
import { ToolDefinition } from '../ToolRegistry';
import {
  AIProvider,
  AIProviderConfig,
  StreamChunk,
  createChatMessage,
  generateMessageId,
} from './base';
import {
  withResilience,
  CircuitBreaker,
  ResilientOptions
} from './retryUtils';
import { GeminiCacheManager, CacheStats, getGeminiCacheManager } from './geminiCache';

// ===========================
// Gemini Provider
// ===========================

export interface GeminiThinkingConfig {
  // For Gemini 2.5 models: -1 = auto, 0 = disabled
  thinkingBudget?: number;
  // For Gemini 3 Pro: 'LOW' | 'HIGH'
  thinkingLevel?: 'LOW' | 'HIGH';
  // Whether to include thoughts in response (required to see thinking)
  includeThoughts?: boolean;
}

// ===========================
// Cache Statistics (exported for UI)
// ===========================

export interface GeminiUsageStats {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheHitRate: number;
  estimatedSavings: number;
}

// Shared circuit breaker for all Gemini API calls
const geminiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
  onOpen: () => console.warn('[GeminiProvider] Circuit breaker OPEN - pausing requests'),
  onClose: () => console.log('[GeminiProvider] Circuit breaker CLOSED - resuming requests'),
});

// Default resilience options for Gemini API calls
const GEMINI_RESILIENCE_OPTIONS: ResilientOptions = {
  maxRetries: 3,
  baseDelayMs: 1500,
  maxDelayMs: 30000,
  timeoutMs: 180000, // 3 minute timeout per attempt (allows for long responses)
  circuitBreaker: geminiCircuitBreaker,
  onRetry: (attempt, error, nextDelay) => {
    console.warn(`[GeminiProvider] Retry ${attempt}: ${error.message}. Next attempt in ${nextDelay}ms`);
  },
};

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private config: AIProviderConfig;
  private thinkingConfig?: GeminiThinkingConfig;
  private cacheManager: GeminiCacheManager;

  // Track usage stats for the session
  private usageStats: GeminiUsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    cacheHitRate: 0,
    estimatedSavings: 0,
  };

  constructor(config: AIProviderConfig, thinkingConfig?: GeminiThinkingConfig) {
    this.config = config;
    this.thinkingConfig = thinkingConfig;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.cacheManager = getGeminiCacheManager(config.apiKey);
  }

  /**
   * Get current usage statistics (for UI display)
   */
  getUsageStats(): GeminiUsageStats {
    return { ...this.usageStats };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cacheManager.getStats();
  }

  /**
   * Convert our ChatMessage to Gemini's format
   * IMPORTANT: Don't include thoughts or verbose tool results - 
   * Gemini has its own thinking system
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
    const result: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      const parts: any[] = [];

      // NOTE: Do NOT include thoughts in history - Gemini has its own thinking
      // Adding [Thinking]: causes the model to reference/repeat it

      // Add main content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Add image parts if present
      if (msg.images && msg.images.length > 0) {
        for (const image of msg.images) {
          parts.push({
            inlineData: {
              mimeType: image.mimeType || 'image/png',
              data: image.base64,
            },
          });
        }
      }

      // NOTE: Don't add tool call summaries to message content
      // The model tracks tool calls via function calling mechanism

      // Only add if there are parts
      if (parts.length > 0) {
        result.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    return result;
  }

  /**
   * Convert our ToolDefinition to Gemini's FunctionDeclaration
   */
  private convertToolsToGeminiFormat(tools: ToolDefinition[]): FunctionDeclaration[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
    }));
  }

  /**
   * Send a non-streaming message with retry logic
   */
  async sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<ChatMessage> {
    const systemPrompt = messages.find((m) => m.role === 'system')?.content;
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);
    const functionDeclarations = this.convertToolsToGeminiFormat(tools);

    // DEBUG: Log system prompt (first 200 chars)
    console.log('[GeminiProvider] System prompt preview:', systemPrompt?.substring(0, 200));

    // Build the request config
    const config: any = {
      model: this.config.model,
      contents: geminiMessages,
      systemInstruction: systemPrompt,
      config: {
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 2048,
        },
      },
    };

    // Add thinking config if available
    if (this.thinkingConfig) {
      config.config.thinkingConfig = {};

      if (this.thinkingConfig.thinkingBudget !== undefined) {
        config.config.thinkingConfig.thinkingBudget = this.thinkingConfig.thinkingBudget;
      }

      if (this.thinkingConfig.thinkingLevel) {
        config.config.thinkingConfig.thinkingLevel = this.thinkingConfig.thinkingLevel;
      }

      // Enable thoughts in response
      if (this.thinkingConfig.includeThoughts) {
        config.config.thinkingConfig.includeThoughts = true;
      }
    }

    // Add tools if available
    if (functionDeclarations.length > 0) {
      config.config.tools = [{ functionDeclarations }];
    }

    try {
      // Wrap API call with retry and circuit breaker
      const response = await withResilience(
        () => this.client.models.generateContent(config),
        GEMINI_RESILIENCE_OPTIONS
      );

      // Check for function calls
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const toolCalls: ToolCall[] = functionCalls.map((fc: any) => ({
          id: generateMessageId(),
          name: fc.name,
          arguments: fc.args,
        }));

        return createChatMessage(
          'assistant',
          response.text || '',
          toolCalls
        );
      }

      // Regular text response
      return createChatMessage('assistant', response.text || '');
    } catch (error) {
      console.error('[GeminiProvider] API error after retries:', error);

      // Return a user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Service temporarily unavailable. Please try again in a few seconds.');
      }
      throw new Error(`Gemini API failed: ${errorMessage}`);
    }
  }

  /**
   * Send a streaming message with retry logic
   */
  async streamMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatMessage> {
    const systemPrompt = messages.find((m) => m.role === 'system')?.content;
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);
    const functionDeclarations = this.convertToolsToGeminiFormat(tools);

    // DEBUG: Log system prompt (first 200 chars)
    console.log('[GeminiProvider] Stream - System prompt preview:', systemPrompt?.substring(0, 200));

    // Build the request config
    const config: any = {
      model: this.config.model,
      contents: geminiMessages,
      systemInstruction: systemPrompt,
      config: {
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.maxTokens || 2048,
        },
      },
    };

    // Add thinking config if available
    if (this.thinkingConfig) {
      config.config.thinkingConfig = {};

      if (this.thinkingConfig.thinkingBudget !== undefined) {
        config.config.thinkingConfig.thinkingBudget = this.thinkingConfig.thinkingBudget;
      }

      if (this.thinkingConfig.thinkingLevel) {
        config.config.thinkingConfig.thinkingLevel = this.thinkingConfig.thinkingLevel;
      }

      // Enable thoughts in response
      if (this.thinkingConfig.includeThoughts) {
        config.config.thinkingConfig.includeThoughts = true;
      }
    }

    // Add tools if available
    if (functionDeclarations.length > 0) {
      config.config.tools = [{ functionDeclarations }];
    }

    try {
      // Wrap the stream creation with retry (not the iteration)
      const stream = await withResilience(
        () => this.client.models.generateContentStream(config),
        {
          ...GEMINI_RESILIENCE_OPTIONS,
          // Stream initialization timeout (stream itself has no timeout once started)
          timeoutMs: 60000,
        }
      );

      let fullText = '';
      let fullThoughts = '';
      let toolCalls: ToolCall[] = [];

      // Track usage metadata for caching stats
      let lastUsageMetadata: any = null;

      for await (const chunk of stream) {
        let chunkText = '';
        let chunkThought = '';

        // Safely extract text and thoughts from parts
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            // Check if this is a thought part (Gemini thinking)
            if ((part as any).thought === true && part.text) {
              chunkThought += part.text;
            } else if (part.text) {
              chunkText += part.text;
            }
          }
        } else {
          // Fallback to text property if structure is different, but wrap in try-catch
          try {
            chunkText = chunk.text || '';
          } catch (e) {
            // Ignore
          }
        }

        // Emit thought chunks
        if (chunkThought) {
          fullThoughts += chunkThought;
          onChunk({
            type: 'thought',
            content: chunkThought,
          });
        }

        // Emit text chunks
        if (chunkText) {
          fullText += chunkText;
          onChunk({
            type: 'text',
            content: chunkText,
          });
        }

        // Check for function calls
        const functionCalls = chunk.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          toolCalls = functionCalls.map((fc: any) => ({
            id: generateMessageId(),
            name: fc.name,
            arguments: fc.args,
          }));

          toolCalls.forEach((tc) => {
            onChunk({
              type: 'tool_call',
              toolCall: tc,
            });
          });
        }

        // Track usage metadata (includes cache stats)
        if ((chunk as any).usageMetadata) {
          lastUsageMetadata = (chunk as any).usageMetadata;
        }
      }

      // Update cache stats from final usage metadata
      if (lastUsageMetadata) {
        const cachedTokens = lastUsageMetadata.cachedContentTokenCount ?? 0;
        const inputTokens = lastUsageMetadata.promptTokenCount ?? 0;
        const outputTokens = lastUsageMetadata.candidatesTokenCount ?? 0;

        this.usageStats = {
          inputTokens,
          outputTokens,
          cachedTokens,
          cacheHitRate: inputTokens > 0 ? (cachedTokens / inputTokens) * 100 : 0,
          estimatedSavings: inputTokens > 0 ? (cachedTokens * 0.9 / inputTokens) * 100 : 0,
        };

        // Update cache manager stats
        this.cacheManager.updateStats({
          promptTokenCount: inputTokens,
          cachedContentTokenCount: cachedTokens,
          candidatesTokenCount: outputTokens,
        });

        // Log cache performance
        if (cachedTokens > 0 || inputTokens > 10000) {
          console.log(
            `[GeminiProvider] 📊 Usage: ${inputTokens.toLocaleString()} input, ${outputTokens.toLocaleString()} output. ` +
            `Cache: ${cachedTokens.toLocaleString()} tokens (${this.usageStats.cacheHitRate.toFixed(1)}% hit rate)`
          );
        }
      }

      const finalMessage = createChatMessage(
        'assistant',
        fullText || '',
        toolCalls.length > 0 ? toolCalls : undefined,
        fullThoughts || undefined
      );

      onChunk({
        type: 'done',
        fullMessage: finalMessage,
      });

      return finalMessage;
    } catch (error) {
      console.error('[GeminiProvider] Streaming error after retries:', error);

      // Return a user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        throw new Error('Service temporarily unavailable. Please try again in a few seconds.');
      }
      throw new Error(`Gemini streaming failed: ${errorMessage}`);
    }
  }
}
