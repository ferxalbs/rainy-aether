/**
 * LangGraph Rust Bridge
 *
 * This module bridges LangGraph with the Rust agent backend, allowing LangGraph
 * to execute tools implemented in Rust for maximum performance while maintaining
 * LangGraph's advanced reasoning capabilities.
 *
 * Architecture:
 * 1. Load tool definitions from Rust via Tauri IPC
 * 2. Convert each Rust tool to a LangChain DynamicTool
 * 3. LangGraph can then use these tools in ReAct agents
 * 4. Tool execution happens in Rust, results return to LangGraph
 */

import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as RustCommands from '../rust/commands';
import type { ToolDefinition, ToolResult } from '@/types/rustAgent';

/**
 * Bridge between LangGraph and Rust tools
 *
 * This class loads tool definitions from the Rust backend and creates
 * LangChain DynamicTool instances that execute via Tauri IPC.
 *
 * @example
 * ```typescript
 * // Initialize the bridge
 * await rustBridge.initialize();
 *
 * // Get all tools for LangGraph
 * const tools = rustBridge.getAllTools();
 *
 * // Create ReAct agent with Rust tools
 * const agent = createReactAgent({
 *   llm: model,
 *   tools, // Rust-backed tools!
 *   checkpointSaver: new MemorySaver(),
 * });
 * ```
 */
