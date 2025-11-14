import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcwIcon, PaperclipIcon, SendIcon } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export function ChatConversationView({
  messages,
  message,
  onMessageChange,
  onSend,
  onReset,
}: ChatConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50 px-4 md:px-8 py-6"
      >
        <div className="max-w-[720px] mx-auto space-y-6">
          {/* Reset Button */}
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onReset}
                    className="size-8 rounded-md hover:bg-accent"
                  >
                    <RotateCcwIcon className="size-4" />
                    <span className="sr-only">Reset conversation</span>
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

      {/* Input Area */}
      <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm px-4 md:px-8 py-4">
        <div className="max-w-[720px] mx-auto">
          <div className="rounded-xl border border-border bg-muted/30 p-1">
            <div className="rounded-lg border border-transparent bg-background">
              <Textarea
                placeholder="Type your message... (Shift+Enter for new line)"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="min-h-[80px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 hover:bg-accent"
                        >
                          <PaperclipIcon className="size-4 text-muted-foreground" />
                          <span className="sr-only">Attach file</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach files (coming soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="h-7 px-3 gap-1.5"
                >
                  <span>Send</span>
                  <SendIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
