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
import type { ChatMessage, TextStreamEvent } from './providers/base';
import { calculateCost } from './providers/base';

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
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await agentActions.initialize();
  }

  /**
   * Send a message and get a streaming response
   */
  async sendMessage(options: SendMessageOptions): Promise<void> {
    const { sessionId, content, onToken, onComplete, onError } = options;
    const startTime = Date.now();

    try {
      // Get session
      const session = agentActions.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get provider
      const provider = this.providerManager.getProvider(session.providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${session.providerId}`);
      }

      // Get API key
      const apiKey = await this.credentialService.getCredential(session.providerId);

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

      let assistantContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        // Stream response
        const stream = provider.streamText({
          model: session.modelId,
          messages,
          apiKey,
          config: session.config,
          onProgress: (event) => {
            if (event.type === 'text-delta') {
              onToken?.(event.text);
            }
          },
        });

        for await (const event of stream) {
          if (event.type === 'text-delta') {
            assistantContent += event.text;
            agentActions.updateMessageContent(sessionId, assistantMessageId, assistantContent);
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

    // Check if provider is configured
    const hasCredential = await this.credentialService.hasCredential(params.providerId);
    if (!hasCredential) {
      throw new Error(`Provider ${params.providerId} is not configured. Please add an API key.`);
    }

    // Create session
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
}

/**
 * Get singleton instance of AgentService
 */
export function getAgentService(): AgentService {
  return AgentService.getInstance();
}
