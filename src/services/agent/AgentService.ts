import { invoke } from '@tauri-apps/api/core';
import { ChatMessage } from '@/types/chat';
import { toolRegistry } from './ToolRegistry';
import { AIProvider, StreamChunk, createProvider, ProviderCredentials, getModelConfig } from './providers';
import { getContextStatus, truncateToFitContext } from './TokenCounter';
import { brainService } from '@/services/BrainService';
import { getIDEState } from '@/stores/ideStore';

// Server URL for agent server (Brain sidecar)
const AGENT_SERVER_URL = 'http://localhost:3002';

/**
 * Sync MCP tools from connected servers to the ToolRegistry
 * This enables the agent to use MCP tools like context7, firebase, etc.
 */
async function syncMCPTools(): Promise<number> {
  try {
    // Clear existing MCP tools first
    toolRegistry.clearMCPTools();

    // Fetch connected servers and their tools
    const response = await fetch(`${AGENT_SERVER_URL}/api/agentkit/mcp/connected`);
    if (!response.ok) return 0;

    const data = await response.json();
    if (!data.connected || data.connected.length === 0) return 0;

    // Fetch tools for each connected server
    const allTools: Array<{
      serverName: string;
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

    for (const server of data.connected) {
      try {
        const toolsResponse = await fetch(`${AGENT_SERVER_URL}/api/agentkit/mcp/servers/${server.name}/tools`);
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          if (toolsData.tools) {
            for (const tool of toolsData.tools) {
              allTools.push({
                serverName: server.name,
                name: tool.name,
                description: tool.description || '',
                inputSchema: tool.inputSchema || {},
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[syncMCPTools] Failed to fetch tools from ${server.name}:`, err);
      }
    }

    if (allTools.length === 0) return 0;

    // Create a callTool function that routes to the agent server
    const callTool = async (
      serverName: string,
      toolName: string,
      args: Record<string, unknown>
    ) => {
      const callResponse = await fetch(
        `${AGENT_SERVER_URL}/api/agentkit/mcp/servers/${serverName}/tools/${toolName}/call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ arguments: args }),
        }
      );

      if (!callResponse.ok) {
        return {
          success: false,
          content: [],
          error: `MCP call failed: ${callResponse.statusText}`,
        };
      }

      return await callResponse.json();
    };

    // Register all MCP tools
    return await toolRegistry.registerMCPTools(allTools, callTool);

  } catch (error) {
    console.warn('[syncMCPTools] Failed to sync MCP tools:', error);
    return 0;
  }
}

// ===========================
// Configuration
// ===========================

interface AgentConfig {
  sessionId: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

// ===========================
// Agent Service
// ===========================

export class AgentService {
  private config: AgentConfig;
  private provider: AIProvider | null = null;
  private credentials: ProviderCredentials = {};
  private isInitialized = false;
  private modelSupportsTools = true; // Default to true, check model config

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Initialize the service by loading API credentials
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if brain sidecar is available
      await brainService.checkHealth();
      console.log(`[AgentService] Brain sidecar: ${brainService.connected ? 'connected' : 'not available, using local tools'}`);

      // Sync MCP tools from connected servers
      const mcpToolCount = await syncMCPTools();
      if (mcpToolCount > 0) {
        console.log(`[AgentService] Registered ${mcpToolCount} MCP tools from connected servers`);
      }

      // Load credentials from Tauri secure storage
      const geminiKey = await this.loadCredential('gemini_api_key');
      const groqKey = await this.loadCredential('groq_api_key');

      this.credentials = {
        geminiApiKey: geminiKey || undefined,
        groqApiKey: groqKey || undefined,
      };

      // Check if model supports tools
      const modelConfig = getModelConfig(this.config.model);
      // Default to true if undefined, but explicitly false means no tools
      this.modelSupportsTools = modelConfig?.supportsTools !== false;

      if (!this.modelSupportsTools) {
        console.log(`[AgentService] Model ${this.config.model} does not support tool calling - tools will be disabled`);
      }

      // Create provider
      this.provider = createProvider(
        this.config.model,
        this.credentials,
        this.config.temperature,
        this.config.maxTokens
      );

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AgentService:', error);
      throw error;
    }
  }

  /**
   * Get the Gemini API key (for title generation)
   */
  async getApiKey(): Promise<string | undefined> {
    if (!this.isInitialized) await this.initialize();
    return this.credentials.geminiApiKey;
  }

  /**
   * Load a credential from secure storage
   */
  private async loadCredential(providerId: string): Promise<string | null> {
    try {
      const value = await invoke<string | null>('agent_get_credential', { providerId });
      return value;
    } catch (error) {
      console.warn(`Failed to load credential ${providerId}:`, error);
      return null;
    }
  }

  /**
   * Send a message with streaming support
   */
  async sendMessage(
    messages: ChatMessage[],
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ChatMessage> {
    await this.initialize();

    if (!this.provider) {
      throw new Error('Provider not initialized. Check API credentials.');
    }

    // Get model config for token limits
    const modelConfig = getModelConfig(this.config.model);
    const contextLimits = {
      contextWindow: modelConfig?.contextWindow ?? 32000,
      maxOutputTokens: modelConfig?.maxOutputTokens ?? 8192,
    };

    // Check context usage and truncate if needed
    const status = getContextStatus(messages, contextLimits);
    let processedMessages = messages;

    if (status.isAtLimit) {
      // Truncate to fit
      const { messages: truncated, truncated: wasTruncated, removedCount } = truncateToFitContext(
        messages,
        contextLimits
      );
      processedMessages = truncated;

      if (wasTruncated && onChunk) {
        // Notify user that context was truncated
        onChunk({
          type: 'text',
          content: `\n\n> ⚠️ Context limit reached. Removed ${removedCount} older message(s) to continue.\n\n`,
        });
      }
    } else if (status.isNearLimit && onChunk) {
      // Warn user approaching limit
      console.log(`[AgentService] Context at ${status.percentUsed.toFixed(0)}% - approaching limit`);
    }

    // Only include tools if model supports them
    const tools = this.modelSupportsTools ? toolRegistry.getAllTools() : [];

    // Use streaming if callback provided
    if (onChunk) {
      const response = await this.provider.streamMessage(processedMessages, tools, onChunk);
      return await this.handleToolCalls(response, processedMessages, onChunk);
    } else {
      const response = await this.provider.sendMessage(processedMessages, tools);
      return await this.handleToolCalls(response, processedMessages);
    }
  }

  /**
   * Execute tool calls and get a final response from the LLM
   * Supports multiple rounds of tool execution (up to MAX_TOOL_ITERATIONS)
   */
  private async handleToolCalls(
    response: ChatMessage,
    history: ChatMessage[],
    onChunk?: (chunk: StreamChunk) => void,
    iteration: number = 0
  ): Promise<ChatMessage> {
    // Production limit for extended coding sessions (supports up to 30 hours)
    // 1000 iterations at ~1-2 min per iteration = ~16-33 hours of work
    const MAX_TOOL_ITERATIONS = 1000;

    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }

    if (iteration >= MAX_TOOL_ITERATIONS) {
      console.warn(`[AgentService] Max tool iterations (${MAX_TOOL_ITERATIONS}) reached`);
      response.content = response.content || `
## Session Limit Reached

I've completed **${MAX_TOOL_ITERATIONS}** tool operations in this session. This is the maximum for a single response cycle.

**To continue**, simply send me another message and I can pick up where I left off. All changes made so far have been saved.

Would you like me to:
1. Continue with the current task?
2. Summarize what was accomplished?
3. Start a new approach?`;
      return response;
    }

    // Execute all tool calls - try BrainService first, fallback to local ToolRegistry
    // IMPORTANT: Some tools MUST run locally for proper functionality
    const useBrain = brainService.connected;
    const LOCAL_ONLY_TOOLS = [
      'apply_file_diff',  // Needs frontend React state
      'run_command',      // ToolRegistry has better terminal integration (PTY, async events)
      'run_tests',        // Uses run_command internally
      'git_status',       // Better handled by local git service
      'git_commit',       // Better handled by local git service
      'git_diff',         // Better handled by local git service
    ];

    for (const toolCall of response.toolCalls) {
      try {
        toolCall.status = 'pending';
        if (onChunk) onChunk({ type: 'tool_update', fullMessage: response });

        let result: unknown;

        // Force local execution for tools that need frontend state
        const forceLocal = LOCAL_ONLY_TOOLS.includes(toolCall.name);

        if (useBrain && !forceLocal) {
          // Use sidecar brain service (more reliable, no Tauri hangs)
          // CRITICAL: Pass the user's workspace, NOT the IDE's install path
          const workspace = getIDEState().workspace;
          const brainResult = await brainService.executeTool({
            tool: toolCall.name,
            args: toolCall.arguments,
            workspace: workspace?.path,
          });
          result = brainResult.data ?? { error: brainResult.error };

          if (!brainResult.success) {
            throw new Error(brainResult.error || 'Tool execution failed');
          }
        } else {
          // Use local ToolRegistry (for frontend-only tools or when brain not connected)
          result = await toolRegistry.executeTool(toolCall.name, toolCall.arguments);
        }

        toolCall.result = result;
        toolCall.status = 'success';
        if (onChunk) onChunk({ type: 'tool_update', fullMessage: response });
      } catch (error) {
        toolCall.error = String(error);
        toolCall.status = 'error';
        if (onChunk) onChunk({ type: 'tool_update', fullMessage: response });
      }
    }

    // Create a message with tool results to send back to the LLM
    const toolResultsContent = response.toolCalls.map(tc => {
      if (tc.status === 'success') {
        // Special formatting for command outputs - show stdout directly, not JSON
        if (tc.name === 'run_command' && tc.result && typeof tc.result === 'object') {
          const result = tc.result as Record<string, unknown>;
          const stdout = result.stdout || result.output || '';
          const exitCode = result.exitCode ?? result.exitedWithErrors;
          const duration = result.duration || '';

          // For commands, show the actual output clearly
          let output = `Tool run_command completed (${duration}ms):\n`;
          if (exitCode !== undefined && exitCode !== 0 && exitCode !== false) {
            output += `Exit status: ${exitCode}\n`;
          }
          output += `--- Command Output ---\n${stdout}\n--- End Output ---`;

          // Larger limit for command outputs (8000 chars)
          if (output.length > 8000) {
            output = output.slice(0, 8000) + '\n... (output truncated, showing first 8000 chars)';
          }
          return output;
        }

        // For other tools, use JSON but with better truncation
        const resultStr = JSON.stringify(tc.result, null, 2);
        const truncated = resultStr.length > 5000
          ? resultStr.slice(0, 5000) + '\n... (truncated, showing first 5000 chars)'
          : resultStr;
        return `Tool ${tc.name} executed successfully:\n${truncated}`;
      } else {
        return `Tool ${tc.name} failed with error: ${tc.error}`;
      }
    }).join('\n\n');

    const toolResultsMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Tool execution results:\n\n${toolResultsContent}\n\nAnalyze these results and continue your task. If you need more information, use additional tools. When you have enough information, present your findings clearly to the user.`,
      timestamp: new Date(),
    };

    // Send tool results back to LLM
    if (!this.provider) {
      return response;
    }

    const tools = toolRegistry.getAllTools();

    try {
      let nextResponse: ChatMessage;

      if (onChunk) {
        nextResponse = await this.provider.streamMessage(
          [...history, response, toolResultsMessage],
          tools,
          onChunk
        );
      } else {
        nextResponse = await this.provider.sendMessage(
          [...history, response, toolResultsMessage],
          tools
        );
      }

      // If the LLM wants more tool calls, recursively handle them
      if (nextResponse.toolCalls && nextResponse.toolCalls.length > 0) {
        return await this.handleToolCalls(
          nextResponse,
          [...history, response, toolResultsMessage],
          onChunk,
          iteration + 1
        );
      }

      return nextResponse;
    } catch (error) {
      console.error('Failed to get response after tool execution:', error);
      // Return the original response with tool results if call fails
      response.content = response.content || 'Tool execution completed. Check the results above.';
      return response;
    }
  }

  /**
   * Update the model for this service
   */
  async updateModel(modelId: string): Promise<void> {
    this.config.model = modelId;
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Update temperature
   */
  setTemperature(temperature: number): void {
    this.config.temperature = temperature;
    this.isInitialized = false;
  }

  /**
   * Update max tokens
   */
  setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = maxTokens;
    this.isInitialized = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

// ===========================
// Credential Management
// ===========================

/**
 * Save an API credential securely
 */
export async function saveCredential(providerId: string, apiKey: string): Promise<void> {
  try {
    await invoke('agent_store_credential', { providerId, apiKey });
  } catch (error) {
    console.error(`Failed to save credential ${providerId}:`, error);
    throw error;
  }
}

/**
 * Load an API credential
 */
export async function loadCredential(providerId: string): Promise<string | null> {
  try {
    return await invoke<string | null>('agent_get_credential', { providerId });
  } catch (error) {
    console.warn(`Failed to load credential ${providerId}:`, error);
    return null;
  }
}

/**
 * Delete an API credential
 */
export async function deleteCredential(providerId: string): Promise<void> {
  try {
    await invoke('agent_delete_credential', { providerId });
  } catch (error) {
    console.error(`Failed to delete credential ${providerId}:`, error);
    throw error;
  }
}