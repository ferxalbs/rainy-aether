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
  provider: 'gemini' | 'groq' | 'cerebras';
  model: string;
  description?: string;
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
    category: 'standard',
    supportsThinking: false,
    thinkingMode: 'none',
    thinkingConfig: { thinkingBudget: 0 },
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    description: 'Latest Gemini 2.5 model with improved performance',
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
    name: 'Gemini 2.5 Flash (Thinking Auto)',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    description: 'Gemini 2.5 Flash with automatic thinking budget',
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'auto',
    thinkingConfig: { thinkingBudget: -1 },
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
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'low',
    thinkingConfig: { thinkingLevel: 'LOW' },
  },
  {
    id: 'gemini-3-pro-thinking-high',
    name: 'Gemini 3 Pro (Thinking High)',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    description: 'Gemini 3 Pro with high-depth reasoning',
    category: 'thinking',
    supportsThinking: true,
    thinkingMode: 'high',
    thinkingConfig: { thinkingLevel: 'HIGH' },
  },

  // Groq Models (using Llama and Mixtral)
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Meta Llama 3.3 70B on Groq infrastructure',
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2 Instruct 09/05',
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct-0905',
    description: 'Kimi K2 Instruct 09/05 on Groq',
  },

  // Cerebras Models

  {
    id: 'zai-glm-4.6',
    name: 'Zai GLM 4.6',
    provider: 'cerebras',
    model: 'zai-glm-4.6',
    description: 'Cerebras Zai GLM 4.6 model',
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

  const config: AIProviderConfig = {
    apiKey: '',
    model: modelConfig.model,
    temperature,
    maxTokens,
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
