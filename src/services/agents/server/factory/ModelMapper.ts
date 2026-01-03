/**
 * Model Mapper
 * 
 * Bridges between legacy agent/providers and AgentKit models.
 * Provides access to all configured models for subagent selection.
 */

import { AVAILABLE_MODELS, type ModelConfig } from '../../../agent/providers';
import type { AvailableModel } from '../../../../types/shared-models';

/**
 * Get all available models from legacy providers
 */
export function getAllAvailableModels(): AvailableModel[] {
    return AVAILABLE_MODELS.map(mapModelConfigToAvailable);
}

/**
 * Get standard (non-thinking) models only
 */
export function getStandardModels(): AvailableModel[] {
    return AVAILABLE_MODELS
        .filter(m => m.category !== 'thinking')
        .map(mapModelConfigToAvailable);
}

/**
 * Get thinking-capable models only
 */
export function getThinkingModels(): AvailableModel[] {
    return AVAILABLE_MODELS
        .filter(m => m.category === 'thinking')
        .map(mapModelConfigToAvailable);
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Get models grouped by provider
 */
export function getModelsByProvider(): Record<string, AvailableModel[]> {
    const grouped: Record<string, AvailableModel[]> = {};

    for (const model of AVAILABLE_MODELS) {
        const providerName = capitalizeProvider(model.provider);
        if (!grouped[providerName]) {
            grouped[providerName] = [];
        }
        grouped[providerName].push(mapModelConfigToAvailable(model));
    }

    return grouped;
}

/**
 * Check if a model supports tools/function calling
 */
export function modelSupportsTools(modelId: string): boolean {
    const config = getModelConfig(modelId);
    return config?.supportsTools !== false; // Default to true if not specified
}

/**
 * Check if a model supports thinking mode
 */
export function modelSupportsThinking(modelId: string): boolean {
    const config = getModelConfig(modelId);
    return config?.supportsThinking === true;
}

/**
 * Map AgentKit model ID to legacy provider model
 * This helps bridge the gap for models specified in subagent configs
 */
export function mapAgentKitToLegacy(agentkitModel: string): string {
    const mapping: Record<string, string> = {
        'gemini-3-flash-preview': 'gemini-flash-latest',
        'gemini-3-pro-preview': 'gemini-3-pro-thinking-high',
        'gemini-2.5-flash-lite': 'gemini-flash-lite-latest',
        'llama-3.3-70b-versatile': 'llama-3.3-70b',
        // Add more mappings as needed
    };

    return mapping[agentkitModel] || agentkitModel;
}

/**
 * Map legacy provider model to AgentKit-compatible ID
 */
export function mapLegacyToAgentKit(legacyModel: string): string {
    const config = getModelConfig(legacyModel);

    if (!config) {
        return legacyModel; // Return as-is if not found
    }

    // Return the actual model string used by the provider
    return config.model;
}

// ===========================
// Helper Functions
// ===========================

/**
 * Convert ModelConfig to AvailableModel for UI
 */
function mapModelConfigToAvailable(config: ModelConfig): AvailableModel {
    return {
        id: config.id,
        name: config.name,
        provider: capitalizeProvider(config.provider),
        description: config.description,
        isThinking: config.category === 'thinking',
        isLegacy: true,
    };
}

/**
 * Capitalize provider name for display
 */
function capitalizeProvider(provider: string): string {
    const mapping: Record<string, string> = {
        gemini: 'Google',
        groq: 'Groq',
        cerebras: 'Cerebras',
        anthropic: 'Anthropic',
        openai: 'OpenAI',
        enosislabs: 'Enosis Labs',
    };

    return mapping[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Get recommended models for different use cases
 */
export const RECOMMENDED_MODELS = {
    /** Fast, general-purpose tasks */
    fast: 'gemini-flash-latest',

    /** Complex reasoning and analysis */
    smart: 'gemini-3-pro-thinking-high',

    /** Code generation and editing */
    coding: 'gemini-flash-latest',

    /** Review and analysis */
    review: 'gemini-3-pro-thinking-low',

    /** Lightweight, quick tasks */
    lightweight: 'gemini-flash-lite-latest',
} as const;
