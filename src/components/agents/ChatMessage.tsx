import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CopyIcon, ThumbsUpIcon, ThumbsDownIcon, RotateCcwIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

/**
 * Render a chat message with sender-specific styling and optional AI actions.
 *
 * Renders message content styled differently for 'user' and 'ai' senders; AI messages include an avatar, timestamp, and action buttons (copy, thumbs up, thumbs down, regenerate), while user messages show a user avatar and are aligned to the right.
 *
 * @param message - The message to render, including content, sender, id, and timestamp
 * @returns The chat message React element
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div
      className={cn(
        'flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300',
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.sender === 'ai' && (
        <div className="shrink-0 mt-1">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl blur-md opacity-50" />
            <div className="relative size-9 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-md">
              <Logo className="size-5 text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[80%]">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 relative backdrop-blur-sm transition-all duration-200',
            message.sender === 'user'
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md'
              : 'bg-secondary/80 border border-border/50 shadow-sm hover:shadow-md'
          )}
        >
          {message.sender === 'user' && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl" />
          )}
          <p className="text-sm leading-relaxed relative z-10 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Message actions */}
        <div className={cn(
          'flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          message.sender === 'user' ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-[10px] text-muted-foreground/60 mr-2">
            {formatTime(message.timestamp)}
          </span>

          {message.sender === 'ai' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 hover:bg-accent"
                    onClick={handleCopy}
                  >
                    <CopyIcon className={cn('size-3', copied && 'text-green-500')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy message'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 hover:bg-accent"
                  >
                    <ThumbsUpIcon className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Good response</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 hover:bg-accent"
                  >
                    <ThumbsDownIcon className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bad response</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 hover:bg-accent"
                  >
                    <RotateCcwIcon className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Regenerate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {message.sender === 'user' && (
        <div className="shrink-0 mt-1">
          <Avatar className="size-9 ring-2 ring-primary/20 shadow-sm">
            <AvatarImage src="/ln.png" alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
              U
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}