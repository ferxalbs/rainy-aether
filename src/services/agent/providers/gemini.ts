import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import { ChatMessage, ToolCall } from '@/types/chat';
import { ToolDefinition } from '../ToolRegistry';
import {
  AIProvider,
  AIProviderConfig,
  StreamChunk,
  createChatMessage,
  generateMessageId,
} from './base';

// ===========================
// Gemini Provider
// ===========================

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  /**
   * Convert our ChatMessage to Gemini's format
   */
  private convertMessagesToGeminiFormat(messages: ChatMessage[]): any[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Convert our ToolDefinition to Gemini's FunctionDeclaration
   */
  private convertToolsToGeminiFormat(tools: ToolDefinition[]): FunctionDeclaration[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
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
      const systemPrompt = messages.find((m) => m.role === 'system')?.content;
      const geminiMessages = this.convertMessagesToGeminiFormat(messages);
      const functionDeclarations = this.convertToolsToGeminiFormat(tools);

      // Build the request config
      const config: any = {
        model: this.config.model,
        contents: geminiMessages,
        systemInstruction: systemPrompt,
        config: {
          generationConfig: {
            temperature: this.config.temperature || 0.7,
            maxOutputTokens: this.config.maxTokens || 2048,
          },
        },
      };

      // Add tools if available
      if (functionDeclarations.length > 0) {
        config.config.tools = [{ functionDeclarations }];
      }

      const response = await this.client.models.generateContent(config);

      // Check for function calls
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const toolCalls: ToolCall[] = functionCalls.map((fc: any) => ({
          id: generateMessageId(),
          name: fc.name,
          arguments: fc.args,
        }));

        return createChatMessage(
          'assistant',
          response.text || 'I need to execute some tools to help you.',
          toolCalls
        );
      }

      // Regular text response
      return createChatMessage('assistant', response.text || '');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API failed: ${error}`);
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
      const systemPrompt = messages.find((m) => m.role === 'system')?.content;
      const geminiMessages = this.convertMessagesToGeminiFormat(messages);
      const functionDeclarations = this.convertToolsToGeminiFormat(tools);

      // Build the request config
      const config: any = {
        model: this.config.model,
        contents: geminiMessages,
        systemInstruction: systemPrompt,
        config: {
          generationConfig: {
            temperature: this.config.temperature || 0.7,
            maxOutputTokens: this.config.maxTokens || 2048,
          },
        },
      };

      // Add tools if available
      if (functionDeclarations.length > 0) {
        config.config.tools = [{ functionDeclarations }];
      }

      const stream = await this.client.models.generateContentStream(config);

      let fullText = '';
      let toolCalls: ToolCall[] = [];

      for await (const chunk of stream) {
        let chunkText = '';
        
        // Safely extract text to avoid warnings about non-text parts (function calls)
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
              chunkText += part.text;
            }
          }
        } else {
          // Fallback to text property if structure is different, but wrap in try-catch
          try {
            chunkText = chunk.text || '';
          } catch (e) {
            // Ignore
          }
        }

        if (chunkText) {
          fullText += chunkText;
          onChunk({
            type: 'text',
            content: chunkText,
          });
        }

        // Check for function calls
        const functionCalls = chunk.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          toolCalls = functionCalls.map((fc: any) => ({
            id: generateMessageId(),
            name: fc.name,
            arguments: fc.args,
          }));

          toolCalls.forEach((tc) => {
            onChunk({
              type: 'tool_call',
              toolCall: tc,
            });
          });
        }
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
      console.error('Gemini streaming error:', error);
      throw new Error(`Gemini streaming failed: ${error}`);
    }
  }
}
