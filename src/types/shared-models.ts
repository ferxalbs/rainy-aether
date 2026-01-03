/**
 * Shared Model Types
 * 
 * Common model type definitions used across the application.
 * Bridges between legacy agent/providers and new agents/server.
 */

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    description?: string;
    category?: 'standard' | 'thinking';
    supportsTools?: boolean;
    contextWindow?: number;
    maxOutputTokens?: number;
}

export type ModelProvider = 'gemini' | 'groq' | 'cerebras' | 'anthropic' | 'openai' | 'enosislabs';

/**
 * Available model for UI display
 */
export interface AvailableModel {
    id: string;
    name: string;
    provider: string;
    description?: string;
    isThinking?: boolean;
    isLegacy?: boolean;
}
