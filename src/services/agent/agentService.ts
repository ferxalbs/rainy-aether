/**
 * Agent Service
 *
 * Main orchestration layer for AI agent interactions.
 * Handles message sending, streaming, provider coordination, and error handling.
 */

import { agentActions, getAgentState } from '@/stores/agentStore';
import type { Message } from '@/stores/agentStore';
import { ProviderManager } from './providerManager';
import { CredentialService } from './credentialService';
import type { ChatMessage, ToolCall } from './providers/base';
import { calculateCost } from './providers/base';
import { executeToolCalls, type ToolExecutionResult } from './toolExecutor';
import { getToolRegistry } from './tools/registry';
import { initializeToolSystem } from './tools';
import type { ToolDefinition as AgentToolDefinition } from './providers/base';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { canUseLangGraph, runLangGraphSession } from './langgraph/runner';
import type { LangGraphToolUpdate } from './langgraph/types';
import { AIMessage } from '@langchain/core/messages';
import { agentConfigStore, agentConfigActions } from '@/stores/agentConfigStore';
import { rustAgentOrchestrator } from './rust/orchestrator';
import type { AgentConfig as RustAgentConfig } from '@/types/rustAgent';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  sessionId: string;
  content: string;
  onToken?: (token: string) => void;
  onComplete?: (message: Message) => void;
  onError?: (error: Error) => void;
  onToolCall?: (toolName: string, result: ToolExecutionResult) => void;
  enableTools?: boolean;
  workspaceRoot?: string;
}

/**
 * Service statistics
 */
export interface AgentServiceStats {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
}

// ============================================================================
// AGENT SERVICE
// ============================================================================

/**
 * Main service for AI agent operations
 */
export class AgentService {
  private static instance: AgentService;
  private providerManager: ProviderManager;
  private credentialService: CredentialService;
  private responseTimings: number[] = [];
  private readonly MAX_TIMINGS = 100;
  private isToolSystemInitialized = false;

