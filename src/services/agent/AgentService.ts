import { invoke } from '@tauri-apps/api/core';
import { ChatMessage } from '@/types/chat';
import { toolRegistry } from './ToolRegistry';
import { AIProvider, StreamChunk, createProvider, ProviderCredentials } from './providers';
import { brainService } from '@/services/BrainService';

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

      // Load credentials from Tauri secure storage
      const geminiKey = await this.loadCredential('gemini_api_key');
      const groqKey = await this.loadCredential('groq_api_key');

      this.credentials = {
        geminiApiKey: geminiKey || undefined,
        groqApiKey: groqKey || undefined,
      };

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

    const tools = toolRegistry.getAllTools();

    // Use streaming if callback provided
    if (onChunk) {
      const response = await this.provider.streamMessage(messages, tools, onChunk);
      return await this.handleToolCalls(response, messages, onChunk);
    } else {
      const response = await this.provider.sendMessage(messages, tools);
      return await this.handleToolCalls(response, messages);
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
    const MAX_TOOL_ITERATIONS = 5;

    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }

    if (iteration >= MAX_TOOL_ITERATIONS) {
      console.warn('[AgentService] Max tool iterations reached, stopping to prevent infinite loop');
      response.content = response.content || 'I completed several tool operations. Please review the results above.';
      return response;
    }

    // Execute all tool calls - try BrainService first, fallback to local ToolRegistry
    const useBrain = brainService.connected;

    for (const toolCall of response.toolCalls) {
      try {
        toolCall.status = 'pending';
        if (onChunk) onChunk({ type: 'tool_update', fullMessage: response });

        let result: unknown;

        if (useBrain) {
          // Use sidecar brain service (more reliable, no Tauri hangs)
          const brainResult = await brainService.executeTool({
            tool: toolCall.name,
            args: toolCall.arguments,
          });
          result = brainResult.data ?? { error: brainResult.error };

          if (!brainResult.success) {
            throw new Error(brainResult.error || 'Tool execution failed');
          }
        } else {
          // Fallback to local ToolRegistry (via Tauri)
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
        // Truncate very long results to avoid token limits
        const resultStr = JSON.stringify(tc.result, null, 2);
        const truncated = resultStr.length > 3000 ? resultStr.slice(0, 3000) + '\n... (truncated)' : resultStr;
        return `Tool ${tc.name} executed successfully:\n${truncated}`;
      } else {
        return `Tool ${tc.name} failed with error: ${tc.error}`;
      }
    }).join('\n\n');

    const toolResultsMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Tool execution results:\n\n${toolResultsContent}\n\nNow continue with your task. If you need more tools, call them. If you're done, provide a final response summarizing what you did.`,
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
          tools, // Allow more tool calls in subsequent iterations
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