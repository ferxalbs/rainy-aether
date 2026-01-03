/**
 * Subagent Factory
 * 
 * Converts subagent configurations into executable AgentKit agents with
 * multi-model AI support and tool permission management.
 */

import { createAgent, gemini, anthropic, openai } from '@inngest/agent-kit';
import type { Agent as AgentKitAgent } from '@inngest/agent-kit';
import {
    SubagentConfig,
    ModelId,
    SubagentValidationResult,
} from '../types/SubagentConfig';
import {
    getAllTools,
    getToolsByNames,
    type AgentKitTool,
} from '../tools/agentkit';
import { toolPermissionManager, suggestToolsFromDescription } from '../tools/ToolPermissionManager';

// ===========================
// Model Factory
// ===========================

/**
 * Model ID to actual API model mapping
 * Maps IDs from src/services/agent/providers/index.ts to their API model strings
 */
const MODEL_MAPPINGS: Record<string, { provider: 'gemini' | 'groq' | 'cerebras' | 'anthropic' | 'openai'; model: string }> = {
    // Gemini Standard Models
    'gemini-flash-lite-latest': { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
    'gemini-flash-latest': { provider: 'gemini', model: 'gemini-3-flash-preview' },
    // Gemini Thinking Models
    'gemini-flash-thinking-auto': { provider: 'gemini', model: 'gemini-3-flash-preview' },
    'gemini-3-pro-thinking-low': { provider: 'gemini', model: 'gemini-3-pro-preview' },
    'gemini-3-pro-thinking-high': { provider: 'gemini', model: 'gemini-3-pro-preview' },
    // Groq Models
    'llama-3.3-70b': { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    'moonshotai/kimi-k2-instruct-0905': { provider: 'groq', model: 'moonshotai/kimi-k2-instruct-0905' },
    // Cerebras Models
    'zai-glm-4.6': { provider: 'cerebras', model: 'zai-glm-4.6' },
};

/**
 * Get AgentKit model instance from model ID
 * Uses exact mappings from src/services/agent/providers/index.ts
 */
function getModel(modelId: string) {
    // Handle inherit/default case
    if (modelId === 'inherit' || !modelId) {
        return undefined;
    }

    // Check exact mapping first
    const mapping = MODEL_MAPPINGS[modelId];
    if (mapping) {
        switch (mapping.provider) {
            case 'gemini':
                return gemini({ model: mapping.model });
            case 'groq':
                return openai({ model: mapping.model, baseUrl: 'https://api.groq.com/openai/v1' });
            case 'cerebras':
                return openai({ model: mapping.model, baseUrl: 'https://api.cerebras.ai/v1' });
            case 'anthropic':
                return anthropic({ model: mapping.model, defaultParameters: { max_tokens: 4096, temperature: 0.7 } });
            case 'openai':
                return openai({ model: mapping.model });
        }
    }

    // Fallback for unmapped models - try to infer provider
    if (modelId.includes('gemini') || modelId.includes('flash') || modelId.includes('pro')) {
        return gemini({ model: modelId });
    }
    if (modelId.includes('llama') || modelId.includes('kimi') || modelId.includes('moonshot')) {
        return openai({ model: modelId, baseUrl: 'https://api.groq.com/openai/v1' });
    }
    if (modelId.includes('zai') || modelId.includes('cerebras')) {
        return openai({ model: modelId, baseUrl: 'https://api.cerebras.ai/v1' });
    }
    if (modelId.includes('claude')) {
        return anthropic({ model: modelId, defaultParameters: { max_tokens: 4096, temperature: 0.7 } });
    }
    if (modelId.includes('gpt')) {
        return openai({ model: modelId });
    }

    // Default to Gemini
    console.log(`[SubagentFactory] Unknown model '${modelId}', defaulting to Gemini provider`);
    return gemini({ model: modelId });
}

// ===========================
// Tool Management
// ===========================

/**
 * Get tools based on permission configuration
 */
function getTools(permission: SubagentConfig['tools']): AgentKitTool[] {
    if (permission === 'all') {
        return getAllTools();
    }

    return getToolsByNames(permission);
}

/**
 * Validate that all specified tools exist
 */
function validateTools(toolNames: string[]): { valid: boolean; missing: string[] } {
    const availableTools = getAllTools();
    const availableNames = new Set(availableTools.map(t => t.name));
    const missing = toolNames.filter(name => !availableNames.has(name));

    return {
        valid: missing.length === 0,
        missing,
    };
}

// ===========================
// Factory Class
// ===========================

export class SubagentFactory {
    /**
     * Create an AgentKit agent from subagent configuration
     */
    static create(config: SubagentConfig): AgentKitAgent<any> {
        // Validate first
        const validation = this.validate(config);
        if (!validation.valid) {
            throw new Error(`Invalid subagent config: ${validation.errors.join(', ')}`);
        }

        // Get tools
        const tools = getTools(config.tools);

        // Get model (undefined for 'inherit')
        const model = getModel(config.model);

        // Create AgentKit agent
        const agent = createAgent({
            name: config.name,
            description: config.description,
            system: config.systemPrompt,
            model: model || undefined,
            tools,
        });

        console.log(`[SubagentFactory] Created agent '${config.name}' (${config.id})`);
        console.log(`  - Model: ${config.model}`);
        console.log(`  - Tools: ${config.tools === 'all' ? 'all' : config.tools.length}`);

        return agent;
    }

    /**
     * Validate that a config can create a working agent
     */
    static validate(config: SubagentConfig): SubagentValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate tools
        if (Array.isArray(config.tools)) {
            const toolValidation = validateTools(config.tools);
            if (!toolValidation.valid) {
                errors.push(`Invalid tools: ${toolValidation.missing.join(', ')}`);
            }

            if (config.tools.length === 0) {
                warnings.push('Agent has no tools - it will not be able to take actions');
            }
        }

        // Model validation: now accepts all model IDs, getModel handles mapping
        // No validation needed - getModel will handle unknown models gracefully

        // Validate system prompt (make it lenient - just needs to exist)
        if (!config.systemPrompt || config.systemPrompt.trim().length < 10) {
            warnings.push('System prompt is very short - consider adding more context');
        }

        // Validate execution settings
        if (config.maxIterations < 1 || config.maxIterations > 50) {
            errors.push('maxIterations must be between 1 and 50');
        }

        if (config.temperature < 0 || config.temperature > 2) {
            errors.push('temperature must be between 0 and 2');
        }

        if (config.maxTokens && (config.maxTokens < 100 || config.maxTokens > 100000)) {
            errors.push('maxTokens must be between 100 and 100000');
        }

        // Validate routing config
        if (config.keywords.length === 0 && config.patterns.length === 0) {
            warnings.push('No keywords or patterns defined - routing may be less accurate');
        }

        // Validate regex patterns
        for (const pattern of config.patterns) {
            try {
                new RegExp(pattern);
            } catch (error) {
                errors.push(`Invalid regex pattern: ${pattern}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * Validate with enhanced permission checking
     */
    static validateWithPermissions(config: SubagentConfig): SubagentValidationResult {
        const baseValidation = this.validate(config);
        const errors = [...baseValidation.errors];
        const warnings = [...(baseValidation.warnings || [])];

        // Use permission manager for additional validation
        const compatibility = toolPermissionManager.validateToolList(config);
        errors.push(...compatibility.issues);
        warnings.push(...compatibility.warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    /**
     * Get AI-powered tool suggestions based on description
     */
    static suggestTools(description: string): {
        suggested: string[];
        reasoning: string[];
    } {
        return suggestToolsFromDescription(description);
    }

    /**
     * Test that an agent can be created without errors
     */
    static test(config: SubagentConfig): { success: boolean; error?: string } {
        try {
            const agent = this.create(config);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get available models
     */
    static getAvailableModels(): Array<{
        id: ModelId;
        name: string;
        provider: string;
        description: string;
    }> {
        return [
            {
                id: 'inherit',
                name: 'Inherit from Network',
                provider: 'System',
                description: 'Use the default model from the network configuration',
            },
            {
                id: 'gemini-3-flash',
                name: 'Gemini 3 Flash',
                provider: 'Google',
                description: 'Fast, efficient model for most tasks',
            },
            {
                id: 'gemini-3-pro',
                name: 'Gemini 3 Pro',
                provider: 'Google',
                description: 'Advanced model for complex reasoning',
            },
            {
                id: 'claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                provider: 'Anthropic',
                description: 'Excellent for code review and analysis',
            },
            {
                id: 'claude-3.5-haiku',
                name: 'Claude 3.5 Haiku',
                provider: 'Anthropic',
                description: 'Fast model for quick tasks',
            },
            {
                id: 'grok-beta',
                name: 'Grok Beta',
                provider: 'xAI',
                description: 'Real-time data and current events',
            },
            {
                id: 'gpt-4',
                name: 'GPT-4',
                provider: 'OpenAI',
                description: 'General-purpose advanced model',
            },
        ];
    }

    /**
     * Get tool statistics for config
     */
    static getToolStats(config: SubagentConfig): {
        totalAvailable: number;
        granted: number;
        percentage: number;
        toolNames: string[];
    } {
        const allTools = getAllTools();
        const grantedTools = config.tools === 'all' ? allTools : getToolsByNames(config.tools);

        return {
            totalAvailable: allTools.length,
            granted: grantedTools.length,
            percentage: (grantedTools.length / allTools.length) * 100,
            toolNames: grantedTools.map(t => t.name),
        };
    }

    /**
     * Create a minimal working agent for testing
     */
    static createMinimal(): AgentKitAgent<any> {
        return createAgent({
            name: 'Test Agent',
            description: 'A minimal agent for testing',
            system: 'You are a test agent. Respond concisely.',
            model: gemini({ model: 'gemini-3-flash-preview' }),
            tools: [],
        });
    }
}
