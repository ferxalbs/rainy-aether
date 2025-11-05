/**
 * Tool Registry
 *
 * Central registry for all available tools. Manages tool registration,
 * discovery, and metadata.
 */

import type {
  ToolDefinition,
  ToolRegistryStats,
  PermissionLevel,
} from './types';
import { ToolNotFoundError } from './types';

/**
 * Tool registry singleton
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private executionCounts = new Map<string, number>();
  private executionTimes = new Map<string, number[]>();

  /**
   * Register a tool
   */
  register<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool as ToolDefinition);
    this.executionCounts.set(tool.name, 0);
    this.executionTimes.set(tool.name, []);

    console.log(
      `[ToolRegistry] Registered tool: ${tool.name} (${tool.category}, ${tool.permissionLevel})`
    );
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    const deleted = this.tools.delete(toolName);
    if (deleted) {
      this.executionCounts.delete(toolName);
      this.executionTimes.delete(toolName);
      console.log(`[ToolRegistry] Unregistered tool: ${toolName}`);
    }
    return deleted;
  }

  /**
   * Get a tool by name
   */
  get(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get a tool or throw error
   */
  getOrThrow(toolName: string): ToolDefinition {
    const tool = this.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }
    return tool;
  }

  /**
   * Check if tool exists
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * List all tools
   */
  listAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return this.listAll().filter(tool => tool.category === category);
  }

  /**
   * List tools by permission level
   */
  listByPermission(level: PermissionLevel): ToolDefinition[] {
    return this.listAll().filter(tool => tool.permissionLevel === level);
  }

  /**
   * List cacheable tools
   */
  listCacheable(): ToolDefinition[] {
    return this.listAll().filter(tool => tool.cacheable);
  }

  /**
   * List tools supporting parallel execution
   */
  listParallel(): ToolDefinition[] {
    return this.listAll().filter(tool => tool.supportsParallel);
  }

  /**
   * Search tools by name or description
   */
  search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.listAll().filter(
      tool =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Record tool execution
   */
  recordExecution(toolName: string, durationMs: number): void {
    // Increment execution count
    const count = this.executionCounts.get(toolName) || 0;
    this.executionCounts.set(toolName, count + 1);

    // Record execution time (keep last 100)
    const times = this.executionTimes.get(toolName) || [];
    times.push(durationMs);
    if (times.length > 100) {
      times.shift();
    }
    this.executionTimes.set(toolName, times);
  }

  /**
   * Get execution count for a tool
   */
  getExecutionCount(toolName: string): number {
    return this.executionCounts.get(toolName) || 0;
  }

  /**
   * Get average execution time for a tool
   */
  getAverageExecutionTime(toolName: string): number {
    const times = this.executionTimes.get(toolName) || [];
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Get registry statistics
   */
  getStats(): ToolRegistryStats {
    const tools = this.listAll();

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const tool of tools) {
      byCategory[tool.category] = (byCategory[tool.category] || 0) + 1;
    }

    // Count by permission
    const byPermission: Record<PermissionLevel, number> = {
      user: 0,
      admin: 0,
      restricted: 0,
    };
    for (const tool of tools) {
      byPermission[tool.permissionLevel]++;
    }

    // Total executions
    let totalExecutions = 0;
    for (const count of this.executionCounts.values()) {
      totalExecutions += count;
    }

    // Average execution time
    const allTimes: number[] = [];
    for (const times of this.executionTimes.values()) {
      allTimes.push(...times);
    }
    const averageExecutionTime =
      allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;

    return {
      totalTools: tools.length,
      byCategory,
      byPermission,
      totalExecutions,
      cacheHitRate: 0, // Calculated by cache service
      averageExecutionTime,
    };
  }

  /**
   * Get tool metadata for AI model
   *
   * Formats tools in the structure expected by Vercel AI SDK
   */
  getToolsForAI(permissionLevel: PermissionLevel = 'user'): Record<string, any> {
    const availableTools = this.listAll().filter(tool => {
      // Filter by permission level
      if (permissionLevel === 'user') {
        return tool.permissionLevel === 'user';
      } else if (permissionLevel === 'admin') {
        return tool.permissionLevel === 'user' || tool.permissionLevel === 'admin';
      }
      return true; // restricted includes all
    });

    const toolsForAI: Record<string, any> = {};

    for (const tool of availableTools) {
      toolsForAI[tool.name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
        // execute will be bound during tool execution
      };
    }

    return toolsForAI;
  }

  /**
   * Clear all tools (for testing)
   */
  clear(): void {
    this.tools.clear();
    this.executionCounts.clear();
    this.executionTimes.clear();
    console.log('[ToolRegistry] Cleared all tools');
  }

  /**
   * Get tool count
   */
  get size(): number {
    return this.tools.size;
  }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

/**
 * Get tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

/**
 * Reset tool registry (for testing)
 */
export function resetToolRegistry(): void {
  registryInstance = null;
}
