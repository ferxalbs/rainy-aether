import { invoke } from '@tauri-apps/api/core';
import { ChatMessage } from '@/types/chat';
import { toolRegistry } from './ToolRegistry';
import { AIProvider, StreamChunk, createProvider, ProviderCredentials } from './providers';

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
      return await this.handleToolCalls(response, messages);
    } else {
      const response = await this.provider.sendMessage(messages, tools);
      return await this.handleToolCalls(response, messages);
    }
  }

  /**
   * Execute tool calls and optionally get a final response
   */
  private async handleToolCalls(
    response: ChatMessage,
    _history: ChatMessage[]
  ): Promise<ChatMessage> {
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }

    // Execute all tool calls
    for (const toolCall of response.toolCalls) {
      try {
        toolCall.status = 'pending';
        const result = await toolRegistry.executeTool(toolCall.name, toolCall.arguments);
        toolCall.result = result;
        toolCall.status = 'success';
      } catch (error) {
        toolCall.error = String(error);
        toolCall.status = 'error';
      }
    }

    // For now, just return the response with executed tools
    // In a more advanced implementation, we could send the tool results back to the LLM
    // for a follow-up response:
    /*
    const toolResultsMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'function',
      content: JSON.stringify(response.toolCalls.map(tc => tc.result)),
      timestamp: new Date(),
    };

    const finalResponse = await this.provider.sendMessage([...history, response, toolResultsMessage], []);
    return finalResponse;
    */

    return response;
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