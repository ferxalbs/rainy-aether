/**
 * Tool Permission Manager
 * 
 * Provides runtime validation and enforcement of tool permissions for subagents.
 * Ensures subagents can only access tools they're configured to use.
 */

import type { SubagentConfig } from '../types/SubagentConfig';
import { getAllTools, getToolMetadata, type AgentKitTool } from '../tools/agentkit';

// ===========================
// Types
// ===========================

export interface ToolPermissionCheck {
    allowed: boolean;
    reason?: string;
    suggestion?: string;
}

export interface ToolCompatibility {
    compatible: boolean;
    issues: string[];
    warnings: string[];
}

export interface ToolUsageReport {
    toolName: string;
    allowed: boolean;
    riskLevel: 'safe' | 'moderate' | 'destructive';
    timestamp: string;
}

// ===========================
// Permission Validator
// ===========================

export class ToolPermissionManager {
    private usageHistory: Map<string, ToolUsageReport[]> = new Map();

    /**
     * Check if a subagent is allowed to use a specific tool
     */
    checkPermission(config: SubagentConfig, toolName: string): ToolPermissionCheck {
        // If 'all' tools are granted, allow
        if (config.tools === 'all') {
            return {
                allowed: true,
                reason: 'Agent has access to all tools',
            };
        }

        // Check if tool is in whitelist
        if (config.tools.includes(toolName)) {
            return {
                allowed: true,
                reason: 'Tool is in agent whitelist',
            };
        }

        // Tool not allowed
        const metadata = getToolMetadata(toolName);
        const suggestion = metadata
            ? `Add "${toolName}" to the tools array in agent config, or set tools: 'all'`
            : `Tool "${toolName}" does not exist`;

        return {
            allowed: false,
            reason: 'Tool not in agent whitelist',
            suggestion,
        };
    }

    /**
     * Validate all tools in a config
     */
    validateToolList(config: SubagentConfig): ToolCompatibility {
        const issues: string[] = [];
        const warnings: string[] = [];

        // If 'all', no validation needed
        if (config.tools === 'all') {
            return { compatible: true, issues: [], warnings: [] };
        }

        const allTools = getAllTools();
        const allToolNames = new Set(allTools.map(t => t.name));

        // Check each tool exists
        for (const toolName of config.tools) {
            if (!allToolNames.has(toolName)) {
                issues.push(`Tool "${toolName}" does not exist`);
            }
        }

        // Warn if no tools
        if (config.tools.length === 0) {
            warnings.push('Agent has no tools - it will not be able to take actions');
        }

        // Warn about destructive tools
        const destructiveTools = config.tools.filter(name => {
            const meta = getToolMetadata(name);
            return meta?.riskLevel === 'destructive';
        });

        if (destructiveTools.length > 0) {
            warnings.push(
                `Agent has access to destructive tools: ${destructiveTools.join(', ')}`
            );
        }

        return {
            compatible: issues.length === 0,
            issues,
            warnings,
        };
    }

    /**
     * Get recommended tools for a task type
     */
    getRecommendedTools(taskType: 'read-only' | 'write' | 'execute' | 'full'): string[] {
        const allTools = getAllTools();

        switch (taskType) {
            case 'read-only':
                return allTools
                    .filter(t => {
                        const meta = getToolMetadata(t.name);
                        return meta?.riskLevel === 'safe';
                    })
                    .map(t => t.name);

            case 'write':
                return allTools
                    .filter(t => {
                        const meta = getToolMetadata(t.name);
                        return meta?.category === 'read' || meta?.category === 'write';
                    })
                    .map(t => t.name);

            case 'execute':
                return allTools
                    .filter(t => {
                        const meta = getToolMetadata(t.name);
                        return meta?.category !== 'git'; // Everything except git
                    })
                    .map(t => t.name);

            case 'full':
                return allTools.map(t => t.name);

            default:
                return [];
        }
    }

    /**
     * Check if tools are compatible with agent's purpose
     */
    checkToolCompatibility(
        config: SubagentConfig,
        requiredCapabilities: string[]
    ): ToolCompatibility {
        const issues: string[] = [];
        const warnings: string[] = [];

        if (config.tools === 'all') {
            // Has all capabilities
            return { compatible: true, issues: [], warnings: [] };
        }

        const toolNames = new Set(config.tools);

        // Check for required capabilities
        for (const capability of requiredCapabilities) {
            const hasCapability = Array.from(toolNames).some(name => {
                const meta = getToolMetadata(name);
                return meta?.category === capability || name.includes(capability);
            });

            if (!hasCapability) {
                issues.push(`Missing tools for capability: ${capability}`);
            }
        }

        return {
            compatible: issues.length === 0,
            issues,
            warnings,
        };
    }

