import Groq from 'groq-sdk';
import { ChatMessage, ToolCall } from '@/types/chat';
import { ToolDefinition } from '../ToolRegistry';
import {
  AIProvider,
  AIProviderConfig,
  StreamChunk,
  createChatMessage,
  generateMessageId,
  convertToolsToFunctionFormat,
} from './base';

// ===========================
// Groq Provider
// ===========================

export class GroqProvider implements AIProvider {
  private client: Groq;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new Groq({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // Required for Tauri WebView
    });
  }

  /**
   * Convert our ChatMessage to Groq's format
   */
  private convertMessagesToGroqFormat(messages: ChatMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
      ...(msg.toolCalls && {
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      }),
    }));
  }

  /**
   * Send a non-streaming message
   */
  async sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<ChatMessage> {
    try {
      const groqMessages = this.convertMessagesToGroqFormat(messages);
      const groqTools = convertToolsToFunctionFormat(tools);

      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: groqMessages,
        tools: groqTools.length > 0 ? groqTools : undefined,
        tool_choice: groqTools.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Check if tool calls were made
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCalls: ToolCall[] = message.tool_calls.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        }));

        return createChatMessage(
          'assistant',
          message.content || 'I need to execute some tools to help you.',
          toolCalls
        );
      }

      // Regular text response
      return createChatMessage('assistant', message.content || '');
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error(`Groq API failed: ${error}`);
    }
  }

  /**
   * Send a streaming message
   */
  async streamMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatMessage> {
    try {
      const groqMessages = this.convertMessagesToGroqFormat(messages);
      const groqTools = convertToolsToFunctionFormat(tools);

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: groqMessages,
        tools: groqTools.length > 0 ? groqTools : undefined,
        tool_choice: groqTools.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        stream: true,
      });

      let fullText = '';
      let toolCalls: ToolCall[] = [];
      const toolCallsInProgress: Map<number, any> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        // Handle text content
        if (delta.content) {
          fullText += delta.content;
          onChunk({
            type: 'text',
            content: delta.content,
          });
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const tcDelta of delta.tool_calls) {
            const index = tcDelta.index;

            if (!toolCallsInProgress.has(index)) {
              toolCallsInProgress.set(index, {
                id: tcDelta.id || generateMessageId(),
                name: '',
                arguments: '',
              });
            }

            const tc = toolCallsInProgress.get(index);

            if (tcDelta.function?.name) {
              tc.name = tcDelta.function.name;
            }

            if (tcDelta.function?.arguments) {
              tc.arguments += tcDelta.function.arguments;
            }
          }
        }
      }

      // Parse accumulated tool calls
      if (toolCallsInProgress.size > 0) {
        toolCalls = Array.from(toolCallsInProgress.values()).map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments),
        }));

        toolCalls.forEach((tc) => {
          onChunk({
            type: 'tool_call',
            toolCall: tc,
          });
        });
      }

      const finalMessage = createChatMessage(
        'assistant',
        fullText || 'I need to execute some tools to help you.',
        toolCalls.length > 0 ? toolCalls : undefined
      );

      onChunk({
        type: 'done',
        fullMessage: finalMessage,
      });

      return finalMessage;
    } catch (error) {
      console.error('Groq streaming error:', error);
      throw new Error(`Groq streaming failed: ${error}`);
    }
  }
}
