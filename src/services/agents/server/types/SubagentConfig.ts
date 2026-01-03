/**
 * Subagent Configuration Types
 * 
 * Defines the schema and types for dynamic, user-configurable subagents.
 * Follows Anthropic's subagent patterns with multi-model AI support.
 */

import { z } from 'zod';

// ===========================
// Model Types
// ===========================

export const ModelIdSchema = z.enum([
    'inherit',              // Use network default
    'gemini-3-flash',       // Gemini Flash (fast)
    'gemini-3-pro',         // Gemini Pro (smart)
    'claude-3.5-sonnet',    // Claude Sonnet (analysis)
    'claude-3.5-haiku',     // Claude Haiku (fast)
    'grok-beta',            // xAI Grok (real-time)
    'gpt-4',                // OpenAI GPT-4 (general)
]);

export type ModelId = z.infer<typeof ModelIdSchema>;

// ===========================
// Tool Permission Types
// ===========================

export const ToolPermissionSchema = z.union([
    z.literal('all'),       // Inherit all tools from parent
    z.array(z.string()),    // Specific tool whitelist
]);

export type ToolPermission = z.infer<typeof ToolPermissionSchema>;

// ===========================
// Subagent Scope
// ===========================

export const SubagentScopeSchema = z.enum([
    'user',      // User-level (~/.rainy/agents/)
    'project',   // Project-level (.rainy/agents/)
    'plugin',    // Plugin-provided (plugins/*/agents/)
]);

export type SubagentScope = z.infer<typeof SubagentScopeSchema>;

// ===========================
// Main Configuration Schema
// ===========================

/**
 * Complete subagent configuration
 */
export const SubagentConfigSchema = z.object({
    // Identity
    name: z.string()
        .min(1, 'Name is required')
        .max(50, 'Name must be 50 characters or less'),

    id: z.string()
        .regex(/^[a-z0-9-]+$/, 'ID must be lowercase letters, numbers, and hyphens only')
        .min(1, 'ID is required')
        .max(50, 'ID must be 50 characters or less'),

    description: z.string()
        .min(10, 'Description must be at least 10 characters')
        .max(500, 'Description must be 500 characters or less'),

    version: z.string()
        .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)')
        .default('1.0.0'),

    // Behavior
    systemPrompt: z.string()
        .min(50, 'System prompt must be at least 50 characters')
        .max(10000, 'System prompt must be 10000 characters or less'),

    model: ModelIdSchema.default('inherit'),

    // Tool Permissions
    tools: ToolPermissionSchema.default('all'),

    // Routing Configuration
    keywords: z.array(z.string())
        .default([])
        .describe('Keywords for pattern-based routing'),

    patterns: z.array(z.string())
        .default([])
        .describe('Regex patterns for routing (as strings)'),

    priority: z.number()
        .min(0, 'Priority must be at least 0')
        .max(100, 'Priority must be at most 100')
        .default(50)
        .describe('Routing priority (0-100, higher = more likely to be selected)'),

    // Execution Settings
    maxIterations: z.number()
        .min(1, 'Max iterations must be at least 1')
        .max(50, 'Max iterations must be at most 50')
        .default(15)
        .describe('Maximum tool call iterations'),

    temperature: z.number()
        .min(0, 'Temperature must be at least 0')
        .max(2, 'Temperature must be at most 2')
        .default(0.7)
        .describe('Model temperature (0 = deterministic, 2 = creative)'),

    maxTokens: z.number()
        .min(100)
        .max(100000)
        .optional()
        .describe('Maximum tokens for responses'),

    // Metadata
    author: z.string()
        .optional()
        .describe('Agent creator'),

    tags: z.array(z.string())
        .default([])
        .describe('Tags for organization and search'),

    scope: SubagentScopeSchema,

    enabled: z.boolean()
        .default(true)
        .describe('Whether this agent is active'),

    // Analytics (managed by system)
    createdAt: z.string()
        .datetime()
        .default(() => new Date().toISOString()),

    updatedAt: z.string()
        .datetime()
        .default(() => new Date().toISOString()),

    usageCount: z.number()
        .int()
        .min(0)
        .default(0)
        .describe('Number of times this agent has been used'),

    successRate: z.number()
        .min(0)
        .max(1)
        .optional()
        .describe('Success rate (0.0-1.0)'),
});

export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;

// ===========================
// File Format Types
// ===========================

/**
 * Subagent file structure (YAML frontmatter + markdown)
 */
export interface SubagentFile {
    /**
     * YAML frontmatter (all config except systemPrompt)
     */
    frontmatter: Omit<SubagentConfig, 'systemPrompt'>;

    /**
     * Markdown content (system prompt)
     */
    systemPrompt: string;
}

/**
 * Partial config for creating new subagents
 */
export const CreateSubagentSchema = SubagentConfigSchema.omit({
    createdAt: true,
    updatedAt: true,
    usageCount: true,
    successRate: true,
});

export type CreateSubagentConfig = z.infer<typeof CreateSubagentSchema>;

/**
 * Partial config for updating existing subagents
 */
export const UpdateSubagentSchema = SubagentConfigSchema.partial().required({ id: true });

export type UpdateSubagentConfig = z.infer<typeof UpdateSubagentSchema>;

// ===========================
// Validation Result
// ===========================

export interface SubagentValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}

// ===========================
// Analytics Types
// ===========================

export interface SubagentStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgDurationMs: number;
    totalTokensUsed: number;
    avgTokensPerExecution: number;
    commonTools: Array<{ name: string; count: number }>;
    lastUsed?: string;
}

export interface SubagentExecution {
    id: number;
    subagentId: string;
    task: string;
    success: boolean;
    durationMs: number;
    tokensUsed?: number;
    toolCalls?: number;
    errorMessage?: string;
    createdAt: string;
}

// ===========================
// Export Helpers
// ===========================

/**
 * Create a default subagent config
 */
export function createDefaultSubagentConfig(
    overrides: Partial<CreateSubagentConfig>
): CreateSubagentConfig {
    return CreateSubagentSchema.parse({
        name: 'New Agent',
        id: 'new-agent',
        description: 'A custom agent for specific tasks',
        systemPrompt: 'You are a helpful AI assistant specialized in specific tasks.',
        scope: 'project',
        ...overrides,
    });
}

/**
 * Validate a subagent config
 */
export function validateSubagentConfig(
    config: unknown
): SubagentValidationResult {
    try {
        SubagentConfigSchema.parse(config);
        return { valid: true, errors: [] };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                valid: false,
                errors: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`),
            };
        }
        return {
            valid: false,
            errors: ['Unknown validation error'],
        };
    }
}
