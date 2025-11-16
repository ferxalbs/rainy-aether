/**
 * Chat Components - Public API
 *
 * Export all chat-related components for Phase 8 Enhanced UX & Streaming.
 *
 * @example
 * ```typescript
 * import { StreamingMessage, MarkdownMessage, CodeBlock, VirtualizedMessageList } from '@/components/chat';
 *
 * <StreamingMessage
 *   agentId="rainy"
 *   message="Explain recursion"
 *   onComplete={(content) => console.log(content)}
 * />
 *
 * <MarkdownMessage content="# Hello\nThis is **markdown**!" />
 *
 * <CodeBlock language="typescript" code="const x = 42;" />
 *
 * <VirtualizedMessageList messages={messages} isLoading={false} />
 * ```
 */

export { StreamingMessage, TypingIndicator } from './StreamingMessage';
export type { StreamingMessageProps } from './StreamingMessage';

export { MarkdownMessage } from './MarkdownMessage';
export type { MarkdownMessageProps } from './MarkdownMessage';

export { CodeBlock } from './CodeBlock';
export type { CodeBlockProps } from './CodeBlock';

export { SplitView } from './SplitView';
export type { SplitViewProps } from './SplitView';

export { VirtualizedMessageList } from './VirtualizedMessageList';
export type { VirtualizedMessageListProps, Message } from './VirtualizedMessageList';

export { CodeBlockActions } from './CodeBlockActions';
export type { CodeBlockActionsProps } from './CodeBlockActions';
