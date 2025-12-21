import { ChatMessage, ToolCall } from "@/types/chat";
import { ToolDefinition } from "../ToolRegistry";

// ===========================
// Provider Interface
// ===========================

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  type: "text" | "thought" | "tool_call" | "done" | "tool_update" | "error";
  content?: string;
  toolCall?: ToolCall;
  fullMessage?: ChatMessage;
  error?: string;
}

export interface AIProvider {
  /**
   * Send a message and get a complete response
   */
  sendMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<ChatMessage>;

  /**
   * Send a message and stream the response
   */
  streamMessage(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatMessage>;
}

// ===========================
// Utility Functions
// ===========================

/**
 * Convert ChatMessage history to format expected by most LLM APIs
 */
export function convertMessagesToAPIFormat(messages: ChatMessage[]): any[] {
  return messages
    .filter((m) => m.role !== "system") // System prompts handled separately
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: m.content,
      ...(m.toolCalls && {
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      }),
    }));
}

/**
 * Convert ToolDefinition to OpenAI-compatible function format
 */
export function convertToolsToFunctionFormat(tools: ToolDefinition[]): any[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return crypto.randomUUID();
}

/**
 * Create a ChatMessage from provider response
 */
export function createChatMessage(
  role: "user" | "assistant" | "system",
  content: string,
  toolCalls?: ToolCall[],
  thoughts?: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date(),
    toolCalls,
    thoughts,
  };
}