    /**
     * Record tool usage for analytics
     */
    recordUsage(agentId: string, toolName: string, allowed: boolean): void {
        if (!this.usageHistory.has(agentId)) {
            this.usageHistory.set(agentId, []);
        }

        const metadata = getToolMetadata(toolName);
        const report: ToolUsageReport = {
            toolName,
            allowed,
            riskLevel: metadata?.riskLevel || 'safe',
            timestamp: new Date().toISOString(),
        };

        this.usageHistory.get(agentId)!.push(report);

        // Keep only last 100 records per agent
        const history = this.usageHistory.get(agentId)!;
        if (history.length > 100) {
            this.usageHistory.set(agentId, history.slice(-100));
        }
    }

    /**
     * Get usage statistics for an agent
     */
    getUsageStats(agentId: string): {
        totalAttempts: number;
        allowedUses: number;
        deniedUses: number;
        toolsUsed: string[];
        riskProfile: Record<string, number>;
    } {
        const history = this.usageHistory.get(agentId) || [];

        const toolsUsed = [...new Set(history.filter(h => h.allowed).map(h => h.toolName))];

        const riskProfile: Record<string, number> = {
            safe: 0,
            moderate: 0,
            destructive: 0,
        };

        for (const record of history) {
            if (record.allowed) {
                riskProfile[record.riskLevel]++;
            }
        }

        return {
            totalAttempts: history.length,
            allowedUses: history.filter(h => h.allowed).length,
            deniedUses: history.filter(h => !h.allowed).length,
            toolsUsed,
            riskProfile,
        };
    }

    /**
     * Clear usage history
     */
    clearHistory(agentId?: string): void {
        if (agentId) {
            this.usageHistory.delete(agentId);
        } else {
            this.usageHistory.clear();
        }
    }

    /**
     * Get all agents with tool violations
     */
    getViolations(): Array<{ agentId: string; deniedCount: number }> {
        const violations: Array<{ agentId: string; deniedCount: number }> = [];

        for (const [agentId, history] of this.usageHistory.entries()) {
            const deniedCount = history.filter(h => !h.allowed).length;
            if (deniedCount > 0) {
                violations.push({ agentId, deniedCount });
            }
        }

        return violations.sort((a, b) => b.deniedCount - a.deniedCount);
    }
}

// ===========================
// Tool Compatibility Checker
// ===========================

/**
 * Check if a set of tools provides sufficient capabilities
 */
export function checkToolCapabilities(
    toolNames: string[],
    requiredCapabilities: Array<'read' | 'write' | 'execute' | 'git' | 'analysis'>
): {
    satisfied: boolean;
    missing: string[];
    available: string[];
} {
    const available: string[] = [];
    const missing: string[] = [];

    for (const capability of requiredCapabilities) {
        const hasTool = toolNames.some(name => {
            const meta = getToolMetadata(name);
            return meta?.category === capability;
        });

        if (hasTool) {
            available.push(capability);
        } else {
            missing.push(capability);
        }
    }

    return {
        satisfied: missing.length === 0,
        missing,
        available,
    };
}

/**
 * Suggest tools based on agent description
 */
export function suggestToolsFromDescription(description: string): {
    suggested: string[];
    reasoning: string[];
} {
    const lowerDesc = description.toLowerCase();
    const suggested: string[] = [];
    const reasoning: string[] = [];

    // Read operations
    if (lowerDesc.includes('read') || lowerDesc.includes('analyze') || lowerDesc.includes('review')) {
        suggested.push('read_file', 'list_dir', 'search_code', 'get_project_context');
        reasoning.push('Description mentions reading/analyzing - added read tools');
    }

    // Write operations
    if (lowerDesc.includes('write') || lowerDesc.includes('create') || lowerDesc.includes('edit')) {
        suggested.push('create_file', 'write_file', 'edit_file');
        reasoning.push('Description mentions writing/creating - added write tools');
    }

    // Execute operations
    if (lowerDesc.includes('run') || lowerDesc.includes('test') || lowerDesc.includes('execute')) {
        suggested.push('run_command', 'run_tests');
        reasoning.push('Description mentions running/testing - added execute tools');
    }

    // Git operations
    if (lowerDesc.includes('git') || lowerDesc.includes('commit') || lowerDesc.includes('version')) {
        suggested.push('git_status', 'git_diff', 'git_add', 'git_commit');
        reasoning.push('Description mentions git - added git tools');
    }

    // Analysis
    if (lowerDesc.includes('diagnostic') || lowerDesc.includes('lint') || lowerDesc.includes('error')) {
        suggested.push('get_diagnostics', 'analyze_file');
        reasoning.push('Description mentions diagnostics - added analysis tools');
    }

    // Documentation
    if (lowerDesc.includes('document') || lowerDesc.includes('explain')) {
        suggested.push('read_file', 'list_dir', 'analyze_imports');
        reasoning.push('Description mentions documentation - added read/analysis tools');
    }

    return {
        suggested: [...new Set(suggested)], // Remove duplicates
        reasoning,
    };
}

// ===========================
// Singleton Instance
// ===========================

export const toolPermissionManager = new ToolPermissionManager();
