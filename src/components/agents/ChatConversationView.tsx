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
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50 px-4 md:px-8 py-6"
      >
        <div className="max-w-[800px] mx-auto space-y-6">
          {/* Header with Reset Button */}
          <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md rounded-lg border border-border/50 px-4 py-3 mb-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-sm">
                <SparklesIcon className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Rainy AI</h3>
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
                    className="h-8 gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <RotateCcwIcon className="size-4" />
                    <span className="hidden sm:inline text-xs font-medium">New Chat</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start new conversation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Messages */}
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 right-8 z-20 animate-in fade-in slide-in-from-bottom-2">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={scrollToBottom}
            className="size-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border border-border/50 hover:bg-accent hover:shadow-xl transition-all duration-200"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/50 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl px-4 md:px-8 py-4">
        <div className="max-w-[800px] mx-auto">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/50 to-secondary/30 backdrop-blur-sm p-1 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="rounded-xl border border-border/30 bg-background/80 backdrop-blur-sm">
              <Textarea
                placeholder="Type your message... (Shift+Enter for new line)"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="min-h-[80px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/30">
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <PaperclipIcon className="size-4 text-muted-foreground" />
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
                          className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <CodeIcon className="size-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach code context</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <MicIcon className="size-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Voice input</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isMessageEmpty}
                  className={cn(
                    'h-8 px-4 gap-1.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-200',
                    isMessageEmpty && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-sm font-medium">Send</span>
                  <SendIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted/50 border border-border/50 rounded">Enter</kbd> to send,{' '}
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted/50 border border-border/50 rounded">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}