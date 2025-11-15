import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  RotateCcwIcon,
  PaperclipIcon,
  SendIcon,
  ChevronDownIcon,
  SparklesIcon,
  CodeIcon,
  MicIcon,
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/cn';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatConversationViewProps {
  messages: Message[];
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (content: string) => void;
  onReset: () => void;
}

/**
 * Renders the chat conversation UI including message list, sticky header, message input, and scroll controls.
 *
 * Renders messages and a header with conversation controls; auto-scrolls to the bottom when new messages arrive only if the user is already near the bottom, shows a "scroll to bottom" button when the user scrolls away, and provides an input area where Enter sends the message and Shift+Enter inserts a newline.
 *
 * @param messages - Array of chat messages to display; each message contains id, content, sender, and timestamp.
 * @param message - Current text in the message input.
 * @param onMessageChange - Called with the new input value when the message text changes.
 * @param onSend - Called with the current message text when the user sends a message.
 * @param onReset - Called to start a new conversation.
 * @returns The chat conversation view as a React element.
 */
export function ChatConversationView({
  messages,
  message,
  onMessageChange,
  onSend,
  onReset,
}: ChatConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // Handle scroll to check if user is near bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNear = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setIsNearBottom(isNear);
    setShowScrollButton(!isNear);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
    }
  };

  const isMessageEmpty = !message.trim();

  return (
    <div className="flex h-full flex-col relative">
      {/* Messages Area */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent px-4 md:px-8 py-6 pb-32"
      >
        <div className="max-w-[720px] mx-auto space-y-6">
          {/* Header with Reset Button */}
          <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg border border-border px-4 py-2.5 mb-4">
            <div className="flex items-center gap-3">
              <div className="size-7 rounded-md bg-primary flex items-center justify-center">
                <SparklesIcon className="size-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Rainy AI</h3>
                <p className="text-xs text-muted-foreground">
                  {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-7 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span className="hidden sm:inline text-xs">New Chat</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start new conversation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Messages */}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-28 right-8 z-20">
          <Button
            variant="secondary"
            size="icon"
            onClick={scrollToBottom}
            className="size-10 rounded-full shadow-lg"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 py-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="max-w-[720px] mx-auto pointer-events-auto">
          <div className="rounded-xl border border-border bg-card shadow-xl backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
            <div className="p-1">
              <Textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="min-h-[60px] max-h-[160px] resize-none border-0 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <PaperclipIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach files</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <CodeIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach code</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isMessageEmpty}
                  className="h-7 px-3 gap-1"
                >
                  <span className="text-xs">Send</span>
                  <SendIcon className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}