  private constructor() {
    this.providerManager = ProviderManager.getInstance();
    this.credentialService = CredentialService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * Initialize the service and tool system
   */
  async initialize(workspaceRoot?: string): Promise<void> {
    await agentActions.initialize();

    // Initialize agent configuration store
    await agentConfigActions.initialize();

    // Initialize tool system if not already done
    if (!this.isToolSystemInitialized) {
      await initializeToolSystem({
        workspaceRoot,
        userId: 'default-user',
      });
      this.isToolSystemInitialized = true;
      console.log('[AgentService] Tool system initialized with', getToolRegistry().size, 'tools');
    }

    const selectedAgent = agentConfigStore.getSelectedAgent();
    console.log('[AgentService] Initialized with agent:', selectedAgent);
  }

  /**
   * Send a message and get a streaming response
   */
  async sendMessage(options: SendMessageOptions): Promise<void> {
    const {
      sessionId,
      content,
      onToken,
      onComplete,
      onError,
      onToolCall,
      enableTools = true,
      workspaceRoot,
    } = options;
    const startTime = Date.now();

    try {
      // Get session
      const session = agentActions.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get API key (using synchronous localStorage method)
      const apiKey = this.credentialService.getApiKey(session.providerId);
      if (!apiKey) {
        throw new Error(`No API key found for provider: ${session.providerId}`);
      }

      // ==========================================================================
      // TRIPLE-AGENT ROUTING LOGIC
      // ==========================================================================
      // Determine which agent to use based on configuration
      const settings = agentConfigStore.getSettings();
      const selectedAgent = agentConfigStore.getSelectedAgent();

      // Priority 1: Use explicitly selected agent if enabled
      if (selectedAgent === 'agent3' && settings.agent3.enabled) {
        console.log('[AgentService] ⚡ Using Agent 3 (Rust Core) - explicitly selected');
        return await this.sendMessageWithAgent3({
          sessionId,
          content,
          onToken,
          onComplete,
          onError,
          onToolCall,
          enableTools,
          workspaceRoot,
        });
      }

      if (selectedAgent === 'agent2' && settings.agent2.enabled) {
        console.log('[AgentService] Using Agent 2 (LangGraph) - explicitly selected');
        return await this.sendMessageWithAgent2({
          sessionId,
          content,
          onToken,
          onComplete,
          onError,
          onToolCall,
          enableTools,
          workspaceRoot,
        });
      }

      if (selectedAgent === 'agent1' && settings.agent1.enabled) {
        console.log('[AgentService] Using Agent 1 (Custom) - explicitly selected');
        // Continue to Agent 1 path below
      }

      // Priority 2: Fallback logic if selected agent is disabled
      if (selectedAgent === 'agent3' && !settings.agent3.enabled) {
        if (settings.agent2.enabled) {
          console.log('[AgentService] Fallback to Agent 2 (LangGraph) - Agent 3 disabled');
          return await this.sendMessageWithAgent2({
            sessionId,
            content,
            onToken,
            onComplete,
            onError,
            onToolCall,
            enableTools,
            workspaceRoot,
          });
        } else if (settings.agent1.enabled) {
          console.log('[AgentService] Fallback to Agent 1 (Custom) - Agent 3 disabled');
          // Continue to Agent 1 path below
        }
      }

      if (selectedAgent === 'agent2' && !settings.agent2.enabled) {
        if (settings.agent3.enabled) {
          console.log('[AgentService] Fallback to Agent 3 (Rust Core) - Agent 2 disabled');
          return await this.sendMessageWithAgent3({
            sessionId,
            content,
            onToken,
            onComplete,
            onError,
            onToolCall,
            enableTools,
            workspaceRoot,
          });
        } else if (settings.agent1.enabled) {
          console.log('[AgentService] Fallback to Agent 1 (Custom) - Agent 2 disabled');
          // Continue to Agent 1 path below
        }
      }

      if (selectedAgent === 'agent1' && !settings.agent1.enabled) {
        if (settings.agent3.enabled) {
          console.log('[AgentService] Fallback to Agent 3 (Rust Core) - Agent 1 disabled');
          return await this.sendMessageWithAgent3({
            sessionId,
            content,
            onToken,
            onComplete,
            onError,
            onToolCall,
            enableTools,
            workspaceRoot,
          });
        } else if (settings.agent2.enabled) {
          console.log('[AgentService] Fallback to Agent 2 (LangGraph) - Agent 1 disabled');
          return await this.sendMessageWithAgent2({
            sessionId,
            content,
            onToken,
            onComplete,
            onError,
            onToolCall,
            enableTools,
            workspaceRoot,
          });
        }
      }

      // Priority 3: Legacy feature flag support (backward compatibility)
      if (canUseLangGraph() && settings.agent2.enabled && selectedAgent !== 'agent1') {
        console.log('[AgentService] Using Agent 2 (LangGraph) - feature flag enabled');
        return await this.sendMessageWithAgent2({
          sessionId,
          content,
          onToken,
          onComplete,
          onError,
          onToolCall,
          enableTools,
          workspaceRoot,
        });
      }

      // ==========================================================================
      // AGENT 1 PATH (CUSTOM AI SDK IMPLEMENTATION)
      // ==========================================================================

      // Get provider
      const provider = this.providerManager.getProvider(session.providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${session.providerId}`);
      }

      // Validate model
      const model = provider.getModel(session.modelId);
      if (!model) {
        throw new Error(`Model not found: ${session.modelId}`);
      }

      // Add user message
      const userMessageId = agentActions.addMessage(sessionId, {
        role: 'user',
        content,
      });

      // Create assistant message placeholder
      const assistantMessageId = agentActions.addMessage(sessionId, {
        role: 'assistant',
        content: '',
      });

      // Set streaming state
      agentActions.setStreaming(sessionId, true, assistantMessageId);

      // Prepare messages for provider
      const messages: ChatMessage[] = session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add the new user message
      messages.push({ role: 'user', content });

      // Prepare tool definitions if tools are enabled
      let tools: AgentToolDefinition[] | undefined;
      if (enableTools && model.supportsTools) {
        tools = this.getToolDefinitions();
      }

      let assistantContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      const toolCalls: ToolCall[] = [];

      try {
        // Stream response
        const stream = provider.streamText({
          model: session.modelId,
          messages,
          apiKey,
          config: session.config,
          tools,
          onProgress: (event) => {
            if (event.type === 'text-delta') {
              onToken?.(event.text);
            } else if (event.type === 'tool-call') {
              toolCalls.push(event.toolCall);
            }
          },
        });

        for await (const event of stream) {
          if (event.type === 'text-delta') {
            assistantContent += event.text;
            agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);
          } else if (event.type === 'tool-call') {
            // Tool calls are already collected in the onProgress callback
            // We don't need to do anything here
          } else if (event.type === 'finish') {
            if (event.usage) {
              promptTokens = event.usage.promptTokens;
              completionTokens = event.usage.completionTokens;

              // Calculate cost
              const cost = calculateCost(model, {
                promptTokens,
                completionTokens,
              });

              // Update message metadata
              agentActions.updateMessageMetadata(sessionId, assistantMessageId, {
                tokens: completionTokens,
                cost: cost || undefined,
                metadata: {
                  finishReason: event.finishReason,
                  usage: event.usage,
                },
              });

              // Also update user message with prompt tokens
              agentActions.updateMessageMetadata(sessionId, userMessageId, {
                tokens: promptTokens,
              });
            }
          } else if (event.type === 'error') {
            throw event.error;
          }
        }

        // Execute tool calls if any
        if (toolCalls.length > 0) {
          await this.handleToolCalls(toolCalls, {
            sessionId,
            assistantMessageId,
            workspaceRoot,
            onToolCall,
          });
        }

        // Record response time
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);

        // Clear streaming state
        agentActions.setStreaming(sessionId, false, null);

        // Get final message
        const finalMessage = agentActions.getSession(sessionId)?.messages.find(
          (m) => m.id === assistantMessageId
        );

        if (finalMessage) {
          onComplete?.(finalMessage);
        }
      } catch (error) {
        // Clear streaming state on error
        agentActions.setStreaming(sessionId, false, null);

        // Remove incomplete assistant message
        await agentActions.deleteMessage(sessionId, assistantMessageId);

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      agentActions.setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Regenerate the last assistant message
   */
  async regenerateLastMessage(sessionId: string): Promise<void> {
    const session = agentActions.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Find last user message
    const messages = [...session.messages].reverse();
    const lastUserMessage = messages.find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message to regenerate from');
    }

    // Remove last assistant message if it exists
    const lastAssistantMessage = messages.find((m) => m.role === 'assistant');
    if (lastAssistantMessage) {
      await agentActions.deleteMessage(sessionId, lastAssistantMessage.id);
    }

    // Resend the user message
    await this.sendMessage({
      sessionId,
      content: lastUserMessage.content,
    });
  }

  /**
   * Stop streaming for a session
   */
  stopStreaming(sessionId: string): void {
    agentActions.setStreaming(sessionId, false, null);
  }

  /**
   * Create a new agent session
   */
  async createSession(params: {
    name?: string;
    providerId: string;
    modelId: string;
    systemPrompt?: string;
    workspaceRoot?: string;
  }): Promise<string> {
    // Validate provider
    const provider = this.providerManager.getProvider(params.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${params.providerId}`);
    }

    // Validate model
    const model = provider.getModel(params.modelId);
    if (!model) {
      throw new Error(`Model not found: ${params.modelId}`);
    }

    // Check if provider is configured (using synchronous localStorage method)
    const hasApiKey = this.credentialService.hasApiKey(params.providerId);
    if (!hasApiKey) {
      throw new Error(`Provider ${params.providerId} is not configured. Please add an API key.`);
    }

    // Create session with workspace context
    return await agentActions.createSession(params);
  }

  /**
   * Get service statistics
   */
  getStats(): AgentServiceStats {
    const state = getAgentState();
    let totalMessages = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const session of state.sessions.values()) {
      totalMessages += session.messages.length;
      totalTokens += session.totalTokens;
      totalCost += session.totalCost;
    }

    return {
      totalSessions: state.sessions.size,
      totalMessages,
      totalTokens,
      totalCost,
      averageResponseTime: this.getAverageResponseTime(),
    };
  }