export class LangGraphRustBridge {
  private rustTools: Map<string, DynamicTool> = new Map();
  private toolDefinitions: Map<string, ToolDefinition> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize bridge by loading all Rust tools
   *
   * This method:
   * 1. Fetches tool definitions from Rust backend
   * 2. Converts each to a LangChain DynamicTool
   * 3. Caches the tools for future use
   *
   * This operation is idempotent - calling multiple times is safe.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔗 Rust bridge already initialized');
      return;
    }

    console.log('🔗 Initializing Rust tool bridge...');

    try {
      // Get tool definitions from Rust backend
      const rustToolDefs = await RustCommands.listTools();

      console.log(`📦 Found ${rustToolDefs.length} tools from Rust backend:`);
      rustToolDefs.forEach((tool) => console.log(`   ✓ ${tool.name}`));

      // Convert each Rust tool to LangChain DynamicTool
      for (const toolDef of rustToolDefs) {
        const langChainTool = this.createLangChainTool(toolDef);
        this.rustTools.set(toolDef.name, langChainTool);
        this.toolDefinitions.set(toolDef.name, toolDef);
      }

      this.initialized = true;
      console.log(
        `✅ Rust tool bridge initialized with ${this.rustTools.size} tools`
      );
    } catch (error) {
      console.error('❌ Failed to initialize Rust tool bridge:', error);
      throw new Error(
        `Rust tool bridge initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Convert Rust tool definition to LangChain DynamicTool
   *
   * @param toolDef - Rust tool definition
   * @returns LangChain DynamicTool that executes via Rust backend
   */
  private createLangChainTool(toolDef: ToolDefinition): DynamicTool {
    return new DynamicTool({
      name: toolDef.name,
      description: toolDef.description,

      // Schema for LangChain
      // For now, we use a simplified schema that accepts any JSON object
      // In the future, we could convert the Rust JSON schema to Zod dynamically
      schema: z.object({
        input: z
          .string()
          .or(z.record(z.unknown()))
          .describe('Tool input as JSON string or object'),
      }),

      // Execute via Rust backend
      func: async (input: string | Record<string, unknown>, config?: any) => {
        try {
          console.log(`🔧 Executing Rust tool: ${toolDef.name}`);

          // Extract workspace context from LangGraph config
          const workspaceRoot = config?.configurable?.workspaceRoot;
          const sessionId = config?.configurable?.sessionId;

          if (workspaceRoot) {
            console.log(`📂 Tool has workspace context: ${workspaceRoot}`);
          } else {
            console.warn(`⚠️ Tool executing without workspace context`);
          }

          // Parse input if it's a string
          let params: Record<string, unknown>;
          if (typeof input === 'string') {
            try {
              params = JSON.parse(input);
            } catch {
              // If parsing fails, treat as plain input
              params = { input };
            }
          } else {
            params = input;
          }

          // Inject workspace context into tool params
          if (workspaceRoot) {
            params._workspaceRoot = workspaceRoot;
          }
          if (sessionId) {
            params._sessionId = sessionId;
          }

          // Execute via Rust backend
          const result: ToolResult = await RustCommands.executeTool(
            toolDef.name,
            params
          );

          // Return result as string (LangChain requirement)
          if (result.success) {
            // If output is already a string, return it
            if (typeof result.output === 'string') {
              return result.output;
            }
            // Otherwise, stringify the output
            return JSON.stringify(result.output);
          } else {
            const errorMsg = result.error || 'Tool execution failed';
            console.error(`❌ Tool execution failed: ${toolDef.name}`, errorMsg);
            throw new Error(errorMsg);
          }
        } catch (error) {
          console.error(`❌ Tool execution error: ${toolDef.name}`, error);
          throw error instanceof Error
            ? error
            : new Error(`Tool execution failed: ${String(error)}`);
        }
      },
    });
  }

  /**
   * Get all Rust tools as LangChain tools
   *
   * @returns Array of LangChain DynamicTools backed by Rust
   * @throws Error if bridge is not initialized
   */
  getAllTools(): DynamicTool[] {
    this.checkInitialized();
    return Array.from(this.rustTools.values());
  }

  /**
   * Get specific tools by name
   *
   * @param names - Array of tool names to retrieve
   * @returns Array of LangChain DynamicTools (only found tools)
   * @throws Error if bridge is not initialized
   */
  getTools(names: string[]): DynamicTool[] {
    this.checkInitialized();

    return names
      .map((name) => this.rustTools.get(name))
      .filter((tool): tool is DynamicTool => tool !== undefined);
  }

  /**
   * Get a single tool by name
   *
   * @param name - Tool name
   * @returns LangChain DynamicTool or undefined if not found
   * @throws Error if bridge is not initialized
   */
  getTool(name: string): DynamicTool | undefined {
    this.checkInitialized();
    return this.rustTools.get(name);
  }

  /**
   * Get tool definition (metadata) by name
   *
   * @param name - Tool name
   * @returns Rust tool definition or undefined if not found
   * @throws Error if bridge is not initialized
   */
  getToolDefinition(name: string): ToolDefinition | undefined {
    this.checkInitialized();
    return this.toolDefinitions.get(name);
  }

  /**
   * Get all tool definitions
   *
   * @returns Array of all Rust tool definitions
   * @throws Error if bridge is not initialized
   */
  getAllToolDefinitions(): ToolDefinition[] {
    this.checkInitialized();
    return Array.from(this.toolDefinitions.values());
  }

  /**
   * Check if a tool exists
   *
   * @param name - Tool name
   * @returns True if tool exists, false otherwise
   */
  hasTool(name: string): boolean {
    return this.initialized && this.rustTools.has(name);
  }

  /**
   * Get the number of loaded tools
   *
   * @returns Number of tools
   */
  getToolCount(): number {
    return this.rustTools.size;
  }

  /**
   * Check if bridge is initialized
   *
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset the bridge (for testing purposes)
   *
   * Clears all loaded tools and resets initialization state.
   */
  reset(): void {
    this.rustTools.clear();
    this.toolDefinitions.clear();
    this.initialized = false;
    console.log('🔄 Rust tool bridge reset');
  }

  /**
   * Check if bridge is initialized and throw if not
   *
   * @throws Error if bridge is not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Rust tool bridge not initialized. Call initialize() first.'
      );
    }
  }
}

// ============================================================================
// Global Singleton Instance
// ============================================================================

/**
 * Global singleton instance of the Rust bridge
 *
 * Use this instance throughout the application to ensure tools are
 * loaded only once and shared across all agents.
 */
export const rustBridge = new LangGraphRustBridge();

/**
 * Get the global Rust bridge instance
 *
 * @returns The singleton Rust bridge instance
 */
export function getRustBridge(): LangGraphRustBridge {
  return rustBridge;
}

/**
 * Initialize the global Rust bridge
 *
 * Convenience function that initializes the singleton instance.
 * This is idempotent - safe to call multiple times.
 *
 * @example
 * ```typescript
 * // Initialize once at app startup
 * await initializeRustBridge();
 *
 * // Now all agents can use the tools
 * const tools = getRustBridge().getAllTools();
 * ```
 */
export async function initializeRustBridge(): Promise<void> {
  await rustBridge.initialize();
}
