/**
 * Model Router
 * 
 * Centralized configuration for LLM models across different providers.
 * Supports Gemini, OpenAI, Anthropic, and Groq.
 */

import { gemini, openai, anthropic } from '@inngest/agent-kit';

// ===========================
// Types
// ===========================

export type ModelProvider = 'gemini' | 'openai' | 'anthropic' | 'groq';

export type ModelSpeed = 'fast' | 'smart' | 'balanced';

export interface ModelConfig {
    provider: ModelProvider;
    model: string;
    displayName: string;
    speed: ModelSpeed;
    contextWindow: number;
    description: string;
}

// ===========================
// Model Definitions
// ===========================

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
    // Gemini Models (Primary)
    'gemini-3-flash': {
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        displayName: 'Gemini 3 Flash',
        speed: 'fast',
        contextWindow: 1000000,
        description: 'Fast, latest generation Gemini model',
    },
    'gemini-3-pro': {
        provider: 'gemini',
        model: 'gemini-3-pro-preview',
        displayName: 'Gemini 3 Pro',
        speed: 'smart',
        contextWindow: 2000000,
        description: 'Most capable Gemini model',
    },

    // OpenAI Models
    'gpt-5.2': {
        provider: 'openai',
        model: 'gpt-5.2',
        displayName: 'GPT-5.2',
        speed: 'smart',
        contextWindow: 128000,
        description: 'Latest OpenAI flagship model',
    },
    'gpt-codex-5.2': {
        provider: 'openai',
        model: 'gpt-codex-5.2',
        displayName: 'GPT Codex 5.2',
        speed: 'smart',
        contextWindow: 128000,
        description: 'Optimized for code generation',
    },

    // Anthropic Models
    'claude-4.5-sonnet': {
        provider: 'anthropic',
        model: 'claude-4.5-sonnet',
        displayName: 'Claude 4.5 Sonnet',
        speed: 'balanced',
        contextWindow: 200000,
        description: 'Best balance of speed and capability',
    },
    'claude-4.5-opus': {
        provider: 'anthropic',
        model: 'claude-4.5-opus',
        displayName: 'Claude 4.5 Opus',
        speed: 'smart',
        contextWindow: 200000,
        description: 'Most capable Claude model',
    },
    'claude-4.5-haiku': {
        provider: 'anthropic',
        model: 'claude-4.5-haiku',
        displayName: 'Claude 4.5 Haiku',
        speed: 'fast',
        contextWindow: 200000,
        description: 'Fastest Claude model',
    },

    // Groq Models (Ultra-fast)
    'kimi-k2': {
        provider: 'groq',
        model: 'kimi-k2-09-25',
        displayName: 'Kimi K2',
        speed: 'fast',
        contextWindow: 128000,
        description: 'Ultra-fast inference via Groq',
    },
};

// ===========================
// Default Models by Use Case
// ===========================

export const DEFAULT_MODELS = {
    // Primary model for most tasks
    primary: 'gemini-3-flash',

    // For complex reasoning/planning
    smart: 'gemini-3-pro',

    // For speed-critical operations
    fast: 'gemini-3-flash',

    // Fallback if primary fails
    fallback: 'claude-4.5-sonnet',
} as const;

// ===========================
// Model Factory
// ===========================

/**
 * Get an AgentKit model instance by model ID
 */
export function getModel(modelId: string = DEFAULT_MODELS.primary) {
    const config = AVAILABLE_MODELS[modelId];
    if (!config) {
        console.warn(`[ModelRouter] Unknown model: ${modelId}, using default`);
        return getModel(DEFAULT_MODELS.primary);
    }

    switch (config.provider) {
        case 'gemini':
            return gemini({ model: config.model });
        case 'openai':
            return openai({ model: config.model });
        case 'anthropic':
            return anthropic({
                model: config.model,
                defaultParameters: {
                    max_tokens: 8192,
                },
            });
        case 'groq':
            // Groq uses OpenAI-compatible API
            return openai({
                model: config.model,
                baseUrl: 'https://api.groq.com/openai/v1',
            });
        default:
            return gemini({ model: 'gemini-3-flash-preview' });
    }
}

/**
 * Get a model by speed preference
 */
export function getModelBySpeed(speed: ModelSpeed) {
    switch (speed) {
        case 'fast':
            return getModel(DEFAULT_MODELS.fast);
        case 'smart':
            return getModel(DEFAULT_MODELS.smart);
        case 'balanced':
        default:
            return getModel(DEFAULT_MODELS.primary);
    }
}

/**
 * Get the default model for the network
 */
export function getDefaultModel() {
    return getModel(DEFAULT_MODELS.primary);
}

/**
 * Get the smart model for complex tasks
 */
export function getSmartModel() {
    return getModel(DEFAULT_MODELS.smart);
}

/**
 * Get the fast model for quick operations
 */
export function getFastModel() {
    return getModel(DEFAULT_MODELS.fast);
}

// ===========================
// Helpers
// ===========================

/**
 * Get all available models for a provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
    return Object.values(AVAILABLE_MODELS).filter(m => m.provider === provider);
}

/**
 * Get all available model IDs
 */
export function getAvailableModelIds(): string[] {
    return Object.keys(AVAILABLE_MODELS);
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(provider: ModelProvider): boolean {
    switch (provider) {
        case 'gemini':
            return !!process.env.GEMINI_API_KEY;
        case 'openai':
            return !!process.env.OPENAI_API_KEY;
        case 'anthropic':
            return !!process.env.ANTHROPIC_API_KEY;
        case 'groq':
            return !!process.env.GROQ_API_KEY;
        default:
            return false;
    }
}

/**
 * Get first available configured model
 */
export function getFirstAvailableModel() {
    const providersInOrder: ModelProvider[] = ['gemini', 'anthropic', 'openai', 'groq'];

    for (const provider of providersInOrder) {
        if (isProviderConfigured(provider)) {
            const models = getModelsByProvider(provider);
            if (models.length > 0) {
                const modelId = Object.keys(AVAILABLE_MODELS).find(
                    id => AVAILABLE_MODELS[id].provider === provider
                );
                if (modelId) {
                    return getModel(modelId);
                }
            }
        }
    }

    // Fallback to Gemini (assuming it's always available)
    return getModel(DEFAULT_MODELS.primary);
}
