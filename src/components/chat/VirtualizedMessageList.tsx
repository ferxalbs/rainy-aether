/**
 * VirtualizedMessageList Component
 *
 * High-performance message list using virtual scrolling for handling 1000+ messages
 * without performance degradation. Uses @tanstack/react-virtual for efficient DOM
 * rendering of only visible items.
 *
 * Features:
 * - Virtual scrolling (only renders visible messages)
 * - Automatic scroll to bottom on new messages
 * - Smooth scrolling with overscan
 * - Memory efficient (handles 10k+ messages)
 * - Reverse scrolling (newest at bottom)
 *
 * @example
 * ```tsx
 * <VirtualizedMessageList
 *   messages={messages}
 *   isLoading={isLoading}
 *   onLoadMore={() => loadOlderMessages()}
 * />
 * ```
 */

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatMessage } from '@/components/agents/ChatMessage';
import { TypingIndicator } from '@/components/chat';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Message interface
 */
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  toolCalls?: any[];
}

/**
 * Props for VirtualizedMessageList
 */
export interface VirtualizedMessageListProps {
  /** Array of messages to display */
  messages: Message[];

  /** Whether agent is currently responding */
  isLoading?: boolean;

  /** Whether to show typing indicator */
  showTypingIndicator?: boolean;

  /** Callback for loading more messages (infinite scroll) */
  onLoadMore?: () => void;

  /** Whether more messages are available */
  hasMore?: boolean;

  /** Whether loading more messages */
  isLoadingMore?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Height of container (default: full height) */
  height?: number | string;

  /** Overscan count (number of items to render outside viewport) */
  overscan?: number;

  /** Whether to auto-scroll to bottom on new messages */
  autoScrollToBottom?: boolean;
}

/**
 * VirtualizedMessageList component
 */
export function VirtualizedMessageList({
  messages,
  isLoading = false,
  showTypingIndicator = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  className,
  height = '100%',
  overscan = 5,
  autoScrollToBottom = true,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Estimated message height
    overscan,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScrollToBottom && messages.length > lastMessageCountRef.current) {
      // New message added - scroll to bottom
      const lastItem = virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1];
      if (lastItem) {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, autoScrollToBottom, virtualizer]);

  // Handle scroll to top (load more)
  useEffect(() => {
    if (!parentRef.current || !onLoadMore || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      if (!parentRef.current) return;
      const { scrollTop } = parentRef.current;

      // If scrolled to top (with 100px threshold), load more
      if (scrollTop < 100) {
        onLoadMore();
      }
    };

    const element = parentRef.current;
    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [onLoadMore, hasMore, isLoadingMore]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Load more indicator */}
      {hasMore && (
        <div className="flex items-center justify-center p-4">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading older messages...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-primary hover:text-primary/80 underline underline-offset-2"
            >
              Load older messages
            </button>
          )}
        </div>
      )}

      {/* Virtual items container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <div className="px-4 py-2">
                <ChatMessage message={message} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {showTypingIndicator && (
        <div className="px-4 py-4">
          <TypingIndicator />
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">No messages yet</h3>
          <p className="text-xs">Start a conversation to see messages here</p>
        </div>
      )}
    </div>
  );
}

/**
 * Export type for external use
 */
export type { Message };
