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
  ModelTier,
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
    // ===== MAX TIER - Ultra-premium, massive context, advanced features =====
    {
      id: 'moonshotai/kimi-k2-instruct-0905',
      name: 'Kimi K2 Instruct',
      description: 'Ultra-premium model with massive 256k context, parallel tools, and structured output',
      contextWindow: 262144, // 256k tokens
      maxOutputTokens: 16384,
      supportsStreaming: true,
      supportsTools: true,
      supportsParallelTools: true,
      supportsStructuredOutput: true,
      supportsJsonMode: true,
      tier: 'max',
      capabilities: ['chat', 'completion', 'tools', 'parallel-tools', 'structured-output', 'streaming'],
      useCases: ['complex-analysis', 'large-codebases', 'multi-file-refactoring', 'advanced-reasoning'],
      costPer1kTokens: {
        input: 0.002, // Higher cost for premium features
        output: 0.004,
      },
      performance: {
        averageLatency: 1500,
        tokensPerSecond: 80,
        reliability: 98,
      },
    },
    {
      id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      name: 'Llama 4 Maverick 17B',
      description: 'Next-gen Llama with parallel tools and enhanced instruction following',
      contextWindow: 131072, // 128k tokens
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      supportsParallelTools: true,
      supportsStructuredOutput: true,
      supportsJsonMode: true,
      tier: 'max',
      capabilities: ['chat', 'completion', 'tools', 'parallel-tools', 'structured-output', 'streaming'],
      useCases: ['autonomous-agents', 'parallel-execution', 'tool-orchestration'],
      costPer1kTokens: {
        input: 0.0015,
        output: 0.003,
      },
      performance: {
        averageLatency: 1200,
        tokensPerSecond: 100,
        reliability: 97,
      },
    },

    // ===== PREMIUM TIER - High performance, advanced features =====
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      description: 'Most capable standard Llama model with broad knowledge and reasoning',
      contextWindow: 131072, // 128k tokens
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      supportsParallelTools: false,
      tier: 'premium',
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      useCases: ['general-purpose', 'code-generation', 'analysis'],
      costPer1kTokens: {
        input: 0.00059,
        output: 0.00079,
      },
      performance: {
        averageLatency: 800,
        tokensPerSecond: 120,
        reliability: 95,
      },
    },

    // ===== QUALITY TIER - Best balance =====
    {
      id: 'llama-3.1-70b-versatile',
      name: 'Llama 3.1 70B Versatile',
      description: 'Balanced performance and capability',
      contextWindow: 131072,
      maxOutputTokens: 32768,
      supportsStreaming: true,
      supportsTools: true,
      tier: 'quality',
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      useCases: ['complex-tasks', 'multi-turn', 'reasoning'],
      costPer1kTokens: {
        input: 0.00059,
        output: 0.00079,
      },
      performance: {
        averageLatency: 850,
        tokensPerSecond: 115,
        reliability: 94,
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
      tier: 'balanced',
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      useCases: ['general-coding', 'explanations', 'analysis'],
      costPer1kTokens: {
        input: 0.00024,
        output: 0.00024,
      },
      performance: {
        averageLatency: 700,
        tokensPerSecond: 130,
        reliability: 92,
      },
    },

    // ===== SPEED TIER - Ultra-fast responses =====
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      description: 'Ultra-fast model for quick responses',
      contextWindow: 131072,
      maxOutputTokens: 8000,
      supportsStreaming: true,
      supportsTools: true,
      tier: 'speed',
      capabilities: ['chat', 'completion', 'tools', 'streaming'],
      useCases: ['quick-queries', 'simple-tasks', 'autocomplete'],
      costPer1kTokens: {
        input: 0.00005,
        output: 0.00008,
      },
      performance: {
        averageLatency: 300,
        tokensPerSecond: 200,
        reliability: 93,
      },
    },

    // ===== COST TIER - Budget-friendly =====
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      description: 'Google Gemma 2 model optimized for instruction following',
      contextWindow: 8192,
      maxOutputTokens: 8192,
      supportsStreaming: true,
      supportsTools: false,
      tier: 'cost',
      capabilities: ['chat', 'completion', 'streaming'],
      useCases: ['simple-queries', 'testing', 'learning'],
      costPer1kTokens: {
        input: 0.0002,
        output: 0.0002,
      },
      performance: {
        averageLatency: 500,
        tokensPerSecond: 150,
        reliability: 90,
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
        maxRetries: params.config.maxTokens ?? 4096,
        topP: params.config.topP,
        frequencyPenalty: params.config.frequencyPenalty,
        presencePenalty: params.config.presencePenalty,
        seed: params.config.seed,
      });

      return {
        text: result.text,
        usage: result.usage
          ? {
              promptTokens: (result.usage as any).promptTokens || 0,
              completionTokens: (result.usage as any).completionTokens || 0,
              totalTokens: result.usage.totalTokens || 0,
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
      const model = this.getModel(params.model);

      // Build request options with advanced features
      const requestOptions: any = {
        model: groq(params.model),
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.config.temperature ?? 0.7,
        topP: params.config.topP,
        frequencyPenalty: params.config.frequencyPenalty,
        presencePenalty: params.config.presencePenalty,
        seed: params.config.seed,
      };

      // Add parallel tool calls support if model supports it
      if (model?.supportsParallelTools && params.config.parallelToolCalls !== false) {
        requestOptions.parallelToolCalls = true;
      }

      // Add user identifier if provided
      if (params.config.user) {
        requestOptions.user = params.config.user;
      }

      // Add tools if provided
      if (params.tools && params.tools.length > 0) {
        requestOptions.tools = params.tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));

        // Limit max tool calls if specified
        if (params.config.maxToolCalls) {
          requestOptions.maxToolRoundtrips = params.config.maxToolCalls;
        }
      }

      const result = streamText(requestOptions);

      for await (const delta of result.fullStream) {
        if (delta.type === 'text-delta') {
          const event: TextStreamEvent = {
            type: 'text-delta',
            text: (delta as any).text || '',
          };
          yield event;
          params.onProgress?.(event);
        } else if (delta.type === 'finish') {
          const totalUsage = (delta as any).totalUsage;
          const event: TextStreamEvent = {
            type: 'finish',
            usage: totalUsage
              ? {
                  promptTokens: (totalUsage as any).promptTokens || 0,
                  completionTokens: (totalUsage as any).completionTokens || 0,
                  totalTokens: totalUsage.totalTokens || 0,
                }
              : undefined,
            finishReason: (delta as any).finishReason,
          };
          yield event;
          params.onProgress?.(event);
        } else if ((delta as any).type === 'error') {
          const event: TextStreamEvent = {
            type: 'error',
            error: new Error((delta as any).error || 'Unknown error'),
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
        maxOutputTokens: 5,
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
  getRecommendedModel(
    useCase: 'speed' | 'quality' | 'balanced' | 'cost' | 'premium' | 'max'
  ): AIModel | undefined {
    switch (useCase) {
      case 'max':
        // Ultra-premium: Massive context, parallel tools, structured output
        return this.getModel('moonshotai/kimi-k2-instruct-0905');
      case 'premium':
        // High performance with advanced features
        return this.getModel('llama-3.3-70b-versatile');
      case 'quality':
        // Best balance of quality and cost
        return this.getModel('llama-3.1-70b-versatile');
      case 'balanced':
        // Good performance, moderate cost
        return this.getModel('mixtral-8x7b-32768');
      case 'speed':
        // Ultra-fast responses
        return this.getModel('llama-3.1-8b-instant');
      case 'cost':
        // Budget-friendly
        return this.getModel('gemma2-9b-it');
      default:
        return this.getModel('llama-3.3-70b-versatile');
    }
  }

  /**
   * Get models by tier
   */
  getModelsByTier(tier: ModelTier): AIModel[] {
    return this.models.filter((m) => m.tier === tier);
  }

  /**
   * Get models that support parallel tools
   */
  getParallelToolModels(): AIModel[] {
    return this.models.filter((m) => m.supportsParallelTools === true);
  }

  /**
   * Get models that support structured output
   */
  getStructuredOutputModels(): AIModel[] {
    return this.models.filter((m) => m.supportsStructuredOutput === true);
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
