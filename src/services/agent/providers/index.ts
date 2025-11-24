import { AIProvider, AIProviderConfig } from './base';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';

// ===========================
// Model Configurations
// ===========================

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'groq';
  model: string;
  description?: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  // Gemini Models
    {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    description: 'Fast and efficient Gemini model',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    description: 'Latest experimental Gemini model with improved performance',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    description: 'Powerful Gemini model with large context window',
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
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    description: 'Fast Llama 3.1 8B model on Groq',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B (Groq)',
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    description: 'Mixtral 8x7B with 32K context on Groq',
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
      return new GeminiProvider(config);

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
