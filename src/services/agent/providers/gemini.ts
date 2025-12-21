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

// ===========================
// Gemini Provider
// ===========================

export interface GeminiThinkingConfig {
  // For Gemini 2.5 models: -1 = auto, 0 = disabled
  thinkingBudget?: number;
  // For Gemini 3 Pro: 'LOW' | 'HIGH'
  thinkingLevel?: 'LOW' | 'HIGH';
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
  timeoutMs: 60000, // 60 second timeout per attempt
  circuitBreaker: geminiCircuitBreaker,
  onRetry: (attempt, error, nextDelay) => {
    console.warn(`[GeminiProvider] Retry ${attempt}: ${error.message}. Next attempt in ${nextDelay}ms`);
  },
};

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private config: AIProviderConfig;
  private thinkingConfig?: GeminiThinkingConfig;

  constructor(config: AIProviderConfig, thinkingConfig?: GeminiThinkingConfig) {
    this.config = config;
    this.thinkingConfig = thinkingConfig;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  /**
   * Convert our ChatMessage to Gemini's format
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
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
          // Shorter timeout for stream initialization
          timeoutMs: 30000,
        }
      );

      let fullText = '';
      let toolCalls: ToolCall[] = [];

      for await (const chunk of stream) {
        let chunkText = '';

        // Safely extract text to avoid warnings about non-text parts (function calls)
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
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
      }

      const finalMessage = createChatMessage(
        'assistant',
        fullText || '',
        toolCalls.length > 0 ? toolCalls : undefined
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
