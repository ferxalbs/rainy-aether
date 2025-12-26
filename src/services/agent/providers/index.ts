import { AIProvider, AIProviderConfig } from './base';
import { GeminiProvider, GeminiThinkingConfig } from './gemini';
import { GroqProvider } from './groq';

// ===========================
// Model Configurations
// ===========================

export type ThinkingMode = 'none' | 'auto' | 'low' | 'high';

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'groq' | 'cerebras' | 'anthropic' | 'openai' | 'enosislabs';
  model: string;
  description?: string;
  // Token limits
  contextWindow: number;     // Max input tokens (context window size)
  maxOutputTokens: number;   // Max output tokens per response
  // Tool/function calling support
  supportsTools?: boolean;   // If false, tools will not be sent to this model
  // Thinking capabilities
  supportsThinking?: boolean;
  thinkingMode?: ThinkingMode;
  thinkingConfig?: GeminiThinkingConfig;
  category?: 'standard' | 'thinking';
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  // ===========================
  // Standard Gemini Models (No Thinking)
  // ===========================
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    description: 'Fast and efficient Gemini model',
    contextWindow: 128000,     // 128K context
    maxOutputTokens: 8192,     // 8K output
    category: 'standard',
    supportsThinking: false,
    thinkingMode: 'none',
    thinkingConfig: { thinkingBudget: 0 },
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini 3 Flash',
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    description: 'Latest Gemini 3 Flash model with improved performance',
    contextWindow: 1000000,    // 1M context
    maxOutputTokens: 8192,     // 8K output
    category: 'standard',
    supportsThinking: true,
    thinkingMode: 'none',
    thinkingConfig: { thinkingBudget: 0 },
  },

  // ===========================
  // Gemini Thinking Models - Auto Mode
  // ===========================
  {
    id: 'gemini-flash-thinking-auto',
    name: 'Gemini 3 Flash (Dynamic Thinking)',
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    description: 'Gemini 3 Flash with dynamic thinking budget',
    contextWindow: 1000000,    // 1M context
    maxOutputTokens: 8192,     // 8K output
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'auto',
    thinkingConfig: { thinkingBudget: -1, includeThoughts: true },
  },

  // ===========================
  // Gemini 3 Pro Thinking Models
  // ===========================
  {
    id: 'gemini-3-pro-thinking-low',
    name: 'Gemini 3 Pro (Thinking Low)',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    description: 'Gemini 3 Pro with low-depth reasoning',
    contextWindow: 1000000,    // 1M context
    maxOutputTokens: 16384,    // 16K output (Pro has higher limit)
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'low',
    thinkingConfig: { thinkingLevel: 'LOW', includeThoughts: true },
  },
  {
    id: 'gemini-3-pro-thinking-high',
    name: 'Gemini 3 Pro (Thinking High)',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    description: 'Gemini 3 Pro with high-depth reasoning',
    contextWindow: 1000000,    // 1M context
    maxOutputTokens: 16384,    // 16K output
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'high',
    thinkingConfig: { thinkingLevel: 'HIGH', includeThoughts: true },
  },

  // ===========================
  // Groq Models
  // ===========================
  // Note: Llama 3.3 70B supports function calling, Kimi K2 may not
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Meta Llama 3.3 70B on Groq infrastructure',
    contextWindow: 128000,     // 128K context
    maxOutputTokens: 8192,     // 8K output
    supportsTools: true,
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 Instruct 09/05',
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct-0905',
    description: 'Kimi K2 Instruct 09/05 on Groq',
    contextWindow: 32000,      // 32K context
    maxOutputTokens: 8192,     // 8K output
    supportsTools: false,
  },

  // ===========================
  // Cerebras Models
  // ===========================
  {
    id: 'zai-glm-4.6',
    name: 'Zai GLM 4.6',
    provider: 'cerebras',
    model: 'zai-glm-4.6',
    description: 'Cerebras Zai GLM 4.6 model',
    contextWindow: 32000,      // 32K context
    maxOutputTokens: 8192,     // 8K output
  },
];

// ===========================
// Provider Factory
// ===========================

export interface ProviderCredentials {
  geminiApiKey?: string;
  groqApiKey?: string;
}

/**
 * Create an AI provider instance based on model configuration
 */
export function createProvider(
  modelId: string,
  credentials: ProviderCredentials,
  temperature?: number,
  maxTokens?: number
): AIProvider {
  const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);

  if (!modelConfig) {
    throw new Error(`Model ${modelId} not found`);
  }

  // Use model's maxOutputTokens if not explicitly set
  const effectiveMaxTokens = maxTokens ?? modelConfig.maxOutputTokens;

  const config: AIProviderConfig = {
    apiKey: '',
    model: modelConfig.model,
    temperature,
    maxTokens: effectiveMaxTokens,
  };

  switch (modelConfig.provider) {
    case 'gemini':
      if (!credentials.geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }
      config.apiKey = credentials.geminiApiKey;
      return new GeminiProvider(config, modelConfig.thinkingConfig);

    case 'groq':
      if (!credentials.groqApiKey) {
        throw new Error('Groq API key not configured');
      }
      config.apiKey = credentials.groqApiKey;
      return new GroqProvider(config);

    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

/**
 * Get all available models
 */
export function getAllModels(): ModelConfig[] {
  return AVAILABLE_MODELS;
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: 'gemini' | 'groq'): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

// Re-export types
export type { AIProvider, AIProviderConfig, StreamChunk } from './base';
