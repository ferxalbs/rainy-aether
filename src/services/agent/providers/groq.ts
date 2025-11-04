/**
 * Groq Provider Implementation
 *
 * Ultra-fast AI inference using Groq's LPU (Language Processing Unit) architecture.
 * Supports Llama 3.x and Gemma 2 models with exceptional speed (<500ms first token).
 */

import { createGroq } from '@ai-sdk/groq';
import { streamText, generateText } from 'ai';
import type {
  AIProvider,
  AIModel,
  GenerateTextParams,
  GenerateTextResult,
  StreamTextParams,
  TextStreamEvent,
  ProviderConfig,
  ProviderInfo,
} from './base';
import { BaseProvider } from './base';

/**
 * Groq AI Provider
 *
 * Features:
 * - Ultra-fast inference (first token < 500ms)
 * - Large context windows (up to 131k tokens)
 * - Support for Llama 3.3 70B, Llama 3.1 8B, Gemma 2 9B
 * - Streaming and non-streaming modes
 * - Function/tool calling support
 */
export class GroqProvider extends BaseProvider implements AIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly description = 'Ultra-fast AI inference with Llama and Gemma models';
  readonly requiresApiKey = true;

  protected models: AIModel[] = [
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      description: 'Most capable Llama model with broad knowledge and reasoning',
      contextWindow: 131072, // 128k tokens
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      costPer1kTokens: {
        input: 0.00059,
        output: 0.00079,
      },
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      description: 'Fast and efficient model for quick responses',
      contextWindow: 131072,
      maxOutputTokens: 8000,
      supportsStreaming: true,
      supportsTools: true,
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      costPer1kTokens: {
        input: 0.00005,
        output: 0.00008,
      },
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      description: 'Google Gemma 2 model optimized for instruction following',
      contextWindow: 8192,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: false,
      capabilities: ['chat', 'completion', 'streaming'],
      costPer1kTokens: {
        input: 0.0002,
        output: 0.0002,
      },
    },
    {
      id: 'llama-3.1-70b-versatile',
      name: 'Llama 3.1 70B Versatile',
      description: 'Balanced performance and capability',
      contextWindow: 131072,
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      costPer1kTokens: {
        input: 0.00059,
        output: 0.00079,
      },
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      description: 'Mixture of experts model with strong performance',
      contextWindow: 32768,
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      costPer1kTokens: {
        input: 0.00024,
        output: 0.00024,
      },
    },
  ];

  async listModels(): Promise<AIModel[]> {
    return this.models;
  }

  /**
   * Generate text using Groq (non-streaming)
   */
  async generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
    this.validateParams(params);

    try {
      const groq = createGroq({ apiKey: params.apiKey });

      const result = await generateText({
        model: groq(params.model),
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.config.temperature ?? 0.7,
        maxTokens: params.config.maxTokens ?? 4096,
        topP: params.config.topP,
        frequencyPenalty: params.config.frequencyPenalty,
        presencePenalty: params.config.presencePenalty,
        seed: params.config.seed,
      });

      return {
        text: result.text,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        finishReason: result.finishReason,
      };
    } catch (error) {
      throw new Error(`Groq generation failed: ${error}`);
    }
  }

  /**
   * Stream text generation using Groq
   */
  async *streamText(params: StreamTextParams): AsyncIterable<TextStreamEvent> {
    this.validateParams(params);

    try {
      const groq = createGroq({ apiKey: params.apiKey });

      const result = streamText({
        model: groq(params.model),
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.config.temperature ?? 0.7,
        maxTokens: params.config.maxTokens ?? 4096,
        topP: params.config.topP,
        frequencyPenalty: params.config.frequencyPenalty,
        presencePenalty: params.config.presencePenalty,
        seed: params.config.seed,
      });

      for await (const delta of result.fullStream) {
        if (delta.type === 'text-delta') {
          const event: TextStreamEvent = {
            type: 'text-delta',
            text: delta.textDelta,
          };
          yield event;
          params.onProgress?.(event);
        } else if (delta.type === 'finish') {
          const event: TextStreamEvent = {
            type: 'finish',
            usage: delta.usage
              ? {
                  promptTokens: delta.usage.promptTokens,
                  completionTokens: delta.usage.completionTokens,
                  totalTokens: delta.usage.totalTokens,
                }
              : undefined,
            finishReason: delta.finishReason,
          };
          yield event;
          params.onProgress?.(event);
        } else if (delta.type === 'error') {
          const event: TextStreamEvent = {
            type: 'error',
            error: new Error(delta.error),
          };
          yield event;
          params.onProgress?.(event);
        }
      }
    } catch (error) {
      const errorEvent: TextStreamEvent = {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
      yield errorEvent;
      params.onProgress?.(errorEvent);
    }
  }

  /**
   * Validate Groq API key by making a minimal request
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || !apiKey.startsWith('gsk_')) {
      return false;
    }

    try {
      const groq = createGroq({ apiKey });

      // Make a minimal request to validate the key
      const result = await generateText({
        model: groq('llama-3.1-8b-instant'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      });

      return result.text.length > 0;
    } catch (error) {
      console.error('Groq API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get default configuration for Groq
   */
  getDefaultConfig(): ProviderConfig {
    return {
      defaultModel: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
    };
  }

  /**
   * Get provider information
   */
  getInfo(): ProviderInfo {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      requiresApiKey: this.requiresApiKey,
      website: 'https://groq.com',
      docUrl: 'https://console.groq.com/docs',
      status: 'active',
    };
  }

  /**
   * Get recommended model for specific use cases
   */
  getRecommendedModel(useCase: 'speed' | 'quality' | 'balanced' | 'cost'): AIModel | undefined {
    switch (useCase) {
      case 'speed':
        return this.getModel('llama-3.1-8b-instant');
      case 'quality':
        return this.getModel('llama-3.3-70b-versatile');
      case 'balanced':
        return this.getModel('llama-3.1-70b-versatile');
      case 'cost':
        return this.getModel('llama-3.1-8b-instant');
      default:
        return this.getModel('llama-3.3-70b-versatile');
    }
  }

  /**
   * Check if a model supports a specific capability
   */
  supportsCapability(modelId: string, capability: string): boolean {
    const model = this.getModel(modelId);
    return model?.capabilities?.includes(capability) ?? false;
  }
}

/**
 * Create a new Groq provider instance
 */
export function createGroqProvider(): GroqProvider {
  return new GroqProvider();
}
