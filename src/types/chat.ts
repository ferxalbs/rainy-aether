/**
 * Shared Chat Types
 *
 * Common type definitions used across chat components to ensure consistency
 * and prevent type mismatches between different chat-related modules.
 */

/**
 * Image attachment for multimodal messages
 */
export interface ImageAttachment {
  /** Base64 encoded image data */
  base64: string;
  /** MIME type (image/png, image/jpeg, etc.) */
  mimeType: string;
  /** Original filename (optional) */
  filename?: string;
}

/**
 * Unified message interface used across all chat components
 *
 * This combines the essential fields from both the local Message interface
 * and the agent ChatMessage interface to create a single source of truth.
 *
 * @property id - Unique identifier for the message
 * @property content - The message text content
 * @property role - The role of the message sender (standardized with agent types)
 * @property timestamp - When the message was created
 * @property toolCalls - Optional array of tool calls associated with this message
 * @property images - Optional array of image attachments for multimodal messages
 * @property metadata - Optional metadata for extensions and custom data
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;

  /** Message text content */
  content: string;

  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';

  /** Message creation timestamp */
  timestamp: Date;

  /** Optional tool calls made during message generation */
  toolCalls?: ToolCall[];

  /** Optional thinking/reasoning content (Gemini only) */
  thoughts?: string;

  /** Optional image attachments for multimodal messages */
  images?: ImageAttachment[];

  /** Optional metadata for custom data and extensions */
  metadata?: Record<string, unknown>;
}

/**
 * Tool call representation
 */
export interface ToolCall {
  /** Unique tool call identifier */
  id: string;

  /** Name of the tool being called */
  name: string;

  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;

  /** Result from tool execution */
  result?: unknown;

  /** Error if tool execution failed */
  error?: string;

  /** Status of the tool call */
  status?: 'pending' | 'success' | 'error';
}

/**
 * Legacy message sender type for backward compatibility
 * Maps to the new 'role' field
 *
 * @deprecated Use 'role' field instead
 */
export type MessageSender = 'user' | 'ai';

/**
 * Helper function to convert legacy sender to role
 */
export function senderToRole(sender: MessageSender): 'user' | 'assistant' {
  return sender === 'ai' ? 'assistant' : 'user';
}

/**
 * Helper function to convert role to legacy sender
 */
export function roleToSender(role: 'user' | 'assistant' | 'system'): MessageSender {
  return role === 'assistant' || role === 'system' ? 'ai' : 'user';
}
