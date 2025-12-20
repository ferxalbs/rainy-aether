/**
 * Model Adapter - Provider-Agnostic Bridge
 * 
 * Bridges the existing AIProvider interface to AgentKit's inference system.
 * This allows the brain to be completely agnostic to the underlying provider
 * (Gemini, Groq, etc.) while enabling routing by cost/latency/capacity.
 */

import {
    createProvider,
    ProviderCredentials,
    AVAILABLE_MODELS,
    ModelConfig,
} from '@/services/agent/providers';
import type { AIProvider } from '@/services/agent/providers/base';
import type { ChatMessage } from '@/types/chat';
import type { ToolDefinition } from '@/services/agent/ToolRegistry';

// ===========================
// Types
// ===========================

export interface InferenceOptions {
    modelId: string;
    credentials: ProviderCredentials;
    temperature?: number;
    maxTokens?: number;
}

export interface InferenceResult {
    content: string;
    toolCalls?: {
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }[];
}

export type TaskType = 'fast' | 'smart' | 'cheap' | 'thinking';

// ===========================
// Model Selection
// ===========================

/**
 * Smart model selector for routing by capacity/latency/cost.
 * Uses the existing AVAILABLE_MODELS configuration.
 */
export function selectModelForTask(task: TaskType): string {
    switch (task) {
        case 'fast':
            // Groq provides lowest latency
            return 'llama-3.3-70b';
        case 'smart':
            // Gemini with thinking for complex reasoning
            return 'gemini-3-pro-thinking-high';
        case 'thinking':
            // Auto-budget thinking for balanced reasoning
            return 'gemini-flash-thinking-auto';
        case 'cheap':
            // Flash Lite for cost efficiency
            return 'gemini-flash-lite-latest';
        default:
            // Default balanced option
            return 'gemini-flash-latest';
    }
}

/**
 * Get model configuration by ID
 */
export function getModel(modelId: string): ModelConfig | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Get recommended model based on task characteristics
 */
export function getRecommendedModel(options: {
    complexity: 'low' | 'medium' | 'high';
    latencyRequired: 'low' | 'medium' | 'high';
    costSensitive: boolean;
}): string {
    const { complexity, latencyRequired, costSensitive } = options;

    // High complexity tasks need thinking models
    if (complexity === 'high') {
        return 'gemini-3-pro-thinking-high';
    }

    // Low latency requirement
    if (latencyRequired === 'low') {
        return 'llama-3.3-70b'; // Groq is fastest
    }

    // Cost sensitive
    if (costSensitive) {
        return 'gemini-flash-lite-latest';
    }

    // Medium complexity with auto thinking
    if (complexity === 'medium') {
        return 'gemini-flash-thinking-auto';
    }

    return 'gemini-flash-latest';
}

// ===========================
// Inference Adapter
// ===========================

/**
 * Create AgentKit-compatible inference function from existing provider layer.
 * This allows routing by cost/latency/capacity using the same provider abstraction.
 */
export function createInferenceAdapter(options: InferenceOptions) {
    let provider: AIProvider | null = null;

    const getProvider = () => {
        if (!provider) {
            provider = createProvider(
                options.modelId,
                options.credentials,
                options.temperature,
                options.maxTokens
            );
        }
        return provider;
    };

    return async (
        messages: ChatMessage[],
        tools: ToolDefinition[]
    ): Promise<InferenceResult> => {
        const p = getProvider();
        const response = await p.sendMessage(messages, tools);

        return {
            content: response.content,
            toolCalls: response.toolCalls?.map(tc => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments as Record<string, unknown>,
            })),
        };
    };
}

/**
 * Create a streaming inference adapter
 */
export function createStreamingAdapter(options: InferenceOptions) {
    const provider = createProvider(
        options.modelId,
        options.credentials,
        options.temperature,
        options.maxTokens
    );

    return async (
        messages: ChatMessage[],
        tools: ToolDefinition[],
        onChunk: (chunk: { type: string; content?: string }) => void
    ): Promise<InferenceResult> => {
        const response = await provider.streamMessage(messages, tools, (chunk) => {
            onChunk({
                type: chunk.type,
                content: chunk.content,
            });
        });

        return {
            content: response.content,
            toolCalls: response.toolCalls?.map(tc => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments as Record<string, unknown>,
            })),
        };
    };
}

// ===========================
// Cost/Latency Tracking
// ===========================

interface ModelMetrics {
    avgLatencyMs: number;
    totalCalls: number;
    errorRate: number;
    lastUsed: Date;
}

const metricsCache = new Map<string, ModelMetrics>();

/**
 * Record model usage metrics for intelligent routing
 */
export function recordModelMetrics(
    modelId: string,
    latencyMs: number,
    success: boolean
): void {
    const existing = metricsCache.get(modelId) || {
        avgLatencyMs: 0,
        totalCalls: 0,
        errorRate: 0,
        lastUsed: new Date(),
    };

    const newTotal = existing.totalCalls + 1;
    const newAvgLatency = (existing.avgLatencyMs * existing.totalCalls + latencyMs) / newTotal;
    const newErrorRate = success
        ? existing.errorRate * (existing.totalCalls / newTotal)
        : (existing.errorRate * existing.totalCalls + 1) / newTotal;

    metricsCache.set(modelId, {
        avgLatencyMs: newAvgLatency,
        totalCalls: newTotal,
        errorRate: newErrorRate,
        lastUsed: new Date(),
    });
}

/**
 * Get best performing model based on recent metrics
 */
export function getBestPerformingModel(candidates: string[]): string | undefined {
    let best: { modelId: string; score: number } | undefined;

    for (const modelId of candidates) {
        const metrics = metricsCache.get(modelId);
        if (!metrics) continue;

        // Score: lower latency and error rate = higher score
        const score = (1 / (metrics.avgLatencyMs + 1)) * (1 - metrics.errorRate);

        if (!best || score > best.score) {
            best = { modelId, score };
        }
    }

    return best?.modelId;
}