  /**
   * Export session as markdown
   */
  async exportSessionAsMarkdown(sessionId: string): Promise<string> {
    const session = agentActions.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const lines: string[] = [];

    // Header
    lines.push(`# ${session.name}`);
    lines.push('');
    lines.push(`**Provider**: ${session.providerId}`);
    lines.push(`**Model**: ${session.modelId}`);
    lines.push(`**Created**: ${new Date(session.createdAt).toLocaleString()}`);
    lines.push(`**Total Tokens**: ${session.totalTokens.toLocaleString()}`);
    if (session.totalCost > 0) {
      lines.push(`**Total Cost**: $${session.totalCost.toFixed(6)}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Messages
    for (const message of session.messages) {
      if (message.role === 'system') {
        lines.push('## System Prompt');
        lines.push('');
        lines.push(message.content);
        lines.push('');
      } else {
        const role = message.role === 'user' ? 'You' : 'Assistant';
        lines.push(`### ${role}`);
        lines.push('');
        lines.push(message.content);
        lines.push('');
        if (message.tokens) {
          lines.push(`*Tokens: ${message.tokens}*`);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Export session as JSON
   */
  async exportSessionAsJSON(sessionId: string): Promise<string> {
    const session = agentActions.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Record response time for statistics
   */
  private recordResponseTime(ms: number): void {
    this.responseTimings.push(ms);
    if (this.responseTimings.length > this.MAX_TIMINGS) {
      this.responseTimings.shift();
    }
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    if (this.responseTimings.length === 0) return 0;
    const sum = this.responseTimings.reduce((a, b) => a + b, 0);
    return sum / this.responseTimings.length;
  }

  /**
   * Get tool definitions for the AI provider
   * Converts Zod schemas to JSON Schema format required by AI SDK
   */
  private getToolDefinitions(): AgentToolDefinition[] {
    const registry = getToolRegistry();
    const allTools = registry.listAll();

    return allTools.map((tool) => {
      // Convert Zod schema to JSON Schema
      const jsonSchema = zodToJsonSchema(tool.inputSchema, {
        name: tool.name,
        $refStrategy: 'none', // Don't use $ref for inline schemas
      });

      // Extract the schema properties (remove top-level metadata)
      const parameters = {
        type: 'object',
        properties: (jsonSchema as any).properties || {},
        required: (jsonSchema as any).required || [],
        additionalProperties: false,
      };

      return {
        name: tool.name,
        description: tool.description,
        parameters,
      };
    });
  }

  /**
   * Send message using Agent 2 (LangGraph-based ReAct agent)
   */
  private async sendMessageWithAgent2(options: SendMessageOptions): Promise<void> {
    const {
      sessionId,
      content,
      onToken,
      onComplete,
      onError,
      workspaceRoot,
    } = options;
    const startTime = Date.now();

    try {
      const session = agentActions.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const apiKey = this.credentialService.getApiKey(session.providerId);
      if (!apiKey) {
        throw new Error(`No API key found for provider: ${session.providerId}`);
      }

      // Add user message
      const userMessageId = agentActions.addMessage(sessionId, {
        role: 'user',
        content,
      });

      // Create assistant message placeholder
      const assistantMessageId = agentActions.addMessage(sessionId, {
        role: 'assistant',
        content: '',
      });

      // Set streaming state
      agentActions.setStreaming(sessionId, true, assistantMessageId);

      let assistantContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        // Run LangGraph session
        const { stream } = await runLangGraphSession({
          session,
          apiKey,
          userMessage: content,
          config: {
            sessionId,
            threadId: sessionId, // Use sessionId as threadId for persistence
            workspaceRoot,
            userId: 'default-user',
          },
          onToolUpdate: (update: LangGraphToolUpdate) => {
            // Handle tool progress updates
            const currentContent = assistantContent || '';
            let statusText = `\n\n**Tool: ${update.toolName}**\n`;
            statusText += `Status: ${update.status}\n`;
            if (update.message) {
              statusText += `${update.message}\n`;
            }
            if (update.progress !== undefined) {
              statusText += `Progress: ${update.progress}%\n`;
            }

            if (!currentContent.includes(`**Tool: ${update.toolName}**`)) {
              assistantContent += statusText;
              agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);
            }
          },
        });

        // Process stream events with proper token streaming
        let lastContent = '';

        for await (const chunk of stream) {
          // Handle object-style chunks from LangGraph
          if (chunk && typeof chunk === 'object') {
            for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
              // Skip control nodes
              if (nodeName === '__end__' || nodeName === 'agent') {
                continue;
              }

              // Handle messages from the graph
              if (nodeOutput && typeof nodeOutput === 'object' && 'messages' in nodeOutput) {
                const messages = (nodeOutput as any).messages;
                if (Array.isArray(messages)) {
                  // Get the last message (most recent)
                  const lastMsg = messages[messages.length - 1];

                  if (lastMsg instanceof AIMessage) {
                    // Stream AI message content incrementally
                    if (lastMsg.content) {
                      const currentContent = String(lastMsg.content);

                      // Calculate delta (only new content)
                      if (currentContent.length > lastContent.length) {
                        const delta = currentContent.slice(lastContent.length);
                        assistantContent = currentContent;
                        lastContent = currentContent;

                        // Update UI with new content
                        agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);

                        // Stream delta to onToken callback
                        if (delta) {
                          onToken?.(delta);
                        }
                      }
                      // Handle complete replacement (e.g., after tool execution)
                      else if (currentContent !== lastContent) {
                        assistantContent = currentContent;
                        lastContent = currentContent;
                        agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);
                      }
                    }

                    // Extract token usage from response metadata
                    if (lastMsg.response_metadata) {
                      const metadata = lastMsg.response_metadata as any;
                      if (metadata.tokenUsage) {
                        promptTokens = metadata.tokenUsage.promptTokens || promptTokens;
                        completionTokens = metadata.tokenUsage.completionTokens || completionTokens;
                      } else if (metadata.usage) {
                        promptTokens = metadata.usage.prompt_tokens || promptTokens;
                        completionTokens = metadata.usage.completion_tokens || completionTokens;
                      }
                    }

                    // Handle tool calls
                    if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
                      console.log('[LangGraph] Tool calls detected:', lastMsg.tool_calls.length);
                    }
                  }
                }
              }
            }
          }
        }

        // Log final state
        console.log(`[LangGraph] Stream complete. Tokens: ${promptTokens}/${completionTokens}`);

        // Calculate cost (estimation)
        const provider = this.providerManager.getProvider(session.providerId);
        const model = provider?.getModel(session.modelId);
        let cost: number | undefined;
        if (model && promptTokens > 0) {
          const calculatedCost = calculateCost(model, { promptTokens, completionTokens });
          cost = calculatedCost !== null ? calculatedCost : undefined;
        }

        // Update message metadata
        agentActions.updateMessageMetadata(sessionId, assistantMessageId, {
          tokens: completionTokens,
          cost: cost || undefined,
          metadata: {
            usage: { promptTokens, completionTokens },
            langgraph: true,
          },
        });

        // Update user message with prompt tokens
        agentActions.updateMessageMetadata(sessionId, userMessageId, {
          tokens: promptTokens,
        });

        // Record response time
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);

        // Clear streaming state
        agentActions.setStreaming(sessionId, false, null);

        // Get final message
        const finalMessage = agentActions.getSession(sessionId)?.messages.find(
          (m) => m.id === assistantMessageId
        );

        if (finalMessage) {
          onComplete?.(finalMessage);
        }
      } catch (error) {
        // Clear streaming state on error
        agentActions.setStreaming(sessionId, false, null);

        // Remove incomplete assistant message
        await agentActions.deleteMessage(sessionId, assistantMessageId);

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      agentActions.setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Send message using Agent 3 (Rust Core)
   *
   * Uses the Rust-powered agent backend for maximum performance
   */
  private async sendMessageWithAgent3(options: SendMessageOptions): Promise<void> {
    const {
      sessionId,
      content,
      onToken,
      onComplete,
      onError,
      enableTools = true,
      workspaceRoot,
    } = options;
    const startTime = Date.now();

    try {
      const session = agentActions.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const apiKey = this.credentialService.getApiKey(session.providerId);
      if (!apiKey) {
        throw new Error(`No API key found for provider: ${session.providerId}`);
      }

      // Add user message
      const userMessageId = agentActions.addMessage(sessionId, {
        role: 'user',
        content,
      });

      // Create assistant message placeholder
      const assistantMessageId = agentActions.addMessage(sessionId, {
        role: 'assistant',
        content: '',
      });

      // Set streaming state
      agentActions.setStreaming(sessionId, true, assistantMessageId);

      let assistantContent = '';

      try {
        // Get Agent 3 settings
        const settings = agentConfigStore.getSettings();
        const agent3Config = settings.agent3.config;

        // Create Rust agent config
        const rustConfig: RustAgentConfig = {
          provider: session.providerId,
          model: session.modelId,
          systemPrompt: session.config?.systemPrompt,
          maxIterations: agent3Config.maxIterations,
          toolTimeout: agent3Config.toolTimeout,
          parallelTools: agent3Config.parallelTools,
          temperature: agent3Config.temperature,
          maxTokens: agent3Config.maxTokens,
          extra: {
            workspaceRoot: workspaceRoot || '',
            maxConcurrentTools: agent3Config.maxConcurrentTools,
            rateLimitEnabled: agent3Config.rateLimitEnabled,
            maxRequestsPerMinute: agent3Config.maxRequestsPerMinute,
            metricsEnabled: agent3Config.metricsEnabled,
            debugLogging: agent3Config.debugLogging,
          },
        };

        // Create Rust agent session
        const rustSessionId = await rustAgentOrchestrator.createSession(
          'rainy-agent', // agent type
          rustConfig
        );

        console.log(`[Agent3] Created Rust session: ${rustSessionId}`);

        // Send message to Rust backend
        // Note: Currently Rust backend doesn't support streaming,
        // so we'll get the complete response
        const result = await rustAgentOrchestrator.sendMessage(
          rustSessionId,
          content,
          enableTools
        );

        console.log(`[Agent3] Received result from Rust backend`);

        // Simulate streaming by chunking the response
        assistantContent = result.content;
        const chunkSize = 50; // characters per chunk
        for (let i = 0; i < assistantContent.length; i += chunkSize) {
          const chunk = assistantContent.slice(i, Math.min(i + chunkSize, assistantContent.length));
          onToken?.(chunk);
          agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent.slice(0, i + chunk.length));
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Update final message content
        agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);

        // Update message metadata
        agentActions.updateMessageMetadata(sessionId, assistantMessageId, {
          tokens: result.metadata.tokensUsed || 0,
          cost: result.metadata.costUsd || 0,
          metadata: {
            usage: {
              promptTokens: 0, // Rust backend doesn't provide prompt tokens separately
              completionTokens: result.metadata.tokensUsed || 0,
            },
            executionTimeMs: result.metadata.executionTimeMs,
            toolsExecuted: result.metadata.toolsExecuted,
            rustCore: true,
          },
        });

        // Update user message metadata
        agentActions.updateMessageMetadata(sessionId, userMessageId, {
          tokens: 0, // Rust doesn't provide separate prompt tokens
        });

        // Record response time
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);

        // Clear streaming state
        agentActions.setStreaming(sessionId, false, null);

        // Get final message
        const finalMessage = agentActions.getSession(sessionId)?.messages.find(
          (m) => m.id === assistantMessageId
        );

        if (finalMessage) {
          onComplete?.(finalMessage);
        }

        // Cleanup: destroy Rust session (optional, could keep for conversation history)
        // await rustAgentOrchestrator.destroySession(rustSessionId);
      } catch (error) {
        // Clear streaming state on error
        agentActions.setStreaming(sessionId, false, null);

        // Remove incomplete assistant message
        await agentActions.deleteMessage(sessionId, assistantMessageId);

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      agentActions.setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Handle tool calls from the AI agent
   */
  private async handleToolCalls(
    toolCalls: ToolCall[],
    options: {
      sessionId: string;
      assistantMessageId: string;
      workspaceRoot?: string;
      onToolCall?: (toolName: string, result: ToolExecutionResult) => void;
    }
  ): Promise<void> {
    const { sessionId, assistantMessageId, workspaceRoot, onToolCall } = options;

    // Execute tool calls
    const batchResult = await executeToolCalls(
      toolCalls,
      {
        sessionId,
        workspaceRoot,
        onProgress: (update) => {
          // Update message content with tool progress
          const session = agentActions.getSession(sessionId);
          if (!session) return;

          const message = session.messages.find((m) => m.id === assistantMessageId);
          if (!message) return;

          // Append tool status to message
          let statusText = `\n\n**Tool: ${update.toolName}**\n`;
          statusText += `Status: ${update.status}\n`;
          if (update.message) {
            statusText += `${update.message}\n`;
          }

          const currentContent = message.content || '';
          if (!currentContent.includes(`**Tool: ${update.toolName}**`)) {
            agentActions.updateMessageContent(sessionId, assistantMessageId, currentContent + statusText);
          }
        },
      },
      false // Sequential execution
    );

    // Append tool results to message
    let toolResultsText = '\n\n---\n\n**Tool Executions:**\n\n';

    for (const result of batchResult.results) {
      toolResultsText += `### ${result.toolName}\n\n`;

      if (result.success) {
        toolResultsText += `✓ Success (${result.duration}ms)\n\n`;
        toolResultsText += '```\n';
        toolResultsText += result.formattedOutput;
        toolResultsText += '\n```\n\n';
      } else {
        toolResultsText += `✗ Error (${result.duration}ms)\n\n`;
        toolResultsText += '```\n';
        toolResultsText += result.error || 'Unknown error';
        toolResultsText += '\n```\n\n';
      }

      // Notify callback
      onToolCall?.(result.toolName, result);
    }

    // Update message with final tool results
    const session = agentActions.getSession(sessionId);
    if (session) {
      const message = session.messages.find((m) => m.id === assistantMessageId);
      if (message) {
        const baseContent = message.content.split('\n\n---\n\n')[0]; // Remove any previous tool results
        agentActions.updateMessageContent(sessionId, assistantMessageId, baseContent + toolResultsText);
      }
    }

    // Update message metadata with tool execution info
    agentActions.updateMessageMetadata(sessionId, assistantMessageId, {
      metadata: {
        toolCalls: batchResult.results.map((r) => ({
          toolName: r.toolName,
          success: r.success,
          duration: r.duration,
        })),
        toolExecutionTime: batchResult.totalDuration,
      },
    });
  }
}

/**
 * Get singleton instance of AgentService
 */
export function getAgentService(): AgentService {
  return AgentService.getInstance();
}
